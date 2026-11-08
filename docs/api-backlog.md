# Backlog API (trừ phần AI)

Danh sách API cần có theo plan. Claude Code đối chiếu với code hiện tại, đánh dấu `[x]` khi đã có và chạy được.
Mọi đường dẫn bắt đầu bằng `/api/v1`, đi qua gateway `:8000`. Quy ước code: xem `CLAUDE.md`.

> **Kiểm thử 2026-11-07** (sau đợt sửa lỗi đánh giá backend, `docs/api-changelog.md`): 9 service profile `local`, newman
> folder 0–8 và 10: 177 request, 493 assertion, 0 lỗi. Unit test mới: catalog 7, ordering 8.
>
> **Kiểm thử 2026-10-27:** chạy cả 10 service profile `local`, `newman` với `docs/postman` (folder 0–8, bỏ AI):
> 143 request, 402 assertion, 0 lỗi, chạy lặp lại vẫn qua. Đã đánh `[x]` toàn bộ Đợt 0–1 trừ Import/Export (chưa làm).
> INF-1/INF-2 kiểm tra riêng (Swagger 8 service, `X-Request-Id` tới log). Lệnh chạy: README mục 6.
>
> **Trạng thái 2026-10-25:** đã viết code cho toàn bộ Đợt 0 và Đợt 1, `mvn clean install` qua; **chưa chạy thử API nào**,
> nên chưa đánh `[x]`. Lệch so với mô tả bên dưới:
>
> - `POST /vouchers` (tạo voucher) chuyển sang `POST /admin/vouchers`.
> - `GET /warehouses` mở cho STAFF (cần để lọc tồn kho), thêm/sửa kho vẫn ADMIN.
> - Thêm ngoài backlog: `GET /admin/categories`, `GET /admin/brands` (thấy cả bản ghi đã ẩn), `GET /admin/products/{sku}`
>   (thấy cả DRAFT/HIDDEN), `GET /admin/orders/{code}` (kèm order_items).
> - Postman (`docs/postman`) có request cho mọi API trên.
> - Các API batch nhận body `{"skus": [...]}`. Giỏ hàng trả về giỏ đầy đủ sau mỗi thao tác.
> - CUS-4: dữ liệu hành chính là bản TẠM (đủ 34 tỉnh, phường/xã mẫu, mã phường tạm), xem `customer-service/src/main/resources/locations/`.
>
> **Bổ sung 2026-10-26:** thêm INF-3 (route admin ở gateway) và nhóm Import/Export (XLS-0, IMP-_, EXP-_) vào Đợt 1.
> Kiểm tra INF-3 trước khi test qua cổng 8000: các API `/admin/**` mới (trừ `/admin/users/**`) sẽ 404 nếu gateway chưa có route.

Ký hiệu quyền: `public` = không cần đăng nhập · `user` = đăng nhập · `owner` = chỉ chủ dữ liệu (hoặc STAFF/ADMIN) ·
`ADMIN`/`STAFF` = realm role · `perm:x` = client role `x` của `pcshop-backend`.

**"Xóa" theo quy tắc vòng đời** (plan mục 4): bảng có `is_active` → `PATCH .../active` (không có DELETE);
bảng có `status` → chuyển trạng thái; đơn hàng/thanh toán → không bao giờ xóa; dữ liệu cá nhân có snapshot → `DELETE` xóa thật.

---

## Đợt 0: Hạ tầng API (làm trước)

