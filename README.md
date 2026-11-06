# PC Shop: web bán linh kiện PC thông minh (Microservices + AI/RAG)

Khung dự án theo `ke-hoach-de-tai-pc-shop.md`. Phương án xác thực đang dùng: **Keycloak** (đang thử, xem plan mục 12).

> ⚠️ Bộ khung được soạn trong môi trường không tải được thư viện từ Maven Central nên **chưa build thử**. Cú pháp Java/SQL/YAML/JSON/XML đã được kiểm tra tự động. Lần build đầu nếu lỗi, xem mục [Xử lý sự cố](#9-xử-lý-sự-cố).

---

## 1. Cần cài

| Công cụ | Ghi chú |
|---|---|
| **JDK 21** | Cả nhóm dùng chung bản này. Trong IntelliJ: *File → Project Structure → SDK* và *Settings → Build Tools → Maven → Runner → JRE* đều chọn 21 |
| **Docker Desktop** | Chạy hạ tầng: Postgres + pgvector, MongoDB, Redis, Kafka, Keycloak |
| **IntelliJ IDEA** | Community hoặc Ultimate đều được |
| **Ollama** (cho ai-service) | Cài trực tiếp trên Windows (ollama.com) để dùng GPU, hoặc chạy bằng Docker: `docker compose --profile ai up -d` |
| Git Bash (tùy chọn) | Để chạy lệnh `curl` trong README |

## 2. Cấu trúc

```
pc-shop/
├── pom.xml                      ← aggregator (chỉ gom module)
├── docker-compose.yml           ← hạ tầng cho profile local
├── infra/
│   ├── postgres/init/           ← tạo schema extensions + pgvector, schema keycloak
│   └── keycloak/realm-pcshop.json  ← realm, role, client, tài khoản test (ID cố định)
├── common/
│   ├── shared-contracts/        ← ResponseData, PageResponse, ErrorCode, BusinessException, AuthUser
│   ├── shared-events/           ← payload + tên topic Kafka
│   ├── common-webflux/          ← JWT Keycloak, CurrentUser, xử lý lỗi (Spring, tự cấu hình)
│   └── common-quarkus/          ← CurrentUser, ExceptionMapper, AuditableEntity (Quarkus)
├── gateway/                     ← Spring Cloud Gateway      :8000
├── customer-service/            ← Quarkus + Postgres         :8081  (hồ sơ khách, quản lý user qua Keycloak)
├── catalog-service/             ← Quarkus + MongoDB          :8082
├── cart-service/                ← Spring WebFlux + Redis     :8083
├── ordering-service/            ← Spring WebFlux + R2DBC     :8084
├── inventory-service/           ← Quarkus + Postgres         :8085
├── review-service/              ← Spring WebFlux + MongoDB   :8086
├── ai-service/                  ← Quarkus + LangChain4j + pgvector :8087
├── media-service/               ← Quarkus + Postgres         :8088
├── notification-service/        ← Quarkus                    :8089
└── .run/                        ← run configuration dùng chung cho IntelliJ
```

| Hạ tầng | Cổng | Tài khoản |
|---|---|---|
| Keycloak | 8180 | trang quản trị `admin` / `admin` |
| PostgreSQL | 5432 | `pcshop` / `pcshop`, DB `pcshop` |
| MongoDB | 27017 | không mật khẩu |
| Redis | 6379 | |
| Kafka | 9092 | |
| Ollama | 11434 | |

`identity-service` trong plan được thay bằng **`customer-service`**, vì tài khoản đã do Keycloak quản lý. ID người dùng là **UUID** (`sub` của Keycloak) ở mọi bảng.

## 3. Chạy lần đầu (profile `local`)

```bash
# 1. Hạ tầng (lần đầu Keycloak mất khoảng 30-60 giây để import realm)
docker compose up -d

# 2. Model cho ai-service (một lần; bỏ qua nếu chưa làm phần AI)
ollama pull qwen2.5:7b
ollama pull bge-m3
```

3. Mở thư mục `pc-shop` bằng IntelliJ (*File → Open*), đợi Maven import xong.
4. Chạy run configuration **`0. Build all (mvn install)`** một lần. Các service Quarkus cần module `common` đã được cài vào Maven local.
5. Chạy **`All services [local]`**, hoặc chạy từng service trong thư mục `local`.
6. Kiểm tra: mở `http://localhost:8082/api/v1/categories` phải thấy 8 danh mục.

Khi sửa code trong `common/*`, chạy lại `0. Build all` rồi khởi động lại service.

## 4. Hiện danh sách service trong IntelliJ

Thư mục `.run/` có sẵn run configuration cho từng service ở hai profile, IntelliJ tự nhận khi mở project.
Cấu hình dùng type **Spring Boot** (gateway, cart, ordering, review) và **Quarkus** (6 service còn lại, chạy `quarkus:dev`),
nên tự hiện trong cửa sổ **Services** (`Alt+8`), nhóm theo `local` / `dev`. Hai type này cần **IntelliJ IDEA Ultimate**.

Nếu IntelliJ tự sinh thêm cấu hình không có hậu tố (vd `CartApplication`, `ai-service`): xóa đi. Chúng chạy không kèm
profile, service Spring sẽ rơi vào profile mặc định `dev` và lỗi nếu chưa có `.env`.

Mỗi service Quarkus có cổng debug riêng (5011–5019) để chạy nhiều service cùng lúc. Muốn debug một service Quarkus: *Run → Attach to Process* hoặc tạo cấu hình *Remote JVM Debug* trỏ tới cổng đó.

## 5. Tài khoản test và lấy token

Tất cả mật khẩu là `123456`. ID được cố định trong `infra/keycloak/realm-pcshop.json`, nên giống nhau trên mọi máy.

| Username | ID | Role | Permission (client role của `pcshop-backend`) |
|---|---|---|---|
| customer1 | `1111…1111` | CUSTOMER | – |
| customer2 | `2222…2222` | CUSTOMER | – |
| staff1 | `3333…3333` | STAFF | `order:update-status`, `inventory:write` |
| admin1 | `9999…9999` | ADMIN, STAFF | `product:write`, `order:update-status`, `inventory:write`, `knowledge:write` |

**PowerShell:**

```powershell
$token = (Invoke-RestMethod -Method Post `
  -Uri http://localhost:8180/realms/pcshop/protocol/openid-connect/token `
  -Body @{ grant_type='password'; client_id='pcshop-web'; username='admin1'; password='123456' }).access_token
