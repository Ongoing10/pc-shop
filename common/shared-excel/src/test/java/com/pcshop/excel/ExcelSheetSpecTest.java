package com.pcshop.excel;

import com.pcshop.excel.dto.ImportResults;
import com.pcshop.excel.dto.MapImportRow;
import com.pcshop.excel.engine.ColumnDef;
import com.pcshop.excel.engine.ColumnType;
import com.pcshop.excel.engine.ExcelFileException;
import com.pcshop.excel.engine.ExcelGuide;
import com.pcshop.excel.engine.ExcelReader;
import com.pcshop.excel.engine.ExcelResultWriter;
import com.pcshop.excel.engine.ExcelSheetSpec;
import com.pcshop.excel.engine.ExcelStreamWriter;
import com.pcshop.excel.engine.ExcelWriter;
import com.pcshop.excel.reference.ReferenceItem;
import com.pcshop.excel.store.TempDirImportStore;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Cột động (ExcelSheetSpec) và các chức năng bổ sung theo docs/import-export-guide.md mục 3. */
class ExcelSheetSpecTest {

    private static final ExcelSheetSpec SPEC = ExcelSheetSpec.of("Sản phẩm", List.of(
            ColumnDef.text("sku", "SKU").asRequired().asText().asCode(),
            ColumnDef.text("name", "Tên sản phẩm").asRequired(),
            ColumnDef.decimal("price", "Giá bán").asRequired().asCurrency(),
            ColumnDef.integer("tdp", "TDP (W)"),
            ColumnDef.of("socket", "Socket", ColumnType.STRING).dropdown("socket"),
            ColumnDef.of("memory", "Chuẩn RAM", ColumnType.STRING_LIST).dropdown("memory"),
            ColumnDef.of("released", "Ngày ra mắt", ColumnType.DATE),
            ColumnDef.of("updated", "Cập nhật", ColumnType.DATE_TIME),
            ColumnDef.of("oc", "Ép xung", ColumnType.BOOLEAN),
            ColumnDef.of("sold", "Đã bán", ColumnType.LONG),
            ColumnDef.text("brand", "Thương hiệu").dropdown("brand")));

    private static final Map<String, List<ReferenceItem>> REFS = Map.of(
            "socket", items("LGA1700", "AM5"),
            "memory", items("DDR4", "DDR5"),
            "brand", List.of(new ReferenceItem(1L, "INTEL", "Intel"), new ReferenceItem(2L, "AMD", "AMD")));

    private static List<ReferenceItem> items(String... codes) {
        List<ReferenceItem> result = new ArrayList<>();
        for (String code : codes) {
            result.add(new ReferenceItem(null, code, null));
        }
        return result;
    }

    private static Map<String, Object> fullRow() {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("sku", "001-CPU");
        row.put("name", "Intel Core i5");
        row.put("price", new BigDecimal("7990000"));
        row.put("tdp", 125);
        row.put("socket", "LGA1700");
        row.put("memory", List.of("DDR4", "DDR5"));
        row.put("released", LocalDate.of(2024, 1, 8));
        row.put("updated", LocalDateTime.of(2026, 10, 27, 9, 30));
        row.put("oc", true);
        row.put("sold", 12345678901L);
        row.put("brand", "INTEL");
        return row;
    }

    @Test
    void roundTripEveryColumnType() throws Exception {
        byte[] file = ExcelWriter.write(SPEC, List.of(fullRow()), REFS, ExcelMessages.VI, 10);
        List<MapImportRow> rows = ExcelReader.read(file, SPEC, REFS, ExcelMessages.VI);

        assertThat(rows).hasSize(1);
        MapImportRow row = rows.getFirst();
        assertThat(row.getErrors()).isEmpty();
        assertThat(row.getRow()).isEqualTo(1);
        assertThat(row.getString("sku")).isEqualTo("001-CPU");
        assertThat(row.getDecimal("price")).isEqualByComparingTo("7990000");
        assertThat(row.getInteger("tdp")).isEqualTo(125);
        assertThat(row.getString("socket")).isEqualTo("LGA1700");
        assertThat(row.getList("memory")).containsExactly("DDR4", "DDR5");
        assertThat(row.get("released")).isEqualTo(LocalDate.of(2024, 1, 8));
        assertThat(row.get("updated")).isEqualTo(LocalDateTime.of(2026, 10, 27, 9, 30));
        assertThat(row.getBoolean("oc")).isTrue();
        assertThat(row.getLong("sold")).isEqualTo(12345678901L);
        // ghi "INTEL|Intel" (Mã|Tên), đọc ra mã
        assertThat(row.getString("brand")).isEqualTo("INTEL");
    }

