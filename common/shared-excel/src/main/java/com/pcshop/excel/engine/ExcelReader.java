package com.pcshop.excel.engine;

import com.pcshop.excel.dto.BaseImportDTO;
import com.pcshop.excel.dto.MapImportRow;
import com.pcshop.excel.reference.ReferenceItem;
import com.pcshop.excel.util.Reflections;
import org.apache.poi.openxml4j.util.ZipSecureFile;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.FormulaEvaluator;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;

/**
 * Đọc file .xlsx. Chỉ kiểm tra định dạng (kiểu ô, bắt buộc, giá trị dropdown, mã trùng trong file);
 * kiểm tra với DB do service làm. Lỗi từng ô ghi vào dòng ({@code addError}), đọc hết file để báo đủ lỗi một lần.
 * Lỗi của cả file (không phải xlsx, quá lớn, sai mẫu, quá số dòng) ném {@link ExcelFileException}.
 *
 * <p>Không giữ trạng thái, chạy được song song.
 */
public final class ExcelReader {

    /** Kích thước file tối đa mặc định (guide: 5 MB). */
    public static final int DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

    // STRICT: ngày không tồn tại (31/02) là lỗi, không tự đổi thành ngày cuối tháng; STRICT cần "uuuu" thay "yyyy"
    private static final List<DateTimeFormatter> DATE_FORMATS = List.of(
            strict("dd/MM/uuuu"),
            strict("d/M/uuuu"),
            DateTimeFormatter.ISO_LOCAL_DATE,
            strict("dd-MM-uuuu"));

    private static final List<DateTimeFormatter> DATE_TIME_FORMATS = List.of(
            strict("dd/MM/uuuu HH:mm:ss"),
            strict("dd/MM/uuuu HH:mm"),
            strict("d/M/uuuu H:mm"),
            DateTimeFormatter.ISO_LOCAL_DATE_TIME,
            strict("uuuu-MM-dd HH:mm:ss"),
            strict("uuuu-MM-dd HH:mm"));

    static {
        ExcelSecurity.init();
    }

    private ExcelReader() {
    }

    private static DateTimeFormatter strict(String pattern) {
        return DateTimeFormatter.ofPattern(pattern).withResolverStyle(ResolverStyle.STRICT);
    }

    /** File không đọc được (không phải .xlsx, hỏng...). */
    public static class InvalidExcelFileException extends ExcelFileException {
        public InvalidExcelFileException(Throwable cause) {
            super("File không đọc được, chỉ nhận file Excel .xlsx", cause);
        }
    }

    /**
     * Đọc thành DTO (cột từ field có {@code @ImportExportMapping}).
     * Cột tham chiếu ({@code key}) giữ nguyên chữ trong ô ({@code Mã|Tên}); service tự lấy mã và kiểm tra.
     *
     * @param firstDataRow chỉ số dòng dữ liệu đầu tiên (0 là dòng tiêu đề, mặc định 1)
     * @param translate    dịch mã message theo locale của request
     * @return các dòng không rỗng; lỗi định dạng ô đã được ghi vào {@code errorMessage} của dòng
     */
    public static <D extends BaseImportDTO> List<D> read(byte[] content,
                                                         Class<D> dtoClass,
                                                         int firstDataRow,
                                                         Function<String, String> translate) {
        ExcelSheetSpec spec = ExcelSheetSpec.of(dtoClass, translate);
        List<MapImportRow> rows = read(content, spec, null, firstDataRow, translate);
        List<D> result = new ArrayList<>(rows.size());
        for (MapImportRow source : rows) {
            D dto = newInstance(dtoClass);
            dto.setRow(source.getRow());
            source.getErrors().forEach(dto::addError);
            for (ColumnDef column : spec.columns()) {
                Object value = source.get(column.key());
                if (value == null) {
                    continue;
                }
                Field field = Reflections.requireField(dtoClass, column.key());
                try {
                    Reflections.set(field, dto, toFieldType(value, field.getType(), translate));
                } catch (ArithmeticException | NumberFormatException ex) {
                    dto.addError(column.header() + ": " + translate.apply("import.number_is_not_valid"));
                }
            }
            result.add(dto);
        }
        return result;
    }

    /**
     * Đọc theo mô tả cột (cột động). Dòng tiêu đề là dòng 0, dữ liệu từ dòng 1.
     *
     * @param references {@code dropdownKey -> danh sách}: cột có dropdown phải nhận giá trị trong danh sách
     *                   (không phân biệt hoa thường, ô dạng {@code Mã|Tên} lấy mã). Key không có trong map thì không kiểm tra.
     */
    public static List<MapImportRow> read(byte[] content,
                                          ExcelSheetSpec spec,
                                          Map<String, List<ReferenceItem>> references,
                                          Function<String, String> translate) {
        return read(content, spec, references, 1, translate);
    }