$h = @{ Authorization = "Bearer $token" }

Invoke-RestMethod http://localhost:8000/api/v1/me -Headers $h
```

**Git Bash:**

```bash
TOKEN=$(curl -s -X POST http://localhost:8180/realms/pcshop/protocol/openid-connect/token \
  -d grant_type=password -d client_id=pcshop-web -d username=admin1 -d password=123456 \
  | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/me
```

Đăng nhập bằng username/password như trên **chỉ dùng để thử API**. Frontend thật dùng luồng Authorization Code + PKCE (chuyển sang trang đăng nhập của Keycloak).

## 6. Thử nhanh các API (qua gateway :8000)

| Mục đích | Request | Ghi chú |
|---|---|---|
| Danh mục, sản phẩm | `GET /api/v1/categories`, `GET /api/v1/products?category=GPU` | Công khai |
| Tồn kho | `GET /api/v1/inventory/GPU-MSI-4070S-12G` | Công khai |
| Hồ sơ của tôi | `GET /api/v1/me` | Lần đầu tự tạo hồ sơ từ token |
| Đơn của tôi | `GET /api/v1/orders/my` | customer1 có đơn `DH20261024000001` |
| Quyền sở hữu | customer1 gọi `GET /api/v1/orders/DH20261024000002` | 403: đơn của customer2 |
| Giỏ hàng | `POST /api/v1/cart/items` `{"sku":"CPU-I5-14600K","quantity":1}` | Lưu trong Redis; trả giỏ kèm giá, tồn kho |
| Giỏ khách vãng lai | như trên, không gửi token, thêm header `X-Guest-Key: <16-64 ký tự>` | Đăng nhập xong gọi `POST /api/v1/cart/merge` |
| Lọc sản phẩm | `GET /api/v1/products?category=MAINBOARD&socket=AM5&sort=price,desc` · `GET /api/v1/products/search?q=rtx` | Công khai |
| Kiểm tra tương thích | `POST /api/v1/compatibility/check` `{"skus":["CPU-R5-7600X","MB-ASUS-B760M-D5"]}` | Báo lỗi socket (rule engine tất định) |
| Xem trước thanh toán | customer1: thêm hàng vào giỏ rồi `POST /api/v1/checkout/preview` `{"voucherCode":"WELCOME10","addressId":1}` | Không tạo đơn |
| Timeline đơn | `GET /api/v1/orders/DH20261005000003/timeline` | customer1 |
| Quản lý đơn | staff1: `GET /api/v1/admin/orders?status=1` · `PATCH /api/v1/admin/orders/{code}/status` `{"status":4}` | |
| Thống kê | admin1: `GET /api/v1/admin/stats/overview` · `/top-products` · `/low-stock` | |
| Thao tác hàng loạt | staff1: `PATCH /api/v1/admin/reviews/bulk/approve` `{"ids":[...]}` · admin1: `PATCH /api/v1/admin/products/bulk/status` `{"skus":[...],"status":3}` | Một dòng lỗi thì không lưu gì, trả 400 kèm `data: [{id, reason}]` |
| Xem file (blob) | `GET /api/v1/media/files/{id}/view` | Bucket `knowledge-docs` cần token ADMIN |
| Quản lý user | admin1 gọi `GET /api/v1/admin/users?keyword=customer` | customer-service gọi Keycloak Admin API |
| Swagger | `http://localhost:808x/swagger-ui.html` (Spring) · `http://localhost:808x/q/swagger-ui` (Quarkus) | Gọi thẳng cổng service, không qua gateway |
| Nạp sản phẩm vào RAG | admin1 gọi `POST /api/v1/ai/knowledge/sync-products` | Cần Ollama đang chạy |
| Xem retriever trả gì | `GET /api/v1/ai/search?q=card chơi game 2K` | Công khai |
| Chatbot | `POST /api/v1/ai/chat` `{"message":"Tư vấn card chơi game 2K"}` | Công khai; gửi lại `sessionId` để giữ ngữ cảnh |

### Chạy toàn bộ collection bằng newman

Cần cả 10 service đang chạy profile `local` (riêng AI không bắt buộc). Chạy từ thư mục `docs/postman`:

```bash
cd docs/postman
npx newman run pc-shop.postman_collection.json -e pc-shop.local.postman_environment.json --working-dir . \
  --folder "0. Auth (Keycloak)" --folder "1. Customer (8081)" --folder "2. Catalog (8082)" --folder "3. Inventory (8085)" \
  --folder "4. Cart (8083)" --folder "5. Ordering (8084)" --folder "6. Review (8086)" --folder "7. Media (8088)" \
  --folder "8. Notification (8089)" --folder "10. Import / Export (Excel)"
```

- Tài khoản chọn theo tên request: `[ADMIN]` → admin1, `[STAFF]` → staff1, còn lại customer1. Token tự lấy ở pre-request
  của collection, nên trong Postman bấm chạy lẻ từng request cũng được.
- Mã mong đợi mặc định là 2xx; tên có `(403)` hay `(200|400)` là mã khác. Ba request đổi trạng thái đơn mẫu (hủy đơn,
  đổi trạng thái đơn, đổi trạng thái nhiều đơn) trả 200 ở lần chạy đầu và 400 từ lần sau, vì đơn đã chuyển trạng thái rồi.
- Dữ liệu tạo mới (danh mục, SKU, kho, voucher...) gắn `runId` nên chạy lại không trùng. Mỗi lần chạy để lại một tài khoản
  `staff<runId>` trong Keycloak (chưa có API xóa tài khoản), xóa tay trong Admin Console nếu cần.

Gửi tiếng Việt bằng PowerShell 5.1 phải mã hóa UTF-8, nếu không ký tự sẽ bị lỗi:

```powershell
$body = [Text.Encoding]::UTF8.GetBytes('{"message":"Tư vấn card chơi game 2K, còn hàng không?"}')
Invoke-RestMethod -Method Post http://localhost:8000/api/v1/ai/chat -ContentType 'application/json; charset=utf-8' -Body $body
```

Log của ai-service in ra toàn bộ prompt (có đoạn tri thức RAG được chèn vào) và lời gọi tool `getPrice` / `checkStock`, tiện để giải thích cơ chế khi bảo vệ.

## 7. Profile `dev` (Supabase + MongoDB Atlas dùng chung)

1. Copy `.env.example` thành `.env` ở thư mục gốc và điền giá trị thật. **Không commit** file này (đã có trong `.gitignore`).
2. Service **Spring** tự đọc `.env` (cấu hình `spring.config.import`).
3. Service **Quarkus** đọc biến môi trường. Cách đơn giản nhất trên Windows: nạp `.env` thành biến môi trường của user một lần, rồi **khởi động lại IntelliJ**:
   ```powershell
   Get-Content .env | Where-Object { $_ -match '^[A-Z0-9_]+=' } | ForEach-Object {
     $k, $v = $_ -split '=', 2; [Environment]::SetEnvironmentVariable($k, $v, 'User') }
   ```
4. Chạy cấu hình trong thư mục `dev` (hoặc `All services [dev]`).

Quy tắc khi dùng DB chung (plan mục 7.4):
- Profile `dev` **không tự migrate**. Migration mới phải chạy thử bằng profile `local`, merge vào `main`, rồi **một người phụ trách** chạy service từ `main` với cờ bật migrate: `-Dspring.flyway.enabled=true` (Spring) hoặc `-Dquarkus.flyway.migrate-at-start=true` / `-Dquarkus.liquibase-mongodb.migrate-at-start=true` (Quarkus).
- Đặt tên migration theo thời gian: `V20261025_1430__mo_ta.sql`. Không sửa file đã chạy.
- Keycloak, Kafka, Redis luôn chạy local ở cả hai profile. Tài khoản cả nhóm cần dùng chung thì thêm vào file realm với `id` cố định.

## 8. Đã có và còn phải làm

**Đã có trong khung:**
- Hạ tầng Docker; Keycloak tự import realm (role, permission, client, tài khoản test).
- Kiểm tra JWT ở mọi service; `CurrentUser`; envelope `ResponseData` thống nhất giữa Spring và Quarkus.
- Migration V1 cho mọi schema Postgres (theo DBML, ID user là UUID); changelog Liquibase cho MongoDB catalog; seed: 8 danh mục, 7 thương hiệu, 4 luật tương thích, 5 sản phẩm, tồn kho, 2 voucher, 2 đơn hàng.
- Ví dụ ở từng service: kiểm tra quyền sở hữu (ordering), kiểm tra permission (inventory, ai), tự tạo hồ sơ khi gọi lần đầu (customer), gọi Keycloak Admin API (customer), upload file qua service (media).
- **ai-service:** ingest (chia chunk, embedding bằng bge-m3, lưu pgvector), hybrid retrieval (vector + full-text + lọc metadata), AI service có RAG + tool calling (`getPrice`, `checkStock` gọi realtime sang catalog/inventory) + bộ nhớ hội thoại theo `sessionId`.

**TODO chính (theo plan):**
- Saga đặt hàng qua Kafka + outbox (ordering ↔ inventory), thanh toán VNPay/MoMo.
- Rule engine tương thích + PC Builder (catalog), tool `checkCompatibility` gọi rule engine.
- Consumer `product.updated` / `product.hidden` ở ai-service (thay cho API `sync-products`).
- Chat trả lời dạng stream (SSE), lưu lịch sử chat vào MongoDB.
- `SupabaseFileStorage` cho profile `dev` (ghi chú cấu hình AWS SDK nằm trong `FileStorage.java`).
- Notification (Kafka, email, WebSocket), review summary, đánh giá RAG (`eval_cases`).
- Frontend (Next.js + `keycloak-js`), CI GitHub Actions.

## 9. Xử lý sự cố

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| `Could not find artifact ...:quarkus-langchain4j-bom` | Version Quarkus platform chưa có BOM này. Tạo thử project trên code.quarkus.io với extension *LangChain4j Ollama* và đúng version Quarkus, copy lại tọa độ BOM/version vào `ai-service/pom.xml` |
| Gateway: `Could not find artifact spring-cloud-starter-gateway-server-webflux` | Đổi sang tên cũ `spring-cloud-starter-gateway` |
| Service Quarkus báo không tìm thấy `common-quarkus` | Chưa chạy `0. Build all (mvn install)` |
| `release version 21 not supported` | IntelliJ/Maven đang dùng JDK 17, xem mục 1 |
| Mọi request trả 401 dù có token | Token phải lấy từ `http://localhost:8180` (issuer phải khớp tuyệt đối); token hết hạn sau 5 phút |
| Service Quarkus chờ khoảng 30 giây rồi báo lỗi OIDC | Keycloak chưa chạy xong; xem `docker compose logs -f keycloak` |
| Sửa `realm-pcshop.json` mà không thấy thay đổi | Realm đã có trong DB thì Keycloak bỏ qua file. Muốn import lại: `docker compose down -v` (**xóa sạch dữ liệu local**) rồi `up -d` |
| `POST /admin/users` hoặc `PUT /admin/users/{id}/roles` báo 403 từ Keycloak | Realm import trước ngày 2026-10-25 thiếu quyền. Admin Console → realm `pcshop` → Users → `service-account-pcshop-backend` → Role mapping → gán thêm `view-realm`, `view-clients` (client `realm-management`) |
| ai-service: `Connection refused` tới 11434 | Ollama chưa chạy hoặc chưa `ollama pull` model |
| ai-service: lỗi số chiều vector | Model embedding không phải 1024 chiều; dùng `bge-m3` hoặc viết migration đổi `vector(1024)` |
| Postgres: `type "vector" does not exist` | Volume Postgres được tạo từ image cũ không có pgvector: `docker compose down -v` rồi `up -d` |
