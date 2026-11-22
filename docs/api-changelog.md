# Thay đổi API

Ghi lại API mới hoặc thay đổi so với `docs/api-backlog.md` / tài liệu thiết kế, mới nhất ở trên.
Đường dẫn bắt đầu bằng `/api/v1`, đi qua gateway `:8000`.

## 2026-11-21: ai-service hoàn thiện (chat SSE, lịch sử Mongo, kho tri thức admin, event sản phẩm)

### Đổi đường dẫn (phá vỡ tương thích)

| Cũ | Mới | Ghi chú |
|---|---|---|
| `POST /ai/knowledge` | `POST /admin/knowledge` | API admin về dưới `/admin/**` theo quy ước; gateway đã khai route |
| `POST /ai/knowledge/sync-products` | `POST /admin/knowledge/sync-products` | Kết quả thêm `removed` (sản phẩm không còn bán bị gỡ); đọc hết mọi trang catalog (trước chỉ 100 sản phẩm đầu) |
| `GET /ai/search` (public) | `GET /admin/knowledge/search` (perm knowledge:write) | `ScoredChunk.metadataJson` (chuỗi) → `metadata` (object), thêm `score` |

### API mới

| Request | Quyền | Kết quả |
|---|---|---|
| `POST /ai/chat/stream` | public | SSE, mỗi `data:` là JSON `{type, text, sessionId, requestId}`: `session` → `status`* → `token` → `done` (hoặc `error`). Hiện câu trả lời đến trong một `token` (xem dưới) |
| `GET /ai/chat/sessions?limit=` | user | phiên chat gần đây của user |
| `GET /ai/chat/sessions/{id}` · `DELETE` | public; phiên đã gắn user thì chỉ chủ phiên (403) | lịch sử sạch (câu hỏi + câu trả lời) / xóa thật |
| `POST /ai/chat/feedback` `{sessionId, requestId, value}` | như trên | ghi `ai_request_logs.feedback` (1 / -1) |
| `GET /admin/knowledge?sourceType=&status=&q=&page=&size=` | perm knowledge:write | `PageResponse<KnowledgeDocument>`; mặc định bỏ tài liệu đã gỡ (status 5) |
| `GET /admin/knowledge/{id}` | perm knowledge:write | tài liệu + các chunk |
| `DELETE /admin/knowledge/{id}` | perm knowledge:write | xóa thật chunk, tài liệu chuyển status 5 |

### Thay đổi hành vi

- `POST /ai/chat`: response thêm `requestId`; lỗi model trả 502 `EXTERNAL_SERVICE_ERROR` (trước 500 body rỗng); gửi câu mới khi câu trước
  của cùng phiên chưa xong → 409; `sessionId` phải khớp `[A-Za-z0-9-]{8,64}`; `message` tối đa 1000 ký tự.
- Bộ nhớ hội thoại lưu ở Mongo (database `ai`, collection `chat_sessions`), không mất khi restart; giữ 12 message gần nhất.
  Câu hỏi cũ được cắt phần tri thức RAG chèn thêm để lượt sau không mang theo.
- Phiên tạo khi đã đăng nhập gắn với user; phiên vãng lai được gắn khi user đăng nhập rồi hỏi tiếp.
- catalog gửi `product.updated` (tạo/sửa/nhập Excel/chuyển sang ACTIVE) và `product.hidden` (ẩn/ngừng bán); ai-service index lại / gỡ
  ngay. Gửi thẳng không qua outbox (Mongo không có transaction): Kafka lỗi lúc đó thì chạy `sync-products` để bù.
- Tool mới: `checkCompatibility` gọi `POST /compatibility/check` của catalog (trước là stub), `findProducts` (danh mục, khoảng giá, từ khóa).
- Mỗi câu trả lời ghi `ai_request_logs` (chunk đã dùng, tool đã gọi kèm kết quả, độ trễ, lỗi).
- SSE chưa stream từng token: quarkus-langchain4j-ollama 1.0.2 đọc hỏng dòng `tool_calls` khi stream. Endpoint gửi tiến trình
  (`status`) trong lúc model chạy rồi gửi cả câu trả lời; client nối các `token` lại nên sau này đổi sang stream thật không phải sửa.

