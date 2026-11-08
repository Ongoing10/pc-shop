# PC Shop: hướng dẫn cho Claude Code

Đồ án môn học: web bán linh kiện PC thông minh, kiến trúc microservices, tích hợp AI/RAG.
Nhóm 2 người, người dùng chính là Hoàng. Trao đổi bằng **tiếng Việt**.

Tài liệu gốc (đọc khi cần, không cần đọc hết ngay):

- `docs/ke-hoach-de-tai-pc-shop.md`: plan đầy đủ (kiến trúc, AI/RAG, lộ trình 16 tuần, quyết định thiết kế)
- `docs/pc-shop-schema.dbml`: thiết kế CSDL (lưu ý: phần identity/users trong DBML là thiết kế CŨ, xem "Xác thực" bên dưới)
- `docs/api-backlog.md`: danh sách API cần có (checklist, đánh dấu [x] khi xong)
- `docs/import-export-guide.md`: thiết kế import/export Excel (module `common/shared-excel`, cột động theo danh mục)
- `README.md`: cách chạy, cổng, tài khoản test, xử lý sự cố

## Trạng thái hiện tại

Bộ khung được soạn trong một môi trường KHÔNG tải được thư viện từ Maven Central, nên **chưa từng được build**.
Cú pháp Java/SQL/YAML/JSON/XML đã được kiểm tra tự động. Việc đầu tiên là build, chạy thử và sửa lỗi.

Hai chỗ chưa chắc về tọa độ thư viện:

1. `ai-service/pom.xml` import `io.quarkus.platform:quarkus-langchain4j-bom:${quarkus.platform.version}` (Quarkus 3.20.0)
2. `gateway/pom.xml` dùng `spring-cloud-starter-gateway-server-webflux` (Spring Cloud 2025.0.0, Spring Boot 3.5.0)

## Lệnh

```bash
docker compose up -d                       # hạ tầng: Postgres+pgvector, Mongo, Redis, Kafka, Keycloak(:8180), Mailpit(:8025)
mvn clean install -DskipTests              # build toàn bộ, cài common/* vào Maven local (bắt buộc trước khi chạy Quarkus)
mvn -pl ordering-service spring-boot:run -Dspring-boot.run.profiles=local        # service Spring
cd catalog-service && mvn quarkus:dev -Dquarkus.profile=local -Ddebug=5012       # service Quarkus
ollama pull qwen2.5:7b && ollama pull bge-m3                                      # model cho ai-service
```

Kiểm tra nhanh: `GET http://localhost:8082/api/v1/categories` trả 8 danh mục. Lấy token và các API mẫu: README mục 5–6.

## Kiến trúc và quy ước (đã chốt, giữ nguyên trừ khi người dùng đổi)

- **Build:** Maven monorepo, JDK 21. POM gốc chỉ là aggregator. KHÔNG import `spring-boot-dependencies` và `quarkus-bom` chung một chỗ.
  Module Spring có parent `spring-boot-starter-parent`; module Quarkus kế thừa POM gốc và tự import `quarkus-bom`.
- **Service:** gateway(8000, Spring Cloud Gateway), customer(8081, Quarkus), catalog(8082, Quarkus+Mongo), cart(8083, WebFlux+Redis),
  ordering(8084, WebFlux+R2DBC), inventory(8085, Quarkus), review(8086, WebFlux+Mongo), ai(8087, Quarkus+LangChain4j),
  media(8088, Quarkus), notification(8089, Quarkus+Mongo).
- **CSDL:** database-per-service. Một Postgres chia schema (`customer`, `inventory`, `ordering`, `media`, `ai`, `keycloak`);
  một Mongo chia database (`catalog`, `review`, `notification`). KHÔNG có khóa ngoại xuyên service, chỉ "tham chiếu logic".
- **Gọi giữa service:** qua API nội bộ dạng batch (`POST /products/batch`, `POST /inventory/batch`); gọi thay mặt user thì
  chuyển tiếp access token (ordering → cart/customer). Địa chỉ service khác khai ở `pcshop.services.*` (luôn localhost).
- **API admin:** nằm dưới `/api/v1/admin/**` của service sở hữu dữ liệu; thêm route admin mới thì phải khai trong `GatewayConfig`.
  Quarkus: mỗi lớp resource một `@Path` gốc riêng (vd `/api/v1/admin/warehouses`), KHÔNG để hai lớp cùng gốc `/api/v1` hay
  `/api/v1/admin`: Quarkus chọn lớp theo `@Path` khớp dài nhất rồi mới tìm method, method ở lớp kia sẽ 404.
- **API hàng loạt:** `.../bulk/<hành động>` hoặc `POST .../bulk-delete`, tối đa 100 phần tử, "tất cả hoặc không" qua
  `BulkErrors` (`shared-contracts`): lỗi trả 400 kèm `data: [{id, reason}]`. "Xóa" hàng loạt theo vòng đời dữ liệu (ẩn/đổi trạng thái).
- **Swagger:** Spring `/swagger-ui.html`, Quarkus `/q/swagger-ui` (cấu hình chung ở `common-*`). Log kèm `X-Request-Id` do gateway gắn.
- **Profile:** `local` = DB chạy Docker trên máy; `dev` = Supabase + MongoDB Atlas dùng chung (biến trong `.env`, không commit).
  Kafka, Redis, Keycloak luôn chạy local. Profile `dev` KHÔNG tự migrate (Flyway/Liquibase tắt).
