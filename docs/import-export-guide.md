# Hướng dẫn bổ sung Import / Export Excel

Tài liệu cho Claude Code thực hiện các hạng mục `IMP-*`, `EXP-*` trong `docs/api-backlog.md`.
Tuân thủ quy ước trong `CLAUDE.md` (ResponseData, BusinessException, CurrentUser, không base CRUD generic).

---

## 1. Phạm vi

| Mã | Chức năng | Service | Ghi dữ liệu |
|---|---|---|---|
| IMP-1 | Import sản phẩm theo danh mục (file mẫu có **cột động** theo `spec_schema` của danh mục) | catalog (Quarkus, Mongo) | Từng dòng độc lập |
| IMP-2 | Import phiếu nhập kho | inventory (Quarkus, Postgres) | Tất cả hoặc không gì (1 transaction) |
| EXP-1 | Export đơn hàng | ordering (WebFlux, R2DBC) | – |
| EXP-2 | Export sản phẩm theo danh mục, **cùng định dạng file mẫu IMP-1** (sửa xong import lại được bằng UPSERT) | catalog | – |
| EXP-3 | Export tồn kho | inventory | – |

Không làm import cho danh mục, thương hiệu, voucher, luật tương thích (ít dòng, nhập tay).

## 2. Đã có sẵn: module `common/shared-excel`

Engine Excel của thư viện `common-reactive` đã được **chuyển sẵn** vào `common/shared-excel` (Java thuần + Apache POI,
không phụ thuộc framework). Bảng đối chiếu nguồn gốc và cách dùng: `common/shared-excel/README.md`. **Dùng module này,
không viết engine mới.**

Đã có: đọc/ghi theo field DTO + `@ImportExportMapping` (kèm `header` tiếng Việt), chuyển kiểu ô (số, ngày nhiều định dạng,
boolean "có/không", enum, công thức), bỏ dòng trống, phát hiện mã trùng trong file, cột Text, định dạng tiền/ngày,
header `(*)` + comment, freeze pane, dropdown (sheet phụ + named range + data validation), dropdown dạng `Mã|Tên`
(`ReferenceItem`), `ExcelMessages.VI`, `ImportStore` + `TempDirImportStore`, unit test round-trip.

Lưu ý: base gốc cũng chưa từng được build. Việc đầu tiên là `mvn -pl common/shared-excel test` và sửa nếu lỗi.

Phần service của base (`BaseImportService`…) KHÔNG được chuyển; mỗi service tự viết import service theo mục 4–5.
Nếu cần đối chiếu logic gốc: mở Claude Code với `claude --add-dir <đường-dẫn>/common-reactive` (chỉ đọc, không copy thêm vào repo).

## 3. Phần cần bổ sung vào `shared-excel` (kèm unit test)

### 3.1 Cột động (cho file mẫu sản phẩm)

Engine hiện chỉ sinh cột từ field của DTO. Thêm khả năng **cột động** mà không phá API cũ, ví dụ:
- `ColumnDef` (record: `key`, `header`, `type`, `required`, `textFormat`, `currency`, `width`, `comment`, `dropdownKey`) và
  `ExcelSheetSpec` (tên sheet, `List<ColumnDef>`).
- `ExcelWriter.write(ExcelSheetSpec, List<Map<String,Object>> rows, Map<String, List<ReferenceItem>> refs, translate, validationRows)`.
- `ExcelReader.read(byte[], ExcelSheetSpec, translate)` → `List<MapImportRow>` (`MapImportRow extends BaseImportDTO`, có `Map<String,Object> values`).
- Có thể dựng `ExcelSheetSpec` từ DTO (cột cố định) rồi nối thêm cột động: dùng chung một đường code đọc/ghi.

### 3.2 Yêu cầu chức năng còn thiếu (ngoài cột động)

Phần đã có ở mục 2 giữ nguyên; bổ sung các ý dưới đây còn chưa có trong module.

