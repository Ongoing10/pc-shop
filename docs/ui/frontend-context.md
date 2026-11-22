# PC Shop: bối cảnh để dựng frontend

Tài liệu này dành cho người (hoặc AI) dựng frontend mà **không đọc được mã nguồn backend**. Mọi thứ cần biết để làm
giao diện khách hàng và trang quản trị đều nằm ở đây và trong file đi kèm `docs/ui/api-types.ts`.

- **Nguồn:** đọc trực tiếp code các service (controller/resource, DTO, entity), realm Keycloak, dữ liệu seed, `docs/ui/design-brief.md`.
  Response mẫu ở mục f là **response thật**, gọi qua gateway `http://localhost:8000` bằng tài khoản test ngày 2026-10-27
  (mảng rút gọn còn 1–2 phần tử, đánh dấu `"...(+N)"` = còn N phần tử nữa bị lược).
- **Kiểu dữ liệu:** `docs/ui/api-types.ts` có interface cho mọi request/response ở mục f. Khi tài liệu này và file types
  khác nhau ở tên trường, **file types đúng** (đã kiểm tra bằng `tsc` với chính các response mẫu).
- **Ngôn ngữ:** giao diện 100% tiếng Việt. Định danh kỹ thuật (tên trường, tên API, mã trạng thái) giữ tiếng Anh.
- **Trạng thái backend:** đã có đủ API đọc/ghi cho sản phẩm, giỏ hàng, voucher, xem trước thanh toán, đơn hàng (xem, hủy,
  đổi trạng thái), đặt hàng (`POST /orders`, giữ hàng tự động qua Saga), tồn kho, review, thông báo, upload file,
  import/export Excel, chat AI, thanh toán online (VNPay; MoMo và môi trường chưa có khóa VNPay dùng trang thanh toán giả lập),
  hoàn tiền.

---

## a. Tổng quan sản phẩm

**PC Shop** là website bán linh kiện máy tính (CPU, mainboard, RAM, card đồ họa, ổ cứng, nguồn, vỏ case, tản nhiệt) bằng
tiếng Việt, đồ án môn học theo kiến trúc microservices. Giá bán bằng VND.

### Người dùng

| Nhóm | Mô tả | Thiết bị |
|---|---|---|
| Khách vãng lai | Xem, lọc, tìm sản phẩm; dùng PC Builder; chat tư vấn AI; có giỏ hàng tạm | điện thoại nhiều, máy tính khi so thông số |
| Khách hàng (đã đăng nhập) | Như trên + giỏ hàng gắn tài khoản, thanh toán, theo dõi đơn, đánh giá, lưu cấu hình PC, sổ địa chỉ | như trên |
| Nhân viên (STAFF) | Xử lý đơn, quản lý tồn kho, duyệt đánh giá | desktop, làm việc lâu, cần bảng dày đặc |
| Quản trị (ADMIN) | Mọi việc của nhân viên + sản phẩm, voucher, người dùng, thống kê | desktop |

Khách hàng điển hình: sinh viên, game thủ, người tự ráp PC lần đầu (18–35 tuổi). Họ lo nhất hai điều:
**mua về có lắp được với nhau không** và **giá, tồn kho có đúng không**.

### Điểm khác biệt (phải thể hiện rõ trên giao diện)

1. **Kiểm tra tương thích tất định.** Backend có một rule engine đọc bảng luật (`compatibility_rules`) và thông số chuẩn hóa
   của sản phẩm (`product.compat`) để trả lời chắc chắn: socket CPU khớp mainboard không, RAM DDR4/DDR5 có đúng chuẩn
   mainboard không, nguồn có đủ công suất không, card đồ họa có vừa vỏ case không, mainboard có vừa case không.
   Cùng một danh sách linh kiện luôn cho cùng một kết quả. Hiển thị ở **PC Builder**, giỏ hàng, trang sản phẩm.
2. **Tư vấn AI có giá và tồn kho thật.** Chatbot dùng RAG (tìm trong mô tả sản phẩm, tài liệu hướng dẫn) và gọi công cụ để lấy
   giá, tồn kho từ hệ thống thật. LLM không tự bịa giá. Frontend chỉ gọi API chat của backend.
3. **Thông số trình bày như datasheet:** có đơn vị, canh cột, chip thông số tương thích ("đường khớp nối", mục i).

---

## b. Vai trò và quyền

### Mô hình quyền

- **Realm role** (vai trò): `CUSTOMER`, `STAFF`, `ADMIN`. Một người có thể có nhiều role (admin1 có cả `ADMIN` và `STAFF`).
- **Permission** (quyền thao tác, là client role của client `pcshop-backend` trong Keycloak):

| Permission | Cho phép |
|---|---|
| `product:write` | Quản lý sản phẩm, danh mục, thương hiệu, luật tương thích; import/export Excel sản phẩm |
| `order:update-status` | Đổi trạng thái đơn hàng (đơn lẻ và hàng loạt) |
| `inventory:write` | Nhập kho (form, Excel), điều chỉnh tồn |
| `knowledge:write` | Thêm tài liệu tri thức cho AI, đồng bộ sản phẩm vào AI, xem file nội bộ |

- **Quyền sở hữu** luôn kiểm tra ở backend: khách chỉ xem đơn, địa chỉ, cấu hình PC, review của chính mình
  (STAFF/ADMIN xem được mọi đơn). Frontend không cần tự lọc, chỉ cần xử lý 403/404.
- Người **tự đăng ký** trên trang Keycloak hiện **không được gán role nào** (realm chưa cấu hình role mặc định).
  Frontend coi người đã đăng nhập mà không có `STAFF`/`ADMIN` là khách hàng; mọi API phía khách chỉ yêu cầu đăng nhập,
  không yêu cầu role `CUSTOMER`.

### Tài khoản test (ID cố định, giống nhau trên mọi máy)

| Username | `sub` | Realm role | Permission |
|---|---|---|---|
| customer1 | `11111111-1111-1111-1111-111111111111` | CUSTOMER | – |
| customer2 | `22222222-2222-2222-2222-222222222222` | CUSTOMER | – |
| staff1 | `33333333-3333-3333-3333-333333333333` | STAFF | `order:update-status`, `inventory:write` |
| admin1 | `99999999-9999-9999-9999-999999999999` | ADMIN, STAFF | cả 4 permission |

Mật khẩu tài khoản test do nhóm cung cấp riêng (không ghi trong tài liệu này). Chế độ MOCK của frontend không cần mật khẩu.

### Màn hình theo vai trò

Ký hiệu: ● được dùng · ◐ xem được, thao tác bị giới hạn · – không thấy.

| Màn hình | Khách vãng lai | Khách hàng | STAFF | ADMIN |
|---|---|---|---|---|
| K01 Trang chủ, K02 Danh sách/tìm kiếm, K03 Chi tiết sản phẩm | ● | ● | ● | ● |
| K03 viết đánh giá | – (nút dẫn đi đăng nhập) | ● | ● | ● |
| K04 PC Builder | ● (không lưu được) | ● lưu, chia sẻ | ● | ● |
| K05 Giỏ hàng | ● (giỏ tạm qua `X-Guest-Key`) | ● | ● | ● |
| K06 Thanh toán, K07 Đơn của tôi, K08 Tài khoản, K10 Thông báo | – (chuyển đi đăng nhập) | ● | ● | ● |
| K09 Chat AI | ● | ● | ● | ● |
| K11 Cấu hình được chia sẻ (`/build/:code`) | ● nếu công khai | ● | ● mọi cấu hình | ● |
| A01 Dashboard | – | – | ◐ (thống kê bán hàng và sắp hết hàng đều mở cho STAFF) | ● |
| A02/A03 Sản phẩm, A04 Import Excel sản phẩm, A10 Danh mục/Thương hiệu/Luật | – | – | – (trừ khi có `product:write`) | ● |
| A05 Tồn kho, phiếu nhập | – | – | ● xem; nhập/điều chỉnh cần `inventory:write`; thêm/sửa kho: ADMIN | ● |
| A06 Đơn hàng | – | – | ● xem, xuất Excel; đổi trạng thái cần `order:update-status` | ● |
| A07 Duyệt đánh giá | – | – | ● | ● |
| A08 Voucher, A09 Người dùng & phân quyền | – | – | – | ● |
| A11 Kho tri thức AI | – | – | – (trừ khi có `knowledge:write`) | ● |

Quy tắc hiển thị menu admin: vào khu `/admin` khi có role `STAFF` hoặc `ADMIN`; mục nào cần permission thì **ẩn** khi
thiếu permission (backend vẫn chặn bằng 403). Nút thao tác (đổi trạng thái đơn, nhập kho) cũng ẩn/tắt theo permission.

### Khách vãng lai làm được gì

Xem danh mục, thương hiệu, sản phẩm, bộ lọc, lịch sử giá, tồn kho, đánh giá đã duyệt; tìm kiếm; kiểm tra tương thích;
dùng PC Builder (không lưu); giỏ hàng tạm (header `X-Guest-Key`, giữ 30 ngày, gộp vào tài khoản khi đăng nhập); chat AI;
xem danh sách voucher công khai; xem cấu hình PC được chia sẻ công khai; xem danh mục tỉnh/phường.

---

## c. Xác thực (Keycloak OIDC)

| Thông số | Giá trị (môi trường local) |
|---|---|
| Keycloak | `http://localhost:8180` (Keycloak 26.0) |
| Realm | `pcshop` |
| Client của frontend | `pcshop-web`: public client (không có secret), Authorization Code + **PKCE S256** |
| Redirect URI cho phép | `http://localhost:3000/*` |
| Web origin cho phép | `http://localhost:3000` |
| Issuer (`iss`) | `http://localhost:8180/realms/pcshop` |
| Thời hạn access token | 300 giây (5 phút): phải tự làm mới bằng refresh token |
| Đăng ký, quên mật khẩu, đăng nhập bằng email | bật, dùng trang của Keycloak (giao diện mặc định, chưa có theme riêng) |

**Frontend phải chạy ở cổng 3000** (`vite --port 3000`): Keycloak chỉ chấp nhận redirect về `localhost:3000`, gateway chỉ
cho CORS từ origin này. Muốn dùng cổng khác phải nhờ nhóm backend sửa realm và gateway.

### Luồng

1. Chế độ REAL dùng `keycloak-js` (bản 26.x cho khớp server): `init({ onLoad: 'check-sso', pkceMethod: 'S256', checkLoginIframe: false })`.
   Trang công khai không bắt đăng nhập; trang cần đăng nhập gọi `keycloak.login({ redirectUri })`.
2. Mọi request tới API gửi header `Authorization: Bearer <access_token>`. Trước mỗi request gọi `keycloak.updateToken(30)`.
3. Đăng xuất: `keycloak.logout({ redirectUri: origin })`.
4. Sau khi đăng nhập lần đầu trong phiên: (a) gọi `GET /api/v1/me` (tự tạo hồ sơ trong DB shop); (b) nếu đang có giỏ khách
   vãng lai thì gọi `POST /api/v1/cart/merge` kèm header `X-Guest-Key`, rồi xóa guest key ở localStorage.
5. Đổi tên, email, mật khẩu: dùng trang tài khoản của Keycloak (`keycloak.accountManagement()`); API `/me` của shop chỉ sửa
   số điện thoại, giới tính, ngày sinh.

### Claim frontend được dùng (payload thật của staff1)

```json
{
  "exp": 1793118094, "iat": 1793117794,
  "iss": "http://localhost:8180/realms/pcshop",
  "aud": "pcshop-backend", "azp": "pcshop-web",
  "sub": "33333333-3333-3333-3333-333333333333",
  "typ": "Bearer", "scope": "email profile",
  "realm_access": { "roles": ["STAFF"] },
  "resource_access": { "pcshop-backend": { "roles": ["inventory:write", "order:update-status"] } },
  "preferred_username": "staff1",
  "name": "Nhân Viên", "given_name": "Nhân", "family_name": "Viên",
  "email": "staff1@pcshop.local", "email_verified": true
}
```

| Claim | Dùng để |
|---|---|
| `sub` | ID người dùng (UUID) ở mọi bảng: so với `userId` của đơn, review, cấu hình PC |
| `preferred_username` | tên đăng nhập (không hiển thị công khai) |
| `name` / `given_name` / `family_name` | tên hiển thị; `name` cũng là `userDisplayName` của review |
| `email` | email |
| `realm_access.roles` | vai trò: `CUSTOMER` / `STAFF` / `ADMIN` (có thể rỗng với người tự đăng ký) |
| `resource_access["pcshop-backend"].roles` | permission; **không có khóa này** khi user không có permission nào |

Token có thể thiếu `realm_access` hoặc `resource_access`: luôn đọc kiểu `token.realm_access?.roles ?? []`.
Nguồn sự thật về quyền vẫn là backend; thông tin trong token chỉ để ẩn/hiện giao diện. Có thể dùng `GET /me`
(trả `roles`, `permissions` đã chuẩn hóa) thay cho tự giải mã token.

---

## d. Quy ước API

### Địa chỉ

- Base URL: `VITE_API_BASE_URL`, local là `http://localhost:8000`. Mọi đường dẫn bắt đầu bằng `/api/v1`.
- Frontend **chỉ** gọi gateway. Không gọi thẳng cổng service (8081–8089), không gọi Ollama/LLM.
- Gateway cho phép CORS từ `http://localhost:3000`, gửi credentials, method GET/POST/PUT/PATCH/DELETE, mọi header;
  cho đọc header `Content-Disposition` và `X-Request-Id`.

### Envelope `ResponseData`

Mọi response JSON (thành công lẫn lỗi nghiệp vụ) có dạng:

```json
{ "error_status": 1, "error_message": null, "error_code": null, "data": { } }
```

- `error_status`: `1` thành công, `0` lỗi. `error_message`: câu tiếng Việt, **hiển thị được ngay cho người dùng**.
- Thành công nhưng không có dữ liệu (xóa): `data: null`.
- Luôn kiểm tra HTTP status trước, rồi mới đọc envelope.

### Lỗi: các dạng cần xử lý

Từ 2026-11-07 mọi lỗi (Spring lẫn Quarkus) đều là `ResponseData`, trừ 401 do token sai/hết hạn (body rỗng).

| Trường hợp | HTTP | Body | Frontend làm gì |
|---|---|---|---|
| Lỗi nghiệp vụ | 400/403/404/409/422/502/500 | `ResponseData` với `error_code`, `error_message` | hiện `error_message` (toast hoặc dưới form) |
| Lỗi hàng loạt ("tất cả hoặc không") | 400 | `ResponseData` có `data: [{id, reason}]` | đánh dấu từng dòng theo `id`, hiện `reason` |
| Lỗi kiểm tra dữ liệu (mọi service) | 400 | `ResponseData` `VALIDATION_ERROR`, `data: [{field, message}]`; `field` là tên trường trong body (`receiverPhone`, `lines[0].quantity`) | gắn `message` vào ô form theo `field` |
| Dữ liệu đã bị người khác sửa / trùng | 409 | `ResponseData` `CONFLICT` | báo và tải lại dữ liệu |
| Token sai hoặc hết hạn | 401 | **rỗng** | làm mới token rồi thử lại một lần; vẫn 401 thì chuyển đăng nhập |
| Chưa đăng nhập gọi API cần đăng nhập | 401 | `ResponseData` `UNAUTHORIZED` (riêng Spring: rỗng) | như trên |
| Thiếu role/permission | 403 | `ResponseData` `FORBIDDEN` | hiện `error_message` |
| Lỗi hệ thống không bắt được | 500 | `ResponseData` `INTERNAL_ERROR` "Lỗi hệ thống" | hiện thông báo chung, cho thử lại |

Message là tiếng Việt (ràng buộc mặc định: "không được để trống", "phải lớn hơn hoặc bằng 1"...).
Frontend nên tự kiểm tra form trước khi gửi, dùng lỗi server làm lớp cuối.

Bảng `ErrorCode` → HTTP: `VALIDATION_ERROR` 400 · `BAD_REQUEST` 400 · `UNAUTHORIZED` 401 · `FORBIDDEN` 403 · `NOT_FOUND` 404 ·
`CONFLICT` 409 · `OUT_OF_STOCK` 409 · `VOUCHER_INVALID` 422 · `EXTERNAL_SERVICE_ERROR` 502 · `INTERNAL_ERROR` 500.

Mẫu lỗi thật:

`GET /products?sort=foo` (khách vãng lai) → **HTTP 400**

```json
{
  "error_status": 0,
  "error_message": "sort không hợp lệ: foo (price|name|newest|sold|rating, asc|desc)",
  "error_code": "BAD_REQUEST",
  "data": null
}
```

`PATCH /admin/orders/bulk/status` (staff1) → **HTTP 400**<br>Body: `{"codes": ["DH20261024000002", "DH20261023000007", "DH00000000000000"], "status": 5}`

```json
{
  "error_status": 0,
  "error_message": "2 dòng không hợp lệ, chưa lưu gì",
  "error_code": "BAD_REQUEST",
  "data": [
    {
      "id": "DH00000000000000",
      "reason": "Không tìm thấy đơn hàng"
    },
    {
      "id": "DH20261023000007",
      "reason": "Không thể chuyển đơn từ trạng thái 6 sang 5"
    }
  ]
}
```

`PUT /me` (customer1) → **HTTP 400**<br>Body: `{"phoneNumber": "12345"}`

```json
{
  "error_status": 0,
  "error_message": "phoneNumber: Số điện thoại không hợp lệ",
  "error_code": "VALIDATION_ERROR",
  "data": [
    {
      "field": "phoneNumber",
      "message": "Số điện thoại không hợp lệ"
    }
  ]
}
```

`POST /admin/inventory/import` → **HTTP 400**<br>Body: `{"warehouseId": 1, "lines": [{"sku": "", "quantity": 0}]}`

```json
{
  "error_status": 0,
  "error_message": "lines[0].quantity: phải lớn hơn hoặc bằng 1, lines[0].sku: không được để trống",
  "error_code": "VALIDATION_ERROR",
  "data": [
    { "field": "lines[0].quantity", "message": "phải lớn hơn hoặc bằng 1" },
    { "field": "lines[0].sku", "message": "không được để trống" }
  ]
}
```

### Phân trang `PageResponse`

```json
{ "content": [ ], "page": { "size": 20, "number": 0, "totalElements": 95, "totalPages": 5 } }
```

Query `page` (từ 0) và `size` (mặc định 20, tối đa 100; riêng movements mặc định 50, `/orders/my` và `/reviews` mặc định 10).
API **không** phân trang (trả mảng):
`/categories`, `/brands`, `/pc-builds/my`, `/addresses`, `/warehouses`, `/vouchers`,
`/admin/vouchers`, `/admin/categories`, `/admin/brands`, `/admin/compatibility-rules`, `/admin/stats/*`.

### API hàng loạt

Đường dẫn `.../bulk/<hành động>` hoặc `POST .../bulk-delete`, tối đa 100 phần tử, id không được lặp. "Tất cả hoặc không":
một dòng lỗi thì không lưu dòng nào, trả 400 với danh sách `[{id, reason}]`. Giao diện: giữ nguyên lựa chọn, tô đỏ dòng lỗi.

### Header `X-Guest-Key` (giỏ khách vãng lai)

- Chỉ dùng cho `/api/v1/cart/**`. Chuỗi 16–64 ký tự `A-Z a-z 0-9 -`. Frontend tự sinh một lần (vd `crypto.randomUUID()`,
  36 ký tự hợp lệ) và lưu `localStorage`.
- Chưa đăng nhập: bắt buộc gửi, thiếu thì 401 `UNAUTHORIZED` ("Cần đăng nhập hoặc gửi header X-Guest-Key...").
- Đã đăng nhập: backend **bỏ qua** header này, dùng giỏ của tài khoản. Riêng `POST /cart/merge` cần cả token và header.

### Định dạng dữ liệu

| Loại | Trong JSON | Hiển thị |
|---|---|---|
| Tiền | `number`, VND, giá trị nguyên (`7990000`) ở mọi service | `7.990.000 ₫` (`Intl.NumberFormat('vi-VN', {style:'currency', currency:'VND'})`) |
| Gửi tiền lên | số nguyên, không dấu chấm | ô nhập tự định dạng nghìn |
| Ngày giờ có `Z` (catalog, review, notification) | `"2026-10-27T16:06:20.459Z"` (UTC) | đổi sang giờ VN: `27/10/2026 23:06` |
| Ngày giờ không múi giờ (ordering, customer, inventory, media) | `"2026-10-24T20:25:34.732737"` (đã là giờ VN) | parse như giờ địa phương, KHÔNG thêm Z |
| Ngày | `"2026-10-27"` | `27/10/2026` |
| Gửi ngày giờ lên (voucher) | `"2026-11-01T00:00:00"` (giờ VN, không múi giờ) | |
| Mã trạng thái | số nguyên 1..n | nhãn tiếng Việt theo mục g |
| ID | Postgres: số (`id: 7`); Mongo: chuỗi hex 24 ký tự; người dùng: UUID | |

Số lẻ thập phân trong thông số (`boost_clock_ghz: 5.3`) hiển thị dấu phẩy kiểu Việt (`5,3 GHz`).

### Upload và tải file

- **Upload ảnh:** `POST /api/v1/media/upload`, `multipart/form-data` với `file` và `bucket`. Trả `MediaFile`, trong đó `url`
  dùng trực tiếp cho `<img src>`. Mỗi bucket có quyền, loại file và dung lượng riêng (kiểm tra ở frontend trước khi gửi,
  `accept` của input file theo bảng):

  | Bucket | Ai upload | Đuôi file | Tối đa |
  |---|---|---|---|
  | `products` | permission `product:write` | jpg, jpeg, png, webp, gif | 5 MB |
  | `avatars` | user đăng nhập | jpg, jpeg, png, webp, gif | 2 MB |
  | `reviews` | user đăng nhập | jpg, jpeg, png, webp, gif | 5 MB |
  | `knowledge-docs` | ADMIN hoặc `knowledge:write` | pdf, docx, txt, md | 20 MB |

  Sai đuôi/quá dung lượng → 400, sai quyền → 403. `mimeType` do server đặt theo đuôi file. Ảnh sản phẩm lưu vào
  `product.images[{fileId, url, isPrimary}]` khi tạo/sửa sản phẩm. Hiện sản phẩm seed **chưa có ảnh** (`images: null`):
  frontend cần ảnh giữ chỗ theo danh mục.