- **Migration:** Flyway (Postgres), Liquibase MongoDB (catalog), `ensureIndex` lúc khởi động (review).
  Tên theo thời gian `V20261024_1000__mo_ta.sql`. Không sửa migration đã chạy, không dùng `ddl-auto`.
  Seed nằm ở `db/seed`. Extension pgvector ở schema `extensions` (giống Supabase), ghi đầy đủ `extensions.vector`.
- **Vòng đời dữ liệu:** không có bảng audit chung; mỗi bảng chỉ MỘT cơ chế (`status` hoặc `is_active` hoặc xóa thật).
  Đơn hàng/thanh toán không bao giờ xóa. 4 cột audit `created_by/at`, `updated_by/at`.
- **Hợp đồng API chung** (`common/shared-contracts`): mọi response bọc trong `ResponseData`
  `{"error_status","error_message","error_code","data"}`; phân trang `PageResponse`; lỗi nghiệp vụ ném `BusinessException(ErrorCode, msg)`.
  Mọi lỗi khác cũng ra envelope: Spring qua `GlobalExceptionHandler`, Quarkus qua các mapper trong `common-quarkus`
  (validate → `VALIDATION_ERROR` + `data: [FieldError]`, optimistic lock/trùng khóa → 409). Chỉ 401 do token sai là body rỗng.
- **Không làm base CRUD generic** (BaseController/BaseCrudService/criteria động). Viết service tường minh; đoạn nào lặp ở
  service thứ hai mới đưa vào `common-*`. Quarkus dùng Panache **repository pattern**.
- **Lưu file:** không dùng MinIO. `local` = ổ đĩa (`data/uploads`), `dev` = Supabase Storage (TODO `SupabaseFileStorage`).

## Xác thực: Keycloak (đang thử, chưa chốt hẳn)

- Realm `pcshop` trong `infra/keycloak/realm-pcshop.json`, import khi Keycloak khởi động lần đầu (realm đã có thì bỏ qua file).
- Token RS256; ID user = `sub` (UUID) ở MỌI bảng. Realm role: CUSTOMER/STAFF/ADMIN.
  Permission = client role của `pcshop-backend` (`product:write`, `order:update-status`, `inventory:write`, `knowledge:write`).
- Code nghiệp vụ chỉ dùng `AuthUser` qua `CurrentUser` (`common-webflux` / `common-quarkus`), không đọc claim trực tiếp.
- Kiểm tra quyền SỞ HỮU (vd khách chỉ xem đơn của mình) luôn nằm trong code service.
- `customer-service` thay cho identity-service trong plan: chỉ giữ hồ sơ (`customer_profiles`, `user_addresses`), tự tạo hồ sơ khi
  user gọi API lần đầu; quản lý tài khoản qua Keycloak Admin REST API.
- Tài khoản test (mật khẩu `123456`): customer1, customer2, staff1, admin1, ID cố định trong file realm.
- Nếu nhóm quay về tự viết xác thực: giữ UUID, phát token chuẩn OIDC (RS256 + JWKS, claim giống Keycloak) để các service không phải sửa.

## AI/RAG (ai-service)

- Ollama local: chat `qwen2.5:7b`, embedding `bge-m3` (1024 chiều = cột `vector(1024)`).
- Ingest: sản phẩm = 1 chunk; tài liệu dài chia ~2000 ký tự, overlap 200. Bỏ qua re-embed nếu `content_hash` không đổi.
- Retrieval hybrid 2 bước: 50 ứng viên theo vector (HNSW) rồi xếp lại 0.7 vector + 0.3 full-text; lọc metadata.
- **Giá và tồn kho KHÔNG lấy từ vector store**, luôn qua tool calling (`getPrice`, `checkStock` gọi catalog/inventory).
- Kiểm tra tương thích phải do **rule engine tất định** (catalog, `compatibility_rules`), LLM chỉ diễn giải.
- Sản phẩm chuyển HIDDEN/DISCONTINUED → event `product.hidden` → xóa thật chunk khỏi pgvector.

## Việc tiếp theo (theo thứ tự)

1. Build toàn bộ, sửa lỗi compile/khởi động; chạy profile `local` cho từng service; xác nhận các API mẫu trong README mục 6.
2. ~~Saga đặt hàng qua Kafka + outbox (ordering ↔ inventory)~~ (xong 2026-11-08, kèm thanh toán VNPay + cổng giả lập, hoàn tiền, sold_count). Còn: MoMo thật, API hoàn tiền của cổng.
3. Rule engine tương thích + PC Builder; tool `checkCompatibility`.
4. Consumer `product.updated`/`product.hidden` ở ai-service; chat stream (SSE); lịch sử chat vào Mongo.
5. Frontend Next.js + `keycloak-js`; CI GitHub Actions.

## Lưu ý khi làm việc trên máy người dùng

- Máy Windows; IntelliJ IDEA; run configuration dùng chung ở `.run/`.
- Không commit `.env`, mật khẩu Supabase/Atlas, hay secret Keycloak thật.
- `docker compose down -v` XÓA SẠCH dữ liệu local (kể cả user Keycloak tạo tay): hỏi trước khi chạy.
