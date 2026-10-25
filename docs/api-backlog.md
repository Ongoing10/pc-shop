# Backlog API (trừ phần AI)

Danh sách API cần có theo plan. Claude Code đối chiếu với code hiện tại, đánh dấu `[x]` khi đã có và chạy được.
Mọi đường dẫn bắt đầu bằng `/api/v1`, đi qua gateway `:8000`. Quy ước code: xem `CLAUDE.md`.

Ký hiệu quyền: `public` = không cần đăng nhập · `user` = đăng nhập · `owner` = chỉ chủ dữ liệu (hoặc STAFF/ADMIN) ·
`ADMIN`/`STAFF` = realm role · `perm:x` = client role `x` của `pcshop-backend`.

**"Xóa" theo quy tắc vòng đời** (plan mục 4): bảng có `is_active` → `PATCH .../active` (không có DELETE);
bảng có `status` → chuyển trạng thái; đơn hàng/thanh toán → không bao giờ xóa; dữ liệu cá nhân có snapshot → `DELETE` xóa thật.

---

## Đợt 0: Hạ tầng API (làm trước)

- [ ] **INF-1** Swagger UI cho mọi service: Spring `springdoc-openapi-starter-webflux-ui` (`/swagger-ui.html`), Quarkus `quarkus-smallrye-openapi` (`/q/swagger-ui`). Khai báo security scheme Bearer JWT.
- [ ] **INF-2** Gateway gắn header `X-Request-Id` nếu request chưa có; các service ghi giá trị này vào log.

## Đợt 1: CRUD và nghiệp vụ không cần Kafka

### customer-service
- [ ] **CUS-1** `GET /addresses` (user) · `POST /addresses` · `PUT /addresses/{id}` · `DELETE /addresses/{id}` (xóa thật) · `PATCH /addresses/{id}/default`. Chỉ thao tác địa chỉ của chính mình; một user tối đa 1 địa chỉ mặc định.
- [ ] **CUS-2** `POST /admin/users` (ADMIN): tạo tài khoản nhân viên trong Keycloak + gán role.
- [ ] **CUS-3** `PUT /admin/users/{id}/roles` (ADMIN): đổi realm role / client role qua Keycloak Admin API.
- [ ] **CUS-4** `GET /locations/provinces`, `GET /locations/provinces/{code}/wards` (public): danh mục hành chính 2 cấp, dữ liệu seed tĩnh (file JSON trong resources là đủ).

### catalog-service
- [ ] **CAT-1** Danh mục: `GET /categories/{code}` (public) · `POST /admin/categories` · `PUT /admin/categories/{code}` · `PATCH /admin/categories/{code}/active` (perm:product:write).
- [ ] **CAT-2** Thương hiệu: `GET /brands` · `GET /brands/{code}` (public) · `POST/PUT/PATCH active` dưới `/admin/brands` (perm:product:write).
- [ ] **CAT-3** Sản phẩm admin (perm:product:write): `GET /admin/products?status=&category=&q=&page=&size=` (thấy cả DRAFT/HIDDEN) · `POST /admin/products` · `PUT /admin/products/{sku}` · `PATCH /admin/products/{sku}/status` · `PATCH /admin/products/{sku}/price` (ghi thêm `price_histories`). Đổi trạng thái sang HIDDEN/DISCONTINUED: TODO bắn event `product.hidden` (ghi chú trong code, chưa cần Kafka).
- [ ] **CAT-4** Lọc và tìm sản phẩm (public): mở rộng `GET /products` với `brand`, `minPrice`, `maxPrice`, `sort` (`price,asc`…), và lọc thông số tương thích (`socket`, `memoryType`, `formFactor` → trường `compat.*`). Thêm `GET /products/search?q=` (text index Mongo) và `GET /products/facets?category=` (giá trị cho bộ lọc).
- [ ] **CAT-5** `POST /products/batch` (public; body danh sách SKU, tối đa 100): API nội bộ cho cart/ordering, tránh N+1.
- [ ] **CAT-6** `GET /products/{sku}/price-history` (public).
- [ ] **CAT-7** Luật tương thích (perm:product:write): `GET /admin/compatibility-rules` · `POST` · `PUT /{code}` · `PATCH /{code}/active`.
- [ ] **CAT-8** `POST /compatibility/check` (public): body danh sách SKU → kết quả rule engine TẤT ĐỊNH đọc `compatibility_rules` + `products.compat`: `{compatible, issues:[{ruleCode, severity, message}], estimatedWattage}`.
- [ ] **CAT-9** Cấu hình PC: `GET /pc-builds/my` (user) · `GET /pc-builds/{code}` (owner hoặc `is_public`) · `POST /pc-builds` · `PUT /pc-builds/{code}` · `DELETE /pc-builds/{code}` (xóa thật, owner). Lưu kèm kết quả `compatibility/check`.

