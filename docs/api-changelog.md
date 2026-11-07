# Thay đổi API

Ghi lại API mới hoặc thay đổi so với `docs/api-backlog.md` / tài liệu thiết kế, mới nhất ở trên.
Đường dẫn bắt đầu bằng `/api/v1`, đi qua gateway `:8000`.

## 2026-10-27: Import / Export Excel (XLS-0, IMP-1/2, EXP-1/2/3)

Thiết kế: `docs/import-export-guide.md`. Postman: folder `10. Import / Export (Excel)`, file mẫu ở `docs/postman/fixtures/`.

### API mới

| Mã | Request | Quyền |
|---|---|---|
| IMP-1 | `GET /admin/products/import/template?category=CPU` | perm:product:write |
| | `POST /admin/products/import/validate` (multipart: `file`, `category`, `mode` = `CREATE_ONLY` mặc định / `UPSERT`) | perm:product:write |
| | `GET /admin/products/import/{importId}/result-file` | perm:product:write |
| | `POST /admin/products/import` `{"importId": "..."}` | perm:product:write |
| EXP-2 | `GET /admin/products/export?category=CPU&status=` (`category` bắt buộc) | perm:product:write |
| IMP-2 | `GET /admin/inventory/import/excel/template` | perm:inventory:write |
| | `POST /admin/inventory/import/excel/validate` (multipart: `file`, `referenceCode` bắt buộc, ≤ 50 ký tự) | perm:inventory:write |
| | `GET /admin/inventory/import/excel/{importId}/result-file` | perm:inventory:write |
| | `POST /admin/inventory/import/excel` `{"importId": "..."}` | perm:inventory:write |
| EXP-3 | `GET /admin/inventory/export?warehouseId=&lowStock=` | STAFF, ADMIN |
| EXP-1 | `GET /admin/orders/export?status=&from=&to=&q=` | STAFF, ADMIN |

Kết quả `validate` và `import` dùng tên trường snake_case như guide mục 4 (`import_id`, `total_rows`, `valid_rows`,
`invalid_rows`, `errors[{row, messages}]`, `preview`; `created`, `updated`, `failed`). `row` là số dòng như Excel hiển thị.
`importId` chỉ người đã upload dùng được, giữ 1 giờ; import xong thì bị xóa (gọi lại → 404).
Lỗi cả file (không phải .xlsx, > 5 MB, sai mẫu, quá 1000 dòng, `mode` lạ) → 400; lỗi từng dòng nằm trong `errors`, HTTP 200.

### Thay đổi dữ liệu / API có sẵn

- `categories` có thêm `spec_schema` (changeSet `20261027-1000-categories-spec-schema`): `GET /categories`, `GET /categories/{code}`
  trả thêm trường `specSchema` `[{key, label, group: specs|compat, type, required, unit, options}]`.
  Chưa có API sửa `spec_schema`; danh mục tạo mới qua API sẽ không có cột động trong file Excel.
- ChangeSet `20261027-1001-fix-seed-storage-interface` (context `seed`): sản phẩm `STORAGE-KINGSTON-NV2-1T` đổi
  `compat.interface` `"M.2 NVMe"` → `"NVMe"`, thêm `compat.form_factor: "M.2 2280"` (khớp options của `spec_schema`).
- `InventoryService.importStock` (INV-3, `POST /admin/inventory/import`) giữ nguyên hành vi; logic ghi được tách để IMP-2 dùng lại.

### Hành vi cần biết

- **IMP-1:** ghi từng dòng độc lập. UPSERT giữ nguyên ảnh, mô tả chi tiết, slug, trạng thái và các thông số ngoài `spec_schema`;
  ô thông số để trống thì xóa thông số đó. Cột Trạng thái chỉ dùng khi tạo mới (Nháp/Đang bán, trống = Nháp).
  Đổi giá → `price_histories` reason `IMPORT`. Slug sinh từ tên, trùng thì thêm `-2`, `-3`.
- **IMP-2:** "tất cả hoặc không" (một transaction). SKU kiểm tra qua `POST /products/batch` theo lô 100, nên sản phẩm
  Nháp (DRAFT) không nhập kho qua Excel được. Một cặp (kho, SKU) chỉ được xuất hiện một lần trong file.
  `created` = số dòng tồn kho (SKU + kho) mới tạo, `updated` = số dòng được cộng thêm. Xung đột optimistic lock → 409, import lại.
- **EXP-1:** quá `pcshop.excel.max-export-rows` (10000) đơn → 400, yêu cầu thu hẹp bộ lọc (không cắt bớt).
- File tải về có `Content-Disposition: attachment; filename="..."; filename*=UTF-8''...` (tên tiếng Việt).