    private static List<MapImportRow> read(byte[] content,
                                           ExcelSheetSpec spec,
                                           Map<String, List<ReferenceItem>> references,
                                           int firstDataRow,
                                           Function<String, String> translate) {
        if (content == null || content.length == 0) {
            throw new ExcelFileException("File rỗng");
        }
        if (content.length > DEFAULT_MAX_BYTES) {
            throw new ExcelFileException("File vượt quá " + (DEFAULT_MAX_BYTES / 1024 / 1024) + " MB");
        }
        try (Workbook workbook = open(content)) {
            Sheet sheet = workbook.getSheetAt(0);
            FormulaEvaluator evaluator = workbook.getCreationHelper().createFormulaEvaluator();
            DataFormatter formatter = new DataFormatter(Locale.ROOT);
            List<ColumnDef> columns = spec.columns();
            checkHeader(sheet, columns, formatter, evaluator, firstDataRow);

            Map<String, Map<String, String>> allowed = allowedValues(columns, references);
            Map<String, Map<String, Enum<?>>> enumLookup = enumLookup(columns, translate);
            Map<String, Map<String, Integer>> codeFirstRow = new HashMap<>();
            List<MapImportRow> result = new ArrayList<>();

            for (int rowIndex = firstDataRow; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (isBlank(row, columns.size(), formatter, evaluator)) {
                    continue;
                }
                if (result.size() >= spec.maxRows()) {
                    throw new ExcelFileException("File có quá " + spec.maxRows() + " dòng dữ liệu, hãy chia nhỏ file");
                }
                MapImportRow out = new MapImportRow();
                out.setRow(rowIndex);

                for (int i = 0; i < columns.size(); i++) {
                    ColumnDef column = columns.get(i);
                    try {
                        Object value = readCell(row.getCell(i), column, formatter, evaluator, enumLookup);
                        if (value == null) {
                            if (column.required()) {
                                out.addError(column.header() + ": " + translate.apply("import.required"));
                            }
                            continue;
                        }
                        out.put(column.key(), checkAllowed(value, column, allowed));
                    } catch (CellFormatException ex) {
                        String reason = ex.value == null
                                ? translate.apply(ex.getMessage())
                                : ex.value + " " + translate.apply(ex.getMessage());
                        out.addError(column.header() + ": " + reason);
                    }
                }

                // Mã trùng ngay trong file
                for (ColumnDef column : columns) {
                    Object code = out.get(column.key());
                    if (column.code() && code != null && !code.toString().isBlank()) {
                        String key = code.toString().trim().toLowerCase(Locale.ROOT);
                        if (codeFirstRow.computeIfAbsent(column.key(), k -> new HashMap<>()).putIfAbsent(key, rowIndex) != null) {
                            out.addError(column.header() + ": " + translate.apply("import.row_is_duplicated"));
                        }
                    }
                }
                result.add(out);
            }
            return result;
        } catch (IOException ex) {
            throw new InvalidExcelFileException(ex);
        }
    }

    private static Workbook open(byte[] content) {
        try {
            return new XSSFWorkbook(new ByteArrayInputStream(content));
        } catch (IOException | RuntimeException ex) {
            throw new InvalidExcelFileException(ex);
        }
    }

    private static final class CellFormatException extends RuntimeException {
        /** Giá trị gây lỗi, đặt trước lý do (vd "LGA9999 không có trong danh sách"); null nếu không cần. */
        final String value;

        CellFormatException(String messageCode) {
            this(messageCode, null);
        }

        CellFormatException(String messageCode, String value) {
            super(messageCode, null, false, false);
            this.value = value;
        }
    }

    /** Dòng tiêu đề phải khớp mẫu (bỏ "(*)", không phân biệt hoa thường); thừa cột ở cuối thì bỏ qua (vd cột "Lỗi"). */
    private static void checkHeader(Sheet sheet, List<ColumnDef> columns, DataFormatter formatter,
                                    FormulaEvaluator evaluator, int firstDataRow) {
        if (firstDataRow < 1) {
            return;
        }
        Row header = sheet.getRow(firstDataRow - 1);
        for (int i = 0; i < columns.size(); i++) {
            Cell cell = header == null ? null : header.getCell(i);
            String actual = cell == null ? "" : formatter.formatCellValue(cell, evaluator);
            String expected = columns.get(i).header();
            if (!normalizeHeader(actual).equals(normalizeHeader(expected))) {
                throw new ExcelFileException("File không đúng mẫu, hãy tải file mẫu mới (cột " + (i + 1)
                        + ": cần \"" + expected + "\", file có \"" + actual.trim() + "\")");
            }
        }
    }

