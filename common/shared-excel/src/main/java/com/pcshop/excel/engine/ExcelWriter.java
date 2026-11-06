package com.pcshop.excel.engine;

import com.pcshop.excel.reference.ReferenceItem;
import com.pcshop.excel.util.Reflections;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataValidation;
import org.apache.poi.ss.usermodel.DataValidationConstraint;
import org.apache.poi.ss.usermodel.DataValidationHelper;
import org.apache.poi.ss.usermodel.Name;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.ss.util.CellReference;
import org.apache.poi.ss.util.WorkbookUtil;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * Ghi file .xlsx. Không giữ trạng thái: mọi dữ liệu nằm trong tham số,
 * nên nhiều request export chạy song song không đè lên nhau.
 *
 * <p>Cột có enum hoặc tham chiếu có dropdown; giá trị dropdown nằm ở sheet ẩn {@value #LIST_SHEET}.
 * Bản theo DTO chỉ dựng {@link ExcelSheetSpec} từ lớp DTO rồi đi chung đường với bản theo spec.
 */
public final class ExcelWriter {

    public static final String LIST_SHEET = "_lists";

    /** Số ô tối đa liệt kê ở cột "Giá trị cho phép" của sheet Hướng dẫn. */
    private static final int GUIDE_MAX_ITEMS = 30;

    private ExcelWriter() {
    }

    /**
     * @param dtoClass       lớp DTO mô tả cột
     * @param rows           dữ liệu (rỗng thì ra file mẫu chỉ có tiêu đề)
     * @param references     key tham chiếu -> danh sách giá trị cho dropdown
     * @param translate      dịch mã message theo locale của request
     * @param validationRows số dòng được gắn dropdown
     */
    public static byte[] write(Class<?> dtoClass,
                               List<?> rows,
                               Map<String, List<ReferenceItem>> references,
                               Function<String, String> translate,
                               int validationRows) throws IOException {
        ExcelSheetSpec spec = ExcelSheetSpec.of(dtoClass, translate);
        List<Map<String, Object>> maps = new ArrayList<>(rows.size());
        for (Object dto : rows) {
            Map<String, Object> values = new HashMap<>();
            for (ColumnDef column : spec.columns()) {
                values.put(column.key(), Reflections.get(dto, column.key()));
            }
            maps.add(values);
        }
        return build(spec, maps, references, translate, validationRows, null);
    }

    /**
     * Ghi theo mô tả cột (cột động).
     *
     * @param rows           mỗi dòng là {@code key cột -> giá trị}; giá trị {@code List} ghi thành chuỗi cách dấu phẩy
     * @param references     {@code dropdownKey -> danh sách} cho dropdown
     * @param validationRows số dòng được gắn dropdown
     */
    public static byte[] write(ExcelSheetSpec spec,
                               List<Map<String, Object>> rows,
                               Map<String, List<ReferenceItem>> references,
                               Function<String, String> translate,
                               int validationRows) throws IOException {
        return build(spec, rows, references, translate, validationRows, null);
    }

    /** File mẫu: sheet dữ liệu rỗng (có dropdown cho {@code spec.maxRows()} dòng) và sheet Hướng dẫn. */
    public static byte[] writeTemplate(ExcelSheetSpec spec,
                                       Map<String, List<ReferenceItem>> references,
                                       Function<String, String> translate,
                                       ExcelGuide guide) throws IOException {
        return build(spec, List.of(), references, translate, spec.maxRows(), guide);
    }

    private static byte[] build(ExcelSheetSpec spec,
                                List<Map<String, Object>> rows,
                                Map<String, List<ReferenceItem>> references,
                                Function<String, String> translate,
                                int validationRows,
                                ExcelGuide guide) throws IOException {
        Map<String, List<ReferenceItem>> refs = references == null ? Map.of() : references;
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ExcelStyles styles = new ExcelStyles(wb);
            Sheet sheet = wb.createSheet(WorkbookUtil.createSafeSheetName(spec.sheetName()));
            List<ColumnDef> columns = spec.columns();

            CellWriter.writeHeader(sheet, columns, translate, styles);

            Map<String, Map<String, ReferenceItem>> referenceByCode = CellWriter.indexReferences(refs);
            int rowIndex = 1;
            for (Map<String, Object> values : rows) {
                Row row = sheet.createRow(rowIndex++);
                for (int i = 0; i < columns.size(); i++) {
                    ColumnDef column = columns.get(i);
                    CellWriter.writeCell(row.createCell(i), column, values.get(column.key()), styles, translate,
                            referenceByCode);
                }
            }
            sheet.createFreezePane(0, 1);

            Map<String, List<String>> dropdowns = dropdownItems(columns, refs, translate);
            if (guide != null) {
                writeGuide(wb, styles, spec, guide, dropdowns, translate);
            }
            addDropdowns(wb, sheet, columns, dropdowns, Math.max(validationRows, rows.size()));
            wb.setActiveSheet(0);

            wb.write(out);
            return out.toByteArray();
        }
    }

    /** Key dropdown của cột: {@code dropdownKey}, hoặc {@code enum_<key>} nếu là cột enum. */
    private static String dropdownName(ColumnDef column) {
        if (column.enumClass() != null) {
            return "enum_" + column.key();
        }
        return column.dropdownKey();
    }

    /** dropdown name -> các giá trị hiển thị (giữ thứ tự cột). */
    private static Map<String, List<String>> dropdownItems(List<ColumnDef> columns,
                                                           Map<String, List<ReferenceItem>> refs,
                                                           Function<String, String> translate) {
        Map<String, List<String>> result = new LinkedHashMap<>();
        for (ColumnDef column : columns) {
            String name = dropdownName(column);
            if (name == null || result.containsKey(name)) {
                continue;
            }
            List<String> items = new ArrayList<>();
            if (column.enumClass() != null) {
                for (Enum<?> constant : column.enumClass().getEnumConstants()) {
                    items.add(ExcelColumn.enumText(constant, translate));
                }
            } else {
                for (ReferenceItem item : refs.getOrDefault(name, List.of())) {
                    items.add(item.display());
                }
            }
            if (!items.isEmpty()) {
                result.put(name, items);
            }
        }
        return result;
    }

    /** Dropdown: ghi danh sách vào sheet ẩn, đặt tên vùng, gắn data validation cho cột. */
    private static void addDropdowns(XSSFWorkbook wb, Sheet sheet, List<ColumnDef> columns,
                                     Map<String, List<String>> dropdowns, int lastRow) {
        if (dropdowns.isEmpty()) {
            return;
        }
        Sheet listSheet = wb.createSheet(LIST_SHEET);
        Row headerRow = listSheet.createRow(0);
        Map<String, String> rangeNames = new HashMap<>();
        int listColumn = 0;
        for (Map.Entry<String, List<String>> entry : dropdowns.entrySet()) {
            List<String> items = entry.getValue();
            headerRow.createCell(listColumn).setCellValue(entry.getKey());
            for (int i = 0; i < items.size(); i++) {
                Row r = listSheet.getRow(i + 1) != null ? listSheet.getRow(i + 1) : listSheet.createRow(i + 1);
                r.createCell(listColumn).setCellValue(items.get(i));
            }
            listSheet.setColumnWidth(listColumn, 256 * 30);

            String letter = CellReference.convertNumToColString(listColumn);
            Name name = wb.createName();
            name.setNameName(rangeName(entry.getKey(), listColumn));
            name.setRefersToFormula("'" + LIST_SHEET + "'!$" + letter + "$2:$" + letter + "$" + (items.size() + 1));
            rangeNames.put(entry.getKey(), name.getNameName());
            listColumn++;
        }
        wb.setSheetHidden(wb.getSheetIndex(listSheet), true);

        DataValidationHelper helper = sheet.getDataValidationHelper();
        for (int i = 0; i < columns.size(); i++) {
            ColumnDef column = columns.get(i);
            String rangeName = rangeNames.get(dropdownName(column));
            if (rangeName == null) {
                continue;
            }
            DataValidationConstraint constraint = helper.createFormulaListConstraint(rangeName);
            CellRangeAddressList range = new CellRangeAddressList(1, Math.max(1, lastRow), i, i);
            DataValidation validation = helper.createValidation(constraint, range);
            // Ô nhiều giá trị (cách dấu phẩy) không nằm trong danh sách: chỉ gợi ý, không chặn
            validation.setShowErrorBox(!column.isMultiValue());
            validation.setShowPromptBox(true);
            sheet.addValidationData(validation);
        }
    }

    /** Tên vùng hợp lệ của Excel: chỉ chữ, số, gạch dưới; thêm số thứ tự để không trùng. */
    private static String rangeName(String key, int index) {
        return "list_" + index + "_" + key.replaceAll("[^A-Za-z0-9_]", "_");
    }

    private static void writeGuide(XSSFWorkbook wb, ExcelStyles styles, ExcelSheetSpec spec, ExcelGuide guide,
                                   Map<String, List<String>> dropdowns, Function<String, String> translate) {
        Sheet sheet = wb.createSheet(WorkbookUtil.createSafeSheetName(ExcelGuide.SHEET_NAME));
        int rowIndex = 0;
        Cell titleCell = sheet.createRow(rowIndex++).createCell(0);
        titleCell.setCellValue(guide.title() == null ? spec.sheetName() : guide.title());
        titleCell.setCellStyle(styles.title);
        for (String note : guide.notes()) {
            sheet.createRow(rowIndex++).createCell(0).setCellValue("- " + note);
        }
        rowIndex++;

        String[] headers = {"Cột", "Bắt buộc", "Kiểu", "Giá trị cho phép", "Ví dụ", "Ghi chú"};
        Row headerRow = sheet.createRow(rowIndex++);
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(styles.header);
        }
        for (ColumnDef column : spec.columns()) {
            Row row = sheet.createRow(rowIndex++);
            row.createCell(0).setCellValue(column.header());
            row.createCell(1).setCellValue(column.required() ? "Có" : "");
            row.createCell(2).setCellValue(column.isMultiValue() ? ColumnType.STRING_LIST.text : column.type().text);
            List<String> items = dropdowns.getOrDefault(dropdownName(column), List.of());
            String allowed = items.size() > GUIDE_MAX_ITEMS
                    ? String.join(", ", items.subList(0, GUIDE_MAX_ITEMS)) + "... (chọn trong dropdown)"
                    : String.join(", ", items);
            Cell allowedCell = row.createCell(3);
            allowedCell.setCellValue(allowed);
            allowedCell.setCellStyle(styles.wrap);
            Object example = guide.example().get(column.key());
            if (example != null) {
                Cell exampleCell = row.createCell(4);
                CellWriter.writeText(exampleCell, exampleText(example), column, styles);
            }
            if (!column.comment().isBlank()) {
                row.createCell(5).setCellValue(translateOr(translate, column.comment(), column.comment()));
            }
        }
        sheet.setColumnWidth(0, 256 * 30);
        sheet.setColumnWidth(1, 256 * 10);
        sheet.setColumnWidth(2, 256 * 24);
        sheet.setColumnWidth(3, 256 * 50);
        sheet.setColumnWidth(4, 256 * 30);
        sheet.setColumnWidth(5, 256 * 40);
    }

    private static String exampleText(Object value) {
        if (value instanceof List<?> list) {
            return String.join(", ", list.stream().map(String::valueOf).toList());
        }
        if (value instanceof Boolean b) {
            return b ? "Có" : "Không";
        }
        if (value instanceof java.math.BigDecimal bd) {
            return bd.toPlainString();
        }
        return String.valueOf(value);
    }

    /** Dịch; nếu không có message (translate trả lại chính mã) thì dùng fallback. */
    static String translateOr(Function<String, String> translate, String code, String fallback) {
        String text = translate.apply(code);
        return text == null || text.equals(code) ? fallback : text;
    }
}
