# shared-excel

Engine import/export Excel dùng chung cho catalog, inventory (Quarkus) và ordering (WebFlux).
Java thuần + Apache POI, không phụ thuộc framework. Chạy được song song (không giữ state).

## Nguồn gốc

Chuyển từ package `excel` của thư viện `common-reactive`:

| File ở đây | Từ base | Thay đổi |
|---|---|---|
| `engine/ExcelReader`, `ExcelWriter`, `ExcelColumn`, `ExcelStyles` | `excel/engine/*` | Đổi package; tên cột dùng `ExcelColumn.header()` |
| `annotation/ImportExportMapping`, `ExcelEnum` | `excel/annotation/*` | Thêm thuộc tính `header` (tên cột tiếng Việt) |
| `dto/BaseImportDTO`, `ImportMode` | `excel/dto/*` | Đổi package |
| `reference/ReferenceItem` | `excel/reference/ReferenceItem` | Đổi package |
| `util/Reflections` | `util/Reflections` | Đổi package |
| `store/ImportStore`, `TempDirImportStore` | `excel/store/*` | Viết lại bản đồng bộ (bỏ Reactor/Lombok), giữ logic |
| `ExcelMessages` | – | Mới: dịch mã lỗi của engine sang tiếng Việt |
| test `ExcelRoundTripTest` | test cùng tên | Bỏ Lombok; thêm test `header()`, `ExcelMessages`, `ImportStore` |

**Không chuyển:** `BaseImportService`, `BaseExportService`, `ExcelServiceSupport`, `ImportContext`, `ExcelReferences`,
`ReferenceSource`, `ValidateImportFileDTO`, `ResultImportFileDTO` (gắn Spring/Reactor/i18n của base). Mỗi service tự viết
import service; định dạng response theo `docs/import-export-guide.md` mục 4.

> Base gốc cũng **chưa từng được build** (ghi trong README của nó), nên module này vẫn phải build và chạy test:
> `mvn -pl common/shared-excel test`.

## Dùng nhanh

```java
public class StockLineImport extends BaseImportDTO {
    @ImportExportMapping(header = "Mã kho", required = true, key = "Warehouse")
    private String warehouse;                       // dropdown "Mã|Tên" lấy từ references.get("Warehouse")
    @ImportExportMapping(header = "Mã SKU", required = true, isTextColumn = true, isCodeField = true)
    private String sku;
    @ImportExportMapping(header = "Số lượng nhập", required = true)
    private Integer quantity;
    @ImportExportMapping(header = "Ghi chú")
    private String note;
    public StockLineImport() { }
    // getter...
}

byte[] template = ExcelWriter.write(StockLineImport.class, List.of(), references, ExcelMessages.VI, 2000);
List<StockLineImport> rows = ExcelReader.read(bytes, StockLineImport.class, 1, ExcelMessages.VI);
rows.stream().filter(r -> !r.getIsValid())...    // lỗi định dạng ô + mã trùng trong file đã nằm ở errorMessage
// Kiểm tra với DB (SKU có tồn tại, kho đang hoạt động...) do service tự làm, rồi r.addError("...")
```

## Cột động (`ExcelSheetSpec`)

Lõi đọc/ghi làm việc trên `ExcelSheetSpec` (danh sách `ColumnDef`) và `Map<String, Object>`; hàm theo DTO ở trên chỉ dựng
spec từ lớp DTO rồi đi chung đường (chữ ký cũ giữ nguyên).

```java
ExcelSheetSpec spec = ExcelSheetSpec.of("CPU", List.of(
        ColumnDef.text("sku", "SKU").asRequired().asText().asCode(),
        ColumnDef.decimal("price", "Giá bán").asRequired().asCurrency(),
        ColumnDef.of("compat.socket", "Socket", ColumnType.STRING).asRequired().dropdown("compat.socket"),
        ColumnDef.of("compat.memory_types", "Chuẩn RAM", ColumnType.STRING_LIST).dropdown("ram")))
        .withMaxRows(1000);
// hoặc: ExcelSheetSpec.of(MyDto.class, ExcelMessages.VI).withColumns(cộtĐộng)

byte[] template = ExcelWriter.writeTemplate(spec, refs, ExcelMessages.VI, new ExcelGuide("Mẫu ...", notes, exampleRow));
List<MapImportRow> rows = ExcelReader.read(bytes, spec, refs, ExcelMessages.VI);   // refs: dropdownKey -> danh sách
byte[] result = ExcelResultWriter.withErrors(bytes, ImportResults.errorsByRow(rows)); // thêm cột "Lỗi"
try (var w = new ExcelStreamWriter(ExcelMessages.VI)) { w.sheet(spec1, rows1).sheet(spec2, rows2); w.toBytes(); } // SXSSF
```

Engine lo phần định dạng: header khớp mẫu (bỏ `(*)`, không phân biệt hoa thường; cột thừa ở cuối được bỏ qua), bắt buộc,
kiểu ô (số nguyên có phần lẻ là lỗi, ngày STRICT: `31/02` là lỗi), giá trị dropdown (trả về mã chuẩn), mã trùng trong file,
quá `maxRows`/5 MB/không phải xlsx (`ExcelFileException`, service đổi sang 400). Lỗi dòng: `getErrors()` dạng `"<cột>: <lý do>"`.
Ghi: sheet dropdown `_lists` ẩn, chuỗi bắt đầu `= + - @` được quote-prefix (chống formula injection).

Thêm: `ImportPolicy` (`CREATE_ONLY`/`UPSERT`), `ImportStore.save(content, meta)`/`loadMeta` (người upload, loại import...),
DTO response `ImportResults`, `ExcelHttp.contentDisposition` (tên file tiếng Việt). Test: `ExcelSheetSpecTest`.

Hành vi cũ đổi nhẹ: cột `required` giờ báo lỗi khi trống (trước chỉ thêm `(*)`); boolean ghi ra "Có/Không";
sheet dropdown đổi tên `Unit` → `_lists` và bị ẩn.
