# Checklist giao diện khách hàng (nexus-pc)

Đối chiếu ngày 2026-11-07: API backend hiện có (code các service) × giao diện `nexus-pc/` × danh sách màn K01–K11 trong
`docs/ui/design-brief.md`. Đánh `[x]` khi xong và đã chạy với backend thật (profile `local`, qua gateway `:8000`).

## 1. Hiện trạng tóm tắt

**Backend:** Đợt 0–1 của `docs/api-backlog.md` đã xong và test newman. Còn thiếu (Đợt 2): `POST /orders`, thanh toán
(`/payments/**`, VNPay), event Kafka, thông báo realtime. AI có `POST /ai/chat` (chưa stream), `GET /ai/search`.

**Frontend nexus-pc:** React 19 + Vite + antd + react-query, 17 route, i18n vi/en. **Toàn bộ dữ liệu đang là mock:**

- `productService` đọc `mockData.ts`; `orderService` và `authService` ghi localStorage (tài khoản giả, OTP giả `889922`).
- Giỏ hàng, yêu thích, so sánh nằm trong Context + localStorage.
- `axiosClient` có sẵn nhưng chưa trang nào gọi; chưa có `keycloak-js`; field `requiresAuth` của route khai nhưng không dùng.
- Kiểu `Product` của FE dùng `id`, `category`, `specs: string[]`, `stock`; API thật dùng `sku`, `categoryCode`,
  `specs`/`compat` dạng object, tồn kho ở API riêng (xem `docs/ui/api-types.ts`).

## 2. Đối chiếu màn hình (role khách hàng)

Ký hiệu: ✅ có · 🟡 có nhưng thiếu ý/chỉ mock · ❌ chưa có

| Màn | UI | API backend | Thiếu ở UI |
|---|---|---|---|
| K01 Trang chủ `/` | ✅ | ✅ (`/categories`, `/brands`, `/products`) | Dải "nổi bật/khuyến mãi" chưa có API công khai tương ứng |
| K02 Danh sách + lọc `/products`, `/components` | 🟡 | ✅ (`/products`, `/search`, `/facets`) | Lọc compat (socket, DDR, form factor), `minPrice`, phân trang server, badge còn hàng |
| K03 Chi tiết `/product/:id` | 🟡 | ✅ | Tab đánh giá + thống kê sao, viết đánh giá, lịch sử giá, thông số theo `specSchema`, chip compat, nút "Thêm vào PC Builder", trạng thái hết hàng |
| K04 PC Builder `/builder` | 🟡 | ✅ (`/compatibility/check`, `/pc-builds`) | Kiểm tra tương thích thật + danh sách lỗi, công suất ước tính, lọc linh kiện theo slot đã chọn, số lượng/slot, lưu, chia sẻ |
| K05 Giỏ hàng `/cart` + drawer | 🟡 | ✅ (`/cart`, guest key, merge) | Cảnh báo `purchasable=false`, xóa hết, kiểm tra tương thích của giỏ |
| K06 Thanh toán `/checkout` | 🟡 | 🟡 thiếu `POST /orders` | Chọn từ sổ địa chỉ, tỉnh/phường thật, ô voucher, tổng từ `checkout/preview`, khóa nút khi `canPlaceOrder=false` |
| K07 Đơn của tôi `/account/orders` | 🟡 | ✅ (`/orders/my`, `/{code}`, `/timeline`, `/cancel`) | Trang chi tiết đơn, timeline, hủy đơn có lý do, viết đánh giá món đã nhận |
| K08 Tài khoản `/account` | 🟡 | ✅ (`/me`, `/addresses`, `/pc-builds/my`) | Sổ địa chỉ đang hardcode (cần CRUD + mặc định), tab cấu hình PC đã lưu |
| K09 Chat AI | ❌ | ✅ (`POST /ai/chat`) | Toàn bộ widget |
| K10 Thông báo | ❌ | ✅ (`/notifications`, `unread-count`, `read`, `read-all`) | Chuông ở header + dropdown/trang danh sách |
| K11 Cấu hình chia sẻ `/build/:code` | ❌ | ✅ (`GET /pc-builds/{code}`) | Toàn bộ trang |
| Đặt hàng thành công | ✅ (trong Checkout) | ❌ chờ `POST /orders` | Hiển thị theo dữ liệu `Order` thật |
| Tra cứu đơn `/track-order` | ✅ | ⚠️ `GET /orders/{code}` chỉ owner | Khách vãng lai không tra được (xem quyết định D3) |
| Đăng nhập/Đăng ký/Quên/Đổi mật khẩu | ✅ form tự làm | Keycloak | Xung đột hướng làm, xem D1 |
| So sánh `/compare` | ✅ | (làm ở client, lấy dữ liệu qua `/products/batch`) | Đổi nguồn dữ liệu |
| Yêu thích | 🟡 nút tim, chưa có trang | ❌ không có API | Xem D4 |
| Giới thiệu `/about`, Chính sách `/policy`, 404 | ✅ | không cần | – |