## 2026-11-08 (rà soát): Sửa lỗi đồng thời, an toàn cấu hình, dọn dữ liệu kỹ thuật

- **Thanh toán:** IPN và return URL đến cùng lúc cho một lần thanh toán → chỉ một bên ghi kết quả (UPDATE có điều kiện trạng thái),
  bên kia trả "đã xử lý" (IPN `02`, return vẫn `result=success`). Trước đây có thể ghi hai lần / lỗi 409.
- **Trang thanh toán giả lập** mặc định TẮT (`application.yml`), chỉ bật ở `application-local.yml`, `application-dev.yml`.
  Profile mới (vd production) an toàn mặc định.
- **Nhân viên chuyển tay sang PAID (3)** → ghi dòng `payments` `MANUAL-<mã đơn>` (SUCCESS), để hủy/trả đơn sau đó tạo được yêu cầu hoàn tiền.
- **Hoàn tiền xong** chỉ chuyển đơn sang `paymentStatus` 3 khi đơn không còn lần thanh toán thành công nào (hoàn tiền thừa của lần
  thanh toán thứ hai không làm đơn thành "đã hoàn tiền").
- **Consumer Kafka của ordering:** lỗi thì thử lại giãn cách (2s → 1 phút, 10 lần, ~6 phút) rồi chuyển sang topic `<tên>.DLT`
  (trước: thử 10 lần liền rồi bỏ event, đơn có thể kẹt ở PENDING).
- **notification-service:** consumer group mới đọc từ event mới nhất (`latest`), không sinh thông báo / email cho lịch sử đơn khi chạy
  lần đầu. Event cũ hơn `pcshop.mail.max-event-age` (1 giờ) không gửi email (vẫn có thông báo trong ứng dụng).
- **Dọn bảng kỹ thuật** (3:30 sáng mỗi ngày): ordering, inventory xóa `outbox_events` đã gửi sau 7 ngày, `processed_events` sau 30 ngày;
  catalog `processed_events` TTL 30 ngày (changeSet `20261108-1000-processed-events-ttl`); review `outbox_events` TTL 7 ngày (đã có).
- ordering: scheduler 2 thread (relay outbox không phải chờ job hủy đơn quá hạn).

## 2026-11-08 (bổ sung 3): Thông báo realtime (SSE) và email

### API mới (notification-service)

| Request | Quyền | Kết quả |
|---|---|---|
| `POST /notifications/stream-ticket` | user | `{ticket, expiresIn}`: vé mở stream, dùng 1 lần, sống `pcshop.stream.ticket-ttl` (60 giây) |
| `GET /notifications/stream?ticket=` | header Bearer HOẶC vé | `text/event-stream`: `unread-count` khi mở, `notification` khi có thông báo mới, comment ping mỗi 25 giây |

### Hành vi

- Thông báo mới (từ event) được đẩy ngay tới mọi kết nối SSE đang mở của chủ thông báo (nhiều tab được). Kết nối giữ trong bộ nhớ:
  chỉ đúng khi chạy MỘT instance notification-service (nhiều instance cần Redis pub/sub).
- **Email** theo trạng thái đơn (`pcshop.mail.order-statuses`, mặc định 2–8), mẫu Qute `templates/order-status.html`, gửi tới
  `orders.customer_email` (email trong token lúc đặt; đơn cũ NULL thì không gửi). Gửi bất đồng bộ, lỗi/quá
  `pcshop.mail.send-timeout` chỉ ghi log, không thử lại. Event giao lại không gửi email hai lần.