### cart-service
- [ ] **CRT-1** `PUT /cart/items/{sku}` (đặt số lượng; 0 = xóa) · `DELETE /cart` (xóa hết).
- [ ] **CRT-2** `GET /cart` trả kèm tên, giá hiện tại, còn hàng (gọi `catalog /products/batch` + `inventory`), và tổng tiền tạm tính.
- [ ] **CRT-3** Giỏ khách vãng lai: header `X-Guest-Key`, key `cart:guest:{guestKey}`, TTL 30 ngày · `POST /cart/merge` (user, gộp giỏ guest vào giỏ tài khoản rồi xóa giỏ guest).

### ordering-service
- [ ] **ORD-1** Voucher admin (ADMIN): `GET /admin/vouchers` (cả ngừng hoạt động) · `PUT /admin/vouchers/{id}` · `PATCH /admin/vouchers/{id}/active`. Giữ optimistic lock (`version`).
- [ ] **ORD-2** `POST /vouchers/validate` (user): body `{code, subtotal, categories[]}` → hợp lệ không, số tiền giảm, lý do nếu không hợp lệ (hết hạn, chưa đủ đơn tối thiểu, hết lượt, user đã dùng).
- [ ] **ORD-3** `POST /checkout/preview` (user): từ giỏ hàng (gọi cart) + mã voucher + địa chỉ → giá hiện tại, giảm giá, phí ship (quy tắc đơn giản, cấu hình được), tổng, cảnh báo hết hàng. KHÔNG tạo đơn.
- [ ] **ORD-4** Đơn hàng admin (STAFF): `GET /admin/orders?status=&from=&to=&q=&page=&size=` · `PATCH /admin/orders/{code}/status` (perm:order:update-status; kiểm tra chuyển trạng thái hợp lệ; ghi `order_status_histories` cùng transaction).
- [ ] **ORD-5** `GET /orders/{code}/timeline` (owner).
- [ ] **ORD-6** `POST /orders/{code}/cancel` (owner, chỉ khi PENDING/AWAITING_PAYMENT) → CANCELLED + lý do + lịch sử. Nhả hàng: TODO event `order.cancelled` (đợt 2).

### inventory-service
- [ ] **INV-1** Kho (ADMIN): `GET /warehouses` · `POST /admin/warehouses` · `PUT /admin/warehouses/{id}` · `PATCH /admin/warehouses/{id}/active`.
- [ ] **INV-2** `GET /admin/inventory?warehouseId=&lowStock=true&page=&size=` (STAFF).
- [ ] **INV-3** `POST /admin/inventory/import` (perm:inventory:write): nhập kho nhiều dòng; tạo dòng tồn kho nếu chưa có; ghi `stock_movements`. Sửa luôn `PUT /inventory/{sku}/adjust` hiện có để ghi `stock_movements`.
- [ ] **INV-4** `GET /admin/inventory/movements?sku=&from=&to=` (STAFF).
- [ ] **INV-5** `POST /inventory/batch` (public; danh sách SKU → tồn kho): API nội bộ cho cart/checkout.

### review-service
- [ ] **REV-1** `PUT /reviews/{id}` (owner, chỉ khi PENDING) · `DELETE /reviews/{id}` (owner → status DELETED_BY_USER).
- [ ] **REV-2** Kiểm duyệt (STAFF): `GET /admin/reviews?status=PENDING` · `PATCH /admin/reviews/{id}/approve` · `PATCH /admin/reviews/{id}/reject` · `POST /admin/reviews/{id}/reply`.
- [ ] **REV-3** `GET /reviews/stats?productId=` (public): điểm trung bình, số lượt, phân bố 1–5 sao (chỉ APPROVED).

### media-service
- [ ] **MED-1** `DELETE /media/files/{id}` (người upload hoặc ADMIN; xóa thật bản ghi + file).

### notification-service
- [ ] **NOT-1** Lưu thông báo vào MongoDB (collection `notifications`, TTL 90 ngày): `GET /notifications?page=&size=` · `GET /notifications/unread-count` · `PATCH /notifications/{id}/read` · `PATCH /notifications/read-all`.

### Thống kê (đặt ở service sở hữu dữ liệu)
- [ ] **STA-1** ordering: `GET /admin/stats/overview?from=&to=` (doanh thu, số đơn, đơn theo trạng thái) · `GET /admin/stats/top-products?from=&to=&limit=` (từ `order_items`).
- [ ] **STA-2** inventory: `GET /admin/stats/low-stock`.

## Đợt 2: cần Kafka/Saga hoặc dịch vụ ngoài (làm riêng, KHÔNG trong đợt này)

- [ ] `POST /orders` (tạo đơn + outbox + Saga giữ hàng) · `POST /payments/{orderCode}` · `GET /payments/vnpay/ipn` · `GET /payments/vnpay/return`
- [ ] Event `product.updated` / `product.hidden` / `order.cancelled`; thông báo realtime (WebSocket/SSE)
- [ ] Rate limit `/ai/**` ở gateway

## Ngoài phạm vi đợt này
- Toàn bộ API của ai-service.