**Đọc (`ExcelReader`):**
- Chỉ nhận `.xlsx`; file hỏng hoặc sai định dạng → lỗi `BAD_REQUEST` rõ ràng, không lỗi 500.
- Header ở dòng 1. Kiểm tra header khớp `ExcelSheetSpec` (bỏ qua dấu `(*)`, không phân biệt hoa thường): sai thì báo "File không đúng mẫu, hãy tải file mẫu mới".
- Bỏ dòng trống hoàn toàn. Vượt `maxRows` → từ chối cả file.
- Chuyển kiểu theo `ColumnType` (logic giống `ExcelReader` của base): số (ô số hoặc chữ "1 000"), ngày (ô ngày, `dd/MM/yyyy`, `yyyy-MM-dd`…), boolean (`có/không`, `x`, `1/0`, `true/false`), công thức (lấy giá trị đã tính). Số nguyên mà có phần lẻ → lỗi.
- Cột có dropdown: giá trị phải nằm trong danh sách (so sánh đã trim, không phân biệt hoa thường). Dropdown dạng `Mã | Tên` thì lấy phần mã.
- Lỗi ghi vào `RowData.errors` theo dạng `"<Tên cột>: <lý do>"`, KHÔNG ném exception giữa chừng: đọc hết file để báo đủ lỗi một lần.
- Bảo mật: đặt giới hạn chống zip bomb của POI (`ZipSecureFile.setMinInflateRatio(...)`, `setMaxEntrySize(...)`) và kiểm tra kích thước trước khi mở.

**Ghi (`ExcelWriter`, `ExcelResultWriter`):**
- Sheet dữ liệu: header in đậm nền xám, cột bắt buộc có `(*)`, comment trên header nếu `ColumnDef.comment` có giá trị; freeze dòng 1; độ rộng cột hợp lý.
- Cột `textFormat` (SKU, mã): định dạng Text để Excel không đổi `001` thành `1`. Tiền: `#,##0`. Ngày: `dd/MM/yyyy`.
- Dropdown: danh sách ghi ở sheet `_lists` (**ẩn** bằng `setSheetHidden`), named range + data validation cho tối đa `maxRows` dòng.
- File mẫu có **1 dòng ví dụ** và sheet `Hướng dẫn` (ý nghĩa từng cột, cột bắt buộc, giá trị cho phép, đơn vị: mm, W, GB, VND).
- **Chống CSV/formula injection khi export:** chuỗi bắt đầu bằng `=`, `+`, `-`, `@` thì thêm dấu `'` ở đầu, hoặc ghi dạng text.
- Export lớn (EXP-1): dùng `SXSSFWorkbook` (ghi theo luồng, giữ khoảng 100 dòng trong RAM), giới hạn `maxExportRows`.
- `ExcelResultWriter`: mở lại file người dùng đã upload, thêm cột cuối "Lỗi", tô nền đỏ nhạt các dòng sai, ghi nội dung lỗi.

**Test:** unit test round-trip ghi rồi đọc lại (mọi `ColumnType`, dropdown, dòng trống, header sai, số lẻ ở cột số nguyên, công thức).

## 4. Hợp đồng API (giống nhau ở mọi service)

```
GET  /api/v1/admin/<đối-tượng>/import/template[?category=CPU]     → file .xlsx mẫu
POST /api/v1/admin/<đối-tượng>/import/validate                     multipart: file, (category), mode → JSON
GET  /api/v1/admin/<đối-tượng>/import/{importId}/result-file       → file .xlsx gốc + cột "Lỗi"
POST /api/v1/admin/<đối-tượng>/import                              JSON {importId} → JSON
GET  /api/v1/admin/<đối-tượng>/export?<bộ lọc>                      → file .xlsx
```

Kết quả `validate` (bọc trong `ResponseData`):

```json
{
  "import_id": "a3f1...",
  "mode": "UPSERT",
  "total_rows": 120,
  "valid_rows": 117,
  "invalid_rows": 3,
  "errors": [ { "row": 14, "messages": ["Socket: LGA9999 không có trong danh sách", "Giá bán (*): bắt buộc"] } ],
  "preview": [ /* tối đa 20 dòng hợp lệ đầu tiên, để hiển thị cho admin xem */ ]
}
```

Kết quả `import`: `{ "total_rows", "created", "updated", "failed", "errors": [...] }`.

Quy tắc:
- `validate` lưu file vào `ImportStore` (local: thư mục tạm, TTL 1 giờ) cùng metadata (service, category, mode, userId). **Không ghi DB.**
- `import` chỉ nhận `importId` của chính user đó; **đọc lại file và kiểm tra lại từ đầu** (dữ liệu DB có thể đã đổi), rồi mới ghi. Xong thì xóa file tạm.
- `mode`: `CREATE_ONLY` (SKU đã tồn tại → lỗi dòng) hoặc `UPSERT` (cập nhật). Mặc định `CREATE_ONLY`.
- File tải về: header `Content-Disposition: attachment; filename="..."; filename*=UTF-8''<tên đã encode>` (tên có tiếng Việt), content type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
- Giới hạn kích thước 5 MB: kiểm tra ở service; giới hạn body của Quarkus (`quarkus.http.limits.max-body-size`) và gateway phải lớn hơn hoặc bằng.
- Lỗi cả file (sai mẫu, quá lớn, không phải xlsx) → `BusinessException(BAD_REQUEST, ...)`; lỗi từng dòng nằm trong `errors`, HTTP 200.