- **Xem file cần token** (bucket `knowledge-docs`): `fetch(url + '/view', {headers: {Authorization}})` → `blob()` → `URL.createObjectURL`.
- **Tải file Excel** (template, export, file kết quả): `GET` có token, response là file `.xlsx`
  (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`). Lấy tên file từ `Content-Disposition`, ưu tiên
  `filename*=UTF-8''...` (tên tiếng Việt, cần `decodeURIComponent`), không có thì `filename="..."`. Ví dụ thật:
  `attachment; filename="Don_hang_2026-10-27.xlsx"; filename*=UTF-8''%C4%90%C6%A1n%20h%C3%A0ng%202026-10-27.xlsx`.
  Lỗi khi tải file vẫn trả JSON `ResponseData` (kiểm tra `Content-Type` trước khi tạo blob).
- **Upload Excel:** multipart `file` (chỉ `.xlsx`, ≤ 5 MB, ≤ 1000 dòng) kèm trường form khác tùy API (mục g).

### Header khác

- `X-Request-Id`: gateway gắn vào mọi response. Hiện mã này (rút gọn) trong thông báo lỗi 500 để báo lỗi dễ tra log.
- Gửi JSON tiếng Việt luôn kèm `Content-Type: application/json; charset=utf-8`.

---

## e. Danh sách màn hình

Đường dẫn (React Router) là đề xuất. Màn khách cần cả desktop (1440) và mobile (390); màn admin chỉ desktop.

### Khung chung phía khách

Header: logo · ô tìm kiếm (`GET /products/search?q=`) · menu danh mục (`GET /categories`) · nút PC Builder · chuông thông báo
(đã đăng nhập: `GET /notifications/unread-count`) · giỏ hàng (badge = `totalQuantity` của `GET /cart`) · tài khoản
(chưa đăng nhập: nút "Đăng nhập"; đã đăng nhập: menu Tài khoản / Đơn của tôi / Trang quản trị nếu là STAFF/ADMIN / Đăng xuất).
Nút chat AI nổi góc phải dưới trên mọi trang khách.

### K01. Trang chủ (`/`)
- **Mục đích:** giới thiệu điểm khác biệt (PC Builder có kiểm tra tương thích, tư vấn AI), dẫn vào danh mục.
- **Dữ liệu:** `GET /categories` (8 danh mục), `GET /brands`, dải sản phẩm `GET /products?category=GPU&sort=price,asc&size=8`.
  Hero: PC Builder thu nhỏ (chọn CPU mẫu → gợi ý mainboard cùng socket qua `GET /products?category=MAINBOARD&socket=...`).
- **Hành động:** mở PC Builder, vào danh mục, tìm kiếm, mở chat.
- **Rỗng/lỗi:** danh mục lỗi → ẩn khối, giữ hero; chưa có API "bán chạy" công khai nên không làm khối đó.

### K02. Danh sách sản phẩm + bộ lọc (`/c/:categoryCode`, `/search?q=`)
- **Mục đích:** duyệt, lọc theo thông số.
- **Dữ liệu:** bộ lọc `GET /products/facets?category=`; kết quả `GET /products?category=&brand=&minPrice=&maxPrice=&socket=&memoryType=&formFactor=&sort=&page=&size=`;
  tồn kho của trang hiện tại `POST /inventory/batch`; nhãn thông số `GET /categories/{code}` (`specSchema`).
  Tìm kiếm: `GET /products/search?q=` (không lọc được, xếp theo độ khớp).
- **Hành động:** chọn bộ lọc (chip bộ lọc đang áp dụng, xóa từng cái, đồng bộ lên URL query), đổi sắp xếp, thêm vào giỏ,
  thêm vào PC Builder, mở chi tiết.
- **Trạng thái:** đang tải (skeleton thẻ), rỗng ("Không có sản phẩm khớp bộ lọc" + nút "Xóa bộ lọc"), lỗi (thông báo + thử lại).
- **Mobile:** bộ lọc là bottom sheet, nút "Lọc (n)" dính đáy.

### K03. Chi tiết sản phẩm (`/p/:sku`)
- **Dữ liệu:** `GET /products/{sku}`; `GET /categories/{categoryCode}` (nhãn, đơn vị, nhóm thông số); `GET /inventory/{sku}`
  (404 = chưa có tồn kho → coi như hết hàng); `GET /reviews?sku={sku}&page=0` và `GET /reviews/stats?sku={sku}`
  (lưu ý: `productId` là `id` Mongo, không phải SKU); `GET /products/{sku}/price-history` (biểu đồ bậc thang).
- **Hành động:** chọn số lượng 1–99, thêm vào giỏ, thêm vào PC Builder, viết đánh giá (đăng nhập), sửa/gỡ đánh giá của mình.
  Đã đăng nhập: `GET /orders/purchased?sku={sku}` → `purchased = true` thì gợi ý "Bạn đã mua sản phẩm này, hãy đánh giá"
  (ai cũng viết được, nhưng chỉ người đã mua có nhãn "Đã mua hàng").
- **Trạng thái:** bình thường · đang giảm giá (`originalPrice` > `price`) · hết hàng (nút mua tắt, ghi "Hết hàng") ·
  chưa có đánh giá · 404 (sản phẩm không tồn tại hoặc đã ẩn: "Sản phẩm không tồn tại hoặc đã ngừng bán").

### K04. PC Builder (`/builder`, `/builder?code=PCxxxx` để sửa cấu hình đã lưu)
- **Mục đích:** ráp cấu hình theo 8 slot, biết ngay chỗ không khớp và tổng công suất.
- **Dữ liệu:** slot = danh mục có `pcSlot`, theo `sortOrder`. Chọn linh kiện: modal danh sách `GET /products?category=` lọc sẵn
  theo linh kiện đã chọn (mục g). Kiểm tra: `POST /compatibility/check` mỗi khi đổi linh kiện (debounce 300ms).
  Còn hàng: `POST /inventory/batch`. Lưu: `POST /pc-builds` / `PUT /pc-builds/{code}`.
- **Hành động:** chọn/đổi/bỏ linh kiện, đổi số lượng (1–8), lưu (đặt tên, mục đích, ngân sách, công khai), chia sẻ link
  `/build/:code`, thêm cả cấu hình vào giỏ (`POST /cart/items/bulk`), hỏi AI về cấu hình.
- **Trạng thái:** trống · hợp lệ · có lỗi (đoạn nối đỏ + thông báo) · có cảnh báo (hổ phách) · modal chọn linh kiện ·
  chưa đăng nhập bấm Lưu (chuyển đăng nhập, giữ cấu hình trong localStorage).
- **Mobile:** slot thành danh sách; tổng tiền + công suất + "Thêm vào giỏ" dính đáy.

### K05. Giỏ hàng (`/cart`)
- **Dữ liệu:** `GET /cart`.
- **Hành động:** đổi số lượng (`PUT /cart/items/{sku}`, 0 = xóa), xóa dòng (`DELETE /cart/items/{sku}`), xóa hết (`DELETE /cart`),
  kiểm tra tương thích các món trong giỏ (`POST /compatibility/check` với SKU lặp theo số lượng), thanh toán (bắt đăng nhập).
- **Trạng thái:** bình thường · rỗng ("Giỏ hàng trống" + "Xem linh kiện") · có dòng `purchasable=false` (tô mờ, hiện `message`,
  không tính tiền) · có `warnings` (dải cảnh báo đầu trang).

### K06. Thanh toán (`/checkout`)
- **Dữ liệu:** `GET /addresses`; thêm nhanh địa chỉ (`GET /locations/provinces`, `/locations/provinces/{code}/wards`, `POST /addresses`);
  gợi ý voucher `GET /vouchers`; kiểm tra mã `POST /vouchers/validate`; tổng tiền `POST /checkout/preview {voucherCode, addressId}`
  (gọi lại mỗi khi đổi địa chỉ/voucher).
- **Hành động:** chọn/thêm địa chỉ, áp/bỏ mã, chọn thanh toán (COD / VNPay / MoMo), đặt hàng.
- **Trạng thái:** bình thường · mã không hợp lệ (hiện `reason`) · chưa có địa chỉ · không đặt được (`canPlaceOrder=false`, hiện `warnings`).
- **Đặt hàng:** `POST /orders {addressId, voucherCode, paymentMethod, note, expectedTotal}` (gửi `expectedTotal` = `totalAmount`
  của preview đang hiển thị). Thành công → đơn `status 1` (đang giữ hàng), giỏ đã bị xóa phía server (làm mới badge giỏ),
  chuyển tới `/orders/:code?placed=1`. Trang đó gọi lại `GET /orders/{code}` mỗi 1 giây (tối đa ~10 lần) đến khi status khác 1:
  4 → "Đặt hàng thành công"; 2 → "Đơn đã được giữ, chờ thanh toán trong 15 phút"; 7 → "Không đủ hàng" + `cancelReason`.
  Lỗi: 409 `CONFLICT` (giá đổi: cập nhật lại tóm tắt từ `data`, bắt bấm đặt lại), 409 `OUT_OF_STOCK`, 422 `VOUCHER_INVALID`
  (hiện `error_message`). Khóa nút trong lúc gửi, và gửi header `Idempotency-Key` (một UUID sinh khi vào trang, giữ nguyên khi bấm
  lại): request lặp trả lại đúng đơn đã tạo. Đơn online: khi status thành 2, gọi `POST /payments/{code}` rồi chuyển tới `paymentUrl` (mục f.7b).

### K07. Đơn của tôi (`/orders`, `/orders/:code`)
- **Dữ liệu:** `GET /orders/my?page=&size=&status=` (phân trang); chi tiết `GET /orders/{code}`; timeline `GET /orders/{code}/timeline`.
- **Hành động:** lọc theo nhóm trạng thái (tab: Tất cả / Đang xử lý 1–4 / Đang giao 5 / Hoàn tất 6 / Đã hủy, trả 7–8, lọc ở client),
  hủy đơn khi status 1/2/4 và `paymentStatus` ≠ 2 (modal nhập lý do, `POST /orders/{code}/cancel`), đánh giá sản phẩm của đơn đã hoàn tất.
- **Trạng thái:** danh sách · rỗng ("Bạn chưa có đơn hàng nào") · chi tiết đang giao · chi tiết đã hủy (hiện `cancelReason`) ·
  403/404 (đơn không phải của bạn / không tồn tại).
- Danh sách đơn không kèm sản phẩm: thẻ đơn chỉ có mã, ngày, trạng thái, phương thức thanh toán, tổng tiền.

### K08. Tài khoản (`/account`, `/account/addresses`, `/account/builds`)
- **Dữ liệu:** `GET /me`; `GET /addresses`; `GET /pc-builds/my`.
- **Hành động:** sửa hồ sơ (`PUT /me`: số điện thoại, giới tính, ngày sinh); thêm/sửa/xóa địa chỉ, đặt mặc định; mở/xóa
  cấu hình PC (`DELETE /pc-builds/{code}`, xóa nhiều `POST /pc-builds/bulk-delete`); đổi mật khẩu/email → trang Keycloak.
- **Trạng thái:** hồ sơ · sổ địa chỉ rỗng · form có lỗi (SĐT sai) · đã đủ 10 địa chỉ (ẩn nút thêm).

### K09. Widget chat AI (panel phải; mobile toàn màn hình)
- **Dữ liệu:** `POST /ai/chat {sessionId, message}` → `{sessionId, answer}`. Lưu `sessionId` vào `sessionStorage`.
- **Thẻ sản phẩm trong câu trả lời:** tìm mã SKU trong `answer` (regex `\b[A-Z0-9]+(?:-[A-Z0-9]+)+\b`, lọc lại bằng kết quả API),
  gọi `POST /products/batch` + `POST /inventory/batch` để vẽ thẻ với giá/tồn kho **lấy từ API**, không lấy số trong câu trả lời.
- **Hành động:** gửi câu hỏi, bấm câu hỏi gợi ý ("Tư vấn card chơi game 2K", "CPU nào hợp với mainboard B760?",
  "Nguồn 650W có đủ cho RTX 4070 SUPER không?"), mở sản phẩm, thêm vào giỏ/PC Builder từ thẻ, bắt đầu cuộc trò chuyện mới.
- **Trạng thái:** chào · đang trả lời (chấm nhảy; câu trả lời mất 5–60 giây do chạy LLM local) · trả lời kèm thẻ · lỗi
  ("Trợ lý AI đang bận, thử lại sau") · tin nhắn rỗng (nút gửi tắt).
- Không stream (API trả một lần). Không có lịch sử chat lưu server: chỉ giữ trong bộ nhớ trang.

### K10. Thông báo (dropdown chuông + `/notifications`)
- **Dữ liệu:** `GET /notifications?page=&size=`; số chưa đọc và thông báo mới đến **realtime qua SSE** (f.10): sau khi đăng nhập
  mở một stream cho cả ứng dụng, event `unread-count` đặt badge, event `notification` cộng badge + hiện toast + chèn đầu danh sách.
  Stream lỗi / mất mạng: mở lại (lấy vé mới); trong lúc chưa có stream thì dùng `GET /notifications/unread-count` mỗi 60 giây.
  Thông báo tự sinh vài giây sau khi đơn đổi trạng thái (2–8) hoặc cửa hàng trả lời đánh giá (bảng ở f.10).
- **Hành động:** bấm thông báo → `PATCH /notifications/{id}/read` rồi điều hướng theo `data.order_code` (→ `/orders/:code`)
  hoặc `data.sku` (REVIEW_REPLY → `/p/:sku#reviews`);
  "Đánh dấu đã đọc tất cả" → `PATCH /notifications/read-all`.
- **Trạng thái:** có chưa đọc (chấm xanh) · rỗng ("Chưa có thông báo").

### K11. Cấu hình được chia sẻ (`/build/:code`)
- **Dữ liệu:** `GET /pc-builds/{code}` (công khai nếu `isPublic`; chủ cấu hình và nhân viên luôn xem được); giá hiện tại
  `POST /products/batch` để so với `priceAtTime`.
- **Hành động:** "Mở trong PC Builder" (chép cấu hình), "Thêm cả cấu hình vào giỏ".
- **Trạng thái:** 403 ("Cấu hình này không được chia sẻ công khai") · 404.

### K12. Đăng nhập / callback
Không có màn đăng nhập riêng: nút "Đăng nhập" chuyển sang trang Keycloak. Cần một route `/auth/callback` (hoặc để keycloak-js
xử lý ở mọi route) và trang "Đang đăng nhập..." trong lúc init. Màn "Không có quyền" (`/403`) cho khu admin.

### Khung chung phía admin (`/admin/*`)

Sidebar theo quyền: Dashboard · Đơn hàng · Tồn kho · Đánh giá (STAFF) · Sản phẩm · Danh mục & thương hiệu · Luật tương thích
(`product:write`) · Voucher · Người dùng (ADMIN) · Kho tri thức AI (`knowledge:write`). Header: tên, role, nút về trang khách.
Bảng dày (hàng 40px), header bảng dính, chọn nhiều dòng → thanh thao tác hàng loạt.

### A01. Dashboard (`/admin`)
- **Dữ liệu:** `GET /admin/stats/overview?from=&to=` (mặc định 30 ngày), `GET /admin/stats/top-products?from=&to=&limit=10`,
  `GET /admin/stats/low-stock` (ghép tên bằng `POST /products/batch`).
- **Hành động:** đổi khoảng ngày (tối đa 1 năm), bấm một trạng thái → A06 đã lọc, bấm dòng sắp hết → A05.
- **Trạng thái:** bình thường · khoảng ngày không có đơn (số 0, bảng rỗng) · khoảng ngày sai (400 "from phải trước hoặc bằng to").
- Chưa có doanh thu theo ngày: dùng thẻ số + cột ngang "đơn theo trạng thái", không vẽ biểu đồ đường.

### A02. Danh sách sản phẩm (`/admin/products`)
- **Dữ liệu:** `GET /admin/products?status=&category=&q=&page=&size=`.
- **Hành động:** tạo, sửa, chọn nhiều → đổi trạng thái (`PATCH /admin/products/bulk/status`) / đổi giá (`PATCH /admin/products/bulk/price`
  + lý do), import Excel (A04), xuất Excel (`GET /admin/products/export?category=&status=`, `category` bắt buộc).
- **Trạng thái:** bình thường · đang chọn nhiều · lỗi hàng loạt 400 (tô dòng) · rỗng theo bộ lọc · 403 (thiếu `product:write`).

### A03. Form sản phẩm (modal trên trang `/admin/products`, không có route riêng)
- **Dữ liệu:** `GET /admin/products/{sku}` (thấy cả Nháp/Ẩn); `GET /admin/categories`, `GET /admin/brands` cho dropdown;
  `GET /categories/{code}` → `specSchema` sinh ô thông số; upload ảnh `POST /media/upload` (bucket `products`);
  lịch sử giá `GET /products/{sku}/price-history` (chỉ ACTIVE; sản phẩm chưa bán trả 404 → ẩn khung).
- **Hành động:** tạo (`POST /admin/products`, trạng thái Nháp/Đang bán), lưu thông tin (`PUT /admin/products/{sku}`), đổi giá
  qua modal (`PATCH /admin/products/{sku}/price {price, originalPrice, reason}`), đổi trạng thái (`PATCH .../status`).
- **Trạng thái:** tạo CPU (ô socket, memory_types, tdp_w...) · sửa GPU · lỗi kiểm tra (SKU sai định dạng, giá ≤ 0, slug trùng 409) ·
  danh mục chưa có `specSchema` (thông báo, chỉ còn trường chung + nhập thông số dạng key/value).

### A04. Import Excel 3 bước (modal trên `/admin/products` và tab Tồn kho của `/admin/inventory`)
- **Dữ liệu và luồng:** mục g "Import Excel". Sản phẩm: `.../admin/products/import/...`; phiếu nhập kho: `.../admin/inventory/import/excel/...`.
- **Trạng thái:** bước 1 · bước 2 có lỗi theo dòng · bước 2 hợp lệ hết · lỗi cả file 400 · bước 3 thành công · phiên hết hạn (404).

### A05. Tồn kho (`/admin/inventory`, `/admin/inventory/movements`, `/admin/warehouses`)
- **Dữ liệu:** `GET /warehouses`; `GET /admin/inventory?warehouseId=&lowStock=&page=&size=` (ghép tên sản phẩm bằng `POST /products/batch`);
  `GET /admin/inventory/movements?sku=&from=&to=`.
- **Hành động:** lọc kho / sắp hết; tạo phiếu nhập (form nhiều dòng `POST /admin/inventory/import`); nhập từ Excel (A04);
  điều chỉnh tồn (`PUT /inventory/{sku}/adjust?warehouseId=&delta=&note=`); xuất Excel (`GET /admin/inventory/export?warehouseId=&lowStock=`);
  quản lý kho (ADMIN: `POST/PUT /admin/warehouses`, `PATCH .../active`, `PATCH /admin/warehouses/bulk/active`).
- **Trạng thái:** bảng tồn · lọc sắp hết · form phiếu nhập · lịch sử biến động một SKU · 409 xung đột khi nhập (tải lại rồi nhập lại).
- Cột "Có thể bán" = `quantity - reservedQuantity`; tô hổ phách khi ≤ `minQuantity`, đỏ khi ≤ 0.

### A06. Đơn hàng (`/admin/orders`, `/admin/orders/:code`)
- **Dữ liệu:** `GET /admin/orders?status=&from=&to=&q=&page=&size=`; `GET /admin/orders/{code}`; timeline `GET /orders/{code}/timeline`
  (nhân viên dùng được API của khách).
- **Hành động:** đổi trạng thái (chỉ hiện bước hợp lệ, mục g; 7/8 bắt buộc lý do) `PATCH /admin/orders/{code}/status`;
  xem các lần thanh toán `GET /payments/{code}`; trang "Hoàn tiền" `GET /admin/refunds?status=1` + nút "Đã hoàn"
  `PATCH /admin/refunds/{id}/complete` (mục f.7b);
  chọn nhiều → `PATCH /admin/orders/bulk/status`; xuất Excel `GET /admin/orders/export?status=&from=&to=&q=` (quá 10.000 đơn → 400).
- **Trạng thái:** danh sách theo tab trạng thái · chi tiết + timeline · modal đổi trạng thái · lỗi hàng loạt.

### A07. Duyệt đánh giá (`/admin/reviews`)
- **Dữ liệu:** `GET /admin/reviews?status=1&productId=&page=&size=` (mặc định status=1), `GET /admin/reviews/{id}`.
- **Hành động:** duyệt `PATCH /admin/reviews/{id}/approve` (từ 1 hoặc 3), từ chối `PATCH .../reject` (từ 1 hoặc 2), trả lời
  `POST .../reply` (≤ 2000 ký tự, ghi đè câu cũ), duyệt/từ chối nhiều `PATCH /admin/reviews/bulk/approve|reject`.
- **Trạng thái:** hàng chờ · đã chọn một review (khung trả lời) · hàng chờ rỗng ("Không còn đánh giá chờ duyệt").

### A08. Voucher (`/admin/vouchers`)
- **Dữ liệu:** `GET /admin/vouchers`, `GET /admin/vouchers/{id}`.
- **Hành động:** tạo `POST`, sửa `PUT /{id}` (gửi `version`), bật/tắt `PATCH /{id}/active`, bật/tắt nhiều `PATCH /bulk/active`.
- **Trạng thái:** danh sách (thanh tiến độ `usedCount/usageLimit`, nhãn "Chưa bắt đầu/Đang chạy/Hết hạn" tính từ `startAt/endAt`) ·
  form · xung đột 409 ("Voucher đã bị người khác thay đổi, vui lòng tải lại").

### A09. Người dùng & phân quyền (`/admin/users`)
- **Dữ liệu:** `GET /admin/users?keyword=&page=&size=`; `GET /admin/users/{id}`.
- **Hành động:** tạo nhân viên `POST /admin/users`; đặt lại role/permission `PUT /admin/users/{id}/roles` (ma trận checkbox,
  gửi danh sách đầy đủ); khóa/mở `PUT /admin/users/{id}/lock|unlock` (modal xác nhận).
- **Trạng thái:** danh sách · chi tiết + ma trận quyền · form tạo · tự gỡ ADMIN của chính mình (400) · username/email trùng (409).

### A10. Danh mục, thương hiệu, luật tương thích (`/admin/categories`, `/admin/brands`, `/admin/compatibility-rules`)
- **Dữ liệu:** `GET /admin/categories`, `GET /admin/brands`, `GET /admin/compatibility-rules` (kể cả đã tắt).
- **Hành động:** tạo/sửa, bật/tắt (`PATCH .../{code}/active`, `PATCH .../bulk/active`). Không có xóa.
- Chưa có API sửa `specSchema` của danh mục: chỉ hiển thị (bảng chỉ đọc).

### A11. Kho tri thức AI (`/admin/knowledge`, tùy chọn)
- **Dữ liệu:** `GET /admin/knowledge?sourceType=&status=&q=` (bảng tài liệu), `GET /admin/knowledge/{id}` (chunk của tài liệu).
- **Hành động:** thêm tài liệu `POST /admin/knowledge {title, sourceType 2|3|4, sourceRef, content}`; gỡ `DELETE /admin/knowledge/{id}`;
  đồng bộ sản phẩm `POST /admin/knowledge/sync-products`; thử truy vấn `GET /admin/knowledge/search?q=&category=&k=`.

---

## f. Endpoint theo màn hình (kèm response mẫu thật)

Ký hiệu quyền: `public` · `user` (đăng nhập) · `owner` (chủ dữ liệu, hoặc STAFF/ADMIN nếu ghi rõ) · `STAFF` (STAFF hoặc ADMIN) ·
`ADMIN` · `perm:x`. Kiểu ở cột "→" là kiểu của `data` trong `api-types.ts`. Mọi path có tiền tố `/api/v1` (bỏ đi cho gọn).

### f.1 Danh mục, thương hiệu (K01, K02, K03, A03)

| Method | Path | Quyền | Query/Body | → |
|---|---|---|---|---|
| GET | `/categories` | public | | `Category[]` (đang hoạt động, theo `sortOrder`) |
| GET | `/categories/{code}` | public | | `Category` (404 nếu ẩn/không có) |
| GET | `/brands` | public | | `Brand[]` |
| GET | `/brands/{code}` | public | | `Brand` |

`GET /categories` (khách vãng lai) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": [
    {
      "id": "6adcb0cc2444ef877c39127e",
      "code": "CPU",
      "name": "Bộ vi xử lý",
      "slug": "cpu",
      "pcSlot": "CPU",
      "sortOrder": 1,
      "isActive": 1,
      "specSchema": [
        {
          "key": "socket",
          "label": "Socket",
          "group": "compat",
          "type": "string",
          "required": true,
          "unit": null,
          "options": [
            "LGA1700",
            "LGA1851",
            "...(+2)"
          ]
        },
        {
          "key": "memory_types",
          "label": "Chuẩn RAM hỗ trợ",
          "group": "compat",
          "type": "string_list",
          "required": true,
          "unit": null,
          "options": [
            "DDR4",
            "DDR5"
          ]
        },
        "...(+6)"
      ],
      "createdBy": null,
      "createdAt": null,
      "updatedBy": null,
      "updatedAt": null
    },
    {
      "id": "6adcb0cc2444ef877c39127f",
      "code": "MAINBOARD",
      "name": "Bo mạch chủ",
      "slug": "mainboard",
      "pcSlot": "MAINBOARD",
      "sortOrder": 2,
      "isActive": 1,
      "specSchema": [
        {
          "key": "socket",
          "label": "Socket",
          "group": "compat",
          "type": "string",
          "required": true,
          "unit": null,
          "options": [
            "LGA1700",
            "LGA1851",
            "...(+2)"
          ]
        },
        {
          "key": "memory_type",
          "label": "Chuẩn RAM",
          "group": "compat",
          "type": "string",
          "required": true,
          "unit": null,
          "options": [
            "DDR4",
            "DDR5"
          ]
        },
        "...(+4)"
      ],
      "createdBy": null,
      "createdAt": null,
      "updatedBy": null,
      "updatedAt": null
    },
    "...(+6)"
  ]
}
```

`GET /brands` (khách vãng lai) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": [
    {
      "id": "6adcb0cc2444ef877c391288",
      "code": "AMD",
      "name": "AMD",
      "slug": "amd",
      "logoUrl": null,
      "isActive": 1,
      "createdAt": null,
      "updatedAt": null
    },
    {
      "id": "6adcb0cc2444ef877c391289",
      "code": "ASUS",
      "name": "ASUS",
      "slug": "asus",
      "logoUrl": null,
      "isActive": 1,
      "createdAt": null,
      "updatedAt": "2026-10-26T15:59:49.480Z"
    },
    "...(+5)"
  ]
}
```

