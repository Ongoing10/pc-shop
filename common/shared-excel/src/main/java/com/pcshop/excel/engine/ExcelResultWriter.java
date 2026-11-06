package com.pcshop.excel.engine;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * File kết quả import: mở lại đúng file người dùng đã upload, thêm cột cuối "Lỗi",
 * tô nền đỏ nhạt các dòng sai và ghi nội dung lỗi (mỗi lỗi một dòng trong ô).
 */
public final class ExcelResultWriter {

    public static final String ERROR_HEADER = "Lỗi";

    private static final byte[] LIGHT_RED = {(byte) 0xFF, (byte) 0xC7, (byte) 0xCE};

    static {
        ExcelReader.ExcelSecurity.init();
    }

    private ExcelResultWriter() {
    }

    /**
     * @param original    file .xlsx gốc
     * @param errorsByRow chỉ số dòng trong sheet (0 là tiêu đề, giống {@code BaseImportDTO.getRow()}) -> các lỗi
     */
    public static byte[] withErrors(byte[] original, Map<Integer, List<String>> errorsByRow) {
        try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(original));
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.getSheetAt(0);
            ExcelStyles styles = new ExcelStyles(wb);
            Row header = sheet.getRow(0) != null ? sheet.getRow(0) : sheet.createRow(0);
            int errorColumn = errorColumn(header);

            Cell headerCell = header.createCell(errorColumn);
            headerCell.setCellValue(ERROR_HEADER);
            headerCell.setCellStyle(styles.header);
            sheet.setColumnWidth(errorColumn, 256 * 60);

            CellStyle errorStyle = wb.createCellStyle();
            errorStyle.cloneStyleFrom(styles.wrap);
            fillRed(errorStyle, wb);
            Map<Integer, CellStyle> redByStyle = new HashMap<>();

            for (Map.Entry<Integer, List<String>> entry : errorsByRow.entrySet()) {
                if (entry.getValue() == null || entry.getValue().isEmpty() || entry.getKey() < 1) {
                    continue;
                }
                Row row = sheet.getRow(entry.getKey()) != null ? sheet.getRow(entry.getKey()) : sheet.createRow(entry.getKey());
                for (int i = 0; i < errorColumn; i++) {
                    Cell cell = row.getCell(i) != null ? row.getCell(i) : row.createCell(i);
                    CellStyle base = cell.getCellStyle();
                    cell.setCellStyle(redByStyle.computeIfAbsent((int) base.getIndex(), k -> {
                        CellStyle red = wb.createCellStyle();
                        red.cloneStyleFrom(base);
                        fillRed(red, wb);
                        return red;
                    }));
                }
                Cell errorCell = row.createCell(errorColumn);
                errorCell.setCellValue(String.join("\n", entry.getValue()));
                errorCell.setCellStyle(errorStyle);
            }
            wb.setActiveSheet(0);
            wb.write(out);
            return out.toByteArray();
        } catch (IOException | RuntimeException ex) {
            throw new ExcelReader.InvalidExcelFileException(ex);
        }
    }

    /** Cột ngay sau cột cuối của tiêu đề; nếu file đã có cột "Lỗi" (upload lại file kết quả) thì ghi đè cột đó. */
    private static int errorColumn(Row header) {
        int last = Math.max(header.getLastCellNum(), 0);
        if (last > 0) {
            Cell lastCell = header.getCell(last - 1);
            if (lastCell != null && ERROR_HEADER.equalsIgnoreCase(lastCell.toString().trim())) {
                return last - 1;
            }
        }
        return last;
    }

    private static void fillRed(CellStyle style, XSSFWorkbook wb) {
        ((org.apache.poi.xssf.usermodel.XSSFCellStyle) style)
                .setFillForegroundColor(new XSSFColor(LIGHT_RED, wb.getStylesSource().getIndexedColors()));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
    }
}