**Kết luận:** khung giao diện cho khách đã có ~80% số màn, nhưng chưa màn nào nối API thật. Còn thiếu hẳn 3 màn
(Chat AI, Thông báo, Cấu hình chia sẻ) và 2 phần lớn trong màn có sẵn (chi tiết đơn + timeline, sổ địa chỉ).

## 3. Quyết định cần chốt trước khi code

- [ ] **D1. Đăng nhập:** (a) chuyển sang trang Keycloak (`keycloak-js` + PKCE, đúng `frontend-context.md`), bỏ/ẩn các form
      Auth tự làm; hay (b) giữ form đẹp hiện tại, cần làm theme Keycloak hoặc bật Direct Access Grant (kém an toàn hơn).
      Đề xuất (a), vòng sau mới làm theme Keycloak cho đồng bộ giao diện.
- [ ] **D2. Đặt hàng khi chưa có `POST /orders`:** làm nốt UI Checkout tới bước `checkout/preview`, nút "Đặt hàng" tạm gọi mock;
      hay ưu tiên làm Saga đặt hàng (việc số 2 trong CLAUDE.md) trước.
- [x] **D3. Tra cứu đơn cho khách vãng lai:** đã chốt gộp vào "Đơn hàng của tôi" (`/account/orders`, có ô tìm theo mã).
      `/track-order` chỉ còn chuyển hướng: có `?code=` thì sang chi tiết đơn, không có thì sang danh sách.
- [x] **D4. Yêu thích:** đã chốt lưu localStorage, không cần API. Trang `/favorites` dùng được cả khi chưa đăng nhập.
- [ ] **D5. Thẻ sản phẩm trong chat AI:** FE dò SKU trong `answer` (làm được ngay) hay sửa `ChatResponse` trả `products[]` (design-brief Q3).

## 4. Tiến độ giao diện (dữ liệu mock, CHƯA ghép API)

Cập nhật 2026-11-07. Mọi dữ liệu nằm trong `src/services/api/*Service.ts`, lưu localStorage, có sẵn dữ liệu mẫu.
Mỗi service ghi chú API thật tương ứng; khi ghép chỉ cần thay thân hàm, giữ kiểu trả về. Chat AI (K09) để sau.

- [x] Khu tài khoản tách route, dùng chung `AccountShell` (menu trái, chặn khi chưa đăng nhập, đếm thông báo chưa đọc):
      `/account` (tổng quan + hồ sơ), `/account/orders`, `/account/orders/:code`, `/account/addresses`,
      `/account/builds`, `/account/notifications`, `/account/security`.
- [x] K07 Đơn của tôi: lọc theo trạng thái, tìm theo mã. Chi tiết đơn: thanh tiến trình, người nhận, thanh toán, món, voucher,
      timeline, hủy đơn có lý do (chỉ khi chờ xác nhận), mua lại, viết đánh giá món đã giao.
- [x] K08 Sổ địa chỉ: thêm/sửa/xóa, đặt mặc định, tỉnh → phường 2 cấp, kiểm tra số điện thoại. Cấu hình đã lưu: chọn nhiều để xóa,
      chép link, mở lại trong Builder.
- [x] K10 Thông báo: chuông ở header (5 thông báo mới nhất, đọc tất cả) + trang danh sách lọc tất cả/chưa đọc.
- [x] K11 Cấu hình chia sẻ `/build/:code` (mẫu: `/build/GAMING2K`): kiểm tra tương thích, thêm cả cấu hình vào giỏ, sao chép vào Builder.
- [x] K04 PC Builder: kiểm tra tương thích tất định mô phỏng rule engine (socket, chuẩn RAM, tản nhiệt, case, công suất nguồn),
      thanh tải nguồn, đánh dấu linh kiện không khớp trong ngăn chọn, số lượng RAM/SSD, lưu/cập nhật/lưu bản mới, chép link.
- [x] K03 Chi tiết sản phẩm: chip thông số tương thích, hết hàng/sắp hết, thêm vào PC Builder, bảng thông số, lịch sử giá
      (biểu đồ bậc thang + bảng), đánh giá (điểm, phân bố sao lọc được, phản hồi của shop, viết/xóa đánh giá của mình).