`GET /categories/XYZ` (khách vãng lai) → **HTTP 404**

```json
{
  "error_status": 0,
  "error_message": "Không tìm thấy danh mục: XYZ",
  "error_code": "NOT_FOUND",
  "data": null
}
```

### f.2 Sản phẩm phía khách (K01–K03, K09)

| Method | Path | Quyền | Query/Body | → |
|---|---|---|---|---|
| GET | `/products` | public | `ProductListQuery` | `PageResponse<Product>` (chỉ ACTIVE) |
| GET | `/products/search` | public | `q` (bắt buộc), `page`, `size` | `PageResponse<Product>` |
| GET | `/products/facets` | public | `category` | `ProductFacets` |
| GET | `/products/{sku}` | public | | `Product` (404 nếu không ACTIVE) |
| GET | `/products/{sku}/price-history` | public | | `PriceHistory[]` |
| POST | `/products/batch` | public | `{skus: string[]}` (≤ 100) | `ProductSummary[]` |

`GET /products?category=MAINBOARD&socket=AM5&sort=price,desc`:

`GET /products?category=MAINBOARD&socket=AM5&sort=price,desc` (khách vãng lai) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "content": [
      {
        "id": "6adf719d17897e99b062e0fc",
        "sku": "MB-GIGABYTE-B650M-D5",
        "name": "Gigabyte B650M GAMING X AX DDR5",
        "slug": "gigabyte-b650m-gaming-x-ax-ddr5",
        "categoryCode": "MAINBOARD",
        "brandCode": "GIGABYTE",
        "shortDescription": "Mainboard mATX, socket AM5, hỗ trợ DDR5",
        "description": null,
        "price": 3990000,
        "originalPrice": null,
        "images": null,
        "specs": {
          "chipset": "B650",
          "form_factor": "mATX",
          "ram_slots": 4
        },
        "compat": {
          "socket": "AM5",
          "memory_type": "DDR5",
          "form_factor": "mATX",
          "ram_slots": 4,
          "m2_slots": 2
        },
        "tags": [
          "gaming"
        ],
        "warrantyMonths": 36,
        "status": 2,
        "ratingAvg": null,
        "ratingCount": null,
        "soldCount": null,
        "createdBy": null,
        "createdAt": null,
        "updatedBy": null,
        "updatedAt": null
      }
    ],
    "page": {
      "size": 20,
      "number": 0,
      "totalElements": 1,
      "totalPages": 1
    }
  }
}
```

`GET /products/GPU-MSI-4070S-12G`:

`GET /products/GPU-MSI-4070S-12G` (khách vãng lai) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "id": "6adcb0cc2444ef877c39129b",
    "sku": "GPU-MSI-4070S-12G",
    "name": "MSI GeForce RTX 4070 SUPER 12GB Ventus 2X",
    "slug": "msi-rtx-4070-super-12gb-ventus-2x",
    "categoryCode": "GPU",
    "brandCode": "MSI",
    "shortDescription": "Card đồ họa chơi tốt game 2K, 12GB GDDR6X",
    "description": null,
    "price": 16990000,
    "originalPrice": null,
    "images": null,
    "specs": {
      "vram_gb": 12,
      "memory_type": "GDDR6X"
    },
    "compat": {
      "length_mm": 242,
      "tdp_w": 220,
      "recommended_psu_w": 650
    },
    "tags": [
      "gaming",
      "2K"
    ],
    "warrantyMonths": 36,
    "status": 2,
    "ratingAvg": null,
    "ratingCount": null,
    "soldCount": null,
    "createdBy": null,
    "createdAt": null,
    "updatedBy": null,
    "updatedAt": null
  }
}
```

`GET /products/search?q=rtx`:

`GET /products/search?q=rtx` (khách vãng lai) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "content": [
      {
        "id": "6adf719d17897e99b062e0ff",
        "sku": "GPU-ASUS-4080S-16G",
        "name": "ASUS TUF Gaming GeForce RTX 4080 SUPER 16GB",
        "slug": "asus-tuf-rtx-4080-super-16gb",
        "categoryCode": "GPU",
        "brandCode": "ASUS",
        "shortDescription": "Card đồ họa chơi game 4K, 16GB GDDR6X, dài 348mm",
        "description": null,
        "price": 32990000,
        "originalPrice": null,
        "images": null,
        "specs": {
          "vram_gb": 16,
          "memory_type": "GDDR6X"
        },
        "compat": {
          "length_mm": 348,
          "tdp_w": 320,
          "recommended_psu_w": 850
        },
        "tags": [
          "gaming",
          "...(+1)"
        ],
        "warrantyMonths": 36,
        "status": 2,
        "ratingAvg": null,
        "ratingCount": null,
        "soldCount": null,
        "createdBy": null,
        "createdAt": null,
        "updatedBy": null,
        "updatedAt": null
      },
      "...(+1)"
    ],
    "page": {
      "size": 20,
      "number": 0,
      "totalElements": 2,
      "totalPages": 1
    }
  }
}
```

`GET /products/facets?category=MAINBOARD`:

`GET /products/facets?category=MAINBOARD` (khách vãng lai) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "brands": [
      "ASUS",
      "GIGABYTE",
      "MSI"
    ],
    "priceRange": {
      "min": 3590000,
      "max": 4290000
    },
    "compat": {
      "socket": [
        "AM5",
        "LGA1700"
      ],
      "memoryType": [
        "DDR4",
        "DDR5"
      ],
      "formFactor": [
        "ATX",
        "mATX"
      ]
    }
  }
}
```

`POST /products/batch {"skus":["CPU-I5-14600K","GPU-MSI-4070S-12G"]}`:

`POST /products/batch` (khách vãng lai) → **HTTP 200**<br>Body: `{"skus": ["CPU-I5-14600K", "GPU-MSI-4070S-12G"]}`

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": [
    {
      "productId": "6adcb0cc2444ef877c391298",
      "sku": "CPU-I5-14600K",
      "name": "Intel Core i5-14600K",
      "slug": "intel-core-i5-14600k",
      "categoryCode": "CPU",
      "brandCode": "INTEL",
      "price": 7990000,
      "originalPrice": null,
      "imageUrl": null,
      "status": 2,
      "warrantyMonths": 36
    },
    {
      "productId": "6adcb0cc2444ef877c39129b",
      "sku": "GPU-MSI-4070S-12G",
      "name": "MSI GeForce RTX 4070 SUPER 12GB Ventus 2X",
      "slug": "msi-rtx-4070-super-12gb-ventus-2x",
      "categoryCode": "GPU",
      "brandCode": "MSI",
      "price": 16990000,
      "originalPrice": null,
      "imageUrl": null,
      "status": 2,
      "warrantyMonths": 36
    }
  ]
}
```

`GET /products/GPU-MSI-4070S-12G/price-history`:

`GET /products/GPU-MSI-4070S-12G/price-history` (khách vãng lai) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": [
    {
      "id": "6adf719d17897e99b062e10c",
      "productId": null,
      "sku": "GPU-MSI-4070S-12G",
      "oldPrice": 17200000,
      "newPrice": 16990000,
      "reason": "COST_CHANGE",
      "changedBy": null,
      "changedAt": "2026-10-22T02:00:00Z"
    },
    {
      "id": "6adf719d17897e99b062e10b",
      "productId": null,
      "sku": "GPU-MSI-4070S-12G",
      "oldPrice": null,
      "newPrice": 17200000,
      "reason": "INITIAL",
      "changedBy": null,
      "changedAt": "2026-09-01T02:00:00Z"
    }
  ]
}
```

Lỗi: `GET /products/NOPE` → 404 `{"error_status":0,"error_message":"Không tìm thấy sản phẩm: NOPE","error_code":"NOT_FOUND","data":null}`;
`sort` sai → 400 (mẫu ở mục d).

### f.3 Tồn kho phía khách (K02, K03, K04, K09)

| Method | Path | Quyền | Query/Body | → |
|---|---|---|---|---|
| GET | `/inventory/{sku}` | public | | `StockResponse` (404 nếu SKU chưa có dòng tồn kho) |
| POST | `/inventory/batch` | public | `{skus}` (≤ 100) | `StockResponse[]` (SKU lạ → `available: 0`) |

`GET /inventory/GPU-MSI-4070S-12G` (khách vãng lai) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "sku": "GPU-MSI-4070S-12G",
    "available": 55,
    "inStock": true
  }
}
```

`POST /inventory/batch` (khách vãng lai) → **HTTP 200**<br>Body: `{"skus": ["CPU-I5-14600K", "PSU-CORSAIR-RM750E", "NOPE"]}`

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": [
    {
      "sku": "CPU-I5-14600K",
      "available": 87,
      "inStock": true
    },
    {
      "sku": "PSU-CORSAIR-RM750E",
      "available": 5,
      "inStock": true
    },
    {
      "sku": "NOPE",
      "available": 0,
      "inStock": false
    }
  ]
}
```

### f.4 Kiểm tra tương thích, PC Builder (K04, K05, K11)

| Method | Path | Quyền | Query/Body | → |
|---|---|---|---|---|
| POST | `/compatibility/check` | public | `{skus}`: 1–30, SKU lặp = nhiều chiếc | `CompatibilityCheckResult` |
| GET | `/pc-builds/my` | user | | `PcBuild[]` |
| GET | `/pc-builds/{code}` | public nếu `isPublic`, ngược lại owner/STAFF | | `PcBuild` |
| POST | `/pc-builds` | user | `PcBuildRequest` | `PcBuild` |
| PUT | `/pc-builds/{code}` | owner | `PcBuildRequest` | `PcBuild` |
| DELETE | `/pc-builds/{code}` | owner | | `null` (xóa thật) |
| POST | `/pc-builds/bulk-delete` | owner | `{codes}` | `{deleted}` |

Cấu hình hợp lệ (i5-14600K + B760M DDR5 + 32GB DDR5 + RTX 4070 SUPER + RM750e):

`POST /compatibility/check` (khách vãng lai) → **HTTP 200**<br>Body: `{"skus": ["CPU-I5-14600K", "MB-ASUS-B760M-D5", "RAM-KINGSTON-32G-D5", "GPU-MSI-4070S-12G", "PSU-CORSAIR-RM750E"]}`

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "compatible": true,
    "issues": [],
    "estimatedWattage": 345,
    "requiredWattage": 414
  }
}
```

Sai socket (Ryzen 5 7600X AM5 + mainboard LGA1700):

`POST /compatibility/check` (khách vãng lai) → **HTTP 200**<br>Body: `{"skus": ["CPU-R5-7600X", "MB-ASUS-B760M-D5"]}`

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "compatible": false,
    "issues": [
      {
        "ruleCode": "CPU_MB_SOCKET",
        "severity": 1,
        "message": "CPU AMD Ryzen 5 7600X dùng socket AM5 không khớp mainboard ASUS TUF B760M-PLUS WIFI DDR5 (LGA1700)"
      }
    ],
    "estimatedWattage": 105,
    "requiredWattage": 126
  }
}
```

Body sai (Quarkus, không có envelope):

`POST /compatibility/check` (khách vãng lai) → **HTTP 400**<br>Body: `{"skus": []}`

```json
{
  "error_status": 0,
  "error_message": "skus: không được để trống",
  "error_code": "VALIDATION_ERROR",
  "data": [
    {
      "field": "skus",
      "message": "không được để trống"
    }
  ]
}
```

`POST /pc-builds` với RTX 4080 SUPER + nguồn 500W (lưu được dù không tương thích, kết quả nằm trong `compatibilityResult`):

`POST /pc-builds` (customer1) → **HTTP 200**<br>Body: `{"name": "PC gaming 2K", "purpose": "GAMING", "budget": 35000000, "items": [{"sku": "CPU-I5-14600K", "quantity": 1}, {"sku": "MB-ASUS-B760M-D5", "quantity": 1}, {"sku": "RAM-KINGSTON-32G-D5", "quantity": 1}, {"sku": "GPU-ASUS-4080S-16G", "quantity": 1}, {"sku": "PSU-MSI-A500DN", "quantity": 1}], "isPublic": true}`

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "id": "6ae0cbf57fe8ef17e7ec8914",
    "code": "PC326YTFB7",
    "userId": "11111111-1111-1111-1111-111111111111",
    "name": "PC gaming 2K",
    "purpose": "GAMING",
    "budget": 35000000,
    "items": [
      {
        "slot": "CPU",
        "productId": "6adcb0cc2444ef877c391298",
        "sku": "CPU-I5-14600K",
        "name": "Intel Core i5-14600K",
        "quantity": 1,
        "priceAtTime": 7990000
      },
      {
        "slot": "MAINBOARD",
        "productId": "6adcb0cc2444ef877c391299",
        "sku": "MB-ASUS-B760M-D5",
        "name": "ASUS TUF B760M-PLUS WIFI DDR5",
        "quantity": 1,
        "priceAtTime": 4290000
      },
      "...(+3)"
    ],
    "totalPrice": 49050000,
    "estimatedWattage": 445,
    "requiredWattage": 534,
    "compatibilityResult": {
      "isCompatible": false,
      "checkedAt": "2026-10-27T16:06:13.717948400Z",
      "issues": [
        {
          "ruleCode": "PSU_WATTAGE",
          "severity": 1,
          "message": "Tổng công suất ước tính 534W vượt khả năng nguồn MSI MAG A500DN 500W 80 Plus (500W, đã tính hệ số an toàn)"
        }
      ]
    },
    "isAiGenerated": false,
    "isPublic": true,
    "createdAt": "2026-10-27T16:06:13.642724800Z",
    "updatedAt": "2026-10-27T16:06:13.721985800Z"
  }
}
```

`GET /pc-builds/{code}` của người khác khi `isPublic=false`:

`GET /pc-builds/PC326YTFB7` (customer2) → **HTTP 403**

```json
{
  "error_status": 0,
  "error_message": "Cấu hình này không được chia sẻ công khai",
  "error_code": "FORBIDDEN",
  "data": null
}
```

`POST /pc-builds/bulk-delete` (customer1) → **HTTP 200**<br>Body: `{"codes": ["PCX7JXM7LE"]}`

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "deleted": 1
  }
}
```

`DELETE /pc-builds/PC326YTFB7` (customer1) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": null
}
```

### f.5 Giỏ hàng (K05, K04, K09)

Không token thì gửi `X-Guest-Key`. Mọi thao tác ghi trả về giỏ đầy đủ (`CartView`), trừ `DELETE /cart`.

| Method | Path | Quyền | Query/Body | → |
|---|---|---|---|---|
| GET | `/cart` | public (guest key) / user | | `CartView` |
| POST | `/cart/items` | public / user | `{sku, quantity 1–99}` (cộng dồn) | `CartView` |
| POST | `/cart/items/bulk` | public / user | `{items: [{sku, quantity}]}` (≤ 100) | `CartView` |
| PUT | `/cart/items/{sku}` | public / user | `{quantity 0–99}` (0 = xóa) | `CartView` |
| DELETE | `/cart/items/{sku}` | public / user | | `CartView` |
| DELETE | `/cart` | public / user | | `null` |
| POST | `/cart/merge` | user + header `X-Guest-Key` | | `CartView` (giỏ tài khoản sau khi gộp) |

Lưu ý: thêm SKU không tồn tại vẫn thành công (giỏ lưu SKU thô); khi xem giỏ, dòng đó có `purchasable=false`,
`message: "Sản phẩm không còn tồn tại"`. Giỏ không kiểm tra tồn kho lúc thêm, chỉ khi xem.

`POST /cart/items/bulk` (khách vãng lai):

`POST /cart/items/bulk` (khách vãng lai + X-Guest-Key) → **HTTP 200**<br>Body: `{"items": [{"sku": "MB-ASUS-B760M-D5", "quantity": 1}, {"sku": "PSU-CORSAIR-RM750E", "quantity": 1}]}`

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "items": [
      {
        "sku": "CPU-I5-14600K",
        "quantity": 1,
        "productId": "6adcb0cc2444ef877c391298",
        "name": "Intel Core i5-14600K",
        "slug": "intel-core-i5-14600k",
        "imageUrl": null,
        "categoryCode": "CPU",
        "unitPrice": 7990000,
        "lineTotal": 7990000,
        "available": 87,
        "purchasable": true,
        "message": null,
        "warrantyMonths": 36
      },
      {
        "sku": "MB-ASUS-B760M-D5",
        "quantity": 1,
        "productId": "6adcb0cc2444ef877c391299",
        "name": "ASUS TUF B760M-PLUS WIFI DDR5",
        "slug": "asus-tuf-b760m-plus-wifi-ddr5",
        "imageUrl": null,
        "categoryCode": "MAINBOARD",
        "unitPrice": 4290000,
        "lineTotal": 4290000,
        "available": 8,
        "purchasable": true,
        "message": null,
        "warrantyMonths": 36
      },
      "...(+1)"
    ],
    "totalQuantity": 3,
    "subtotal": 14970000,
    "warnings": []
  }
}
```

`POST /cart/merge` (customer2 đăng nhập, gửi kèm guest key):

`POST /cart/merge` (customer2) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "items": [
      {
        "sku": "CPU-I5-14600K",
        "quantity": 2,
        "productId": "6adcb0cc2444ef877c391298",
        "name": "Intel Core i5-14600K",
        "slug": "intel-core-i5-14600k",
        "imageUrl": null,
        "categoryCode": "CPU",
        "unitPrice": 7990000,
        "lineTotal": 15980000,
        "available": 87,
        "purchasable": true,
        "message": null,
        "warrantyMonths": 36
      },
      {
        "sku": "PSU-CORSAIR-RM750E",
        "quantity": 1,
        "productId": "6adcb0cc2444ef877c39129c",
        "name": "Corsair RM750e 750W 80 Plus Gold",
        "slug": "corsair-rm750e-750w",
        "imageUrl": null,
        "categoryCode": "PSU",
        "unitPrice": 2690000,
        "lineTotal": 2690000,
        "available": 5,
        "purchasable": true,
        "message": null,
        "warrantyMonths": 84
      }
    ],
    "totalQuantity": 3,
    "subtotal": 18670000,
    "warnings": []
  }
}
```

Không token, không guest key:

`GET /cart` (khách vãng lai) → **HTTP 401**

```json
{
  "error_status": 0,
  "error_message": "Cần đăng nhập hoặc gửi header X-Guest-Key (16-64 ký tự A-Z, a-z, 0-9, -)",
  "error_code": "UNAUTHORIZED",
  "data": null
}
```

Vượt 99:

`POST /cart/items` (customer1) → **HTTP 400**<br>Body: `{"sku": "GPU-MSI-4070S-12G", "quantity": 99}`

```json
{
  "error_status": 0,
  "error_message": "Mỗi sản phẩm tối đa 99 chiếc",
  "error_code": "BAD_REQUEST",
  "data": null
}
```

`DELETE /cart` (customer2) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": null
}
```

### f.6 Voucher, xem trước thanh toán (K06)

| Method | Path | Quyền | Query/Body | → |
|---|---|---|---|---|
| GET | `/vouchers` | public | | `PublicVoucher[]` (đang bật, trong hạn, còn lượt) |
| POST | `/vouchers/validate` | user | `{code, subtotal, categories[]}` | `VoucherEvaluation` (luôn 200) |
| POST | `/checkout/preview` | user | `{voucherCode?, addressId?}` | `CheckoutPreview` |
| POST | `/orders` | user | `PlaceOrderRequest` | `OrderDetail` (status 1) |

`GET /vouchers` (khách vãng lai) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": [
    {
      "code": "GIAMQ6IQE5",
      "name": "Giảm 10%",
      "type": 1,
      "value": 10,
      "maxDiscountAmount": null,
      "minOrderAmount": 0,
      "applicableCategories": [],
      "perUserLimit": 1,
      "startAt": null,
      "endAt": null
    }
  ]
}
```

`POST /vouchers/validate` (customer1) → **HTTP 200**<br>Body: `{"code": "WELCOME10", "subtotal": 19780000, "categories": ["GPU", "RAM"]}`

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "valid": true,
    "code": "WELCOME10",
    "name": "Giảm 10% cho đơn đầu tiên",
    "type": 1,
    "discountAmount": 500000,
    "freeShipping": false,
    "reason": null
  }
}
```

`POST /vouchers/validate` (customer1) → **HTTP 200**<br>Body: `{"code": "WELCOME10", "subtotal": 500000, "categories": ["RAM"]}`

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "valid": false,
    "code": "WELCOME10",
    "name": null,
    "type": null,
    "discountAmount": 0,
    "freeShipping": false,
    "reason": "Đơn tối thiểu 1000000đ để dùng mã này"
  }
}
```

`POST /checkout/preview {"voucherCode":"WELCOME10","addressId":2}`:

`POST /checkout/preview` (customer1) → **HTTP 200**<br>Body: `{"voucherCode": "WELCOME10", "addressId": 2}`

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "items": [
      {
        "sku": "GPU-MSI-4070S-12G",
        "quantity": 1,
        "productId": "6adcb0cc2444ef877c39129b",
        "name": "MSI GeForce RTX 4070 SUPER 12GB Ventus 2X",
        "imageUrl": null,
        "categoryCode": "GPU",
        "unitPrice": 16990000,
        "lineTotal": 16990000,
        "available": 55,
        "purchasable": true,
        "message": null,
        "warrantyMonths": 36
      },
      {
        "sku": "RAM-KINGSTON-32G-D5",
        "quantity": 1,
        "productId": "6adcb0cc2444ef877c39129a",
        "name": "Kingston Fury Beast 32GB (2x16GB) DDR5 6000",
        "imageUrl": null,
        "categoryCode": "RAM",
        "unitPrice": 2790000,
        "lineTotal": 2790000,
        "available": 20,
        "purchasable": true,
        "message": null,
        "warrantyMonths": 36
      }
    ],
    "subtotal": 19780000,
    "discountAmount": 500000,
    "shippingFee": 0,
    "totalAmount": 19280000,
    "voucher": {
      "valid": true,
      "code": "WELCOME10",
      "name": "Giảm 10% cho đơn đầu tiên",
      "type": 1,
      "discountAmount": 500000,
      "freeShipping": false,
      "reason": null
    },
    "address": {
      "id": 2,
      "receiverName": "Khách Một (công ty)",
      "receiverPhone": "0900000011",
      "provinceCode": "48",
      "provinceName": "Thành phố Đà Nẵng",
      "wardCode": "48001",
      "wardName": "Phường Hải Châu",
      "addressDetail": "10 Bạch Đằng",
      "isDefault": true
    },
    "warnings": [],
    "canPlaceOrder": true
  }
}
```

Chưa chọn địa chỉ, mã FREESHIP:

