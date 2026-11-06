package com.pcshop.excel.engine;

import com.pcshop.excel.reference.ReferenceItem;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.ClientAnchor;
import org.apache.poi.ss.usermodel.Comment;
import org.apache.poi.ss.usermodel.CreationHelper;
import org.apache.poi.ss.usermodel.Drawing;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Ghi dòng tiêu đề và từng ô; dùng chung cho {@link ExcelWriter} (XSSF) và {@link ExcelStreamWriter} (SXSSF). */
final class CellWriter {

    private CellWriter() {
    }

    static void writeHeader(Sheet sheet, List<ColumnDef> columns, Function<String, String> translate, ExcelStyles styles) {
        Row header = sheet.createRow(0);
        Drawing<?> drawing = sheet.createDrawingPatriarch();
        CreationHelper factory = sheet.getWorkbook().getCreationHelper();

        for (int i = 0; i < columns.size(); i++) {
            ColumnDef column = columns.get(i);
            sheet.setColumnWidth(i, Math.min(column.width(), 255 * 256));
            if (column.textFormat()) {
                sheet.setDefaultColumnStyle(i, styles.text);
            }
            Cell cell = header.createCell(i);
            cell.setCellValue(column.title());
            cell.setCellStyle(styles.header);

            if (!column.comment().isBlank()) {
                ClientAnchor anchor = factory.createClientAnchor();
                anchor.setCol1(i);
                anchor.setCol2(i + 3);
                anchor.setRow1(0);
                anchor.setRow2(4);
                Comment comment = drawing.createCellComment(anchor);
                comment.setString(factory.createRichTextString(
                        ExcelWriter.translateOr(translate, column.comment(), column.comment())));
                comment.setAuthor("System");
                cell.setCellComment(comment);
            }
        }
    }

    static void writeCell(Cell cell, ColumnDef column, Object value, ExcelStyles styles,
                          Function<String, String> translate,
                          Map<String, Map<String, ReferenceItem>> referenceByCode) {
        if (value == null) {
            return;
        }
        boolean currency = column.currency();

        if (value instanceof Enum<?> enumValue) {
            writeText(cell, ExcelColumn.enumText(enumValue, translate), column, styles);
        } else if (value instanceof Integer || value instanceof Long || value instanceof Short
                || value instanceof Byte || value instanceof BigInteger) {
            cell.setCellValue(((Number) value).doubleValue());
            cell.setCellStyle(currency ? styles.currency : styles.number);
        } else if (value instanceof Number number) {
            cell.setCellValue(value instanceof BigDecimal bd ? bd.doubleValue() : number.doubleValue());
            cell.setCellStyle(currency ? styles.currency : styles.decimal);
        } else if (value instanceof LocalDate date) {
            cell.setCellValue(date);
            cell.setCellStyle(styles.date);
        } else if (value instanceof LocalDateTime dateTime) {
            cell.setCellValue(dateTime);
            cell.setCellStyle(styles.dateTime);
        } else if (value instanceof Instant instant) {
            cell.setCellValue(LocalDateTime.ofInstant(instant, ZoneId.systemDefault()));
            cell.setCellStyle(styles.dateTime);
        } else if (value instanceof OffsetDateTime odt) {
            cell.setCellValue(odt.atZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime());
            cell.setCellStyle(styles.dateTime);
        } else if (value instanceof ZonedDateTime zdt) {
            cell.setCellValue(zdt.withZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime());
            cell.setCellStyle(styles.dateTime);
        } else if (value instanceof Date date) {
            cell.setCellValue(date);
            cell.setCellStyle(styles.dateTime);
        } else if (value instanceof LocalTime time) {
            cell.setCellValue(time.toString());
        } else if (value instanceof Boolean bool) {
            cell.setCellValue(bool ? "Có" : "Không");
        } else if (value instanceof Collection<?> list) {
            writeText(cell, list.stream().map(String::valueOf).collect(Collectors.joining(", ")), column, styles);
        } else {
            String text = value.toString();
            String key = column.dropdownKey();
            if (key != null && !column.isMultiValue()) {
                ReferenceItem item = referenceByCode.getOrDefault(key, Map.of()).get(ReferenceItem.extractCode(text));
                if (item != null) {
                    text = item.display();
                }
            }
            writeText(cell, text, column, styles);
        }
    }

    /** Chữ bắt đầu bằng = + - @ (hoặc tab/CR) được đánh dấu quote-prefix để Excel không chạy như công thức. */
    static void writeText(Cell cell, String text, ColumnDef column, ExcelStyles styles) {
        cell.setCellValue(text);
        if (needsQuote(text)) {
            cell.setCellStyle(styles.quoted);
        } else if (column.textFormat()) {
            cell.setCellStyle(styles.text);
        }
    }

    static boolean needsQuote(String text) {
        if (text == null || text.isEmpty()) {
            return false;
        }
        char first = text.charAt(0);
        return first == '=' || first == '+' || first == '-' || first == '@' || first == '\t' || first == '\r';
    }

    static Map<String, Map<String, ReferenceItem>> indexReferences(Map<String, List<ReferenceItem>> references) {
        Map<String, Map<String, ReferenceItem>> result = new HashMap<>();
        if (references == null) {
            return result;
        }
        references.forEach((key, items) -> {
            Map<String, ReferenceItem> byCode = new HashMap<>();
            for (ReferenceItem item : items) {
                if (item.code() != null) {
                    byCode.putIfAbsent(item.code(), item);
                }
            }
            result.put(key, byCode);
        });
        return result;
    }
}