- [x] K05 Giỏ hàng: cảnh báo hết hàng/vượt tồn kho (khóa nút thanh toán), xóa tất cả, phí ship, kiểm tra tương thích của giỏ.
- [x] K06 Thanh toán: bắt đăng nhập, chọn từ sổ địa chỉ/thêm nhanh, voucher (gợi ý + áp mã + lý do lỗi), phí ship,
      COD; VNPay hiện "Sắp có". Đặt hàng xong mở chi tiết đơn.
- [x] Yêu thích `/favorites`, nút tim có đếm ở header, thêm tất cả vào giỏ.
- [x] Trang đăng nhập nhận `?redirect=` (chỉ đường dẫn nội bộ) để quay lại trang trước.
- [ ] K09 Widget chat AI (để sau theo yêu cầu).
- [ ] Ghép API thật: giai đoạn 0–1 bên dưới.

## 5. Checklist việc cần làm

### Giai đoạn 0: Nền tảng kết nối API

- [ ] `.env`: `VITE_API_BASE_URL=http://localhost:8000/api/v1`; giữ cổng dev 3000 (Keycloak + CORS gateway chỉ nhận cổng này).
- [ ] `axiosClient`: bóc `ResponseData {error_status, error_message, error_code, data}`, chuẩn hóa lỗi (hiện `error_message`),
      xử lý 401 (gọi đăng nhập lại), 403, 404; kiểu `PageResponse`.
- [ ] Đưa `docs/ui/api-types.ts` vào `nexus-pc/src/types/` làm nguồn kiểu chính; viết hàm map sang kiểu UI nếu cần
      (`id`→`sku`, `category`→`categoryCode`, `specs` object, tồn kho tách riêng).
- [ ] Biến cờ `VITE_USE_MOCK` để còn chạy được giao diện khi backend tắt (giữ `mockData.ts` cho chế độ này).
- [ ] Keycloak (theo D1): `keycloak-js` 26.x, `check-sso` + PKCE, `updateToken(30)` trước mỗi request, đăng xuất.
- [ ] Sau đăng nhập lần đầu: gọi `GET /me` (tạo hồ sơ) rồi `POST /cart/merge` với `X-Guest-Key`, xóa guest key.
- [ ] Route guard dùng `requiresAuth`: `/checkout`, `/account/**`, thông báo → chuyển đăng nhập kèm `redirectUri`.
- [ ] Phân biệt role: user có `STAFF`/`ADMIN` thì hiện lối vào `/admin` (để sau), còn lại là khách hàng.

### Giai đoạn 1: Nối API cho màn đã có

- [ ] **Danh mục, thương hiệu:** `useCategories` → `GET /categories`; menu header theo `sortOrder`; `GET /brands`.
- [ ] **K02 Danh sách:** `GET /products` với `category, brand, minPrice, maxPrice, socket, memoryType, formFactor, sort, page, size`;
      bộ lọc từ `GET /products/facets`; tìm kiếm header → `GET /products/search?q=`; phân trang server; còn hàng qua `POST /inventory/batch`.
- [ ] **K02 trạng thái:** rỗng, đang tải (skeleton có sẵn), chip bộ lọc đang áp dụng, bottom sheet mobile.
- [ ] **K03 Chi tiết:** `GET /products/{sku}` + `GET /categories/{code}` (nhãn, đơn vị theo `specSchema`) + `GET /inventory/{sku}`.
- [ ] **K03 Lịch sử giá:** `GET /products/{sku}/price-history` (biểu đồ bậc thang).
- [ ] **K03 Đánh giá:** `GET /reviews/stats?productId=`, `GET /reviews?productId=` (kèm `adminReply`), form viết `POST /reviews`
      (chưa đăng nhập → nút dẫn đi đăng nhập), sửa/xóa đánh giá của mình khi còn PENDING (`PUT`/`DELETE /reviews/{id}`).
- [ ] **K03 Hết hàng:** `inStock=false` → tắt nút mua, ghi "Hết hàng".
- [ ] **K05 Giỏ hàng:** thay `CartContext` localStorage bằng `GET/POST/PUT/DELETE /cart...`; khách vãng lai gửi `X-Guest-Key`
      (sinh UUID lưu localStorage); hiện `warnings`, `purchasable=false` + `message`; nút xóa hết (`DELETE /cart`).
- [ ] **K05 Kiểm tra tương thích của giỏ:** `POST /compatibility/check` với SKU trong giỏ.
- [ ] **K04 PC Builder:** kiểm tra `POST /compatibility/check` mỗi lần đổi slot → hiện `issues` theo `severity` + `estimatedWattage`
      so với `compat.wattage` của PSU; modal chọn linh kiện lọc theo compat đã chọn (vd CPU AM5 → mainboard `socket=AM5`);
      số lượng/slot; "Thêm cả cấu hình vào giỏ" dùng `POST /cart/items/bulk` thay vòng lặp.