`POST /checkout/preview` (customer1) → **HTTP 200**<br>Body: `{"voucherCode": "FREESHIP"}`

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "items": [
      {
        "sku": "GPU-MSI-4070S-12G",
        "quantity": 1,
        "productId": "6adcb0cc2444ef877c39129b",
        "name": "MSI GeForce RTX 4070 SUPER 12GB Ventus 2X",
        "imageUrl": null,
        "categoryCode": "GPU",
        "unitPrice": 16990000,
        "lineTotal": 16990000,
        "available": 55,
        "purchasable": true,
        "message": null,
        "warrantyMonths": 36
      },
      "...(+1)"
    ],
    "subtotal": 19780000,
    "discountAmount": 0,
    "shippingFee": 0,
    "totalAmount": 19780000,
    "voucher": {
      "valid": true,
      "code": "FREESHIP",
      "name": "Miễn phí vận chuyển",
      "type": 3,
      "discountAmount": 0,
      "freeShipping": true,
      "reason": null
    },
    "address": null,
    "warnings": [
      "Chưa chọn địa chỉ giao hàng, phí vận chuyển đang tính theo mức ngoại vùng"
    ],
    "canPlaceOrder": false
  }
}
```

Giỏ trống → 400 `{"error_status":0,"error_message":"Giỏ hàng trống","error_code":"BAD_REQUEST","data":null}`; `addressId` không
thuộc user → 400 "Địa chỉ giao hàng không tồn tại trong sổ địa chỉ của bạn".

### f.7 Đơn hàng phía khách (K07)

| Method | Path | Quyền | Query/Body | → |
|---|---|---|---|---|
| GET | `/orders/my` | user | `status?`, `page` (0), `size` (10) | `PageResponse<Order>` (mới nhất trước) |
| GET | `/orders/{code}` | owner hoặc STAFF | | `OrderDetail` |
| GET | `/orders/{code}/timeline` | owner hoặc STAFF | | `OrderStatusHistory[]` |
| POST | `/orders/{code}/cancel` | owner, khi status 1/2/4 và chưa thanh toán | `{reason}` (bắt buộc, ≤ 255) | `Order` |

`GET /orders/my?size=2` (customer1) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "content": [
      {
        "createdBy": "11111111-1111-1111-1111-111111111111",
        "createdAt": "2026-10-24T22:30:07.773398",
        "updatedBy": "33333333-3333-3333-3333-333333333333",
        "updatedAt": "2026-10-27T11:11:58.384197",
        "id": 7,
        "code": "DH20261023000007",
        "userId": "11111111-1111-1111-1111-111111111111",
        "status": 6,
        "paymentMethod": 1,
        "paymentStatus": 2,
        "subtotalAmount": 3180000,
        "discountAmount": 0,
        "shippingFee": 20000,
        "totalAmount": 3200000,
        "voucherCode": null,
        "receiverName": "Khách Một",
        "receiverPhone": "0900000001",
        "shippingAddress": "1 Lê Lợi, Phường Bến Thành, Thành phố Hồ Chí Minh",
        "note": null,
        "pcBuildId": null,
        "cancelReason": null,
        "placedAt": "2026-10-24T22:30:07.773398",
        "completedAt": "2026-10-27T11:11:58.382784",
        "version": 0
      },
      "...(+1)"
    ],
    "page": {
      "size": 2,
      "number": 0,
      "totalElements": 4,
      "totalPages": 2
    }
  }
}
```

`GET /orders/DH20261024000001` (customer1) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "order": {
      "createdBy": "11111111-1111-1111-1111-111111111111",
      "createdAt": "2026-10-24T20:25:34.732737",
      "updatedBy": "11111111-1111-1111-1111-111111111111",
      "updatedAt": "2026-10-27T11:11:55.255209",
      "id": 1,
      "code": "DH20261024000001",
      "userId": "11111111-1111-1111-1111-111111111111",
      "status": 7,
      "paymentMethod": 1,
      "paymentStatus": 1,
      "subtotalAmount": 25990000,
      "discountAmount": 0,
      "shippingFee": 0,
      "totalAmount": 25990000,
      "voucherCode": null,
      "receiverName": "Khách Một",
      "receiverPhone": "0900000001",
      "shippingAddress": "1 Lê Lợi, Phường Bến Thành, TP. Hồ Chí Minh",
      "note": null,
      "pcBuildId": null,
      "cancelReason": "Đổi ý, muốn chọn card khác",
      "placedAt": "2026-10-24T20:25:34.732737",
      "completedAt": null
    },
    "items": [
      {
        "id": 1,
        "orderId": 1,
        "productId": "",
        "sku": "GPU-MSI-4070S-12G",
        "productName": "MSI GeForce RTX 4070 SUPER 12GB Ventus 2X",
        "productImageUrl": null,
        "categoryCode": "GPU",
        "unitPrice": 17200000,
        "quantity": 1,
        "discountAmount": 0,
        "lineTotal": 17200000,
        "warrantyMonths": 36,
        "createdAt": "2026-10-24T20:25:34.732737"
      },
      {
        "id": 2,
        "orderId": 1,
        "productId": "",
        "sku": "CPU-I5-14600K",
        "productName": "Intel Core i5-14600K",
        "productImageUrl": null,
        "categoryCode": "CPU",
        "unitPrice": 8790000,
        "quantity": 1,
        "discountAmount": 0,
        "lineTotal": 8790000,
        "warrantyMonths": 36,
        "createdAt": "2026-10-24T20:25:34.732737"
      }
    ]
  }
}
```

`GET /orders/DH20261005000003/timeline` (customer1) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": [
    {
      "id": 8,
      "orderId": 3,
      "fromStatus": null,
      "toStatus": 1,
      "reason": "Đặt hàng",
      "createdBy": "11111111-1111-1111-1111-111111111111",
      "createdAt": "2026-10-06T22:30:07.773398"
    },
    {
      "id": 7,
      "orderId": 3,
      "fromStatus": 1,
      "toStatus": 4,
      "reason": null,
      "createdBy": "33333333-3333-3333-3333-333333333333",
      "createdAt": "2026-10-07T00:30:07.773398"
    },
    {
      "id": 6,
      "orderId": 3,
      "fromStatus": 4,
      "toStatus": 5,
      "reason": null,
      "createdBy": "33333333-3333-3333-3333-333333333333",
      "createdAt": "2026-10-07T22:30:07.773398"
    },
    {
      "id": 5,
      "orderId": 3,
      "fromStatus": 5,
      "toStatus": 6,
      "reason": "Giao thành công, đã thu COD",
      "createdBy": "33333333-3333-3333-3333-333333333333",
      "createdAt": "2026-10-10T22:30:07.773398"
    }
  ]
}
```

`GET /orders/DH20261024000002` (customer1) → **HTTP 403**

```json
{
  "error_status": 0,
  "error_message": "Đây không phải đơn của bạn",
  "error_code": "FORBIDDEN",
  "data": null
}
```

`POST /orders/DH20261005000003/cancel` (customer1, đơn đã hoàn tất) → **HTTP 400**<br>Body: `{"reason": "Đổi ý"}`

```json
{
  "error_status": 0,
  "error_message": "Đơn đã thanh toán hoặc đang giao, không thể tự hủy. Vui lòng liên hệ cửa hàng",
  "error_code": "BAD_REQUEST",
  "data": null
}
```

`POST /orders` (customer1, giỏ có 2 case + 1 nguồn) → **HTTP 200**<br>Body: `{"addressId": 1, "paymentMethod": 1, "note": "Giao giờ hành chính", "expectedTotal": 7270000}`

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "order": {
      "createdBy": "11111111-1111-1111-1111-111111111111",
      "createdAt": "2026-11-08T10:31:05.534095",
      "updatedBy": "11111111-1111-1111-1111-111111111111",
      "updatedAt": "2026-11-08T10:31:05.534095",
      "id": 16,
      "code": "DH20261108001000",
      "userId": "11111111-1111-1111-1111-111111111111",
      "status": 1,
      "paymentMethod": 1,
      "paymentStatus": 1,
      "subtotalAmount": 7270000,
      "discountAmount": 0,
      "shippingFee": 0,
      "totalAmount": 7270000,
      "voucherCode": null,
      "receiverName": "Khách Một",
      "receiverPhone": "0900000001",
      "shippingAddress": "1 Lê Lợi, Phường Bến Thành, Thành phố Hồ Chí Minh",
      "note": "Giao giờ hành chính",
      "pcBuildId": null,
      "cancelReason": null,
      "placedAt": "2026-11-08T10:31:05.492792",
      "completedAt": null,
      "version": 0
    },
    "items": [
      {
        "id": 11,
        "orderId": 16,
        "productId": "6adf719d17897e99b062e100",
        "sku": "CASE-CORSAIR-4000D",
        "productName": "Corsair 4000D Airflow",
        "productImageUrl": null,
        "categoryCode": "CASE",
        "unitPrice": 2290000,
        "quantity": 2,
        "discountAmount": 0,
        "lineTotal": 4580000,
        "warrantyMonths": 24,
        "createdAt": "2026-11-08T10:31:05.565101"
      },
      {
        "id": 12,
        "orderId": 16,
        "productId": "6adcb0cc2444ef877c39129c",
        "sku": "PSU-CORSAIR-RM750E",
        "productName": "Corsair RM750e 750W 80 Plus Gold",
        "productImageUrl": null,
        "categoryCode": "PSU",
        "unitPrice": 2690000,
        "quantity": 1,
        "discountAmount": 0,
        "lineTotal": 2690000,
        "warrantyMonths": 84,
        "createdAt": "2026-11-08T10:31:05.578617"
      }
    ]
  }
}
```

Khoảng 1–3 giây sau, `GET /orders/DH20261108001000` trả `status: 4` (COD đã giữ hàng); timeline có thêm dòng
`{fromStatus: 1, toStatus: 4, reason: "Đã giữ hàng, chờ giao", createdBy: null}`.

`POST /orders` với `expectedTotal` khác tổng tính lại → **HTTP 409**

```json
{
  "error_status": 0,
  "error_message": "Tổng tiền đã thay đổi thành 2810000đ, vui lòng xem lại đơn hàng",
  "error_code": "CONFLICT",
  "data": { "items": [ "…như CheckoutPreview…" ], "totalAmount": 2810000, "canPlaceOrder": true }
}
```

`POST /orders` với mã giảm giá sai → **HTTP 422** `{"error_code": "VOUCHER_INVALID", "error_message": "Mã giảm giá không tồn tại", "data": null}`.
Giỏ có món hết hàng/ngừng bán → **HTTP 409** `OUT_OF_STOCK`, `data` = mảng `warnings` như preview. Giỏ trống → 400 "Giỏ hàng trống".

### f.7b Thanh toán online, hoàn tiền (K06, K07, A06)

| Method | Path | Quyền | Query/Body | → |
|---|---|---|---|---|
| POST | `/payments/{orderCode}` | owner, đơn status 2, không phải COD | | `PaymentInit` |
| GET | `/payments/{orderCode}` | owner hoặc STAFF | | `Payment[]` (mới nhất trước) |
| GET | `/admin/refunds?status=` | STAFF, ADMIN | `status` 1 chờ hoàn / 2 đã hoàn | `RefundView[]` |
| PATCH | `/admin/refunds/{id}/complete` | perm `order:update-status` | `{providerRefundId?}` | `Refund` |

Luồng: trang đơn (status 2) có nút "Thanh toán ngay" → `POST /payments/{code}` → `window.location = paymentUrl`.
Thanh toán xong, backend chuyển trình duyệt tới `/orders/payment-result?orderCode=...&result=...` của frontend:

| `result` | Hiển thị |
|---|---|
| `success` | "Thanh toán thành công", đọc lại đơn (status 3) |
| `failed` | "Thanh toán chưa thành công", nút "Thử lại" (gọi lại `POST /payments/{code}`, được đến khi hết hạn 15 phút) |
| `refund` | "Đơn đã bị hủy trước khi tiền về, cửa hàng sẽ hoàn tiền" |
| `invalid` | "Không xác nhận được giao dịch", nút về trang đơn (không có `orderCode`) |

`POST /payments/DH20261108001008` (customer1, đơn VNPay chờ thanh toán) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "paymentCode": "DH20261108001008-01",
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=1699000000&vnp_Command=pay&...&vnp_SecureHash=5f1c...",
    "amount": 16990000,
    "expiresAt": "2026-11-08T12:19:58.40651",
    "gateway": "VNPAY"
  }
}
```

`gateway`: `VNPAY` khi backend có khóa VNPay; `MOCK` (MoMo, hoặc chưa cấu hình VNPay) → `paymentUrl` là trang giả lập của backend có
hai nút "Thanh toán thành công / thất bại". Frontend xử lý hai loại như nhau.

`GET /admin/refunds?status=1` (staff1) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": [
    {
      "id": 1,
      "orderCode": "DH20261108001008",
      "paymentCode": "DH20261108001008-02",
      "method": 2,
      "amount": 16990000,
      "reason": "Trả hàng: Card lỗi quạt",
      "status": 1,
      "providerRefundId": null,
      "createdAt": "2026-11-08T12:05:09.352313",
      "updatedAt": "2026-11-08T12:05:09.352313"
    }
  ]
}
```

Yêu cầu hoàn tiền tự sinh khi: hủy (7) hoặc trả hàng (8) đơn đã thu tiền (`paymentStatus = 2`, kể cả COD đã giao xong), hoặc tiền về
sau khi đơn đã bị hủy. Chưa gọi API hoàn tiền của cổng: nhân viên hoàn trên trang VNPay (hoặc trả tiền mặt) rồi bấm "Đã hoàn"
→ đơn `paymentStatus = 3`.

### f.8 Tài khoản, địa chỉ, hành chính (K06, K08)

| Method | Path | Quyền | Query/Body | → |
|---|---|---|---|---|
| GET | `/me` | user | | `MeResponse` |
| PUT | `/me` | user | `UpdateProfileRequest` (gửi đủ 3 trường) | `CustomerProfile` |
| GET | `/addresses` | user | | `UserAddress[]` (mặc định lên đầu) |
| GET | `/addresses/{id}` | owner | | `UserAddress` |
| POST | `/addresses` | user | `AddressRequest` (tối đa 10 địa chỉ) | `UserAddress` |
| PUT | `/addresses/{id}` | owner | `AddressRequest` | `UserAddress` |
| DELETE | `/addresses/{id}` | owner | | `null` (xóa thật; xóa địa chỉ mặc định thì địa chỉ mới nhất còn lại thành mặc định) |
| PATCH | `/addresses/{id}/default` | owner | | `UserAddress` |
| GET | `/locations/provinces` | public | | `ProvinceItem[]` (34 tỉnh/thành) |
| GET | `/locations/provinces/{code}/wards` | public | | `Ward[]` |

`GET /me` (customer1) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "id": "11111111-1111-1111-1111-111111111111",
    "username": "customer1",
    "email": "customer1@pcshop.local",
    "roles": [
      "CUSTOMER"
    ],
    "permissions": [],
    "profile": {
      "createdBy": "11111111-1111-1111-1111-111111111111",
      "createdAt": "2026-10-24T20:31:08.314605",
      "updatedBy": "11111111-1111-1111-1111-111111111111",
      "updatedAt": "2026-10-27T11:11:33.906666",
      "id": "11111111-1111-1111-1111-111111111111",
      "displayName": "Khách Một",
      "email": "customer1@pcshop.local",
      "phoneNumber": "0912345678",
      "avatarFileId": null,
      "gender": 1,
      "birthDate": "2003-05-20"
    }
  }
}
```

`PUT /me` (customer1) → **HTTP 400**<br>Body: `{"phoneNumber": "12345"}`

```json
{
  "error_status": 0,
  "error_message": "phoneNumber: Số điện thoại không hợp lệ",
  "error_code": "VALIDATION_ERROR",
  "data": [
    {
      "field": "phoneNumber",
      "message": "Số điện thoại không hợp lệ"
    }
  ]
}
```

`GET /addresses` (customer1) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": [
    {
      "createdBy": "11111111-1111-1111-1111-111111111111",
      "createdAt": "2026-10-26T22:28:34.360861",
      "updatedBy": "11111111-1111-1111-1111-111111111111",
      "updatedAt": "2026-10-27T11:22:18.728713",
      "id": 2,
      "userId": "11111111-1111-1111-1111-111111111111",
      "receiverName": "Khách Một (công ty)",
      "receiverPhone": "0900000011",
      "provinceCode": "48",
      "provinceName": "Thành phố Đà Nẵng",
      "wardCode": "48001",
      "wardName": "Phường Hải Châu",
      "addressDetail": "10 Bạch Đằng",
      "isDefault": true
    },
    "...(+1)"
  ]
}
```

`POST /addresses` (customer1) → **HTTP 200**<br>Body: `{"receiverName": "Khách Một (test)", "receiverPhone": "0900000099", "provinceCode": "79", "wardCode": "79001", "addressDetail": "12 Nguyễn Huệ", "isDefault": false}`

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "createdBy": "11111111-1111-1111-1111-111111111111",
    "createdAt": "2026-10-27T23:06:07.0266094",
    "updatedBy": "11111111-1111-1111-1111-111111111111",
    "updatedAt": "2026-10-27T23:06:07.0266094",
    "id": 8,
    "userId": "11111111-1111-1111-1111-111111111111",
    "receiverName": "Khách Một (test)",
    "receiverPhone": "0900000099",
    "provinceCode": "79",
    "provinceName": "Thành phố Hồ Chí Minh",
    "wardCode": "79001",
    "wardName": "Phường Sài Gòn",
    "addressDetail": "12 Nguyễn Huệ",
    "isDefault": false
  }
}
```

`POST /addresses` (customer1) → **HTTP 400**<br>Body: `{"receiverName": "X", "receiverPhone": "0900000099", "provinceCode": "79", "wardCode": "01001", "addressDetail": "x"}`

```json
{
  "error_status": 0,
  "error_message": "Mã phường/xã không thuộc Thành phố Hồ Chí Minh: 01001",
  "error_code": "BAD_REQUEST",
  "data": null
}
```

`DELETE /addresses/8` (customer1) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": null
}
```

`GET /locations/provinces` (khách vãng lai) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": [
    {
      "code": "01",
      "name": "Thành phố Hà Nội"
    },
    {
      "code": "04",
      "name": "Tỉnh Cao Bằng"
    },
    "...(+32)"
  ]
}
```

`GET /locations/provinces/79/wards` (khách vãng lai) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": [
    {
      "code": "79001",
      "name": "Phường Sài Gòn"
    },
    {
      "code": "79002",
      "name": "Phường Bến Thành"
    },
    "...(+3)"
  ]
}
```

Dữ liệu hành chính hiện là bản tạm: đủ 34 tỉnh/thành (sau sắp xếp 2025), mỗi tỉnh chỉ vài phường/xã mẫu.

### f.9 Đánh giá phía khách (K03)

| Method | Path | Quyền | Query/Body | → |
|---|---|---|---|---|
| GET | `/reviews` | public | `sku` hoặc `productId` (= `Product.id`), `page` (0), `size` (10) | `PageResponse<Review>` (chỉ đã duyệt) |
| GET | `/reviews/stats` | public | `sku` hoặc `productId` | `ReviewStats` |
| GET | `/reviews/{id}` | public nếu đã duyệt, ngược lại người viết/STAFF | | `Review` |
| POST | `/reviews` | user | `CreateReviewRequest` | `Review` (status 1; đã có → 409) |
| PUT | `/reviews/{id}` | owner, chỉ khi status 1 | `UpdateReviewRequest` | `Review` |
| DELETE | `/reviews/{id}` | owner | | `Review` (status 4) |
| GET | `/orders/purchased?sku=` | user | | `{sku, purchased, orderCode}` (đơn hoàn tất gần nhất chứa SKU) |

Khi tạo review, backend tự hỏi ordering: người viết có đơn **hoàn tất** chứa SKU → `verifiedPurchase = true`, `orderCode` = đơn đó
(hiện nhãn "Đã mua hàng"). Mỗi người một review còn hiệu lực cho mỗi (sản phẩm, đơn): mua lại ở đơn khác thì viết thêm được.
Duyệt / từ chối / gỡ review → vài giây sau `Product.ratingAvg`, `ratingCount` tự cập nhật (chỉ tính review đã duyệt).

`POST /reviews` (customer2) → **HTTP 200**<br>Body: `{"sku": "CASE-CORSAIR-4000D", "rating": 5, "title": "Case rộng, dễ đi dây", "content": "Lắp mATX dư chỗ, airflow tốt."}`

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "id": "6ae0cbfce8f7b4c996878bba",
    "productId": "6adf719d17897e99b062e100",
    "sku": "CASE-CORSAIR-4000D",
    "userId": "22222222-2222-2222-2222-222222222222",
    "userDisplayName": "Khách Hai",
    "orderCode": null,
    "rating": 5,
    "title": "Case rộng, dễ đi dây",
    "content": "Lắp mATX dư chỗ, airflow tốt.",
    "verifiedPurchase": false,
    "status": 1,
    "helpfulCount": 0,
    "adminReply": null,
    "createdAt": "2026-10-27T16:06:20.459035900Z",
    "updatedAt": "2026-10-27T16:06:20.459035900Z"
  }
}
```

`GET /reviews?sku=CASE-CORSAIR-4000D` (khách vãng lai) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "content": [
      {
        "id": "6ae0cbfce8f7b4c996878bba",
        "productId": "6adf719d17897e99b062e100",
        "sku": "CASE-CORSAIR-4000D",
        "userId": "22222222-2222-2222-2222-222222222222",
        "userDisplayName": "Khách Hai",
        "orderCode": null,
        "rating": 4,
        "title": "Case rộng, dễ đi dây",
        "content": "Lắp mATX dư chỗ, airflow tốt. Hơi ồn.",
        "verifiedPurchase": false,
        "status": 2,
        "helpfulCount": 0,
        "adminReply": {
          "content": "Cảm ơn bạn đã tin dùng PC Shop!",
          "repliedBy": "33333333-3333-3333-3333-333333333333",
          "repliedAt": "2026-10-27T16:06:21.776Z"
        },
        "createdAt": "2026-10-27T16:06:20.459Z",
        "updatedAt": "2026-10-27T16:06:21.776Z"
      }
    ],
    "page": {
      "size": 10,
      "number": 0,
      "totalElements": 1,
      "totalPages": 1
    }
  }
}
```

`GET /reviews/stats?sku=CASE-CORSAIR-4000D` (khách vãng lai) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "productId": null,
    "sku": "CASE-CORSAIR-4000D",
    "average": 4,
    "count": 1,
    "distribution": {
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 1,
      "5": 0
    }
  }
}
```

`PUT /reviews/6ae0cbfce8f7b4c996878bba` (customer2) → **HTTP 400**<br>Body: `{"rating": 3}`

```json
{
  "error_status": 0,
  "error_message": "Chỉ sửa được review đang chờ duyệt",
  "error_code": "BAD_REQUEST",
  "data": null
}
```

Review mới luôn ở trạng thái "Chờ duyệt": sau khi gửi, hiện "Đánh giá của bạn đang chờ duyệt" và hiển thị riêng cho chính người
viết (không nằm trong `GET /reviews`). Chưa có API "đánh giá của tôi": giữ id review vừa tạo ở localStorage nếu cần hiện lại.

### f.10 Thông báo (K10)

| Method | Path | Quyền | Query/Body | → |
|---|---|---|---|---|
| GET | `/notifications` | user | `page`, `size` | `PageResponse<Notification>` |
| GET | `/notifications/unread-count` | user | | `{count}` |
| PATCH | `/notifications/{id}/read` | owner | | `Notification` |
| PATCH | `/notifications/read-all` | user | | `{updated}` |
| POST | `/notifications/stream-ticket` | user | | `{ticket, expiresIn}` (vé dùng 1 lần, 60 giây) |
| GET | `/notifications/stream` | Bearer **hoặc** `?ticket=` | | `text/event-stream` |

**Realtime (SSE).** `EventSource` của trình duyệt không gửi được header `Authorization`, nên mở stream bằng vé:

```ts
const { data } = await api.post('/notifications/stream-ticket');            // có Bearer như mọi API
const es = new EventSource(`${BASE}/api/v1/notifications/stream?ticket=${data.ticket}`);
es.addEventListener('unread-count', e => setUnread(JSON.parse(e.data).count));   // gửi ngay khi kết nối
es.addEventListener('notification', e => onNew(JSON.parse(e.data) as Notification));
es.onerror = () => { es.close(); /* chờ vài giây, lấy vé MỚI rồi mở lại (vé chỉ dùng 1 lần) */ };
```