    @Test
    void dropdownIsCaseInsensitiveAndRejectsUnknownValues() throws Exception {
        byte[] file = edit(template(), sheet -> {
            Row r1 = sheet.createRow(1);
            r1.createCell(0).setCellValue("A-1");
            r1.createCell(1).setCellValue("CPU");
            r1.createCell(2).setCellValue(1000);
            r1.createCell(4).setCellValue("lga1700");
            r1.createCell(5).setCellValue("ddr5 , DDR4");
            r1.createCell(10).setCellValue("amd");
            Row r2 = sheet.createRow(2);
            r2.createCell(0).setCellValue("A-2");
            r2.createCell(1).setCellValue("CPU");
            r2.createCell(2).setCellValue(1000);
            r2.createCell(4).setCellValue("LGA9999");
            r2.createCell(5).setCellValue("DDR5, DDR9");
        });

        List<MapImportRow> rows = ExcelReader.read(file, SPEC, REFS, ExcelMessages.VI);
        assertThat(rows.get(0).getErrors()).isEmpty();
        assertThat(rows.get(0).getString("socket")).isEqualTo("LGA1700");
        assertThat(rows.get(0).getList("memory")).containsExactly("DDR5", "DDR4");
        assertThat(rows.get(0).getString("brand")).isEqualTo("AMD");
        assertThat(rows.get(1).getErrors()).containsExactly(
                "Socket: LGA9999 không có trong danh sách",
                "Chuẩn RAM: DDR9 không có trong danh sách");
    }

    @Test
    void requiredBlankRowsDuplicatesFractionsAndFormulas() throws Exception {
        byte[] file = edit(template(), sheet -> {
            Row r1 = sheet.createRow(1);
            r1.createCell(0).setCellValue("X-1");
            r1.createCell(1).setCellValue("A");
            r1.createCell(2).setCellFormula("1000*2");
            r1.createCell(3).setCellValue("1 000");
            // dòng 2 trống hoàn toàn, dòng 3 chỉ có ô rỗng: bỏ qua
            sheet.createRow(3).createCell(1).setCellValue("   ");
            Row r4 = sheet.createRow(4);
            r4.createCell(0).setCellValue("x-1");
            r4.createCell(3).setCellValue(12.5);
            r4.createCell(8).setCellValue("có lẽ");
            r4.createCell(6).setCellValue("31/02/2024");
        });

        List<MapImportRow> rows = ExcelReader.read(file, SPEC, REFS, ExcelMessages.VI);
        assertThat(rows).hasSize(2);
        assertThat(rows.get(0).getErrors()).isEmpty();
        assertThat(rows.get(0).getDecimal("price")).isEqualByComparingTo("2000");
        assertThat(rows.get(0).getInteger("tdp")).isEqualTo(1000);

        MapImportRow bad = rows.get(1);
        assertThat(bad.getRow()).isEqualTo(4);
        assertThat(bad.getErrors()).containsExactlyInAnyOrder(
                "Tên sản phẩm: bắt buộc",
                "Giá bán: bắt buộc",
                "TDP (W): phải là số nguyên",
                "Ngày ra mắt: ngày giờ không hợp lệ (dùng dd/MM/yyyy)",
                "Ép xung: chỉ nhận có/không",
                "SKU: trùng mã với một dòng phía trên trong file");
    }

    @Test
    void wrongHeaderRejectsWholeFile() throws Exception {
        byte[] file = edit(template(), sheet -> sheet.getRow(0).getCell(1).setCellValue("Tên"));
        assertThatThrownBy(() -> ExcelReader.read(file, SPEC, REFS, ExcelMessages.VI))
                .isInstanceOf(ExcelFileException.class)
                .hasMessageContaining("File không đúng mẫu");

        // dấu (*), hoa thường và cột thừa ở cuối (vd cột "Lỗi" của file kết quả) vẫn hợp lệ
        byte[] ok = edit(template(), sheet -> {
            sheet.getRow(0).getCell(1).setCellValue("TÊN SẢN PHẨM");
            sheet.getRow(0).createCell(20).setCellValue("Lỗi");
        });
        assertThat(ExcelReader.read(ok, SPEC, REFS, ExcelMessages.VI)).isEmpty();
    }