## 5. Chi tiết từng hạng mục

### IMP-1 / EXP-2: Sản phẩm (catalog-service, quyền `product:write`)

**Việc cần làm trước:** seed `categories` hiện CHƯA có `spec_schema`. Thêm changeSet Liquibase mới (không sửa changeSet cũ),
`updateMany` thêm `spec_schema` cho 8 danh mục. Mỗi phần tử: `{key, label, group: "specs"|"compat", type, required, unit, options[]}`.
Tối thiểu:

| Danh mục | `compat.*` (dùng cho rule engine, phần lớn bắt buộc) | `specs.*` (hiển thị) |
|---|---|---|
| CPU | socket (options), memory_types (nhiều giá trị, cách nhau dấu phẩy), tdp_w | cores, threads, base_clock_ghz, boost_clock_ghz, cache_mb |
| MAINBOARD | socket, memory_type, form_factor, ram_slots, m2_slots | chipset |
| RAM | memory_type, modules | capacity_gb, speed_mhz |
| GPU | length_mm, tdp_w, recommended_psu_w | vram_gb, memory_type |
| PSU | wattage, form_factor | efficiency, modular |
| CASE | supported_form_factors (nhiều giá trị), max_gpu_length_mm, max_cooler_height_mm | color |
| STORAGE | interface (options: SATA, NVMe), form_factor | capacity_gb, read_mbps |
| COOLER | supported_sockets (nhiều giá trị), height_mm, tdp_w | type (Air/AIO) |

**Cột của file mẫu** = cột cố định + cột động theo `spec_schema`:
- Cố định: `SKU (*)` (text), `Tên sản phẩm (*)`, `Thương hiệu (*)` (dropdown từ `brands` đang hoạt động), `Giá bán (*)` (tiền),
  `Giá gốc`, `Mô tả ngắn`, `Bảo hành (tháng)`, `Tags` (cách nhau dấu phẩy), `Trạng thái` (dropdown: Nháp/Đang bán; mặc định Nháp).
- Động: mỗi phần tử `spec_schema` thành một cột, header = `label` + đơn vị, dropdown nếu có `options`.
- File mẫu cho **một** danh mục (tham số `category`); sheet `Hướng dẫn` ghi tên danh mục và giải thích cột.

**Kiểm tra từng dòng:** SKU theo mẫu `^[A-Z0-9][A-Z0-9-]{2,49}$`; trùng SKU trong file; `CREATE_ONLY` mà SKU đã có → lỗi;
thương hiệu tồn tại và đang hoạt động; giá > 0 và giá gốc ≥ giá bán; cột bắt buộc của `spec_schema` có giá trị và đúng kiểu/options.
Sinh `slug` từ tên (bỏ dấu tiếng Việt), trùng thì thêm hậu tố.

**Ghi:** từng dòng độc lập (dòng lỗi không chặn dòng khác). `UPSERT` mà giá thay đổi → ghi thêm `price_histories`
(reason `IMPORT`). Ghi chú TODO bắn event `product.updated` cho ai-service (Đợt 2).

**EXP-2:** `GET /admin/products/export?category=&status=` dùng đúng `ExcelSheetSpec` của file mẫu, để admin sửa rồi import lại bằng `UPSERT`.

### IMP-2 / EXP-3: Nhập kho (inventory-service, quyền `inventory:write`)

- Cột (DTO + `@ExcelColumn`): `Mã kho (*)` (dropdown kho đang hoạt động), `SKU (*)` (text), `Số lượng nhập (*)` (số nguyên > 0), `Ghi chú`.
- Thêm tham số `referenceCode` (số phiếu nhập) ở form upload; ghi vào `stock_movements.reference_code`, `reference_type = IMPORT`.
- Kiểm tra SKU tồn tại bằng `POST /products/batch` của catalog (hạng mục CAT-5 phải có trước). Gọi một lần cho cả file, không gọi từng dòng.
- **Ghi trong MỘT transaction:** có dòng lỗi thì không ghi gì. Mỗi dòng: tăng `inventories.quantity` (tạo dòng tồn kho nếu chưa có),
  ghi `stock_movements` type 1 kèm `quantity_after`. Xung đột optimistic lock → báo lỗi, admin thử lại.