    private static String normalizeHeader(String text) {
        String t = text == null ? "" : text.trim();
        if (t.endsWith("(*)")) {
            t = t.substring(0, t.length() - 3).trim();
        }
        return t.replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    private static Object readCell(Cell cell, ColumnDef column, DataFormatter formatter,
                                   FormulaEvaluator evaluator, Map<String, Map<String, Enum<?>>> enumLookup) {
        if (cell == null || cell.getCellType() == CellType.BLANK) {
            return null;
        }
        CellType cellType = cell.getCellType() == CellType.FORMULA
                ? evaluator.evaluateFormulaCell(cell)
                : cell.getCellType();
        String text = formatter.formatCellValue(cell, evaluator).trim();
        if (text.isEmpty()) {
            return null;
        }

        if (column.enumClass() != null) {
            Enum<?> constant = enumLookup.getOrDefault(column.key(), Map.of()).get(normalize(text));
            if (constant == null) {
                throw new CellFormatException("import.code_is_not_existed");
            }
            return constant;
        }
        return switch (column.type()) {
            case STRING -> text;
            case STRING_LIST -> splitList(text);
            case DATE -> cellType == CellType.NUMERIC
                    ? cell.getLocalDateTimeCellValue().toLocalDate()
                    : parseDate(text);
            case DATE_TIME -> cellType == CellType.NUMERIC
                    ? cell.getLocalDateTimeCellValue()
                    : parseDateTime(text);
            case TIME -> readTime(cell, cellType, text);
            case BOOLEAN -> readBoolean(cell, cellType, text);
            case INTEGER, LONG, DECIMAL -> readNumber(cell, cellType, text, column.type());
        };
    }

    private static LocalTime readTime(Cell cell, CellType cellType, String text) {
        if (cellType == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            return cell.getLocalDateTimeCellValue().toLocalTime();
        }
        try {
            return LocalTime.parse(text);
        } catch (DateTimeParseException ex) {
            throw new CellFormatException("import.date_time_is_not_valid");
        }
    }

    private static Boolean readBoolean(Cell cell, CellType cellType, String text) {
        if (cellType == CellType.BOOLEAN) {
            return cell.getBooleanCellValue();
        }
        return switch (text.toLowerCase(Locale.ROOT)) {
            case "true", "1", "x", "yes", "có", "co" -> Boolean.TRUE;
            case "false", "0", "no", "không", "khong" -> Boolean.FALSE;
            default -> throw new CellFormatException("import.boolean_is_not_valid");
        };
    }

    private static Object readNumber(Cell cell, CellType cellType, String text, ColumnType type) {
        BigDecimal number;
        if (cellType == CellType.NUMERIC) {
            number = new BigDecimal(Double.toString(cell.getNumericCellValue()));
        } else {
            try {
                // chấp nhận khoảng trắng phân cách hàng nghìn: "1 000 000"
                number = new BigDecimal(text.replace(" ", "").replace(" ", ""));
            } catch (NumberFormatException ex) {
                throw new CellFormatException("import.number_is_not_valid");
            }
        }
        try {
            return switch (type) {
                case INTEGER -> number.intValueExact();
                case LONG -> number.longValueExact();
                default -> number.stripTrailingZeros().scale() < 0 ? number.setScale(0) : number.stripTrailingZeros();
            };
        } catch (ArithmeticException ex) {
            throw new CellFormatException("import.integer_is_not_valid");
        }
    }

    private static List<String> splitList(String text) {
        List<String> items = new ArrayList<>();
        for (String part : text.split(",")) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                items.add(trimmed);
            }
        }
        return items.isEmpty() ? null : List.copyOf(items);
    }

    /** Giá trị cột dropdown phải nằm trong danh sách; trả về mã chuẩn (đúng hoa thường như trong danh sách). */
    private static Object checkAllowed(Object value, ColumnDef column, Map<String, Map<String, String>> allowed) {
        Map<String, String> codes = column.dropdownKey() == null ? null : allowed.get(column.dropdownKey());
        if (codes == null) {
            return value;
        }
        if (value instanceof List<?> list) {
            List<String> result = new ArrayList<>(list.size());
            for (Object item : list) {
                result.add(match(item.toString(), codes));
            }
            return List.copyOf(result);
        }
        if (column.isMultiValue()) {
            List<String> parts = splitList(value.toString());
            List<String> result = new ArrayList<>();
            for (String part : parts == null ? List.<String>of() : parts) {
                result.add(match(part, codes));
            }
            return List.copyOf(result);
        }
        return match(value.toString(), codes);
    }

    private static String match(String text, Map<String, String> codes) {
        String code = codes.get(normalize(ReferenceItem.extractCode(text)));
        if (code == null) {
            code = codes.get(normalize(text));
        }
        if (code == null) {
            throw new CellFormatException("import.not_in_list", text.trim());
        }
        return code;
    }

    /** dropdownKey -> (mã đã chuẩn hoá -> mã gốc) */
    private static Map<String, Map<String, String>> allowedValues(List<ColumnDef> columns,
                                                                  Map<String, List<ReferenceItem>> references) {
        Map<String, Map<String, String>> result = new HashMap<>();
        if (references == null) {
            return result;
        }
        for (ColumnDef column : columns) {
            String key = column.dropdownKey();
            if (key == null || result.containsKey(key) || !references.containsKey(key)) {
                continue;
            }
            Map<String, String> codes = new HashMap<>();
            for (ReferenceItem item : references.get(key)) {
                if (item.code() != null) {
                    codes.putIfAbsent(normalize(item.code()), item.code());
                }
            }
            result.put(key, codes);
        }
        return result;
    }

    private static Object toFieldType(Object value, Class<?> type, Function<String, String> translate) {
        if (value instanceof Enum<?> e && type == String.class) {
            return ExcelColumn.enumText(e, translate);
        }
        if (value instanceof List<?> list && type == String.class) {
            return String.join(",", list.stream().map(String::valueOf).toList());
        }
        if (!(value instanceof Number number) || type.isInstance(value)) {
            return value;
        }
        BigDecimal bd = new BigDecimal(number.toString());
        if (type == Integer.class || type == int.class) {
            return bd.intValueExact();
        }
        if (type == Long.class || type == long.class) {
            return bd.longValueExact();
        }
        if (type == Short.class || type == short.class) {
            return bd.shortValueExact();
        }
        if (type == Byte.class || type == byte.class) {
            return bd.byteValueExact();
        }
        if (type == Double.class || type == double.class) {
            return bd.doubleValue();
        }
        if (type == Float.class || type == float.class) {
            return bd.floatValue();
        }
        if (type == BigInteger.class) {
            return bd.toBigIntegerExact();
        }
        if (type == String.class) {
            return bd.toPlainString();
        }
        return bd;
    }

    private static LocalDate parseDate(String text) {
        for (DateTimeFormatter format : DATE_FORMATS) {
            try {
                return LocalDate.parse(text, format);
            } catch (DateTimeParseException ignored) {
                // thử định dạng tiếp theo
            }
        }
        throw new CellFormatException("import.date_time_is_not_valid");
    }

    private static LocalDateTime parseDateTime(String text) {
        for (DateTimeFormatter format : DATE_TIME_FORMATS) {
            try {
                return LocalDateTime.parse(text, format);
            } catch (DateTimeParseException ignored) {
                // thử định dạng tiếp theo
            }
        }
        try {
            return parseDate(text).atStartOfDay();
        } catch (CellFormatException ex) {
            throw new CellFormatException("import.date_time_is_not_valid");
        }
    }

    /** key cột enum -> (chữ hiển thị hoặc tên hằng, đã chuẩn hoá) -> hằng enum */
    private static Map<String, Map<String, Enum<?>>> enumLookup(List<ColumnDef> columns,
                                                                Function<String, String> translate) {
        Map<String, Map<String, Enum<?>>> result = new HashMap<>();
        for (ColumnDef column : columns) {
            if (column.enumClass() == null) {
                continue;
            }
            Map<String, Enum<?>> byText = new HashMap<>();
            for (Enum<?> e : column.enumClass().getEnumConstants()) {
                byText.put(normalize(e.name()), e);
                byText.put(normalize(ExcelColumn.enumText(e, translate)), e);
            }
            result.put(column.key(), byText);
        }
        return result;
    }

    private static String normalize(String text) {
        return text == null ? "" : text.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean isBlank(Row row, int columnCount, DataFormatter formatter, FormulaEvaluator evaluator) {
        if (row == null) {
            return true;
        }
        for (int i = 0; i < columnCount; i++) {
            Cell cell = row.getCell(i);
            if (cell != null && cell.getCellType() != CellType.BLANK
                    && !formatter.formatCellValue(cell, evaluator).isBlank()) {
                return false;
            }
        }
        return true;
    }

    private static <D> D newInstance(Class<D> type) {
        try {
            var constructor = type.getDeclaredConstructor();
            constructor.setAccessible(true);
            return constructor.newInstance();
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException("DTO import " + type.getName() + " cần constructor không tham số", ex);
        }
    }

    /** Dùng {@link ZipSecureFile} để chặn zip bomb; gọi một lần, an toàn khi gọi lại. */
    static final class ExcelSecurity {
        private static volatile boolean done;

        private ExcelSecurity() {
        }

        static void init() {
            if (!done) {
                ZipSecureFile.setMinInflateRatio(0.01);
                ZipSecureFile.setMaxEntrySize(100L * 1024 * 1024);
                done = true;
            }
        }
    }
}