    @Test
    void tooManyRowsAndNonXlsxAreRejected() throws Exception {
        ExcelSheetSpec small = SPEC.withMaxRows(2);
        List<Map<String, Object>> three = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            Map<String, Object> row = fullRow();
            row.put("sku", "S-" + i);
            three.add(row);
        }
        byte[] file = ExcelWriter.write(SPEC, three, REFS, ExcelMessages.VI, 10);
        assertThatThrownBy(() -> ExcelReader.read(file, small, REFS, ExcelMessages.VI))
                .isInstanceOf(ExcelFileException.class)
                .hasMessageContaining("quá 2 dòng");

        assertThatThrownBy(() -> ExcelReader.read("sku,name\n1,a".getBytes(), SPEC, REFS, ExcelMessages.VI))
                .isInstanceOf(ExcelReader.InvalidExcelFileException.class)
                .hasMessageContaining(".xlsx");
        assertThatThrownBy(() -> ExcelReader.read(new byte[ExcelReader.DEFAULT_MAX_BYTES + 1], SPEC, REFS, ExcelMessages.VI))
                .isInstanceOf(ExcelFileException.class)
                .hasMessageContaining("MB");
    }

    @Test
    void templateHasHiddenListsGuideSheetAndRequiredMarks() throws Exception {
        ExcelGuide guide = new ExcelGuide("Mẫu nhập sản phẩm - CPU", List.of("Giá đơn vị VND"), fullRow());
        byte[] file = ExcelWriter.writeTemplate(SPEC, REFS, ExcelMessages.VI, guide);
        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(file))) {
            Sheet data = wb.getSheetAt(0);
            assertThat(data.getSheetName()).isEqualTo("Sản phẩm");
            assertThat(data.getLastRowNum()).isZero();
            assertThat(data.getRow(0).getCell(0).getStringCellValue()).isEqualTo("SKU (*)");
            assertThat(data.getRow(0).getCell(3).getStringCellValue()).isEqualTo("TDP (W)");
            assertThat(data.getDataValidations()).hasSize(3);

            Sheet lists = wb.getSheet(ExcelWriter.LIST_SHEET);
            assertThat(lists).isNotNull();
            assertThat(wb.isSheetHidden(wb.getSheetIndex(lists))).isTrue();

            Sheet guideSheet = wb.getSheet(ExcelGuide.SHEET_NAME);
            assertThat(guideSheet.getRow(0).getCell(0).getStringCellValue()).isEqualTo("Mẫu nhập sản phẩm - CPU");
            assertThat(text(guideSheet)).contains("LGA1700, AM5", "DDR4, DDR5", "001-CPU");
        }
    }

    @Test
    void exportGuardsAgainstFormulaInjection() throws Exception {
        Map<String, Object> row = fullRow();
        row.put("name", "=HYPERLINK(\"http://x\",\"bấm\")");
        byte[] file = ExcelWriter.write(SPEC, List.of(row), REFS, ExcelMessages.VI, 10);
        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(file))) {
            Cell cell = wb.getSheetAt(0).getRow(1).getCell(1);
            assertThat(cell.getCellType()).isEqualTo(org.apache.poi.ss.usermodel.CellType.STRING);
            assertThat(cell.getCellStyle().getQuotePrefixed()).isTrue();
        }
        assertThat(ExcelReader.read(file, SPEC, REFS, ExcelMessages.VI).getFirst().getString("name"))
                .isEqualTo("=HYPERLINK(\"http://x\",\"bấm\")");
    }

    @Test
    void resultFileAddsErrorColumn() throws Exception {
        byte[] file = ExcelWriter.write(SPEC, List.of(fullRow(), fullRow()), REFS, ExcelMessages.VI, 10);
        List<MapImportRow> rows = ExcelReader.read(file, SPEC, REFS, ExcelMessages.VI);
        assertThat(rows.get(1).getIsValid()).isFalse();

        byte[] result = ExcelResultWriter.withErrors(file, ImportResults.errorsByRow(rows));
        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(result))) {
            Sheet sheet = wb.getSheetAt(0);
            int errorColumn = SPEC.columns().size();
            assertThat(sheet.getRow(0).getCell(errorColumn).getStringCellValue()).isEqualTo("Lỗi");
            assertThat(sheet.getRow(1).getCell(errorColumn)).isNull();
            assertThat(sheet.getRow(2).getCell(errorColumn).getStringCellValue()).contains("trùng mã");
            assertThat(sheet.getRow(2).getCell(0).getCellStyle().getFillPattern())
                    .isEqualTo(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);
        }
        // file kết quả upload lại vẫn đọc được (cột "Lỗi" ở cuối bị bỏ qua)
        assertThat(ExcelReader.read(result, SPEC, REFS, ExcelMessages.VI)).hasSize(2);
        assertThat(ImportResults.errors(rows)).singleElement()
                .satisfies(e -> assertThat(e.row()).isEqualTo(3));
    }

    @Test
    void streamWriterWritesSeveralSheetsAndEnforcesLimit() throws Exception {
        ExcelSheetSpec orders = ExcelSheetSpec.of("Đơn hàng", List.of(
                ColumnDef.text("code", "Mã đơn"), ColumnDef.decimal("total", "Tổng").asCurrency()));
        ExcelSheetSpec items = ExcelSheetSpec.of("Chi tiết", List.of(ColumnDef.text("code", "Mã đơn")));
        List<Map<String, Object>> orderRows = new ArrayList<>();
        for (int i = 0; i < 500; i++) {
            orderRows.add(Map.of("code", "DH" + i, "total", new BigDecimal("1000")));
        }

        byte[] file;
        try (ExcelStreamWriter writer = new ExcelStreamWriter(ExcelMessages.VI)) {
            file = writer.sheet(orders, orderRows).sheet(items, List.of(Map.of("code", "DH0"))).toBytes();
        }
        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(file))) {
            assertThat(wb.getNumberOfSheets()).isEqualTo(2);
            assertThat(wb.getSheetAt(0).getLastRowNum()).isEqualTo(500);
            assertThat(wb.getSheetAt(1).getSheetName()).isEqualTo("Chi tiết");
        }

        try (ExcelStreamWriter writer = new ExcelStreamWriter(ExcelMessages.VI)) {
            assertThatThrownBy(() -> writer.sheet(orders.withMaxRows(10), orderRows))
                    .isInstanceOf(ExcelFileException.class);
        }
    }

    @Test
    void importStoreKeepsMetadata(@TempDir Path dir) {
        TempDirImportStore store = new TempDirImportStore(dir, Duration.ofHours(1));
        UUID id = store.save(new byte[]{1}, Map.of("userId", "u-1", "kind", "product", "category", "CPU"));
        assertThat(store.loadMeta(id)).hasValueSatisfying(meta -> assertThat(meta)
                .containsEntry("userId", "u-1").containsEntry("category", "CPU"));
        store.delete(id);
        assertThat(store.loadMeta(id)).isEmpty();
    }

    @Test
    void contentDispositionKeepsVietnameseName() {
        assertThat(ExcelHttp.contentDisposition("Đơn hàng 2026.xlsx"))
                .isEqualTo("attachment; filename=\"Don_hang_2026.xlsx\"; "
                        + "filename*=UTF-8''%C4%90%C6%A1n%20h%C3%A0ng%202026.xlsx");
    }

    // ------------------------------------------------------------------ helpers

    private static byte[] template() throws Exception {
        return ExcelWriter.write(SPEC, List.of(), REFS, ExcelMessages.VI, 10);
    }

    private static byte[] edit(byte[] file, Consumer<Sheet> change) throws Exception {
        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(file)); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            change.accept(wb.getSheetAt(0));
            wb.write(out);
            return out.toByteArray();
        }
    }

    private static String text(Sheet sheet) {
        StringBuilder sb = new StringBuilder();
        for (Row row : sheet) {
            for (Cell cell : row) {
                sb.append(cell.toString()).append(' ');
            }
        }
        return sb.toString();
    }
}