- EXP-3: `GET /admin/inventory/export?warehouseId=&lowStock=` (cột: kho, SKU, tồn, đang giữ, có thể bán, ngưỡng cảnh báo).

### EXP-1: Đơn hàng (ordering-service, role STAFF)

- `GET /admin/orders/export?status=&from=&to=` (cùng bộ lọc với `GET /admin/orders`), tối đa `maxExportRows`.
- Sheet 1 `Đơn hàng`: mã đơn, ngày đặt, khách (user id; tên lấy từ `receiver_name`), SĐT, địa chỉ, trạng thái (chữ tiếng Việt), thanh toán, tạm tính, giảm giá, phí ship, tổng.
- Sheet 2 `Chi tiết`: mã đơn, SKU, tên sản phẩm, đơn giá, số lượng, thành tiền.
- **WebFlux:** POI là thư viện chặn. Gom dữ liệu bằng R2DBC (reactive), rồi ghi file trong
  `Mono.fromCallable(...).subscribeOn(Schedulers.boundedElastic())`; trả `ResponseEntity<byte[]>` (hoặc `Resource`) với header ở mục 4.
  Không gọi `.block()` trong request.

## 6. Ghép vào framework

**Quarkus (catalog, inventory):**
- Upload: `@POST @Consumes(MediaType.MULTIPART_FORM_DATA)` + `@RestForm("file") FileUpload file`, `@RestForm String mode`; đọc bằng `Files.newInputStream(file.uploadedFile())`.
- Tải file: trả `Response.ok(bytes).type(XLSX).header("Content-Disposition", ...)`.
- Method import/export chạy trên worker thread (mặc định với kiểu trả về không reactive); thêm `@Blocking` cho rõ.
- `quarkus.http.limits.max-body-size` ≥ 6M.

**Spring WebFlux (ordering):**
- Chỉ export ở đợt này. Nếu sau này cần upload: `@RequestPart("file") FilePart` → `DataBufferUtils.join(file.content(), maxBytes)` → `byte[]`, rồi xử lý trên `boundedElastic`.

**Gateway:** hiện CHƯA có route cho `/api/v1/admin/products/**`, `/admin/inventory/**`, `/admin/orders/**` (chỉ có `/admin/users/**`).
Phải thêm vào `gateway/.../GatewayConfig.java` (hạng mục INF-3 trong backlog), không thì gọi qua cổng 8000 sẽ 404.

## 7. Postman

Thêm folder `Import / Export` trong collection:
- Request tải file mẫu và export: Postman → *Send and Download* (ghi chú trong description của request).
- Request `validate`: body `form-data`, key `file` kiểu File; test script lưu `import_id` vào biến `importId`.
- Request `import`: body `{"importId": "{{importId}}"}`.
- Đặt 2 file mẫu để test vào `postman/fixtures/`: một file hợp lệ, một file có lỗi cố ý (sai socket, thiếu giá, SKU trùng).

## 7b. Ghi chú khi triển khai (2026-10-27)

Đã làm xong theo guide; các chỗ code khác chữ trong guide:
- Lỗi từng dòng nằm ở `BaseImportDTO.getErrors()` (không có lớp `RowData`); annotation cột của DTO là `@ImportExportMapping`
  (`ExcelColumn` là record nội bộ của engine).
- `ExcelReader.read(byte[], ExcelSheetSpec, refs, translate)` nhận thêm `refs` để kiểm tra giá trị dropdown.
- `mode` dùng enum mới `ImportPolicy` (`CREATE_ONLY`/`UPSERT`); `ImportMode` cũ giữ nguyên.
- Dòng ví dụ của file mẫu nằm ở sheet `Hướng dẫn`, không ở sheet dữ liệu (tránh lỡ import thành dữ liệu thật).
- Liquibase MongoDB không có `updateMany`: changeSet `spec_schema` dùng `runCommand` lệnh `update`.
  Option STORAGE `form_factor` ghi `2.5 inch` (không dùng dấu `"`).
- EXP-3 dùng role STAFF/ADMIN (theo backlog). IMP-2 không nhận SKU còn Nháp (CAT-5 bỏ DRAFT).
- Fixture Postman ở `docs/postman/fixtures/`. Chi tiết API: `docs/api-changelog.md`.

## 8. Thứ tự làm

1. `common/shared-excel` + unit test.
2. Changeset `spec_schema` cho categories → IMP-1 → EXP-2.
3. CAT-5 (`/products/batch`) nếu chưa có → IMP-2 → EXP-3.
4. EXP-1.
5. Cập nhật `docs/api-backlog.md`, `docs/api-changelog.md`, collection Postman.