- [ ] **K04 Lưu/chia sẻ:** `POST /pc-builds` (bắt đăng nhập), `PUT /pc-builds/{code}`, bật `isPublic` + nút copy link.
- [ ] **K06 Thanh toán:** chọn địa chỉ từ `GET /addresses`, thêm nhanh với `GET /locations/provinces` + `/wards`;
      gợi ý voucher `GET /vouchers`, áp mã `POST /vouchers/validate` (hiện `reason` khi lỗi);
      tổng tiền từ `POST /checkout/preview`; tắt nút khi `canPlaceOrder=false`; VNPay hiện "sắp có".
- [ ] **K07 Đơn của tôi:** danh sách `GET /orders/my` (mã, ngày, trạng thái, tổng); nhãn trạng thái tiếng Việt theo mã số.
- [ ] **K08 Hồ sơ:** `GET /me`, `PUT /me` (chỉ `phoneNumber`, `gender`, `birthDate`); tên/email/mật khẩu mở trang tài khoản Keycloak.
- [ ] **K08 Sổ địa chỉ:** CRUD `/addresses`, `PATCH /addresses/{id}/default`, validate số điện thoại `0xxxxxxxxx`, trạng thái rỗng.
- [ ] **Tra cứu đơn:** làm theo D3.
- [ ] **So sánh:** lấy dữ liệu qua `POST /products/batch`, so theo `specSchema` của danh mục.
- [ ] **Auth pages:** làm theo D1 (nếu chọn Keycloak: đổi nút đăng nhập/đăng ký/quên mật khẩu sang `keycloak.login/register`,
      gỡ `authService` mock khỏi luồng thật).

### Giai đoạn 2: Màn còn thiếu

- [ ] **K07 Chi tiết đơn** `/account/orders/:code`: `GET /orders/{code}` (người nhận, địa chỉ, món, giảm giá, phí ship, `cancelReason`)
      + timeline `GET /orders/{code}/timeline`.
- [ ] **K07 Hủy đơn:** modal nhập lý do, `POST /orders/{code}/cancel`, chỉ hiện khi trạng thái chờ xác nhận/chờ thanh toán.
- [ ] **K07 Đánh giá món đã nhận:** nút "Viết đánh giá" trên từng món của đơn đã giao.
- [ ] **K08 Cấu hình PC đã lưu:** tab trong tài khoản, `GET /pc-builds/my`, mở lại vào Builder, xóa (`DELETE` / `POST /pc-builds/bulk-delete`).
- [ ] **K10 Thông báo:** chuông header với `GET /notifications/unread-count` (poll định kỳ), dropdown/trang danh sách
      `GET /notifications`, `PATCH /{id}/read`, `PATCH /read-all`.
- [ ] **K11 Cấu hình chia sẻ** `/build/:code`: `GET /pc-builds/{code}`, nút "Sao chép vào Builder của tôi", "Thêm vào giỏ".
- [ ] **K09 Chat AI:** nút nổi + panel (mobile toàn màn hình), `POST /ai/chat {sessionId, message}`, câu hỏi gợi ý, đang trả lời,
      lỗi; thẻ sản phẩm theo D5 với giá/tồn kho lấy từ `products/batch` + `inventory/batch`.
- [ ] **Trang yêu thích** (nếu giữ theo D4): danh sách sản phẩm đã tim.

### Giai đoạn 3: Phụ thuộc backend chưa có

- [ ] `POST /orders` (Saga giữ hàng) → nối nút "Đặt hàng" + màn đặt hàng thành công với `Order` thật.
- [ ] Thanh toán VNPay: `POST /payments/{orderCode}`, trang return `/payments/vnpay/return`.
- [ ] Chat stream SSE (việc số 4) → đổi widget sang hiện chữ dần.
- [ ] Thông báo realtime (WebSocket/SSE) thay cho poll.
- [ ] (Tùy D3, D4, D5) API tra cứu đơn công khai, wishlist, `products[]` trong ChatResponse.
- [ ] (Tùy chọn) API "bán chạy/nổi bật" công khai cho trang chủ.

### Giai đoạn 4: Hoàn thiện

- [ ] Kiểm tra đủ trạng thái của từng màn theo design-brief (rỗng, đang tải, lỗi, hết hàng, voucher lỗi…).
- [ ] Responsive 390px cho K01–K11.
- [ ] Rà i18n: chuỗi mới có cả `vi.json` và `en.json`; thông báo lỗi từ API hiện nguyên `error_message` tiếng Việt.
- [ ] Chạy thử trọn luồng với customer1: vào trang → lọc → chi tiết → Builder → giỏ (khi chưa đăng nhập) → đăng nhập (merge giỏ)
      → thanh toán → đơn của tôi → hủy đơn → đánh giá.