Hoặc dùng thư viện SSE trên `fetch` (vd `@microsoft/fetch-event-source`) với header `Authorization: Bearer`, không cần vé.
Server gửi comment `: ping` mỗi 25 giây để giữ kết nối (EventSource tự bỏ qua). Mỗi tab một kết nối; đóng stream khi đăng xuất.

**Email.** Mỗi lần đơn đổi trạng thái 2–8, ngoài thông báo trong ứng dụng còn gửi email tới email của tài khoản lúc đặt đơn
(nút "Xem đơn" / "Thanh toán ngay" trỏ về `/orders/:code` của frontend). Trả lời review chỉ có thông báo trong ứng dụng.

Thông báo tự sinh (`channel` IN_APP):

| Khi | `type` | `title` | `data` |
|---|---|---|---|
| Đơn → 2 | ORDER_STATUS | Chờ thanh toán | `{order_code, status}` |
| Đơn → 3 | PAYMENT | Thanh toán thành công | `{order_code, status}` |
| Đơn → 4 / 5 / 6 | ORDER_STATUS | Đơn hàng đã được xác nhận / đang được giao / Giao hàng thành công | `{order_code, status}` |
| Đơn → 7 / 8 | ORDER_STATUS | Đơn hàng đã bị hủy / đã được trả (`content` kèm lý do) | `{order_code, status}` |
| Cửa hàng trả lời review | REVIEW_REPLY | Cửa hàng đã trả lời đánh giá của bạn (`content` = 200 ký tự đầu) | `{review_id, sku, product_id}` |

Đơn ở 1 (đang giữ hàng, vài giây) không có thông báo.

`GET /notifications` (customer1) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "content": [
      {
        "id": "6adf71907daff3217a0eecd4",
        "userId": "11111111-1111-1111-1111-111111111111",
        "type": "ORDER_STATUS",
        "channel": "IN_APP",
        "title": "Đơn hàng đã được xác nhận",
        "content": "Đơn DH20261023000007 đã được cửa hàng xác nhận.",
        "data": {
          "order_code": "DH20261023000007"
        },
        "isRead": true,
        "readAt": "2026-10-27T04:12:08.198Z",
        "sendStatus": 2,
        "sourceEventId": null,
        "createdAt": "2026-10-25T15:28:16.345Z"
      },
      "...(+2)"
    ],
    "page": {
      "size": 20,
      "number": 0,
      "totalElements": 3,
      "totalPages": 1
    }
  }
}
```

`GET /notifications/unread-count` (customer1) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "count": 0
  }
}
```

`PATCH /notifications/read-all` (customer1) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "updated": 0
  }
}
```

`PATCH /notifications/abc/read` (customer1) → **HTTP 404**

```json
{
  "error_status": 0,
  "error_message": "Không tìm thấy thông báo: abc",
  "error_code": "NOT_FOUND",
  "data": null
}
```

### f.11 Chat AI (K09, A11)

| Method | Path | Quyền | Query/Body | → |
|---|---|---|---|---|
| POST | `/ai/chat` | public | `{sessionId?, message}` | `ChatResponse` |
| POST | `/ai/chat/stream` | public | `{sessionId?, message}` | SSE, mỗi `data:` một `ChatStreamEvent` |
| GET | `/ai/chat/sessions` | user | `limit` (≤ 50) | `ChatSessionSummary[]` |
| GET / DELETE | `/ai/chat/sessions/{sessionId}` | public (phiên đã gắn user: chủ phiên) | | `ChatSessionDetail` / null |
| POST | `/ai/chat/feedback` | public (như trên) | `{sessionId, requestId, value: 1|-1}` | null |
| GET | `/admin/knowledge` | perm:knowledge:write | `sourceType`, `status`, `q`, `page`, `size` | `PageResponse<KnowledgeDocument>` |
| GET | `/admin/knowledge/{id}` | perm:knowledge:write | | `KnowledgeDocumentDetail` |
| POST | `/admin/knowledge` | perm:knowledge:write | `KnowledgeRequest` | `IngestResult` |
| DELETE | `/admin/knowledge/{id}` | perm:knowledge:write | | null |
| POST | `/admin/knowledge/sync-products` | perm:knowledge:write | | `SyncResult` |
| GET | `/admin/knowledge/search` | perm:knowledge:write | `q`, `category`, `k` (1–20) | `ScoredChunk[]` |

Response thật (2026-11-21, gọi thẳng ai-service, model chạy CPU nên mất khoảng 1 phút):

```json
{ "error_status": 1, "error_message": null, "error_code": null,
  "data": { "sessionId": "0cdda6ae-fd67-4558-9e2a-7e5c243bdddf", "requestId": 6,
            "answer": "Xin lỗi, CPU AMD Ryzen 5 7600X (SKU: CPU-R5-7600X) và mainboard MSI PRO B760-P DDR4 (SKU: MB-MSI-B760-D4) không tương thích vì CPU dùng socket AM5 trong khi mainboard dùng socket LGA1700. ..." } }
```

Stream SSE thật của cùng câu hỏi:

```
data:{"type":"session","text":null,"sessionId":"0cdda6ae-...","requestId":null}
data:{"type":"status","text":"Đang tra cứu kho tri thức","sessionId":null,"requestId":null}
data:{"type":"status","text":"Đang kiểm tra độ tương thích của cấu hình","sessionId":null,"requestId":null}
data:{"type":"token","text":"Xin lỗi, CPU AMD Ryzen 5 7600X ...","sessionId":null,"requestId":null}
data:{"type":"done","text":null,"sessionId":"0cdda6ae-...","requestId":6}
```

Model lỗi giữa chừng (Ollama sập) thì sự kiện cuối là `{"type":"error","text":"Trợ lý AI đang bận hoặc chưa sẵn sàng, vui lòng thử lại sau."}`;
API `/ai/chat` trả HTTP 502 `EXTERNAL_SERVICE_ERROR` cùng thông báo.

Lỗi kiểm tra (thật):

`POST /ai/chat` (khách vãng lai) → **HTTP 400**<br>Body: `{"message": ""}`

```json
{
  "error_status": 0,
  "error_message": "message: không được để trống",
  "error_code": "VALIDATION_ERROR",
  "data": [
    {
      "field": "message",
      "message": "không được để trống"
    }
  ]
}
```

Khi LLM lỗi: HTTP 500, body có thể rỗng. Frontend hiện "Trợ lý AI đang bận, thử lại sau" và cho gửi lại tin nhắn.

### f.12 Media (A03, K08)

| Method | Path | Quyền | Query/Body | → |
|---|---|---|---|---|
| POST | `/media/upload` | theo bucket (mục d "Upload và tải file") | multipart `file`, `bucket` | `MediaFile` |
| GET | `/media/files/{id}` | public (bucket nội bộ: ADMIN/`knowledge:write`) | | nội dung file (dùng làm `<img src>`) |
| GET | `/media/files/{id}/view` | như trên | | nội dung file (cho fetch → blob) |
| GET | `/media/files/{id}/info` | như trên | | `MediaFile` |
| DELETE | `/media/files/{id}` | người upload hoặc ADMIN | | `null` |
| POST | `/media/files/bulk-delete` | người upload hoặc ADMIN | `{ids}` | `{deleted}` |

`POST /media/upload` (admin1) → **HTTP 200**<br>Form: `{"bucket": "products"}` + file

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "createdBy": "99999999-9999-9999-9999-999999999999",
    "createdAt": "2026-10-27T23:06:23.82654",
    "updatedBy": "99999999-9999-9999-9999-999999999999",
    "updatedAt": "2026-10-27T23:06:24.0542748",
    "id": 11,
    "fileName": "cpu.png",
    "storageType": 2,
    "objectKey": "8778be04-3e61-43e3-85a2-7a5f23f15f85.png",
    "bucket": "products",
    "url": "http://localhost:8000/api/v1/media/files/11",
    "mimeType": "image/png",
    "fileSize": 66,
    "checksum": null
  }
}
```

`POST /media/upload` (admin1) → **HTTP 400**<br>Form: `{"bucket": "nope"}` + file

```json
{
  "error_status": 0,
  "error_message": "Thiếu file hoặc bucket không hợp lệ [reviews, avatars, knowledge-docs, products]",
  "error_code": "BAD_REQUEST",
  "data": null
}
```

`POST /media/files/bulk-delete` (admin1) → **HTTP 200**<br>Body: `{"ids": [12]}`

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "deleted": 1
  }
}
```

### f.13 Dashboard (A01)

| Method | Path | Quyền | Query/Body | → |
|---|---|---|---|---|
| GET | `/admin/stats/overview` | STAFF | `from`, `to` (`yyyy-MM-dd`) | `StatsOverview` |
| GET | `/admin/stats/top-products` | STAFF | `from`, `to`, `limit` | `TopProduct[]` |
| GET | `/admin/stats/low-stock` | STAFF | | `Inventory[]` |

`GET /admin/stats/overview?from=2026-10-01&to=2026-10-31` (admin1) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "from": "2026-10-01",
    "to": "2026-10-31",
    "totalOrders": 7,
    "revenue": 35250000,
    "grossRevenue": 43240000,
    "ordersByStatus": {
      "1": 0,
      "2": 0,
      "3": 1,
      "4": 0,
      "5": 0,
      "6": 4,
      "7": 2,
      "8": 0
    }
  }
}
```

`GET /admin/stats/top-products?from=2026-10-01&to=2026-10-31&limit=5` (admin1) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": [
    {
      "sku": "RAM-KINGSTON-32G-D5",
      "productName": "Kingston Fury Beast 32GB (2x16GB) DDR5 6000",
      "quantity": 3,
      "revenue": 8370000
    },
    {
      "sku": "STORAGE-KINGSTON-NV2-1T",
      "productName": "Kingston NV2 1TB M.2 NVMe PCIe 4.0",
      "quantity": 2,
      "revenue": 3180000
    },
    "...(+3)"
  ]
}
```

`GET /admin/stats/low-stock` (staff1) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": [
    {
      "createdBy": null,
      "createdAt": "2026-10-26T22:28:27.371586",
      "updatedBy": null,
      "updatedAt": null,
      "id": 9,
      "productId": "",
      "sku": "CASE-MSI-M100R",
      "warehouseId": 1,
      "quantity": 1,
      "reservedQuantity": 0,
      "minQuantity": 2,
      "version": 0
    },
    "...(+2)"
  ]
}
```

### f.14 Quản trị sản phẩm (A02, A03)

Tất cả cần `perm:product:write` (thiếu → 403 "Thiếu quyền product:write").

| Method | Path | Query/Body | → |
|---|---|---|---|
| GET | `/admin/products` | `AdminProductListQuery` | `PageResponse<Product>` |
| GET | `/admin/products/{sku}` | | `Product` (mọi trạng thái) |
| POST | `/admin/products` | `CreateProductRequest` | `Product` |
| PUT | `/admin/products/{sku}` | `UpdateProductRequest` | `Product` |
| PATCH | `/admin/products/{sku}/status` | `{status}` | `Product` |
| PATCH | `/admin/products/{sku}/price` | `{price, originalPrice?, reason?}` | `Product` |
| POST | `/admin/products/bulk` | `BulkSaveRequest` | `BulkSaveResult` |
| PATCH | `/admin/products/bulk/status` | `{skus, status}` | `Product[]` |
| PATCH | `/admin/products/bulk/price` | `{items: [{sku, price, originalPrice?}], reason?}` | `Product[]` |
| GET | `/admin/products/export` | `category` (bắt buộc), `status` | file `.xlsx` |

`POST /admin/products` (admin1) → **HTTP 200**<br>Body: `{"sku": "DOC-TEST-O1CGI", "name": "Test tài liệu O1CGI", "categoryCode": "CPU", "brandCode": "INTEL", "shortDescription": "Sản phẩm thử", "price": 1000000, "originalPrice": 1200000, "specs": {"cores": 6}, "compat": {"socket": "LGA1700", "memory_types": ["DDR5"], "tdp_w": 65}, "tags": ["test"], "warrantyMonths": 12, "status": 1}`

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "id": "6ae0cc027fe8ef17e7ec8916",
    "sku": "DOC-TEST-O1CGI",
    "name": "Test tài liệu O1CGI",
    "slug": "test-tai-lieu-o1cgi",
    "categoryCode": "CPU",
    "brandCode": "INTEL",
    "shortDescription": "Sản phẩm thử",
    "description": null,
    "price": 1000000,
    "originalPrice": 1200000,
    "images": null,
    "specs": {
      "cores": 6
    },
    "compat": {
      "socket": "LGA1700",
      "memory_types": [
        "DDR5"
      ],
      "tdp_w": 65
    },
    "tags": [
      "test"
    ],
    "warrantyMonths": 12,
    "status": 1,
    "ratingAvg": null,
    "ratingCount": 0,
    "soldCount": 0,
    "createdBy": "99999999-9999-9999-9999-999999999999",
    "createdAt": "2026-10-27T16:06:26.398615300Z",
    "updatedBy": "99999999-9999-9999-9999-999999999999",
    "updatedAt": "2026-10-27T16:06:26.398615300Z"
  }
}
```

`POST /admin/products` (admin1) → **HTTP 400**<br>Body: `{"sku": "bad sku", "name": "x", "categoryCode": "CPU", "price": -1}`

```json
{
  "error_status": 0,
  "error_message": "price: phải lớn hơn 0, sku: SKU chỉ gồm A-Z, 0-9, -",
  "error_code": "VALIDATION_ERROR",
  "data": [
    {
      "field": "price",
      "message": "phải lớn hơn 0"
    },
    {
      "field": "sku",
      "message": "SKU chỉ gồm A-Z, 0-9, -"
    }
  ]
}
```

`PATCH /admin/products/DOC-TEST-O1CGI/status` (admin1) → **HTTP 400**<br>Body: `{"status": 1}`

```json
{
  "error_status": 0,
  "error_message": "Sản phẩm đã công bố không thể quay về DRAFT",
  "error_code": "BAD_REQUEST",
  "data": null
}
```

`PATCH /admin/products/bulk/status` (admin1) → **HTTP 400**<br>Body: `{"skus": ["DOC-TEST-O1CGI", "NOPE-1"], "status": 4}`

```json
{
  "error_status": 0,
  "error_message": "1 dòng không hợp lệ, chưa lưu gì",
  "error_code": "BAD_REQUEST",
  "data": [
    {
      "id": "NOPE-1",
      "reason": "Không tìm thấy sản phẩm"
    }
  ]
}
```

`GET /admin/products` (staff1) → **HTTP 403**

```json
{
  "error_status": 0,
  "error_message": "Thiếu quyền product:write",
  "error_code": "FORBIDDEN",
  "data": null
}
```

### f.15 Danh mục, thương hiệu, luật tương thích (A10, A03)

Tất cả cần `perm:product:write`.

| Method | Path | Body | → |
|---|---|---|---|
| GET | `/admin/categories` | | `Category[]` (cả đã ẩn) |
| GET | `/admin/categories/{code}` | | `Category` |
| POST | `/admin/categories` | `CategoryRequest` | `Category` |
| PUT | `/admin/categories/{code}` | `UpdateCategoryRequest` | `Category` |
| PATCH | `/admin/categories/{code}/active` | `{active}` | `Category` |
| PATCH | `/admin/categories/bulk/active` | `{codes, active}` | `Category[]` |
| GET | `/admin/brands` | | `Brand[]` (cả đã ẩn) |
| GET | `/admin/brands/{code}` | | `Brand` |
| POST | `/admin/brands` | `BrandRequest` | `Brand` |
| PUT | `/admin/brands/{code}` | `UpdateBrandRequest` | `Brand` |
| PATCH | `/admin/brands/{code}/active` | `{active}` | `Brand` |
| PATCH | `/admin/brands/bulk/active` | `{codes, active}` | `Brand[]` |
| GET | `/admin/compatibility-rules` | | `CompatibilityRule[]` |
| GET | `/admin/compatibility-rules/{code}` | | `CompatibilityRule` |
| POST | `/admin/compatibility-rules` | `RuleRequest` | `CompatibilityRule` |
| PUT | `/admin/compatibility-rules/{code}` | `UpdateRuleRequest` | `CompatibilityRule` |
| PATCH | `/admin/compatibility-rules/{code}/active` | `{active}` | `CompatibilityRule` |
| PATCH | `/admin/compatibility-rules/bulk/active` | `{codes, active}` | `CompatibilityRule[]` |

`PATCH /admin/brands/ASUS/active` (admin1) → **HTTP 200**<br>Body: `{"active": true}`

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "id": "6adcb0cc2444ef877c391289",
    "code": "ASUS",
    "name": "ASUS",
    "slug": "asus",
    "logoUrl": null,
    "isActive": 1,
    "createdAt": null,
    "updatedAt": "2026-10-27T16:06:27.371151400Z"
  }
}
```

`GET /admin/compatibility-rules/CPU_MB_SOCKET` (admin1) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "id": "6adcb0cc2444ef877c391291",
    "code": "CPU_MB_SOCKET",
    "name": "Socket CPU khớp mainboard",
    "sourceCategory": "CPU",
    "targetCategory": "MAINBOARD",
    "ruleType": "EQUALS",
    "sourceField": "socket",
    "targetField": "socket",
    "margin": null,
    "severity": 1,
    "messageTemplate": "CPU {source} dùng socket {sv} không khớp mainboard {target} ({tv})",
    "isActive": 1,
    "createdAt": null,
    "updatedAt": null
  }
}
```

### f.16 Import / Export Excel (A04, A02, A05, A06)

| Method | Path | Quyền | Query/Body | → |
|---|---|---|---|---|
| GET | `/admin/products/import/template` | perm:product:write | `category` | file `.xlsx` |
| POST | `/admin/products/import/validate` | perm:product:write | multipart `file`, `category`, `mode` (`CREATE_ONLY` mặc định / `UPSERT`) | `ImportValidateResult<ProductImportPreviewRow>` |
| GET | `/admin/products/import/{importId}/result-file` | perm:product:write | | file `.xlsx` (thêm cột Lỗi) |
| POST | `/admin/products/import` | perm:product:write | `{importId}` | `ImportResult` |
| GET | `/admin/inventory/import/excel/template` | perm:inventory:write | | file `.xlsx` |
| POST | `/admin/inventory/import/excel/validate` | perm:inventory:write | multipart `file`, `referenceCode` (bắt buộc, ≤ 50) | `ImportValidateResult<StockImportPreviewRow>` |
| GET | `/admin/inventory/import/excel/{importId}/result-file` | perm:inventory:write | | file `.xlsx` |
| POST | `/admin/inventory/import/excel` | perm:inventory:write | `{importId}` | `ImportResult` |
| GET | `/admin/products/export` | perm:product:write | `category`, `status` | file `.xlsx` |
| GET | `/admin/inventory/export` | STAFF | `warehouseId`, `lowStock` | file `.xlsx` |
| GET | `/admin/orders/export` | STAFF | `status`, `from`, `to`, `q` | file `.xlsx` |

Validate file có lỗi (1 dòng hợp lệ, 4 dòng lỗi):

`POST /admin/products/import/validate` (admin1) → **HTTP 200**<br>Form: `{"category": "CPU", "mode": "CREATE_ONLY"}` + file

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "import_id": "cc2e581c-8f17-4fd7-ace4-1d20ced5e721",
    "mode": "CREATE_ONLY",
    "total_rows": 5,
    "valid_rows": 1,
    "invalid_rows": 4,
    "errors": [
      {
        "row": 2,
        "messages": [
          "Socket: LGA9999 không có trong danh sách"
        ]
      },
      {
        "row": 3,
        "messages": [
          "Giá bán: bắt buộc"
        ]
      },
      "...(+2)"
    ],
    "preview": [
      {
        "row": 4,
        "action": "CREATE",
        "sku": "XLS-TEST-BAD-3",
        "name": "Dòng gốc",
        "brand": "INTEL",
        "price": 1000000,
        "compat.socket": "LGA1700",
        "compat.memory_types": [
          "DDR5"
        ],
        "compat.tdp_w": 65
      }
    ]
  }
}
```

Validate file hợp lệ (UPSERT) rồi import:

`POST /admin/products/import/validate` (admin1) → **HTTP 200**<br>Form: `{"category": "CPU", "mode": "UPSERT"}` + file

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "import_id": "cf227f74-bde1-4ee5-8f21-15ca17d91441",
    "mode": "UPSERT",
    "total_rows": 2,
    "valid_rows": 2,
    "invalid_rows": 0,
    "errors": [],
    "preview": [
      {
        "row": 2,
        "action": "UPDATE",
        "sku": "XLS-DEMO-CPU-001",
        "name": "Intel Core i7-14700K (demo import)",
        "brand": "INTEL",
        "price": 10990000,
        "original_price": 11990000,
        "short_description": "20 nhân 28 luồng",
        "warranty_months": 36,
        "tags": [
          "gaming",
          "...(+1)"
        ],
        "status": "Đang bán",
        "compat.socket": "LGA1700",
        "compat.memory_types": [
          "DDR4",
          "...(+1)"
        ],
        "compat.tdp_w": 125,
        "specs.cores": 20,
        "specs.threads": 28,
        "specs.boost_clock_ghz": 5.6,
        "specs.cache_mb": 33
      },
      "...(+1)"
    ]
  }
}
```

`POST /admin/products/import` (admin1) → **HTTP 200**<br>Body: `{"importId": "cf227f74-bde1-4ee5-8f21-15ca17d91441"}`

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "total_rows": 2,
    "created": 0,
    "updated": 2,
    "failed": 0,
    "errors": []
  }
}
```

Phiếu nhập kho:

`POST /admin/inventory/import/excel/validate` (staff1) → **HTTP 200**<br>Form: `{"referenceCode": "PN-DOC-O1CGI"}` + file

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "import_id": "ea94f5ed-a4d3-4c84-8f68-56e818807a0b",
    "mode": "IMPORT",
    "total_rows": 4,
    "valid_rows": 1,
    "invalid_rows": 3,
    "errors": [
      {
        "row": 3,
        "messages": [
          "SKU: XLS-KHONG-CO không có trên catalog hoặc chưa công bố"
        ]
      },
      {
        "row": 4,
        "messages": [
          "SKU: GPU-GIGABYTE-5070-12G không có trên catalog hoặc chưa công bố"
        ]
      },
      "...(+1)"
    ],
    "preview": [
      {
        "row": 2,
        "warehouse": "HCM-01",
        "sku": "CPU-I5-14600K",
        "quantity": 10,
        "note": null
      }
    ]
  }
}
```

Lỗi cả file và phiên hết hạn:

`POST /admin/products/import/validate` (admin1) → **HTTP 400**<br>Form: `{"category": "CPU"}` + file

```json
{
  "error_status": 0,
  "error_message": "Chỉ nhận file Excel .xlsx",
  "error_code": "BAD_REQUEST",
  "data": null
}
```

`POST /admin/products/import` (admin1) → **HTTP 404**<br>Body: `{"importId": "00000000-0000-0000-0000-000000000000"}`

```json
{
  "error_status": 0,
  "error_message": "Không tìm thấy file import 00000000-0000-0000-0000-000000000000 (file chỉ giữ 1 giờ sau khi kiểm tra), hãy upload lại",
  "error_code": "NOT_FOUND",
  "data": null
}
```

### f.17 Tồn kho, kho (A05, A01)

| Method | Path | Quyền | Query/Body | → |
|---|---|---|---|---|
| GET | `/warehouses` | STAFF | | `Warehouse[]` |
| GET | `/admin/warehouses/{id}` | STAFF | | `Warehouse` |
| POST | `/admin/warehouses` | ADMIN | `WarehouseRequest` | `Warehouse` |
| PUT | `/admin/warehouses/{id}` | ADMIN | `UpdateWarehouseRequest` | `Warehouse` |
| PATCH | `/admin/warehouses/{id}/active` | ADMIN | `{active}` | `Warehouse` |
| PATCH | `/admin/warehouses/bulk/active` | ADMIN | `{ids, active}` | `Warehouse[]` |
| GET | `/admin/inventory` | STAFF | `AdminInventoryQuery` | `PageResponse<Inventory>` |
| GET | `/admin/inventory/movements` | STAFF | `StockMovementQuery` | `PageResponse<StockMovement>` |
| POST | `/admin/inventory/import` | perm:inventory:write | `InventoryImportRequest` | `Inventory[]` |
| PUT | `/inventory/{sku}/adjust` | perm:inventory:write | query `warehouseId`, `delta` (có dấu), `note` | `StockResponse` |

`GET /warehouses` (staff1) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": [
    {
      "createdBy": "99999999-9999-9999-9999-999999999999",
      "createdAt": "2026-10-27T11:11:49.493765",
      "updatedBy": "99999999-9999-9999-9999-999999999999",
      "updatedAt": "2026-10-27T11:11:49.493765",
      "id": 3,
      "code": "DNQ64XCV",
      "name": "Kho Đà Nẵng Q64XCV",
      "address": "1 Bạch Đằng, Hải Châu, Đà Nẵng",
      "isActive": 1
    },
    "...(+5)"
  ]
}
```