- [x] **INF-1** Swagger UI cho mọi service: Spring `springdoc-openapi-starter-webflux-ui` (`/swagger-ui.html`), Quarkus `quarkus-smallrye-openapi` (`/q/swagger-ui`). Khai báo security scheme Bearer JWT.
- [x] **INF-2** Gateway gắn header `X-Request-Id` nếu request chưa có; các service ghi giá trị này vào log.
- [x] **INF-3** Gateway: thêm route cho các đường dẫn mới (khung ban đầu chỉ có `/admin/users/**`). Route cụ thể đặt trước route chung:
      `/admin/products/**`, `/admin/categories/**`, `/admin/brands/**`, `/admin/compatibility-rules/**` → catalog;
      `/admin/inventory/**`, `/admin/warehouses/**`, `/admin/stats/low-stock` → inventory;
      `/admin/orders/**`, `/admin/vouchers/**`, `/admin/stats/**` → ordering; `/admin/reviews/**` → review;
      `/locations/**`, `/addresses/**` → customer; `/checkout/**` → ordering.
      Kiểm tra bằng cách gọi một API admin của mỗi service qua `:8000` và so với gọi thẳng cổng service.

## Đợt 1: CRUD và nghiệp vụ không cần Kafka

### customer-service

- [x] **CUS-1** `GET /addresses` (user) · `POST /addresses` · `PUT /addresses/{id}` · `DELETE /addresses/{id}` (xóa thật) · `PATCH /addresses/{id}/default`. Chỉ thao tác địa chỉ của chính mình; một user tối đa 1 địa chỉ mặc định.
- [x] **CUS-2** `POST /admin/users` (ADMIN): tạo tài khoản nhân viên trong Keycloak + gán role.
- [x] **CUS-3** `PUT /admin/users/{id}/roles` (ADMIN): đổi realm role / client role qua Keycloak Admin API.
- [x] **CUS-4** `GET /locations/provinces`, `GET /locations/provinces/{code}/wards` (public): danh mục hành chính 2 cấp, dữ liệu seed tĩnh (file JSON trong resources là đủ).

### catalog-service

- [x] **CAT-1** Danh mục: `GET /categories/{code}` (public) · `POST /admin/categories` · `PUT /admin/categories/{code}` · `PATCH /admin/categories/{code}/active` (perm:product:write).
- [x] **CAT-2** Thương hiệu: `GET /brands` · `GET /brands/{code}` (public) · `POST/PUT/PATCH active` dưới `/admin/brands` (perm:product:write).
- [x] **CAT-3** Sản phẩm admin (perm:product:write): `GET /admin/products?status=&category=&q=&page=&size=` (thấy cả DRAFT/HIDDEN) · `POST /admin/products` · `PUT /admin/products/{sku}` · `PATCH /admin/products/{sku}/status` · `PATCH /admin/products/{sku}/price` (ghi thêm `price_histories`). Đổi trạng thái sang HIDDEN/DISCONTINUED: TODO bắn event `product.hidden` (ghi chú trong code, chưa cần Kafka).
- [x] **CAT-4** Lọc và tìm sản phẩm (public): mở rộng `GET /products` với `brand`, `minPrice`, `maxPrice`, `sort` (`price,asc`…), và lọc thông số tương thích (`socket`, `memoryType`, `formFactor` → trường `compat.*`). Thêm `GET /products/search?q=` (text index Mongo) và `GET /products/facets?category=` (giá trị cho bộ lọc).
- [x] **CAT-5** `POST /products/batch` (public; body danh sách SKU, tối đa 100): API nội bộ cho cart/ordering, tránh N+1.
- [x] **CAT-6** `GET /products/{sku}/price-history` (public).
- [x] **CAT-7** Luật tương thích (perm:product:write): `GET /admin/compatibility-rules` · `POST` · `PUT /{code}` · `PATCH /{code}/active`.
- [x] **CAT-8** `POST /compatibility/check` (public): body danh sách SKU → kết quả rule engine TẤT ĐỊNH đọc `compatibility_rules` + `products.compat`: `{compatible, issues:[{ruleCode, severity, message}], estimatedWattage}`.
- [x] **CAT-9** Cấu hình PC: `GET /pc-builds/my` (user) · `GET /pc-builds/{code}` (owner hoặc `is_public`) · `POST /pc-builds` · `PUT /pc-builds/{code}` · `DELETE /pc-builds/{code}` (xóa thật, owner). Lưu kèm kết quả `compatibility/check`.

