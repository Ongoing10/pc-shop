package com.pcshop.excel.engine;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.util.WorkbookUtil;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * Export lớn bằng {@link SXSSFWorkbook}: chỉ giữ khoảng {@value #WINDOW} dòng trong RAM, phần còn lại ghi ra file tạm.
 * Không có dropdown (export chỉ để xem/lưu). Mỗi sheet giới hạn {@code spec.maxRows()} dòng.
 *
 * <pre>{@code
 * try (ExcelStreamWriter w = new ExcelStreamWriter(ExcelMessages.VI)) {
 *     w.sheet(orderSpec, orderRows);
 *     w.sheet(itemSpec, itemRows);
 *     return w.toBytes();
 * }
 * }</pre>
 */
public final class ExcelStreamWriter implements AutoCloseable {

    public static final int WINDOW = 100;

    private final SXSSFWorkbook wb = new SXSSFWorkbook(WINDOW);
    private final ExcelStyles styles = new ExcelStyles(wb);
    private final Function<String, String> translate;

    public ExcelStreamWriter(Function<String, String> translate) {
        this.translate = translate;
    }

    /** Thêm một sheet; {@code rows} được duyệt một lần (có thể là luồng dữ liệu lớn). */
    public ExcelStreamWriter sheet(ExcelSheetSpec spec, Iterable<Map<String, Object>> rows) {
        Sheet sheet = wb.createSheet(WorkbookUtil.createSafeSheetName(spec.sheetName()));
        List<ColumnDef> columns = spec.columns();
        CellWriter.writeHeader(sheet, columns, translate, styles);
        sheet.createFreezePane(0, 1);

        int rowIndex = 1;
        for (Map<String, Object> values : rows) {
            if (rowIndex > spec.maxRows()) {
                throw new ExcelFileException("Sheet " + spec.sheetName() + " vượt quá " + spec.maxRows()
                        + " dòng, hãy thu hẹp bộ lọc");
            }
            Row row = sheet.createRow(rowIndex++);
            for (int i = 0; i < columns.size(); i++) {
                ColumnDef column = columns.get(i);
                CellWriter.writeCell(row.createCell(i), column, values.get(column.key()), styles, translate, Map.of());
            }
        }
        return this;
    }

    public byte[] toBytes() throws IOException {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            wb.write(out);
            return out.toByteArray();
        }
    }

    @Override
    public void close() throws IOException {
        wb.dispose();
        wb.close();
    }
}