`GET /admin/inventory?size=50` (staff1) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "content": [
      {
        "createdBy": null,
        "createdAt": "2026-10-26T22:28:27.371586",
        "updatedBy": null,
        "updatedAt": null,
        "id": 10,
        "productId": "",
        "sku": "CASE-CORSAIR-4000D",
        "warehouseId": 1,
        "quantity": 7,
        "reservedQuantity": 0,
        "minQuantity": 2,
        "version": 0
      },
      "...(+21)"
    ],
    "page": {
      "size": 50,
      "number": 0,
      "totalElements": 22,
      "totalPages": 1
    }
  }
}
```

`GET /admin/inventory/movements?sku=GPU-MSI-4070S-12G` (staff1) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "content": [
      {
        "id": 38,
        "sku": "GPU-MSI-4070S-12G",
        "warehouseId": 1,
        "type": 1,
        "quantity": 4,
        "quantityAfter": 52,
        "referenceType": "IMPORT",
        "referenceCode": "PN-XLS-Q9JR49",
        "note": null,
        "createdBy": "33333333-3333-3333-3333-333333333333",
        "createdAt": "2026-10-27T12:47:01.756527"
      },
      "...(+11)"
    ],
    "page": {
      "size": 50,
      "number": 0,
      "totalElements": 12,
      "totalPages": 1
    }
  }
}
```

`POST /admin/inventory/import` (staff1) → **HTTP 200**<br>Body: `{"warehouseId": 1, "referenceCode": "PN-DOC-O1CGI", "note": "Mẫu tài liệu", "lines": [{"sku": "CPU-I5-14600K", "quantity": 1}]}`

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": [
    {
      "createdBy": null,
      "createdAt": "2026-10-24T20:26:23.25203",
      "updatedBy": "33333333-3333-3333-3333-333333333333",
      "updatedAt": "2026-10-27T23:06:28.8427153",
      "id": 1,
      "productId": "",
      "sku": "CPU-I5-14600K",
      "warehouseId": 1,
      "quantity": 79,
      "reservedQuantity": 0,
      "minQuantity": 2,
      "version": 8
    }
  ]
}
```

`PUT /inventory/CPU-I5-14600K/adjust?warehouseId=1&delta=-1&note=rollback` (staff1) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "sku": "CPU-I5-14600K",
    "available": 87,
    "inStock": true
  }
}
```

`GET /warehouses` bằng tài khoản khách → 403, body rỗng.

### f.18 Đơn hàng quản trị (A06)

| Method | Path | Quyền | Query/Body | → |
|---|---|---|---|---|
| GET | `/admin/orders` | STAFF | `AdminOrderListQuery` | `PageResponse<Order>` |
| GET | `/admin/orders/{code}` | STAFF | | `OrderDetail` |
| PATCH | `/admin/orders/{code}/status` | perm:order:update-status | `{status, reason?}` | `Order` |
| PATCH | `/admin/orders/bulk/status` | perm:order:update-status | `{codes, status, reason?}` | `Order[]` |
| GET | `/admin/orders/export` | STAFF | như danh sách (trừ page/size) | file `.xlsx` |

`GET /admin/orders?size=50` (staff1) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "content": [
      {
        "createdBy": "11111111-1111-1111-1111-111111111111",
        "createdAt": "2026-10-24T22:30:07.773398",
        "updatedBy": "33333333-3333-3333-3333-333333333333",
        "updatedAt": "2026-10-27T11:11:58.384197",
        "id": 7,
        "code": "DH20261023000007",
        "userId": "11111111-1111-1111-1111-111111111111",
        "status": 6,
        "paymentMethod": 1,
        "paymentStatus": 2,
        "subtotalAmount": 3180000,
        "discountAmount": 0,
        "shippingFee": 20000,
        "totalAmount": 3200000,
        "voucherCode": null,
        "receiverName": "Khách Một",
        "receiverPhone": "0900000001",
        "shippingAddress": "1 Lê Lợi, Phường Bến Thành, Thành phố Hồ Chí Minh",
        "note": null,
        "pcBuildId": null,
        "cancelReason": null,
        "placedAt": "2026-10-24T22:30:07.773398",
        "completedAt": "2026-10-27T11:11:58.382784"
      },
      "...(+6)"
    ],
    "page": {
      "size": 50,
      "number": 0,
      "totalElements": 7,
      "totalPages": 1
    }
  }
}
```

`PATCH /admin/orders/DH20261024000002/status` (staff1) → **HTTP 200**<br>Body: `{"status": 4, "reason": "Đã gọi xác nhận"}`

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "createdBy": "22222222-2222-2222-2222-222222222222",
    "createdAt": "2026-10-24T20:25:34.732737",
    "updatedBy": "33333333-3333-3333-3333-333333333333",
    "updatedAt": "2026-10-27T23:06:15.3732427",
    "id": 2,
    "code": "DH20261024000002",
    "userId": "22222222-2222-2222-2222-222222222222",
    "status": 4,
    "paymentMethod": 2,
    "paymentStatus": 2,
    "subtotalAmount": 7990000,
    "discountAmount": 0,
    "shippingFee": 0,
    "totalAmount": 7990000,
    "voucherCode": null,
    "receiverName": "Khách Hai",
    "receiverPhone": "0900000002",
    "shippingAddress": "2 Tràng Tiền, Phường Hoàn Kiếm, Hà Nội",
    "note": null,
    "pcBuildId": null,
    "cancelReason": null,
    "placedAt": "2026-10-24T20:25:34.732737",
    "completedAt": null
  }
}
```

`PATCH /admin/orders/DH20261023000007/status` (staff1) → **HTTP 400**<br>Body: `{"status": 5}`

```json
{
  "error_status": 0,
  "error_message": "Không thể chuyển đơn từ trạng thái 6 sang 5",
  "error_code": "BAD_REQUEST",
  "data": null
}
```

`GET /admin/orders` (customer1) → **HTTP 403**

```json
{
  "error_status": 0,
  "error_message": "Bạn không có quyền thực hiện thao tác này",
  "error_code": "FORBIDDEN",
  "data": null
}
```

### f.19 Đánh giá quản trị (A07)

| Method | Path | Quyền | Query/Body | → |
|---|---|---|---|---|
| GET | `/admin/reviews` | STAFF | `status` (mặc định 1), `productId`, `page`, `size` | `PageResponse<Review>` |
| GET | `/admin/reviews/{id}` | STAFF | | `Review` |
| PATCH | `/admin/reviews/{id}/approve` | STAFF | | `Review` |
| PATCH | `/admin/reviews/{id}/reject` | STAFF | | `Review` |
| PATCH | `/admin/reviews/bulk/approve` | STAFF | `{ids}` | `Review[]` |
| PATCH | `/admin/reviews/bulk/reject` | STAFF | `{ids}` | `Review[]` |
| POST | `/admin/reviews/{id}/reply` | STAFF | `{content}` | `Review` |

`GET /admin/reviews?status=1` (staff1) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "content": [
      {
        "id": "6adcd93ebce0ed19863ef4e0",
        "productId": "6adcb0cc2444ef877c39129b",
        "sku": "GPU-MSI-4070S-12G",
        "userId": "99999999-9999-9999-9999-999999999999",
        "userDisplayName": "Quản Trị",
        "orderCode": null,
        "rating": 5,
        "title": "Card mát, chơi 2K mượt",
        "content": "Chạy ổn định, nhiệt độ thấp.",
        "verifiedPurchase": false,
        "status": 1,
        "helpfulCount": 0,
        "adminReply": null,
        "createdAt": "2026-10-24T16:13:50.213Z",
        "updatedAt": null
      }
    ],
    "page": {
      "size": 20,
      "number": 0,
      "totalElements": 1,
      "totalPages": 1
    }
  }
}
```

`POST /admin/reviews/6ae0cbfce8f7b4c996878bba/reply` (staff1) → **HTTP 200**<br>Body: `{"content": "Cảm ơn bạn đã tin dùng PC Shop!"}`

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "id": "6ae0cbfce8f7b4c996878bba",
    "productId": "6adf719d17897e99b062e100",
    "sku": "CASE-CORSAIR-4000D",
    "userId": "22222222-2222-2222-2222-222222222222",
    "userDisplayName": "Khách Hai",
    "orderCode": null,
    "rating": 4,
    "title": "Case rộng, dễ đi dây",
    "content": "Lắp mATX dư chỗ, airflow tốt. Hơi ồn.",
    "verifiedPurchase": false,
    "status": 2,
    "helpfulCount": 0,
    "adminReply": {
      "content": "Cảm ơn bạn đã tin dùng PC Shop!",
      "repliedBy": "33333333-3333-3333-3333-333333333333",
      "repliedAt": "2026-10-27T16:06:21.776222Z"
    },
    "createdAt": "2026-10-27T16:06:20.459Z",
    "updatedAt": "2026-10-27T16:06:21.776222Z"
  }
}
```

`PATCH /admin/reviews/bulk/approve` (staff1) → **HTTP 400**<br>Body: `{"ids": ["6ae0cbfce8f7b4c996878bba", "000000000000000000000000"]}`

```json
{
  "error_status": 0,
  "error_message": "2 dòng không hợp lệ, chưa lưu gì",
  "error_code": "BAD_REQUEST",
  "data": [
    {
      "id": "000000000000000000000000",
      "reason": "Không tìm thấy review"
    },
    {
      "id": "6ae0cbfce8f7b4c996878bba",
      "reason": "Không thể chuyển review từ trạng thái 2 sang 2"
    }
  ]
}
```

### f.20 Voucher quản trị (A08)

Tất cả cần role ADMIN.

| Method | Path | Body | → |
|---|---|---|---|
| GET | `/admin/vouchers` | | `AdminVoucher[]` |
| GET | `/admin/vouchers/{id}` | | `AdminVoucher` |
| POST | `/admin/vouchers` | `CreateVoucherRequest` | `AdminVoucher` |
| PUT | `/admin/vouchers/{id}` | `UpdateVoucherRequest` (kèm `version`) | `AdminVoucher` |
| PATCH | `/admin/vouchers/{id}/active` | `{active}` | `AdminVoucher` |
| PATCH | `/admin/vouchers/bulk/active` | `{ids, active}` | `AdminVoucher[]` |

`POST /admin/vouchers` (admin1) → **HTTP 200**<br>Body: `{"name": "Giảm 500K cho VGA", "type": 2, "value": 500000, "minOrderAmount": 10000000, "applicableCategories": ["GPU"], "usageLimit": 100, "perUserLimit": 1, "startAt": "2026-11-01T00:00:00", "endAt": "2026-11-30T23:59:59", "code": "DOCO1CGI"}`

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "id": 8,
    "code": "DOCO1CGI",
    "name": "Giảm 500K cho VGA",
    "type": 2,
    "value": 500000,
    "maxDiscountAmount": null,
    "minOrderAmount": 10000000,
    "applicableCategories": [
      "GPU"
    ],
    "usageLimit": 100,
    "usedCount": 0,
    "perUserLimit": 1,
    "startAt": "2026-11-01T00:00:00",
    "endAt": "2026-11-30T23:59:59",
    "isActive": 1,
    "version": 0,
    "createdAt": "2026-10-27T23:06:27.6233108",
    "updatedAt": "2026-10-27T23:06:27.6233108"
  }
}
```

`PUT /admin/vouchers/8` (admin1) → **HTTP 409**<br>Body: `{"name": "Giảm 500K cho VGA", "type": 2, "value": 500000, "minOrderAmount": 10000000, "applicableCategories": ["GPU"], "usageLimit": 100, "perUserLimit": 1, "startAt": "2026-11-01T00:00:00", "endAt": "2026-11-30T23:59:59", "version": 0}`

```json
{
  "error_status": 0,
  "error_message": "Voucher đã bị người khác thay đổi, vui lòng tải lại",
  "error_code": "CONFLICT",
  "data": null
}
```

### f.21 Người dùng (A09)

Tất cả cần role ADMIN. Dữ liệu tài khoản lấy từ Keycloak, ghép hồ sơ trong DB shop.

| Method | Path | Query/Body | → |
|---|---|---|---|
| GET | `/admin/users` | `keyword`, `page`, `size` | `PageResponse<AdminUserRow>` |
| GET | `/admin/users/{id}` | | `AdminUserDetail` |
| POST | `/admin/users` | `CreateStaffRequest` | `UserRoles` |
| PUT | `/admin/users/{id}/roles` | `RolesRequest` | `UserRoles` |
| PUT | `/admin/users/{id}/lock` | | `string` ("Đã khóa tài khoản <id>") |
| PUT | `/admin/users/{id}/unlock` | | `string` |

`GET /admin/users?keyword=customer` (admin1) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "content": [
      {
        "id": "11111111-1111-1111-1111-111111111111",
        "username": "customer1",
        "email": "customer1@pcshop.local",
        "fullName": "Khách Một",
        "active": true,
        "phoneNumber": "0912345678"
      },
      {
        "id": "22222222-2222-2222-2222-222222222222",
        "username": "customer2",
        "email": "customer2@pcshop.local",
        "fullName": "Khách Hai",
        "active": true,
        "phoneNumber": "0900000002"
      }
    ],
    "page": {
      "size": 20,
      "number": 0,
      "totalElements": 2,
      "totalPages": 1
    }
  }
}
```

`GET /admin/users/33333333-3333-3333-3333-333333333333` (admin1) → **HTTP 200**

```json
{
  "error_status": 1,
  "error_message": null,
  "error_code": null,
  "data": {
    "id": "33333333-3333-3333-3333-333333333333",
    "username": "staff1",
    "email": "staff1@pcshop.local",
    "firstName": "Nhân",
    "lastName": "Viên",
    "active": true,
    "emailVerified": true,
    "createdTimestamp": null,
    "profile": null,
    "realmRoles": [
      "STAFF"
    ],
    "permissions": [
      "inventory:write",
      "order:update-status"
    ]
  }
}
```

Chưa gọi thật khi soạn tài liệu (để không tạo/khóa tài khoản trong Keycloak): `POST /admin/users`, `PUT .../roles`, `.../lock`,
`.../unlock`. Dạng response theo code: `UserRoles` = `{"userId":"<uuid>","realmRoles":["STAFF"],"permissions":["order:update-status"]}`.

---

## g. Quy tắc nghiệp vụ frontend phải hiển thị đúng

### g.1 Bảng mã trạng thái → nhãn, màu gợi ý

Màu theo token ở mục i: `ok` lục, `warn` hổ phách, `error` đỏ, `brand` cobalt, `muted` xám. Nhãn luôn có chữ, không chỉ dùng màu.

**Sản phẩm (`Product.status`)**

| Mã | Hằng | Nhãn | Màu | Ghi chú |
|---|---|---|---|---|
| 1 | DRAFT | Nháp | xám | khách không thấy |
| 2 | ACTIVE | Đang bán | lục | |
| 3 | HIDDEN | Đã ẩn | hổ phách | khách không thấy; trong giỏ: "Sản phẩm đã ngừng bán" |
| 4 | DISCONTINUED | Ngừng bán | xám đậm | |

Chuyển trạng thái: mọi hướng, trừ quay về 1 khi đã công bố. Tạo mới chỉ được 1 hoặc 2.

**Đơn hàng (`Order.status`)**

| Mã | Hằng | Nhãn | Màu |
|---|---|---|---|
| 1 | PENDING | Đang giữ hàng | cobalt |
| 2 | AWAITING_PAYMENT | Chờ thanh toán | hổ phách |
| 3 | PAID | Đã thanh toán | cobalt |
| 4 | CONFIRMED | Đã xác nhận | cobalt |
| 5 | SHIPPING | Đang giao | cobalt đậm |
| 6 | COMPLETED | Hoàn tất | lục |
| 7 | CANCELLED | Đã hủy | đỏ |
| 8 | RETURNED | Trả hàng | xám đậm |

**Thanh toán:** `paymentMethod` 1 Thanh toán khi nhận hàng (COD) · 2 VNPay · 3 MoMo.
`paymentStatus` 1 Chưa thanh toán (xám) · 2 Đã thanh toán (lục) · 3 Đã hoàn tiền (hổ phách).
COD hoàn tất (6) thì backend tự đặt `paymentStatus = 2`.

**Đánh giá (`Review.status`)**

| Mã | Nhãn | Màu | Chuyển được sang |
|---|---|---|---|
| 1 | Chờ duyệt | hổ phách | 2 (duyệt), 3 (từ chối); người viết sửa được, gỡ được |
| 2 | Đã duyệt | lục | 3 (từ chối); người viết gỡ được |
| 3 | Bị từ chối | đỏ | 2 (duyệt lại); người viết gỡ được |
| 4 | Người viết đã gỡ | xám | không chuyển được, không trả lời được |

**Voucher (`type`):** 1 Giảm % (hiển thị "Giảm 10%", kèm "tối đa 500.000 ₫" nếu có `maxDiscountAmount`) · 2 Giảm tiền ("Giảm 500.000 ₫") ·
3 Miễn phí vận chuyển. `isActive` 1 Đang bật / 0 Đã tắt.

**Biến động kho (`StockMovement.type`):** 1 Nhập kho (lục, +) · 2 Xuất bán (cobalt, −) · 3 Hoàn trả (hổ phách, +) · 4 Điều chỉnh (xám, ±).

**Tương thích (`severity`):** 1 Lỗi: đỏ, icon chặn, "Không lắp được" · 2 Cảnh báo: hổ phách, icon tam giác, "Nên kiểm tra".

**Khác:** `isActive` 0/1 → "Đã ẩn"/"Đang hiển thị" (danh mục, thương hiệu), "Đã tắt"/"Đang bật" (luật, voucher, kho);
`gender` 0 Khác · 1 Nam · 2 Nữ; `AdminUserRow.active` false → "Đã khóa" (đỏ).

### g.2 Chuyển trạng thái đơn hợp lệ

```
1 Đang giữ hàng  → 7 Đã hủy                  (2 / 4 / 7 do hệ thống tự chuyển, xem dưới)
2 Chờ thanh toán → 3 Đã thanh toán, 7 Đã hủy     (3 thường do cổng thanh toán tự chuyển)
3 Đã thanh toán  → 4 Đã xác nhận, 7 Đã hủy
4 Đã xác nhận    → 5 Đang giao, 7 Đã hủy
5 Đang giao      → 6 Hoàn tất, 8 Trả hàng
6 Hoàn tất       → 8 Trả hàng
7, 8             → (trạng thái cuối)
```

- Nhân viên (cần `order:update-status`): dropdown chỉ hiện bước hợp lệ từ trạng thái hiện tại; chuyển sang 7 hoặc 8 **bắt buộc lý do**
  (≤ 255 ký tự). Đổi hàng loạt: chỉ cho chọn trạng thái đích hợp lệ với **mọi** đơn đã chọn, hoặc gửi và hiển thị lỗi từng dòng.
- Hệ thống (Saga, `createdBy = null`): 1 → 4 (COD, đã giữ hàng) · 1 → 2 (online, đã giữ hàng) · 1 → 7 ("Không đủ hàng: SKU…") ·
  2 → 7 khi quá 15 phút chưa thanh toán ("Quá hạn thanh toán") · 2 → 3 khi cổng báo thanh toán thành công.
  Đơn 1 thường chỉ tồn tại 1–3 giây.
- Kho: hủy đơn (7) → nhả hàng đang giữ; chuyển 5 Đang giao → trừ hẳn khỏi kho (phiếu "Xuất bán"). Trả hàng (8) KHÔNG tự cộng lại kho
  (nhân viên kiểm hàng rồi điều chỉnh tồn kho tay). Hủy đơn cũng trả lại lượt dùng mã giảm giá.
- Tiền: hủy/trả đơn đã thu tiền → tự tạo yêu cầu hoàn tiền (mục f.7b). Hoàn tất (6) → `soldCount` của sản phẩm tăng (vài giây sau);
  trả hàng sau khi hoàn tất → giảm lại.
- Khách: tự hủy khi đơn ở 1, 2 hoặc 4 và chưa thanh toán (`paymentStatus` ≠ 2); nút "Hủy đơn" chỉ hiện khi đó, bắt nhập lý do.
  Còn lại → "Vui lòng liên hệ cửa hàng".
- Timeline: mỗi dòng `OrderStatusHistory` là một bước; dòng đầu `fromStatus = null` là "Đặt hàng". `createdBy = null` = hệ thống.
  Vẽ timeline dọc theo thứ tự trả về (cũ → mới); bước tương lai (theo luồng chuẩn 1→4→5→6) vẽ mờ.

### g.3 Quy tắc tương thích và PC Builder

**8 slot** (theo `Category.sortOrder`): CPU · Mainboard · RAM · Card đồ họa (GPU) · Ổ cứng (STORAGE) · Nguồn (PSU) · Vỏ case (CASE) · Tản nhiệt (COOLER).
Số lượng mỗi slot 1–8 (thường RAM/ổ cứng mới >1). Gửi `compatibility/check` với SKU **lặp theo số lượng** (vd 2 kit RAM → SKU xuất hiện 2 lần).

**Luật đang bật (seed):**

| `ruleCode` | Nguồn → Đích | Kiểu | So sánh | Mức |
|---|---|---|---|---|
| `CPU_MB_SOCKET` | CPU → MAINBOARD | EQUALS | `compat.socket` CPU = `compat.socket` mainboard | Lỗi |
| `RAM_MB_TYPE` | RAM → MAINBOARD | EQUALS | `compat.memory_type` RAM = `compat.memory_type` mainboard | Lỗi |
| `PSU_WATTAGE` | mọi linh kiện → PSU | SUM_TDP_LTE_WATTAGE | tổng `compat.tdp_w` × 1.2 ≤ `compat.wattage` của PSU | Lỗi |
| `GPU_CASE_LENGTH` | GPU → CASE | LTE | `compat.length_mm` GPU ≤ `compat.max_gpu_length_mm` case | Lỗi |
| `MB_CASE_FORM_FACTOR` | MAINBOARD → CASE | IN | `compat.form_factor` mainboard ∈ `compat.supported_form_factors` case | Lỗi |
| `RAM_MB_SLOTS` | RAM → MAINBOARD | SUM_LTE | tổng `compat.modules` mọi RAM (tính cả số lượng) ≤ `compat.ram_slots` mainboard | Lỗi |
| `CPU_COOLER_SOCKET` | CPU → COOLER | IN | `compat.socket` CPU ∈ `compat.supported_sockets` tản nhiệt | Lỗi |
| `COOLER_CASE_HEIGHT` | COOLER → CASE | LTE | `compat.height_mm` tản nhiệt ≤ `compat.max_cooler_height_mm` case | Lỗi |
| `ONE_CPU`, `ONE_MAINBOARD`, `ONE_PSU`, `ONE_CASE` | slot tương ứng | MAX_COUNT | tối đa 1 linh kiện | Lỗi |
| `ONE_COOLER` | COOLER | MAX_COUNT | tối đa 1 tản nhiệt | Cảnh báo |