- Profile local gửi vào **Mailpit** (service mới trong docker-compose: SMTP 1025, giao diện http://localhost:8025). Gửi thật: đặt
  `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_START_TLS` trong `.env`.
- Migration ordering `V20261108_1200__orders_customer_email.sql`; `Order` thêm `customerEmail`. `Events.OrderStatusChanged` thêm
  `customerEmail`, `customerName`.
- Phụ thuộc mới notification: `quarkus-mailer`, `quarkus-qute`, `quarkus-scheduler`.

## 2026-11-08 (bổ sung 2): Điểm sao tự cập nhật, "đã mua hàng", thông báo từ event

### API mới

| Request | Quyền | Kết quả |
|---|---|---|
| `GET /orders/purchased?sku=` | user | `{sku, purchased, orderCode}`: đơn HOÀN TẤT gần nhất của người gọi chứa SKU |

### Hành vi

- **Điểm sao:** duyệt / từ chối / gỡ review (kể cả hàng loạt) → review-service gửi `review.stats-changed` (điểm trung bình + số lượt
  của review đã duyệt) → catalog ghi `rating_avg`, `rating_count` (+ `rating_updated_at`, bỏ qua bản cũ hơn). Sản phẩm không còn review
  đã duyệt → `0` / `0`.
- **Đã mua hàng:** `POST /reviews` hỏi ordering (chuyển tiếp token); có đơn hoàn tất chứa SKU → `verifiedPurchase = true`,
  `orderCode` = đơn đó. Ordering không phản hồi → vẫn tạo review, `verifiedPurchase = false`.
- **Thông báo:** ordering gửi `order.status-changed` ở MỌI lần đổi trạng thái (và lúc tạo đơn); notification-service sinh thông báo
  cho trạng thái 2–8 (3 là `PAYMENT`, còn lại `ORDER_STATUS`). Trả lời review → `review.replied` → thông báo `REVIEW_REPLY`.
  Chống trùng bằng `source_event_id`. Chưa có email / đẩy realtime.
- review-service có outbox riêng (collection `outbox_events`, event đã gửi tự xóa sau 7 ngày). Mongo local không có transaction
  nên lưu review và ghi outbox không nguyên tử; event thống kê mang số tổng nên lần kiểm duyệt sau sẽ sửa lại.
- Event mới (`shared-events`): `OrderStatusChanged`, `ReviewStatsChanged`, `ReviewReplied`; topic `order.status-changed`,
  `review.stats-changed`, `review.replied`.
- Phụ thuộc mới: review `spring-kafka` + `shared-events`; notification `quarkus-messaging-kafka`. Cấu hình mới:
  review `pcshop.services.ordering`.

## 2026-11-08 (bổ sung): Thanh toán online, hoàn tiền, sold_count, chống đặt trùng

### API mới

| Request | Quyền | Kết quả |
|---|---|---|
| `POST /payments/{orderCode}` | chủ đơn, đơn status 2, không phải COD | `{paymentCode, paymentUrl, amount, expiresAt, gateway: VNPAY\|MOCK}` |
| `GET /payments/{orderCode}` | chủ đơn hoặc STAFF | các lần thanh toán (`payments`), mới nhất trước |
| `GET /payments/vnpay/ipn` | công khai (VNPay gọi, kiểm chữ ký) | `{RspCode, Message}` theo chuẩn VNPay (00, 01, 02, 04, 97), KHÔNG bọc `ResponseData` |
| `GET /payments/vnpay/return` | công khai (trình duyệt) | kiểm chữ ký, ghi kết quả, 302 → `frontend-return-url?orderCode=&result=success\|failed\|refund\|invalid` |
| `GET /payments/mock/{paymentCode}` · `.../complete?result=success\|failed` | công khai, chỉ khi `pcshop.payment.mock-enabled` | trang thanh toán giả lập (HTML) · ghi kết quả rồi 302 như trên |
| `GET /admin/refunds?status=` | STAFF, ADMIN | yêu cầu hoàn tiền kèm mã đơn |
| `PATCH /admin/refunds/{id}/complete` `{providerRefundId?}` | perm `order:update-status` | refund 2, payment 5 (REFUNDED), đơn `paymentStatus` 3 |

Gateway: thêm route `/api/v1/admin/refunds/**` → ordering.

### Hành vi

- **Thanh toán:** mỗi lần bấm là một dòng `payments` (`payment_code` = `<mã đơn>-<lần>` = `vnp_TxnRef`), hạn = `placedAt` + 15 phút.
  Thành công → đơn 2 → 3 (`paymentStatus` 2). Thất bại → khách thử lại được. Thông báo lặp (IPN + return URL, cổng gửi lại) chỉ xử lý lần đầu;
  số tiền lệch → không ghi. Máy cá nhân không nhận được IPN nên return URL cũng ghi kết quả (sau khi kiểm chữ ký).
- **VNPay** dùng khi `.env` có `VNPAY_TMN_CODE` + `VNPAY_HASH_SECRET` (sandbox); không có thì đơn VNPay đi qua trang giả lập.
  **MoMo** luôn qua trang giả lập. Khi chạy thật phải đặt `pcshop.payment.mock-enabled=false`.
- **Hoàn tiền:** tự tạo yêu cầu khi hủy (7) / trả hàng (8) đơn đã thu tiền, hoặc tiền về sau khi đơn đã hủy (các lần thanh toán đang chờ
  chuyển EXPIRED lúc hủy). Chưa gọi API hoàn tiền của cổng: nhân viên hoàn tay rồi đánh dấu.
- **COD hoàn tất** (6) ghi một dòng `payments` (`COD-<mã đơn>`, SUCCESS) để trả hàng thì có cái mà hoàn.
- **sold_count:** hoàn tất (6) → event `order.completed` → catalog cộng `sold_count`; trả hàng sau khi hoàn tất → `order.returned` → trừ lại
  (không xuống dưới 0). Catalog chống trùng bằng collection `processed_events`.
- **Chống đặt trùng:** `POST /orders` nhận header `Idempotency-Key` (1–64 ký tự). Cùng user + cùng key → trả đúng đơn đã tạo, kể cả hai
  request song song (chỉ mục unique). Không gửi key thì như cũ.
- Migration ordering `V20261108_1100__orders_request_id.sql`. Phụ thuộc mới: catalog `quarkus-messaging-kafka`.
- Unit test mới: `VnpayClientTest` (ký URL, kiểm chữ ký, phát hiện sửa tham số).

## 2026-11-08: Đặt hàng + Saga giữ hàng (ordering ↔ inventory qua Kafka)

### API mới

| Request | Quyền | Kết quả |
|---|---|---|
| `POST /orders` `{addressId, voucherCode?, paymentMethod (1 COD, 2 VNPAY, 3 MOMO), note?, expectedTotal?}` | user | `OrderDetail`, đơn `status 1` |

Tiền tính lại từ giỏ trên server (chung code với `/checkout/preview`). Lỗi: giỏ trống / địa chỉ không phải của mình → 400;
giỏ có món không mua được → 409 `OUT_OF_STOCK` (`data` = cảnh báo); mã giảm giá không dùng được → 422 `VOUCHER_INVALID`;
`expectedTotal` khác tổng tính lại → 409 `CONFLICT` (`data` = kết quả preview mới). Đặt xong giỏ bị xóa. Mã đơn `DH<yyyyMMdd><6 số>`.

### Luồng Saga (choreography, transactional outbox + processed_events ở cả hai service)

```
POST /orders → PENDING (1) + order.created ─► inventory giữ hàng (reserved_quantity, stock_reservations HOLD)
  stock.reserved       → COD: CONFIRMED (4) · online: AWAITING_PAYMENT (2)
  stock.reserve-failed → CANCELLED (7) "Không đủ hàng: SKU (cần x, còn y)"
AWAITING_PAYMENT quá 15 phút (pcshop.order.payment-timeout) → CANCELLED "Quá hạn thanh toán"
CANCELLED (mọi đường) → order.cancelled → inventory nhả hàng (RELEASED); trả lại lượt voucher
SHIPPING (5)          → order.shipped   → inventory trừ quantity + reserved, stock_movements "Xuất bán" (CONFIRMED)
```

### Thay đổi hành vi

- **Chuyển trạng thái tay:** từ PENDING nhân viên chỉ được hủy (trước: được chuyển sang 2/4). PENDING là bước Saga, thường chỉ 1–3 giây.
- **Khách tự hủy:** thêm trạng thái CONFIRMED (4), với điều kiện chưa thanh toán (`paymentStatus` ≠ 2). Message lỗi đổi thành
  "Đơn đã thanh toán hoặc đang giao, không thể tự hủy...".
- Chuyển sang PAID (3) thì `paymentStatus` = 2.
- Voucher: đặt đơn ghi `voucher_usages` + `used_count` (version của voucher chặn hai đơn vượt giới hạn cùng lúc → 409); hủy đơn trả lại lượt.
- Trả hàng (8) không tự cộng lại kho. Đơn tạo trước Saga (seed) chuyển sang giao thì không trừ kho (không có hàng đang giữ).
- `CheckoutController.PreviewResponse` đổi tên thành `CheckoutService.Quote` (JSON giữ nguyên).
- Event mới `Events.OrderShipped` / topic `order.shipped` (`shared-events`). Topic tạo tự động khi ordering khởi động (1 partition).
- Migration ordering `V20261108_1000__order_code_seq.sql` (sequence số đơn, bắt đầu 1000).
- Phụ thuộc mới: ordering `spring-kafka`; inventory `quarkus-messaging-kafka`, `quarkus-scheduler`. Lỗi xử lý event ở inventory →
  topic `dead-letter-topic-order-*`.

## 2026-11-07 (bổ sung): định dạng tiền, message tiếng Việt, công suất nguồn, tên người viết review

- **Tiền ở service Spring** (cart, ordering, review) bỏ số 0 thừa: `7990000.0` → `7990000`, `0.00` → `0` (vẫn là số JSON),
  giống phía Quarkus. Áp cho mọi `BigDecimal` trong response.
- **Message validate mặc định** bằng tiếng Việt (`không được để trống`, `phải lớn hơn hoặc bằng 1`...) ở mọi service
  (`shared-contracts/ValidationMessages.properties`). Ràng buộc có message riêng giữ nguyên.
- `POST /compatibility/check` và PC build trả thêm **`requiredWattage`** = tổng TDP × hệ số an toàn của luật `PSU_WATTAGE`
  (con số luật đó so với nguồn). `estimatedWattage` giữ nguyên nghĩa (chưa nhân hệ số).
- **`Review.userDisplayName`** là họ tên (claim `name` của Keycloak), không còn là tên đăng nhập; tài khoản chưa khai tên →
  `"Khách hàng"`. Review tạo trước ngày này vẫn mang username cũ.
- `AuthUser` (shared-contracts) thêm `displayName`; `/me` lấy họ tên từ đây thay vì đọc claim trực tiếp.

## 2026-11-07: Sửa lỗi sau đánh giá backend (bảo mật, đồng thời, hợp đồng lỗi)

### Thay đổi hợp đồng (frontend cần biết)

| API | Trước | Sau |
|---|---|---|
| Lỗi validate ở service **Quarkus** (customer, catalog, inventory, media, notification) | `{"title","status","violations"}`, không envelope | `ResponseData` `error_code: VALIDATION_ERROR`, `error_message: "field: lỗi, ..."`, `data: [{field, message}]` |
| Lỗi validate ở service **Spring** (cart, ordering, review) | `data: null` | thêm `data: [{field, message}]` như Quarkus |
| 403 do `@RolesAllowed`, lỗi không bắt được, 404/405 sai đường dẫn ở Quarkus | body rỗng / text | `ResponseData` (`FORBIDDEN`, `INTERNAL_ERROR`, `NOT_FOUND`...). Xung đột optimistic lock, trùng khóa → 409 `CONFLICT`. 401 do token sai/hết hạn vẫn **rỗng** (cả hai phía) |
| `GET /orders/my` | `List<Order>` | `PageResponse<Order>`, tham số `status`, `page` (0), `size` (10) |
| `GET /reviews?productId=` | `List<Review>` | `PageResponse<Review>`; nhận `productId` **hoặc** `sku`, `page` (0), `size` (10) |
| `GET /reviews/stats` | chỉ `productId` | `productId` hoặc `sku`; kết quả thêm trường `sku` |
| `POST /reviews` | bắt buộc `productId` + `sku` | chỉ cần `sku` (service tra `productId` từ catalog); gửi `productId` thì phải khớp. SKU không có/còn Nháp → 400 |
| `GET /vouchers` (công khai) | entity `Voucher` đầy đủ, cả mã hết hạn/hết lượt | `{code, name, type, value, maxDiscountAmount, minOrderAmount, applicableCategories, perUserLimit, startAt, endAt}`, chỉ mã dùng được ngay |
| `GET /admin/stats/overview` | `ordersByStatus` thiếu khóa khi không có đơn | luôn đủ 8 khóa `"1"`…`"8"` (0 nếu không có) |
| `Order` (mọi API trả đơn) | — | thêm `version` (optimistic lock). Hai thao tác đổi trạng thái cùng lúc → thao tác sau 409 |
| `POST /media/upload` | mọi user, mọi bucket, mọi loại file | xem "Media" bên dưới |
| `POST/PUT /admin/compatibility-rules` | `targetCategory`, `sourceField`, `targetField` bắt buộc | thêm `maxCount`; kiểu `MAX_COUNT` chỉ cần `sourceCategory` + `maxCount`, kiểu khác vẫn cần 3 trường kia |

### Hành vi mới

- **Media:** quyền upload, loại file và dung lượng theo bucket. MIME do server quyết định theo đuôi file (không tin
  `Content-Type` của client); tải file luôn có `X-Content-Type-Options: nosniff`, file cũ có đuôi lạ trả dạng `attachment`.

  | Bucket | Ai upload | Đuôi file | Tối đa |
  |---|---|---|---|
  | `products` | perm `product:write` | jpg, jpeg, png, webp, gif | 5 MB |
  | `avatars` | user đăng nhập | như trên | 2 MB |
  | `reviews` | user đăng nhập | như trên | 5 MB |
  | `knowledge-docs` (nội bộ) | ADMIN hoặc perm `knowledge:write` | pdf, docx, txt, md | 20 MB |

- **Giỏ hàng:** tối đa 50 SKU khác nhau. Thêm SKU mới (`POST /cart/items`, `/items/bulk`, `PUT /items/{sku}`) phải là sản
  phẩm đang bán (ACTIVE), không thì 400; catalog không phản hồi → 502. Cộng số lượng dùng `HINCRBY` (hai request cùng lúc
  không đè nhau). Gộp giỏ (`/cart/merge`) bỏ qua SKU mới khi giỏ tài khoản đã đủ 50 món.
- **`/me`:** hồ sơ tạo bằng `INSERT ... ON CONFLICT DO NOTHING`, gọi song song lần đầu không còn 500.
- **`/admin/users`:** `lock`/`unlock` báo lỗi Keycloak dạng `ResponseData`; không tự khóa được chính mình. `size` tối đa 100.
- **Sản phẩm:** lưu sản phẩm (sửa, đổi giá, đổi trạng thái, import) chỉ `$set` các trường admin sửa được; `rating_avg`,
  `rating_count`, `sold_count` không còn bị ghi đè.
- **Rule engine:** thêm kiểu `SUM_LTE`, `MAX_COUNT`. ChangeSet `20261107-1000-rules-count-slots-cooler` thêm luật
  `ONE_CPU`, `ONE_MAINBOARD`, `ONE_PSU`, `ONE_CASE` (lỗi), `ONE_COOLER` (cảnh báo), `RAM_MB_SLOTS` (tổng thanh RAM ≤ `ram_slots`),
  `CPU_COOLER_SOCKET`, `COOLER_CASE_HEIGHT`.
- **Keycloak:** role mặc định của realm có thêm `CUSTOMER` (người tự đăng ký có role ngay). Realm đã import trước đó: xem README mục xử lý sự cố.
- Migration `ordering` `V20261107_1000__orders_version.sql` (thêm cột `version`).
- Không đổi đường dẫn: các lớp resource Quarkus được tách để mỗi lớp một `@Path` gốc riêng (catalog: `CategoryResource`,
  `BrandResource`, `AdminCategoryResource`, `AdminBrandResource`; inventory: `AdminInventoryStatsResource`).
- Unit test mới: `CompatibilityServiceTest` (catalog), `OrderTransitionTest`, `VoucherDiscountTest` (ordering).

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