### cart-service

- [x] **CRT-1** `PUT /cart/items/{sku}` (đặt số lượng; 0 = xóa) · `DELETE /cart` (xóa hết).
- [x] **CRT-2** `GET /cart` trả kèm tên, giá hiện tại, còn hàng (gọi `catalog /products/batch` + `inventory`), và tổng tiền tạm tính.
- [x] **CRT-3** Giỏ khách vãng lai: header `X-Guest-Key`, key `cart:guest:{guestKey}`, TTL 30 ngày · `POST /cart/merge` (user, gộp giỏ guest vào giỏ tài khoản rồi xóa giỏ guest).

### ordering-service

- [x] **ORD-1** Voucher admin (ADMIN): `GET /admin/vouchers` (cả ngừng hoạt động) · `PUT /admin/vouchers/{id}` · `PATCH /admin/vouchers/{id}/active`. Giữ optimistic lock (`version`).
- [x] **ORD-2** `POST /vouchers/validate` (user): body `{code, subtotal, categories[]}` → hợp lệ không, số tiền giảm, lý do nếu không hợp lệ (hết hạn, chưa đủ đơn tối thiểu, hết lượt, user đã dùng).
- [x] **ORD-3** `POST /checkout/preview` (user): từ giỏ hàng (gọi cart) + mã voucher + địa chỉ → giá hiện tại, giảm giá, phí ship (quy tắc đơn giản, cấu hình được), tổng, cảnh báo hết hàng. KHÔNG tạo đơn.
- [x] **ORD-4** Đơn hàng admin (STAFF): `GET /admin/orders?status=&from=&to=&q=&page=&size=` · `PATCH /admin/orders/{code}/status` (perm:order:update-status; kiểm tra chuyển trạng thái hợp lệ; ghi `order_status_histories` cùng transaction).
- [x] **ORD-5** `GET /orders/{code}/timeline` (owner).
- [x] **ORD-6** `POST /orders/{code}/cancel` (owner, khi PENDING/AWAITING_PAYMENT/CONFIRMED và chưa thanh toán) → CANCELLED + lý do + lịch sử; event `order.cancelled` → inventory nhả hàng.

### inventory-service

- [x] **INV-1** Kho (ADMIN): `GET /warehouses` · `POST /admin/warehouses` · `PUT /admin/warehouses/{id}` · `PATCH /admin/warehouses/{id}/active`.
- [x] **INV-2** `GET /admin/inventory?warehouseId=&lowStock=true&page=&size=` (STAFF).
- [x] **INV-3** `POST /admin/inventory/import` (perm:inventory:write): nhập kho nhiều dòng; tạo dòng tồn kho nếu chưa có; ghi `stock_movements`. Sửa luôn `PUT /inventory/{sku}/adjust` hiện có để ghi `stock_movements`.
- [x] **INV-4** `GET /admin/inventory/movements?sku=&from=&to=` (STAFF).
- [x] **INV-5** `POST /inventory/batch` (public; danh sách SKU → tồn kho): API nội bộ cho cart/checkout.

### review-service

- [x] **REV-1** `PUT /reviews/{id}` (owner, chỉ khi PENDING) · `DELETE /reviews/{id}` (owner → status DELETED_BY_USER).
- [x] **REV-2** Kiểm duyệt (STAFF): `GET /admin/reviews?status=PENDING` · `PATCH /admin/reviews/{id}/approve` · `PATCH /admin/reviews/{id}/reject` · `POST /admin/reviews/{id}/reply`.
- [x] **REV-3** `GET /reviews/stats?productId=` (public): điểm trung bình, số lượt, phân bố 1–5 sao (chỉ APPROVED).

### media-service

- [x] **MED-1** `DELETE /media/files/{id}` (người upload hoặc ADMIN; xóa thật bản ghi + file).

### notification-service

- [x] **NOT-1** Lưu thông báo vào MongoDB (collection `notifications`, TTL 90 ngày): `GET /notifications?page=&size=` · `GET /notifications/unread-count` · `PATCH /notifications/{id}/read` · `PATCH /notifications/read-all`.