- Kiểu EQUALS với một bên là mảng: chỉ cần có phần tử chung (CPU khai `memory_types: ["DDR4","DDR5"]`). So sánh không phân biệt hoa thường.
- Linh kiện thiếu thông số mà luật cần → luật đó bị bỏ qua (không báo lỗi).
- `compatible = false` khi có ít nhất một issue `severity = 1`. Issue `severity = 2` là cảnh báo (vd `ONE_COOLER`).
- `message` đã là câu tiếng Việt hoàn chỉnh: hiển thị nguyên văn, đặt ngay tại "đoạn nối" giữa hai slot liên quan. Ánh xạ
  `ruleCode` → cặp slot: `CPU_MB_SOCKET` CPU–Mainboard · `RAM_MB_TYPE`, `RAM_MB_SLOTS` RAM–Mainboard · `GPU_CASE_LENGTH` GPU–Case ·
  `MB_CASE_FORM_FACTOR` Mainboard–Case · `CPU_COOLER_SOCKET` CPU–Tản nhiệt · `COOLER_CASE_HEIGHT` Tản nhiệt–Case ·
  `ONE_*` chính slot đó · `PSU_WATTAGE` đồng hồ công suất/slot Nguồn. Mã luật lạ → hiện ở khối "Vấn đề khác".
  Ví dụ thật: 2 CPU + 3 kit RAM 2 thanh trên mainboard 4 khe → `ONE_CPU` "Cấu hình chỉ lắp được 1 CPU, đang chọn 2" và
  `RAM_MB_SLOTS` "Tổng 6 thanh RAM vượt số khe của mainboard ASUS TUF B760M-PLUS WIFI DDR5 (4 khe)".
- **Đồng hồ công suất:** `estimatedWattage` là tổng TDP **chưa** nhân hệ số; `requiredWattage` là mức cần (đã nhân 1.2), so với
  `compat.wattage` của PSU đã chọn: ≤ 80% lục · 80–100% hổ phách · > 100% đỏ (trùng lúc backend báo `PSU_WATTAGE`).
  Chưa chọn PSU: hiện "Cần nguồn tối thiểu `requiredWattage` W". Có thể gợi ý thêm `compat.recommended_psu_w` của GPU.
- Bộ lọc gợi ý khi mở modal chọn linh kiện (lọc phía server bằng query của `GET /products`):
  - Đã có CPU → MAINBOARD lọc `socket=<cpu.compat.socket>`; COOLER lọc `socket=<cpu.compat.socket>` (khớp `supported_sockets`).
  - Đã có mainboard → CPU lọc `socket=<mb.compat.socket>`; RAM lọc `memoryType=<mb.compat.memory_type>`;
    CASE lọc `formFactor=<mb.compat.form_factor>`.
  - GPU/PSU không lọc được bằng query (độ dài, công suất): hiện tất cả, đánh dấu món sẽ gây lỗi bằng cách gọi thử
    `compatibility/check` cho từng ứng viên của trang hiện tại, hoặc so sánh ở client với số liệu `compat`.
  - Bộ lọc gợi ý là mặc định có thể tắt ("Hiện cả linh kiện không khớp").
- Sản phẩm không còn ACTIVE trong cấu hình đã lưu → `compatibility/check` trả 404 "Không tìm thấy sản phẩm đang bán: [...]":
  hiện slot đó lỗi "Linh kiện đã ngừng bán", cho chọn lại.
- PC Builder chưa đăng nhập: giữ cấu hình trong localStorage; lưu lên server cần đăng nhập.

### g.4 Luồng import Excel (2 bước có xác nhận, giao diện 3 bước)

1. **Chuẩn bị:** chọn danh mục (sản phẩm) và chế độ `CREATE_ONLY` (chỉ thêm mới, SKU đã có là lỗi) / `UPSERT` (thêm hoặc cập nhật);
   phiếu nhập kho thì nhập số phiếu `referenceCode` (bắt buộc, ≤ 50 ký tự). Nút "Tải file mẫu" (GET template). Chọn file `.xlsx`.
2. **Kiểm tra** (`POST .../validate`, multipart): **không ghi gì**. Trả `import_id`, `total_rows`, `valid_rows`, `invalid_rows`,
   `errors[{row, messages[]}]` (`row` = số dòng như Excel hiển thị), `preview` (tối đa 20 dòng hợp lệ, có `action` CREATE/UPDATE).
   Hiển thị: thẻ tổng hợp, bảng lỗi theo dòng, bảng xem trước; nút "Tải file kết quả" (GET result-file: file gốc thêm cột Lỗi tô đỏ).
   Lỗi cả file (không phải `.xlsx`, > 5 MB, sai mẫu/thiếu cột, > 1000 dòng, `mode` lạ) → HTTP 400 `ResponseData`, quay về bước 1.
3. **Ghi** (`POST .../import {importId}`): nút "Nhập N dòng hợp lệ" (tắt khi `valid_rows = 0`). Kết quả `created`, `updated`, `failed`, `errors`.
   - Sản phẩm: ghi **từng dòng độc lập** (dòng lỗi bỏ qua). Cột Trạng thái chỉ dùng khi tạo mới (Nháp/Đang bán, trống = Nháp).
     UPSERT giữ nguyên ảnh, mô tả dài, slug, trạng thái; ô thông số để trống thì xóa thông số đó. Đổi giá ghi lịch sử giá lý do `IMPORT`.
   - Phiếu nhập kho: **tất cả hoặc không** (một transaction). SKU phải đã công bố (không nhập kho được sản phẩm Nháp).
     Một cặp (kho, SKU) chỉ xuất hiện một lần. `created` = số dòng tồn kho mới tạo, `updated` = số dòng được cộng thêm.
     Xung đột ghi đồng thời → 409, cho "Kiểm tra lại".
   - `importId` giữ **1 giờ**, chỉ người upload dùng được, dùng một lần; quá hạn hoặc đã import → 404 "Không tìm thấy file import...
     hãy upload lại": quay về bước 1.

### g.5 Voucher

- `POST /vouchers/validate` luôn trả 200; xem `valid`. Không hợp lệ → hiện `reason` nguyên văn dưới ô mã. Các lý do có thể gặp:
  "Mã giảm giá không tồn tại" · "đã ngừng áp dụng" · "chưa đến thời gian áp dụng" · "đã hết hạn" · "Đơn tối thiểu 1000000đ để dùng mã này" ·
  "đã hết lượt sử dụng" · "Mã chỉ áp dụng cho danh mục [GPU]" · "Bạn đã dùng hết lượt của mã này".
- Ở trang thanh toán, nguồn sự thật là `POST /checkout/preview` (tính giảm giá chỉ trên các món thuộc danh mục được áp dụng);
  `validate` chỉ để báo nhanh khi người dùng bấm "Áp dụng".
- Cách tính: type 1 = tiền hàng đủ điều kiện × value% (làm tròn), không quá `maxDiscountAmount`; type 2 = min(value, tiền hàng đủ điều kiện);
  type 3 = `discountAmount 0`, `freeShipping true` → phí ship 0.
- Mã không phân biệt hoa thường (server đổi IN HOA). `GET /vouchers` chỉ trả mã đang dùng được (trong hạn, còn lượt)
  hoặc hết lượt (`usedCount >= usageLimit`) khi gợi ý.
- Phí vận chuyển (checkout preview): tiền hàng sau giảm ≥ 5.000.000 ₫ → miễn phí; tỉnh có kho (mã `79` TP.HCM, `01` Hà Nội) → 20.000 ₫;
  còn lại 40.000 ₫; chưa chọn địa chỉ tính theo mức ngoại vùng. Hiển thị "Miễn phí" khi `shippingFee = 0`.
- `canPlaceOrder = false` khi chưa có địa chỉ, giỏ có món không mua được, hoặc không có món nào: tắt nút đặt hàng và hiện `warnings`.

### g.6 Giỏ khách vãng lai và gộp giỏ

1. Lần đầu cần giỏ: nếu chưa có `localStorage.pcshop_guest_key` thì tạo bằng `crypto.randomUUID()`.
2. Chưa đăng nhập: mọi request `/cart/**` gửi `X-Guest-Key`. Giỏ guest hết hạn sau 30 ngày không thao tác.
3. Vừa đăng nhập (sau callback Keycloak): nếu có guest key → `POST /cart/merge` (token + header) → backend cộng dồn số lượng
   (tối đa 99/sản phẩm), xóa giỏ guest, trả giỏ tài khoản → frontend xóa guest key, cập nhật cache giỏ. Lỗi merge không chặn đăng nhập.
4. Đã đăng nhập: không gửi guest key (backend bỏ qua). Đăng xuất: giỏ tài khoản vẫn nằm ở server; frontend xóa cache giỏ, sinh guest key mới khi cần.
5. Hiển thị dòng giỏ: `purchasable=false` → tô mờ, hiện `message`, không tính vào `subtotal`; nút "Xóa khỏi giỏ". `available < quantity` →
   "Chỉ còn N sản phẩm" + gợi ý giảm số lượng. `name = null` (catalog không phản hồi) → hiện SKU và `warnings`.
6. Badge giỏ = `totalQuantity` (gồm cả dòng không mua được).

### g.7 Quy tắc nhỏ khác

- Giá đang giảm: `originalPrice != null && originalPrice > price` → giá gốc gạch ngang + nhãn "−x%".
- "Còn hàng": `inStock` (tổng mọi kho). Hiện "Còn N" khi `available ≤ 5`, "Còn hàng" khi lớn hơn, "Hết hàng" khi 0 hoặc 404.
- Bảo hành: `warrantyMonths` → "36 tháng".
- Review: một người một review cho mỗi (sản phẩm, đơn đã mua) (409 "Bạn đã đánh giá sản phẩm này..."). Chỉ sửa được khi đang chờ duyệt.
  `verifiedPurchase = true` → nhãn "Đã mua hàng" (review tạo trước 2026-11-08 luôn false).
- `ratingAvg`/`ratingCount` trong `Product` tự cập nhật khi review được duyệt/từ chối/gỡ (dùng cho thẻ sản phẩm, sắp xếp
  `sort=rating`). `null` (chưa từng có review) hoặc `ratingCount = 0` → "Chưa có đánh giá". Trang chi tiết vẫn dùng
  `GET /reviews/stats` để có phân bố 1–5 sao.
- Sổ địa chỉ: tối đa 10; số điện thoại `^0\d{9}$`; chọn tỉnh rồi mới chọn phường (phường phụ thuộc tỉnh).
- Hồ sơ: `PUT /me` ghi đè cả 3 trường, gửi lại giá trị cũ của trường không đổi.
- Admin voucher `PUT` cũng ghi đè mọi trường: form sửa phải gửi đủ dữ liệu đang có + `version`.
- Admin không xóa được sản phẩm/danh mục/thương hiệu/kho/voucher/luật: "Xóa" trên giao diện = ẩn/tắt/ngừng bán.

---

## h. Dữ liệu mẫu cho chế độ MOCK

Lấy từ seed và response thật của môi trường local. Mock nên trả **đúng dạng `ResponseData`** như mục f, kể cả lỗi.

### h.1 Danh mục (8) và thông số

| `code` | `name` | `slug` | `pcSlot` | `sortOrder` | Thông số `compat` (bắt buộc*) | Thông số `specs` |
|---|---|---|---|---|---|---|
| CPU | Bộ vi xử lý | cpu | CPU | 1 | socket* (LGA1700/LGA1851/AM4/AM5), memory_types* (DDR4/DDR5, mảng), tdp_w* W | cores, threads, base_clock_ghz GHz, boost_clock_ghz GHz, cache_mb MB |
| MAINBOARD | Bo mạch chủ | mainboard | MAINBOARD | 2 | socket*, memory_type*, form_factor* (E-ATX/ATX/mATX/ITX), ram_slots*, m2_slots | chipset |
| RAM | RAM | ram | RAM | 3 | memory_type*, modules* | capacity_gb GB, speed_mhz MHz |
| GPU | Card đồ họa | vga | GPU | 4 | length_mm* mm, tdp_w* W, recommended_psu_w W | vram_gb GB, memory_type (GDDR6/GDDR6X/GDDR7) |
| STORAGE | Ổ cứng | o-cung | STORAGE | 5 | interface* (SATA/NVMe), form_factor (2.5 inch/M.2 2280) | capacity_gb GB, read_mbps MB/s |
| PSU | Nguồn | nguon | PSU | 6 | wattage* W, form_factor* (ATX/SFX) | efficiency (80 Plus…Titanium), modular (none/semi/full) |
| CASE | Vỏ case | case | CASE | 7 | supported_form_factors* (mảng), max_gpu_length_mm* mm, max_cooler_height_mm* mm | type, color |
| COOLER | Tản nhiệt | tan-nhiet | COOLER | 8 | supported_sockets* (mảng), height_mm mm, tdp_w W | type (Air/AIO), radiator_mm mm |

Đầy đủ một danh mục (`specSchema` có `label`, `options`): xem mẫu `GET /categories` ở f.1.

### h.2 Thương hiệu (7)

`AMD`, `ASUS`, `CORSAIR` (Corsair), `GIGABYTE` (Gigabyte), `INTEL` (Intel), `KINGSTON` (Kingston), `MSI`. Tất cả `isActive: 1`, `logoUrl: null`.

### h.3 Sản phẩm (15 sản phẩm seed, đều ACTIVE, chưa có ảnh)

`available` = tồn có thể bán (tổng các kho) lúc lấy mẫu. Không sản phẩm nào có `originalPrice`; mock nên tự thêm cho 1–2 sản phẩm
(vd GPU-MSI-4070S-12G `originalPrice: 17200000`, khớp lịch sử giá) để có trạng thái "đang giảm giá".

```json
[
  {"id": "6adf719d17897e99b062e0fb", "sku": "CPU-R5-7600X", "name": "AMD Ryzen 5 7600X", "slug": "amd-ryzen-5-7600x", "categoryCode": "CPU", "brandCode": "AMD", "shortDescription": "6 nhân 12 luồng, xung tối đa 5.3GHz, socket AM5", "price": 5490000, "originalPrice": null, "specs": {"cores": 6, "threads": 12, "boost_clock_ghz": 5.3, "cache_mb": 32}, "compat": {"socket": "AM5", "memory_types": ["DDR5"], "tdp_w": 105}, "tags": ["gaming"], "warrantyMonths": 36, "status": 2, "available": 10},
  {"id": "6adcb0cc2444ef877c391298", "sku": "CPU-I5-14600K", "name": "Intel Core i5-14600K", "slug": "intel-core-i5-14600k", "categoryCode": "CPU", "brandCode": "INTEL", "shortDescription": "14 nhân 20 luồng, xung tối đa 5.3GHz, socket LGA1700", "price": 7990000, "originalPrice": null, "specs": {"cores": 14, "threads": 20, "boost_clock_ghz": 5.3, "cache_mb": 24}, "compat": {"socket": "LGA1700", "memory_types": ["DDR4", "DDR5"], "tdp_w": 125}, "tags": ["gaming", "2K"], "warrantyMonths": 36, "status": 2, "available": 87},
  {"id": "6adf719d17897e99b062e0fd", "sku": "MB-MSI-B760-D4", "name": "MSI PRO B760-P DDR4", "slug": "msi-pro-b760-p-ddr4", "categoryCode": "MAINBOARD", "brandCode": "MSI", "shortDescription": "Mainboard ATX, socket LGA1700, dùng RAM DDR4", "price": 3590000, "originalPrice": null, "specs": {"chipset": "B760", "form_factor": "ATX", "ram_slots": 4}, "compat": {"socket": "LGA1700", "memory_type": "DDR4", "form_factor": "ATX", "ram_slots": 4, "m2_slots": 2}, "tags": ["office"], "warrantyMonths": 36, "status": 2, "available": 5},
  {"id": "6adf719d17897e99b062e0fc", "sku": "MB-GIGABYTE-B650M-D5", "name": "Gigabyte B650M GAMING X AX DDR5", "slug": "gigabyte-b650m-gaming-x-ax-ddr5", "categoryCode": "MAINBOARD", "brandCode": "GIGABYTE", "shortDescription": "Mainboard mATX, socket AM5, hỗ trợ DDR5", "price": 3990000, "originalPrice": null, "specs": {"chipset": "B650", "form_factor": "mATX", "ram_slots": 4}, "compat": {"socket": "AM5", "memory_type": "DDR5", "form_factor": "mATX", "ram_slots": 4, "m2_slots": 2}, "tags": ["gaming"], "warrantyMonths": 36, "status": 2, "available": 6},
  {"id": "6adcb0cc2444ef877c391299", "sku": "MB-ASUS-B760M-D5", "name": "ASUS TUF B760M-PLUS WIFI DDR5", "slug": "asus-tuf-b760m-plus-wifi-ddr5", "categoryCode": "MAINBOARD", "brandCode": "ASUS", "shortDescription": "Mainboard mATX, socket LGA1700, hỗ trợ DDR5", "price": 4290000, "originalPrice": null, "specs": {"chipset": "B760", "form_factor": "mATX", "ram_slots": 4}, "compat": {"socket": "LGA1700", "memory_type": "DDR5", "form_factor": "mATX", "ram_slots": 4, "m2_slots": 2}, "tags": ["gaming"], "warrantyMonths": 36, "status": 2, "available": 8},
  {"id": "6adf719d17897e99b062e0fe", "sku": "RAM-CORSAIR-16G-D4", "name": "Corsair Vengeance LPX 16GB (2x8GB) DDR4 3200", "slug": "corsair-vengeance-lpx-16gb-ddr4-3200", "categoryCode": "RAM", "brandCode": "CORSAIR", "shortDescription": "Kit 2x8GB DDR4 3200MHz", "price": 1190000, "originalPrice": null, "specs": {"capacity_gb": 16, "speed_mhz": 3200}, "compat": {"memory_type": "DDR4", "modules": 2}, "tags": ["office"], "warrantyMonths": 36, "status": 2, "available": 25},
  {"id": "6adcb0cc2444ef877c39129a", "sku": "RAM-KINGSTON-32G-D5", "name": "Kingston Fury Beast 32GB (2x16GB) DDR5 6000", "slug": "kingston-fury-beast-32gb-ddr5-6000", "categoryCode": "RAM", "brandCode": "KINGSTON", "shortDescription": "Kit 2x16GB DDR5 6000MHz", "price": 2790000, "originalPrice": null, "specs": {"capacity_gb": 32, "speed_mhz": 6000}, "compat": {"memory_type": "DDR5", "modules": 2}, "tags": ["gaming"], "warrantyMonths": 36, "status": 2, "available": 20},
  {"id": "6adcb0cc2444ef877c39129b", "sku": "GPU-MSI-4070S-12G", "name": "MSI GeForce RTX 4070 SUPER 12GB Ventus 2X", "slug": "msi-rtx-4070-super-12gb-ventus-2x", "categoryCode": "GPU", "brandCode": "MSI", "shortDescription": "Card đồ họa chơi tốt game 2K, 12GB GDDR6X", "price": 16990000, "originalPrice": null, "specs": {"vram_gb": 12, "memory_type": "GDDR6X"}, "compat": {"length_mm": 242, "tdp_w": 220, "recommended_psu_w": 650}, "tags": ["gaming", "2K"], "warrantyMonths": 36, "status": 2, "available": 55},
  {"id": "6adf719d17897e99b062e0ff", "sku": "GPU-ASUS-4080S-16G", "name": "ASUS TUF Gaming GeForce RTX 4080 SUPER 16GB", "slug": "asus-tuf-rtx-4080-super-16gb", "categoryCode": "GPU", "brandCode": "ASUS", "shortDescription": "Card đồ họa chơi game 4K, 16GB GDDR6X, dài 348mm", "price": 32990000, "originalPrice": null, "specs": {"vram_gb": 16, "memory_type": "GDDR6X"}, "compat": {"length_mm": 348, "tdp_w": 320, "recommended_psu_w": 850}, "tags": ["gaming", "4K"], "warrantyMonths": 36, "status": 2, "available": 2},
  {"id": "6adf719d17897e99b062e104", "sku": "STORAGE-KINGSTON-NV2-1T", "name": "Kingston NV2 1TB M.2 NVMe PCIe 4.0", "slug": "kingston-nv2-1tb-nvme", "categoryCode": "STORAGE", "brandCode": "KINGSTON", "shortDescription": "SSD NVMe 1TB, đọc 3500MB/s", "price": 1590000, "originalPrice": null, "specs": {"capacity_gb": 1000, "read_mbps": 3500}, "compat": {"interface": "NVMe", "form_factor": "M.2 2280"}, "tags": ["gaming", "office"], "warrantyMonths": 36, "status": 2, "available": 40},
  {"id": "6adf719d17897e99b062e102", "sku": "PSU-MSI-A500DN", "name": "MSI MAG A500DN 500W 80 Plus", "slug": "msi-mag-a500dn-500w", "categoryCode": "PSU", "brandCode": "MSI", "shortDescription": "Nguồn 500W chuẩn 80 Plus, cho cấu hình văn phòng", "price": 990000, "originalPrice": null, "specs": {"efficiency": "80 Plus", "modular": "none"}, "compat": {"wattage": 500, "form_factor": "ATX"}, "tags": ["office"], "warrantyMonths": 36, "status": 2, "available": 12},
  {"id": "6adcb0cc2444ef877c39129c", "sku": "PSU-CORSAIR-RM750E", "name": "Corsair RM750e 750W 80 Plus Gold", "slug": "corsair-rm750e-750w", "categoryCode": "PSU", "brandCode": "CORSAIR", "shortDescription": "Nguồn 750W, chuẩn 80 Plus Gold, full modular", "price": 2690000, "originalPrice": null, "specs": {"efficiency": "80 Plus Gold", "modular": "full"}, "compat": {"wattage": 750, "form_factor": "ATX"}, "tags": [], "warrantyMonths": 84, "status": 2, "available": 5},
  {"id": "6adf719d17897e99b062e101", "sku": "CASE-MSI-M100R", "name": "MSI MAG Forge M100R", "slug": "msi-mag-forge-m100r", "categoryCode": "CASE", "brandCode": "MSI", "shortDescription": "Case mATX nhỏ gọn, VGA dài tối đa 330mm", "price": 1090000, "originalPrice": null, "specs": {"type": "Mini Tower", "color": "Đen"}, "compat": {"supported_form_factors": ["mATX", "ITX"], "max_gpu_length_mm": 330, "max_cooler_height_mm": 160}, "tags": [], "warrantyMonths": 12, "status": 2, "available": 1},
  {"id": "6adf719d17897e99b062e100", "sku": "CASE-CORSAIR-4000D", "name": "Corsair 4000D Airflow", "slug": "corsair-4000d-airflow", "categoryCode": "CASE", "brandCode": "CORSAIR", "shortDescription": "Case mid-tower, hỗ trợ ATX, VGA dài tối đa 360mm", "price": 2290000, "originalPrice": null, "specs": {"type": "Mid Tower", "color": "Đen"}, "compat": {"supported_form_factors": ["ATX", "mATX", "ITX"], "max_gpu_length_mm": 360, "max_cooler_height_mm": 170}, "tags": ["gaming"], "warrantyMonths": 24, "status": 2, "available": 7},
  {"id": "6adf719d17897e99b062e103", "sku": "COOLER-CORSAIR-H100I", "name": "Corsair iCUE H100i RGB Elite 240mm", "slug": "corsair-icue-h100i-rgb-elite", "categoryCode": "COOLER", "brandCode": "CORSAIR", "shortDescription": "Tản nhiệt nước AIO 240mm, hỗ trợ LGA1700 và AM5", "price": 3290000, "originalPrice": null, "specs": {"type": "AIO", "radiator_mm": 240}, "compat": {"supported_sockets": ["LGA1700", "AM5"], "height_mm": 52}, "tags": ["gaming"], "warrantyMonths": 60, "status": 2, "available": 4}
]
```

Lịch sử giá thật của `GPU-MSI-4070S-12G` (mới nhất trước): `INITIAL` → 17.200.000; `COST_CHANGE` 17.200.000 → 16.990.000 (22/10/2026).

Bộ cấu hình mẫu cho PC Builder:
- **Hợp lệ** (34.750.000 ₫, `estimatedWattage` 345 W): CPU-I5-14600K + MB-ASUS-B760M-D5 + RAM-KINGSTON-32G-D5 + GPU-MSI-4070S-12G + PSU-CORSAIR-RM750E
  (+ STORAGE-KINGSTON-NV2-1T, CASE-CORSAIR-4000D, COOLER-CORSAIR-H100I nếu muốn đủ 8 slot).
- **Sai socket:** CPU-R5-7600X (AM5) + MB-ASUS-B760M-D5 (LGA1700) → `CPU_MB_SOCKET`.
- **Sai chuẩn RAM:** MB-MSI-B760-D4 (DDR4) + RAM-KINGSTON-32G-D5 → `RAM_MB_TYPE`.
- **Thiếu nguồn:** CPU-I5-14600K + GPU-ASUS-4080S-16G + PSU-MSI-A500DN → 445 W × 1.2 = 534 W > 500 W → `PSU_WATTAGE`.
- **VGA quá dài:** GPU-ASUS-4080S-16G (348 mm) + CASE-MSI-M100R (tối đa 330 mm) → `GPU_CASE_LENGTH`.
- **Mainboard không vừa case:** MB-MSI-B760-D4 (ATX) + CASE-MSI-M100R (mATX/ITX) → `MB_CASE_FORM_FACTOR`.

Mock rule engine: cài lại 5 luật ở g.3 trên dữ liệu `compat` (tất định, vài chục dòng code), message theo mẫu:
`CPU {source} dùng socket {sv} không khớp mainboard {target} ({tv})` · `RAM {source} là {sv} nhưng mainboard {target} hỗ trợ {tv}` ·
`Tổng công suất ước tính {sv}W vượt khả năng nguồn {target} ({tv}W, đã tính hệ số an toàn)` (`{source}` = "cấu hình", `{sv}` = mức đã nhân 1.2) ·
`VGA {source} dài {sv}mm, case {target} chỉ chứa tối đa {tv}mm` · `Mainboard {source} chuẩn {sv}, case {target} chỉ hỗ trợ {tv}`
(`{source}`/`{target}` là `name` sản phẩm; giá trị mảng nối bằng `/`).

### h.4 Kho và tồn kho

Kho seed: `id 1` `HCM-01` "Kho Hồ Chí Minh" (TP. Hồ Chí Minh) · `id 2` `HN-01` "Kho Hà Nội" (Hà Nội). Cả hai `isActive: 1`.
(Môi trường local còn vài kho "Kho Đà Nẵng ..." do test tự động tạo, không đưa vào mock.)

| SKU | Kho 1 (HCM-01) | Kho 2 (HN-01) | `minQuantity` | Ghi chú |
|---|---|---|---|---|
| CPU-I5-14600K | 78 | 6 | 2 | |
| CPU-R5-7600X | 10 | – | 2 | |
| MB-ASUS-B760M-D5 | 8 | – | 2 | |
| MB-GIGABYTE-B650M-D5 | 6 | – | 2 | |
| MB-MSI-B760-D4 | 5 | – | 2 | |
| RAM-KINGSTON-32G-D5 | 20 | – | 2 | |
| RAM-CORSAIR-16G-D4 | 25 | – | 2 | |
| GPU-MSI-4070S-12G | 52 | 3 | 2 | |
| GPU-ASUS-4080S-16G | 2 | – | 2 | sắp hết |
| PSU-CORSAIR-RM750E | 0 | 5 | 2 | kho 1 hết (sắp hết) |
| PSU-MSI-A500DN | 12 | – | 2 | |
| CASE-CORSAIR-4000D | 7 | – | 2 | |
| CASE-MSI-M100R | 1 | – | 2 | sắp hết |
| STORAGE-KINGSTON-NV2-1T | 30 | 10 | 2 | |
| COOLER-CORSAIR-H100I | 4 | – | 2 | |

`reservedQuantity` đều 0. Để mock trạng thái "Hết hàng" trên trang khách, đặt một SKU có tổng 0 (vd CASE-MSI-M100R = 0).
Biến động kho mẫu: xem f.17 (`type 1`, `referenceType "IMPORT"`, `referenceCode "PN-..."`).

### h.5 Đơn hàng

Seed có 7 đơn (`paymentMethod` 1 COD, 2 VNPay). Bổ sung 4 đơn mock (đánh dấu *) để đủ mọi trạng thái.

| `code` | Chủ | `status` | Thanh toán | Tổng (₫) | Ghi chú |
|---|---|---|---|---|---|
| DH20261005000003 | customer1 | 6 Hoàn tất | COD, đã TT | 5.580.000 | 2 × RAM-KINGSTON-32G-D5; timeline 1→4→5→6 |
| DH20261010000004 | customer2 | 6 Hoàn tất | VNPay, đã TT | 19.390.000 | PSU-CORSAIR-RM750E + GPU-MSI-4070S-12G (17.200.000); voucher WELCOME10, giảm 500.000 |
| DH20261018000005 | customer1 | 6 Hoàn tất | COD, đã TT | 7.080.000 | RAM-KINGSTON-32G-D5 + MB-ASUS-B760M-D5 |
| DH20261020000006 | customer2 | 7 Đã hủy | COD, chưa TT | 8.830.000 | 1 × CPU-I5-14600K giá 8.790.000, ship 40.000; lý do "Đổi ý, muốn mua bản khác" |
| DH20261023000007 | customer1 | 6 Hoàn tất | COD, đã TT | 3.200.000 | 2 × STORAGE-KINGSTON-NV2-1T, ship 20.000 |
| DH20261024000001 | customer1 | 7 Đã hủy | COD, chưa TT | 25.990.000 | GPU-MSI-4070S-12G (17.200.000) + CPU-I5-14600K (8.790.000); lý do "Đổi ý, muốn chọn card khác" |
| DH20261024000002 | customer2 | 3 Đã thanh toán | VNPay, đã TT | 7.990.000 | timeline 1→2→3 (seed); trên máy local đã được chuyển sang 4 khi thử API |
| DH20261026000008* | customer1 | 1 Chờ xử lý | COD, chưa TT | 19.780.000 | GPU-MSI-4070S-12G + RAM-KINGSTON-32G-D5 (để thử hủy đơn) |
| DH20261026000009* | customer1 | 2 Chờ thanh toán | VNPay, chưa TT | 7.990.000 | CPU-I5-14600K |
| DH20261025000010* | customer2 | 5 Đang giao | COD, chưa TT | 4.330.000 | MB-ASUS-B760M-D5 + ship 40.000 |
| DH20261012000011* | customer1 | 8 Trả hàng | VNPay, đã hoàn (3) | 2.290.000 | CASE-CORSAIR-4000D, lý do "Hàng lỗi" |

Địa chỉ snapshot: customer1 "1 Lê Lợi, Phường Bến Thành, Thành phố Hồ Chí Minh", người nhận "Khách Một", 0900000001;
customer2 "2 Tràng Tiền, Phường Hoàn Kiếm, Thành phố Hà Nội", "Khách Hai", 0900000002. Mã đơn dạng `DH` + `yyyyMMdd` + 6 số.

Thống kê tháng 10/2026 thật: `totalOrders 7`, `revenue 35.250.000`, `grossRevenue 43.240.000`, `ordersByStatus {"3":1,"6":4,"7":2}`;
top sản phẩm đầu: RAM-KINGSTON-32G-D5 (3 chiếc, 8.370.000 ₫).

### h.6 Đánh giá

Seed gần như trống. Mock gợi ý (đúng dạng `Review`):

| `sku` | Người viết | `rating` | `status` | Tiêu đề | Trả lời của shop |
|---|---|---|---|---|---|
| GPU-MSI-4070S-12G | admin1 | 5 | 1 Chờ duyệt | Card mát, chơi 2K mượt (có thật trong DB) | – |
| CASE-CORSAIR-4000D | customer2 | 4 | 2 Đã duyệt | Case rộng, dễ đi dây (đã tạo khi thử API, đã gỡ) | "Cảm ơn bạn đã tin dùng PC Shop!" |
| CPU-I5-14600K* | customer1 | 5 | 2 Đã duyệt | Hiệu năng tốt trong tầm giá | – |
| RAM-KINGSTON-32G-D5* | customer1 | 4 | 2 Đã duyệt | Chạy ổn bus 6000 | – |
| PSU-MSI-A500DN* | customer2 | 2 | 3 Từ chối | (nội dung quảng cáo) | – |

`productId` của review = `id` sản phẩm ở h.3.

### h.7 Voucher

| `id` | `code` | `name` | `type` | `value` | `minOrderAmount` | `maxDiscountAmount` | `usageLimit` | `perUserLimit` | `isActive` |
|---|---|---|---|---|---|---|---|---|---|
| 1 | WELCOME10 | Giảm 10% cho đơn đầu tiên | 1 | 10 | 1.000.000 | 500.000 | 1000 | – | 1 |
| 2 | FREESHIP | Miễn phí vận chuyển | 3 | 0 | 500.000 | – | – | – | 1 |
| 3* | VGA500K | Giảm 500K cho VGA | 2 | 500.000 | 10.000.000 | – | 100 | 1 | 1 (`applicableCategories: ["GPU"]`, 01–30/11/2026) |
| 4* | HETHAN | Mã đã hết hạn | 1 | 5 | 0 | – | – | – | 1 (`endAt` 2026-09-30T23:59:59) |

### h.8 Tài khoản, hồ sơ, địa chỉ, thông báo, cấu hình PC

- Tài khoản: bảng ở mục b. Mock đăng nhập = chọn một trong 4 tài khoản hoặc "Khách vãng lai".
- Hồ sơ customer1: `displayName "Khách Một"`, `email customer1@pcshop.local`, `phoneNumber 0912345678`, `gender 1`, `birthDate 2003-05-20`.
- Địa chỉ customer1: id 2 "Khách Một (công ty)", 0900000011, Thành phố Đà Nẵng (48) / Phường Hải Châu (48001), "10 Bạch Đằng" (mặc định);
  id 1 "Khách Một", 0900000001, Thành phố Hồ Chí Minh (79) / Phường Bến Thành (79002), "1 Lê Lợi".
- Thông báo customer1 (3, mẫu ở f.10): "Đơn hàng đã được xác nhận" (DH20261023000007), "Đơn hàng đang được giao" (DH20261018000005),
  "Miễn phí vận chuyển" (PROMOTION, không có `data`). Mock nên để 1–2 cái `isRead: false`.
- Cấu hình PC: mock một cấu hình công khai `PC7KX2M9QA` "PC gaming 2K" (bộ hợp lệ ở h.3, `purpose GAMING`, `budget 45000000`)
  và một cấu hình riêng tư lỗi nguồn của customer1.

### h.9 Câu trả lời chat AI mẫu (tự soạn cho mock, không phải output thật)

Hỏi "Tư vấn card đồ họa chơi game 2K, còn hàng không?" → `answer`:
"Với nhu cầu chơi game 2K, bạn có thể tham khảo **MSI GeForce RTX 4070 SUPER 12GB Ventus 2X** (SKU: GPU-MSI-4070S-12G): 12GB GDDR6X,
TDP 220W, nên dùng nguồn từ 650W. Sản phẩm hiện còn hàng. Nếu muốn chơi 4K, bản **ASUS TUF Gaming RTX 4080 SUPER 16GB**
(SKU: GPU-ASUS-4080S-16G) mạnh hơn nhưng dài 348mm, cần case đủ rộng và nguồn 850W."
Mock trả sau 1,5 giây để thấy trạng thái "đang trả lời".

---

## i. Thiết kế

**Trạng thái: đã có đề xuất, CHƯA CHỐT.** `docs/ui/design-brief.md` đề xuất 3 phương án, khuyến nghị phương án A "Datasheet" và đang chờ nhóm duyệt.
Mockup thử nghiệm (Vite + React + Tailwind) dùng phương án A. Frontend dùng bộ token dưới đây; nếu nhóm chọn phương án khác chỉ đổi màu và font.

### Token (phương án A, Tailwind v4 `@theme`)

```css
@theme {
  --color-page: #F3F5F8;       /* nền trang, xám lạnh */
  --color-surface: #FFFFFF;    /* thẻ, bảng */
  --color-sunken: #EAEEF3;     /* ô lọc, hàng xen kẽ */
  --color-ink: #0F1B2D;        /* chữ chính */
  --color-ink-muted: #5B6878;  /* chữ phụ */
  --color-line: #D9DFE6;       /* đường kẻ */
  --color-brand: #1D4ED8;      /* link, focus, điều hướng, nút chính ở admin */
  --color-brand-tint: #E6EDFC;
  --color-buy: #C2410C;        /* CHỈ nút mua + giá bán (không dùng ở admin) */
  --color-buy-hover: #9A3412;
  --color-buy-tint: #FDEBDD;
  --color-ok: #166534;   --color-ok-tint: #E7F5EC;                            /* tương thích OK, thành công */
  --color-warn: #7A4F00; --color-warn-tint: #FFF3C4; --color-warn-line: #E9B200; /* cảnh báo, severity 2 */
  --color-error: #B91C1C; --color-error-tint: #FDECEC;                        /* lỗi, severity 1 */

  --font-sans: 'Be Vietnam Pro', 'Noto Sans', system-ui, sans-serif;
  --font-code: 'JetBrains Mono', ui-monospace, monospace; /* CHỈ mã SKU, mã đơn */

  --radius-control: 6px;  /* nút, ô nhập, chip */
  --radius-card: 10px;    /* thẻ, khối */
  --radius-layer: 14px;   /* modal, drawer, widget chat */

  --shadow-raise: 0 1px 2px rgba(15, 27, 45, 0.06);
  --shadow-layer: 0 12px 32px rgba(15, 27, 45, 0.16);
}
```

- **Font:** Be Vietnam Pro 400/500/600/700 (subset vietnamese, cài qua `@fontsource/be-vietnam-pro`), JetBrains Mono 400/500.
  Số tiền và thông số dùng `font-variant-numeric: tabular-nums`.
- **Cỡ chữ:** Display 48/700 (chỉ hero) · H1 30/700 · H2 24/600 · H3 18/600 · Body 16/400 line-height 1.55 · Small 14 (cỡ mặc định admin) ·
  Caption 12/500 (không nhỏ hơn) · Giá 20–30/700 màu `buy` · SKU 13/500 mono. Viết hoa kiểu câu, không ALL CAPS.
- **Khoảng cách:** lưới 4px. Khách: nội dung tối đa 1280px, lề 32px (mobile 16px), khoảng giữa khối 48–64px, hàng bảng 56px.
  Admin: sidebar 240px, lề 24px, khoảng giữa khối 24px, hàng bảng 40px, chữ 14px, không dùng màu `buy`.
- **Icon:** Lucide (`lucide-react`), nét 1.5px, không dùng emoji làm icon.
- **Trạng thái chung:** nút có hover/focus (vòng 2px `brand`, cách 2px)/disabled/đang xử lý (spinner, giữ chiều rộng); skeleton giữ đúng kích thước;
  rỗng = một câu + một hành động; lỗi = nói chuyện gì xảy ra và cách sửa.
- **Điểm nhấn riêng "đường khớp nối":** chip thông số tương thích (`socket`, `memory_type`, `form_factor`, `wattage`, `length_mm`) có một khấc nhỏ ở cạnh trái
  như chân cắm, dùng ở thẻ sản phẩm, trang chi tiết, PC Builder, thẻ trong chat; PC Builder xếp slot dọc nối bằng đường "bus", đoạn nối đổi màu theo kết quả
  luật (200ms, tôn trọng `prefers-reduced-motion`); đồng hồ công suất thanh ngang lục → hổ phách → đỏ.
- **Chưa chốt:** chế độ tối (chưa làm), theme trang đăng nhập Keycloak (dùng mặc định), logo (dùng chữ "PC Shop").

---

## j. Ràng buộc kỹ thuật cho frontend

### Công nghệ

- **React 18 + TypeScript (strict) + Vite**, **Tailwind CSS v4**, **React Router v6** (data router), **TanStack Query v5** cho mọi dữ liệu server.
- Form: React Hook Form + Zod (gợi ý). Icon: `lucide-react`. Font: `@fontsource/*` (không gọi Google Fonts lúc chạy).
- Dev server **cổng 3000** (`server: { port: 3000, strictPort: true }`), lý do ở mục c.
- Kiểu dữ liệu API lấy từ `docs/ui/api-types.ts` (chép vào `src/api/types.ts`, không sửa tên trường).

### Tầng gọi API tách riêng, 2 chế độ

```
src/
  api/
    types.ts            # = docs/ui/api-types.ts
    http.ts             # fetch wrapper REAL: base URL, Bearer, X-Guest-Key, parse envelope, ném ApiError
    errors.ts           # class ApiError { status, code, message, bulkErrors?, fieldErrors?, requestId? }
    endpoints/          # mỗi nhóm một file: catalog.ts, cart.ts, orders.ts, ... (hàm thuần: getProducts(query) → Promise<PageResponse<Product>>)
    mock/
      db.ts             # dữ liệu mục h (có thể ghi, giữ trong bộ nhớ + localStorage)
      handlers/*.ts     # cài lại logic tối thiểu: lọc/phân trang, giỏ, rule engine tương thích, chuyển trạng thái đơn, voucher
    index.ts            # chọn REAL hoặc MOCK theo env, export cùng một interface
  auth/
    AuthProvider.tsx    # interface chung
    mockAuth.ts
    keycloakAuth.ts
  hooks/                # useProducts, useCart... bọc TanStack Query quanh api/endpoints
```

- Biến môi trường:
  - `VITE_API_MODE=mock|real` (**mặc định `mock`**).
  - `VITE_API_BASE_URL=http://localhost:8000` (chỉ dùng ở REAL).
  - `VITE_KEYCLOAK_URL=http://localhost:8180`, `VITE_KEYCLOAK_REALM=pcshop`, `VITE_KEYCLOAK_CLIENT_ID=pcshop-web`.
- Component **không** gọi `fetch` trực tiếp và không biết đang ở chế độ nào; chỉ dùng hook.
- MOCK phải mô phỏng: độ trễ 200–600ms, lỗi theo đúng dạng mục d (envelope, bulk errors, constraint violation), phân trang `PageResponse`,
  quyền (trả 401/403 khi vai trò không đủ), quyền sở hữu (customer1 xem đơn customer2 → 403). Có công tắc giả lập lỗi mạng/500 để vẽ trạng thái lỗi.
- `http.ts` REAL: gắn `Authorization` (lấy token qua interface auth), gắn `X-Guest-Key` cho `/cart/**` khi chưa đăng nhập, xử lý 401
  (làm mới token, thử lại một lần), đọc `X-Request-Id`, tải file (blob + tên từ `Content-Disposition`).
- TanStack Query: query key theo tài nguyên (`['products', query]`, `['cart']`, `['orders','my']`...); mọi API ghi của giỏ trả giỏ đầy đủ
  → `setQueryData(['cart'], data)` thay vì refetch; sau khi đăng nhập/đăng xuất `invalidateQueries` toàn bộ dữ liệu theo user.

### Xác thực tách thành interface

```ts
export interface AuthUser {
  id: string;                 // sub
  username: string;           // preferred_username
  name: string | null;
  email: string | null;
  roles: ('CUSTOMER' | 'STAFF' | 'ADMIN')[];
  permissions: ('product:write' | 'order:update-status' | 'inventory:write' | 'knowledge:write')[];
}
export interface AuthService {
  init(): Promise<void>;
  user: AuthUser | null;               // null = khách vãng lai
  isAuthenticated: boolean;
  login(redirectTo?: string): Promise<void>;
  logout(): Promise<void>;
  getAccessToken(): Promise<string | null>;   // REAL: updateToken(30) trước khi trả
  hasRole(role: AuthUser['roles'][number]): boolean;
  hasPermission(p: AuthUser['permissions'][number]): boolean;
  onChange(cb: (user: AuthUser | null) => void): () => void;
}
```

- **MOCK:** `login()` mở hộp chọn vai trò: Khách vãng lai / customer1 / customer2 / staff1 / admin1 (dữ liệu bảng mục b),
  lưu lựa chọn ở localStorage; có công tắc đổi nhanh ở góc màn hình (chỉ hiện khi MOCK). Không hỏi mật khẩu.
- **REAL:** `keycloak-js` 26.x, Authorization Code + PKCE S256, `check-sso`; đọc user từ token (`sub`, `preferred_username`, `name`, `email`,
  `realm_access.roles`, `resource_access['pcshop-backend'].roles`). Không lưu token vào localStorage (giữ trong bộ nhớ của keycloak-js).
- Bảo vệ route: `RequireAuth` (chưa đăng nhập → `login(location)`), `RequireRole('STAFF'|'ADMIN')`, `RequirePermission(p)` → trang `/403`.

### Chat AI

- Chỉ gọi `POST /api/v1/ai/chat` của backend (qua tầng API, có MOCK). **Không** gọi thẳng Gemini, OpenAI, Ollama hay bất kỳ LLM nào từ trình duyệt,
  không nhúng API key nào.
- Timeout phía client ≥ 90 giây; trong lúc chờ cho phép hủy (AbortController). Không stream (khi backend có SSE sẽ bổ sung sau).

### Chất lượng

- Tiếng Việt có dấu đầy đủ, `lang="vi"`. Định dạng tiền/ngày bằng `Intl` locale `vi-VN`.
- Responsive phía khách (390 → 1440), không cuộn ngang ở 390px, vùng chạm ≥ 44px trên mobile. Admin chỉ desktop (≥ 1280).
- Truy cập: tương phản ≥ 4.5:1, focus thấy được, nhãn form gắn `label`, trạng thái không chỉ dùng màu.
- Không có secret nào trong code frontend (client `pcshop-web` là public client).

---

## k. Ngoài phạm vi

- **MoMo thật** và **gọi API hoàn tiền của cổng**: chưa có (MoMo đi qua trang giả lập; hoàn tiền do nhân viên làm tay rồi đánh dấu).
- **Realtime:** thông báo đẩy (WebSocket/SSE), chat AI dạng stream. Dùng polling cho số thông báo chưa đọc. Chưa gửi email.
- Các mục "Đợt 2" khác: event `product.updated` / `product.hidden` (AI), giới hạn tần suất `/ai/**`, lịch sử chat lưu server,
  tóm tắt review bằng AI, AI PC Builder theo ngân sách.
- API chưa có, đừng thiết kế màn phụ thuộc vào chúng: danh sách "bán chạy" công khai, ảnh sản phẩm trong danh sách đơn, doanh thu theo ngày,
  "đánh giá của tôi", sửa `specSchema` của danh mục, liệt kê/xóa tài liệu tri thức AI, xóa tài khoản người dùng.
- Theme trang đăng nhập Keycloak, chế độ tối, đa ngôn ngữ.

---

## Phụ lục: điểm bất thường của backend cần biết

Đã sửa ngày 2026-11-07 (xem `docs/api-changelog.md`): lỗi validate Quarkus đã có envelope; 403/500 của Quarkus có envelope;
`ordersByStatus` đủ 8 khóa; `/orders/my`, `/reviews` có phân trang; `GET /vouchers` đã lọc và có `applicableCategories`;
người tự đăng ký có role `CUSTOMER`; tiền ở Spring không còn `.0`; message validate tiếng Việt; có `requiredWattage`;
`userDisplayName` là họ tên. Còn lại:

1. 401 do token sai/hết hạn trả body rỗng (cả Spring và Quarkus): luôn kiểm tra status trước khi `response.json()`.
2. Hai kiểu ngày giờ: có `Z` (UTC) và không múi giờ (giờ VN). Đừng gắn `Z` cho loại sau.
3. `POST /products/batch` không giữ thứ tự SKU gửi lên và bỏ qua SKU không có/Nháp: luôn map theo `sku`.
4. `ordersByStatus` có khóa dạng chuỗi (`"6"`).
5. `Review.productId` là ObjectId của sản phẩm (khác nhau giữa các máy); trang sản phẩm nên dùng `?sku=`. Review tạo trước 2026-11-07 có `userDisplayName` là username.
6. Dữ liệu local có một số bản ghi do test tự động tạo (voucher `GIAMQ...`, kho "Kho Đà Nẵng ...", luật `COOLER_Q...` đã tắt, sản phẩm `XLS-...`, `DOC-TEST-...`):
    không dùng làm dữ liệu mock.