### Thống kê (đặt ở service sở hữu dữ liệu)

- [x] **STA-1** ordering: `GET /admin/stats/overview?from=&to=` (doanh thu, số đơn, đơn theo trạng thái) · `GET /admin/stats/top-products?from=&to=&limit=` (từ `order_items`).
- [x] **STA-2** inventory: `GET /admin/stats/low-stock`.

### Import / Export Excel (chi tiết thiết kế: `docs/import-export-guide.md`)

> **Kiểm thử 2026-10-27:** `mvn -pl common/shared-excel test` 15/15. Chạy bản mới của catalog/inventory/ordering ở cổng
> phụ (gọi thẳng service, CHƯA qua gateway :8000 và CHƯA chạy newman folder 10): 49 kiểm tra E2E cho IMP-1/EXP-2/IMP-2/EXP-3
> và kiểm tra tay EXP-1 đều qua. Thay đổi so với mô tả: xem `docs/api-changelog.md` mục 2026-10-27.

- [x] **XLS-0** Module `common/shared-excel` ĐÃ CÓ (chuyển từ engine của common-reactive): build + chạy test, rồi bổ sung cột động, kiểm tra header, sheet hướng dẫn, file kết quả có cột lỗi, giới hạn/bảo mật, SXSSF (guide mục 3).
- [x] **IMP-1** Sản phẩm (perm:product:write): `GET /admin/products/import/template?category=` · `POST /admin/products/import/validate` · `GET /admin/products/import/{importId}/result-file` · `POST /admin/products/import`. Cột động theo `spec_schema` của danh mục (cần changeSet bổ sung `spec_schema`).
- [x] **EXP-2** `GET /admin/products/export?category=&status=` (perm:product:write), cùng định dạng file mẫu IMP-1.
- [x] **IMP-2** Phiếu nhập kho (perm:inventory:write): template · validate · result-file · import dưới `/admin/inventory/import/...`. Một transaction; ghi `stock_movements`. Dùng lại logic ghi kho của INV-3 và `POST /products/batch` (CAT-5) để kiểm tra SKU.
      Lưu ý: INV-3 đã chiếm `POST /admin/inventory/import` (JSON) → đặt API Excel là `POST /admin/inventory/import/excel/validate` và `POST /admin/inventory/import/excel`, template `GET /admin/inventory/import/excel/template`.
- [x] **EXP-3** `GET /admin/inventory/export?warehouseId=&lowStock=` (STAFF).
- [x] **EXP-1** `GET /admin/orders/export?status=&from=&to=` (STAFF): 2 sheet Đơn hàng + Chi tiết, `SXSSFWorkbook`, chạy trên `boundedElastic`.

## Đợt 2: cần Kafka/Saga hoặc dịch vụ ngoài (làm riêng, KHÔNG trong đợt này)

- [x] `POST /orders` (tạo đơn + outbox + Saga giữ hàng, 2026-11-08)
- [x] `POST /payments/{orderCode}` · `GET /payments/vnpay/ipn` · `GET /payments/vnpay/return` · hoàn tiền `/admin/refunds` (2026-11-08; MoMo qua cổng giả lập)
- [x] Event `order.completed` / `order.returned` → catalog sold_count (2026-11-08)
- [x] Review → `rating_avg`/`rating_count` (event `review.stats-changed`); "đã mua hàng" cho review (`GET /orders/purchased`);
      notification sinh thông báo từ `order.status-changed`, `review.replied` (2026-11-08)
- [x] Thông báo realtime (SSE `/notifications/stream`) và email theo trạng thái đơn (Mailpit khi chạy local) (2026-11-08)
- [ ] Event `product.updated` / `product.hidden` (AI)
- [ ] Rate limit `/ai/**` ở gateway

## Ngoài phạm vi đợt này

- Toàn bộ API của ai-service.
