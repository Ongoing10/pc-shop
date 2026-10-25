# Kế hoạch đề tài: Xây dựng ứng dụng web bán linh kiện PC thông minh dựa trên kiến trúc Microservices tích hợp AI và RAG

> **Công nghệ chính:** Spring WebFlux, Quarkus, PostgreSQL (+ pgvector), MongoDB, Redis, Kafka, LangChain4j
> **Tài liệu đi kèm:** `pc-shop-schema.dbml` (schema CSDL chi tiết, xem bằng dbdiagram.io)

---

## Mục lục

1. [Mục tiêu và phạm vi](#1-mục-tiêu-và-phạm-vi)
2. [Tác nhân và chức năng](#2-tác-nhân-và-chức-năng)
3. [Kiến trúc tổng thể](#3-kiến-trúc-tổng-thể)
4. [Thiết kế cơ sở dữ liệu](#4-thiết-kế-cơ-sở-dữ-liệu)
5. [Thiết kế AI/RAG](#5-thiết-kế-airag)
6. [Kỹ thuật Microservices](#6-kỹ-thuật-microservices)
7. [Môi trường phát triển và triển khai CSDL](#7-môi-trường-phát-triển-và-triển-khai-csdl)
8. [Frontend](#8-frontend)
9. [Lộ trình thực hiện](#9-lộ-trình-thực-hiện-16-tuần)
10. [Bố cục báo cáo](#10-bố-cục-báo-cáo)
11. [Rủi ro và cách xử lý](#11-rủi-ro-và-cách-xử-lý)
12. [Vấn đề cần hội ý nhóm](#12-vấn-đề-cần-hội-ý-nhóm)

---

## 1. Mục tiêu và phạm vi

### Mục tiêu

Xây dựng sàn thương mại điện tử bán linh kiện PC gồm CPU, mainboard, RAM, VGA, PSU, case, ổ cứng và tản nhiệt. Hệ thống được chia thành các microservice viết bằng **Spring WebFlux** và **Quarkus**, lưu dữ liệu trên **PostgreSQL** kết hợp **MongoDB**.

Phần AI dùng RAG để làm 4 việc:

- Tư vấn chọn linh kiện qua chatbot.
- Gợi ý cấu hình PC theo ngân sách và nhu cầu (gaming, đồ họa, văn phòng, AI/ML).
- Kiểm tra tương thích giữa các linh kiện và giải thích kết quả bằng ngôn ngữ tự nhiên.
- Tìm kiếm ngữ nghĩa, ví dụ "card chơi game 2K tầm 10 triệu".

### Điểm khác biệt

Linh kiện PC có bài toán **tương thích** rất rõ ràng: socket, chuẩn RAM, công suất nguồn, kích thước case/VGA. Vì vậy AI trong đề tài này giải quyết một vấn đề thật, không phải chatbot gắn thêm cho có.

---

## 2. Tác nhân và chức năng

| Tác nhân | Chức năng |
|---|---|
| **Khách vãng lai** | Xem, lọc, tìm kiếm sản phẩm; chat với AI tư vấn; dùng PC Builder |
| **Khách hàng** | Đăng ký/đăng nhập, giỏ hàng, đặt hàng, thanh toán, theo dõi đơn, đánh giá, lưu cấu hình PC, xem lịch sử chat |
| **Nhân viên / Admin** | Quản lý sản phẩm, tồn kho, đơn hàng, khuyến mãi; quản lý kho tri thức RAG (upload tài liệu, re-index); dashboard thống kê |

---

## 3. Kiến trúc tổng thể

### Sơ đồ

```
                    ┌──────────────┐
  React/Next.js ──▶ │ API Gateway  │ (Spring Cloud Gateway – WebFlux)
                    └──────┬───────┘
          ┌────────────┬───┴────────┬─────────────┬──────────────┐
          ▼            ▼            ▼             ▼              ▼
   Identity      Product/Catalog  Cart        Order &        AI/RAG
  (Quarkus)       (Quarkus)     (WebFlux)    Payment        (Quarkus +
                  MongoDB        Redis       (WebFlux)      LangChain4j)
                                             PostgreSQL     pgvector + Mongo
          │            │            │             │              │
          └────────────┴──── Kafka (event bus) ───┴──────────────┘
                                  │
                       Inventory (Quarkus, PostgreSQL)
                       Notification (Quarkus, email/WebSocket)

  Hạ tầng: Consul/Eureka · Config Server · Prometheus/Grafana · Zipkin/Jaeger · Docker Compose
```

### Phân chia service và công nghệ

| Service | Framework | CSDL | Lý do |
|---|---|---|---|
| API Gateway | Spring Cloud Gateway (WebFlux) | – | Non-blocking; xử lý routing, rate limit, xác thực JWT |
| Identity | Quarkus (tự viết) | PostgreSQL | Phát JWT theo format chung, phân quyền theo role/permission |
| Media | Quarkus | PostgreSQL + Supabase Storage (dev) / ổ đĩa (local) | Lưu file ngoài DB, DB chỉ giữ metadata; không dùng MinIO (xem 7.6) |
| Product/Catalog | **Quarkus** | **MongoDB** | Thông số mỗi loại linh kiện khác nhau nên cần schema linh hoạt; Quarkus khởi động nhanh, tốn ít RAM |
| Inventory | **Quarkus** | PostgreSQL | Tồn kho cần transaction và khóa chặt chẽ |
| Cart | **WebFlux** | Redis | Đọc/ghi liên tục, dữ liệu tạm |
| Order & Payment | **WebFlux** + R2DBC | **PostgreSQL** | Giao dịch cần ACID; Saga phối hợp với Inventory |
| AI/RAG | **Quarkus** + quarkus-langchain4j | PostgreSQL (**pgvector**) + MongoDB | Hỗ trợ LLM tốt; trả lời dạng stream (SSE) |
| Review | WebFlux | MongoDB | Dữ liệu dạng document, ghi nhiều |
| Notification | Quarkus | MongoDB | Nhận sự kiện từ Kafka, gửi email/WebSocket |

> Nên giữ khoảng **7–9 service**. Chia quá nhỏ chỉ tăng công vận hành mà không thêm điểm.

### Lý do chọn framework cho từng service

#### Nguyên tắc chung

WebFlux và Quarkus đều làm được mọi service trong hệ thống. Cách chia dưới đây dựa trên **thế mạnh riêng** của mỗi framework, nhờ đó vừa đáp ứng yêu cầu đề tài (dùng cả hai), vừa có lập luận kỹ thuật khi bảo vệ.

| Tiêu chí | Spring WebFlux | Quarkus |
|---|---|---|
| Mô hình | Reactive thuần (Project Reactor: `Mono`/`Flux`) trên Netty | Lai: viết được cả imperative lẫn reactive (Mutiny `Uni`/`Multi`) trên Vert.x |
| Thế mạnh | Xử lý nhiều kết nối I/O đồng thời; điều phối, gọi nhiều service song song; streaming; hệ sinh thái Spring Cloud | Khởi động nhanh, tốn ít RAM, build được native image; hệ extension phong phú (Panache, Kafka, LangChain4j); dev mode hot reload |
| Phù hợp với | Service đứng trước nhiều request, chủ yếu chờ I/O, cần ghép dữ liệu từ nhiều nguồn | Service nghiệp vụ gọn, cần transaction rõ ràng, hoặc cần extension chuyên biệt |
| Truy cập DB | R2DBC (PostgreSQL), Reactive MongoDB, Reactive Redis | Hibernate ORM/Reactive + Panache, MongoDB Panache |

Tóm lại: **WebFlux** dùng cho các service "đầu vào" và luồng giao dịch nhiều I/O, **Quarkus** dùng cho các service nghiệp vụ nhẹ và service AI.

#### Chi tiết từng service

**API Gateway: Spring Cloud Gateway (WebFlux)**
- Spring Cloud Gateway được xây dựng trên WebFlux/Netty, nên đây gần như là lựa chọn mặc định.
- Gateway nhận toàn bộ request của hệ thống nhưng không tính toán gì nhiều, chủ yếu chuyển tiếp và chờ phản hồi. Mô hình non-blocking giúp phục vụ nhiều kết nối với ít thread.
- Có sẵn route, filter, rate limiting (Redis), circuit breaker, xác thực JWT và tích hợp service discovery.
- Hỗ trợ chuyển tiếp SSE, cần cho luồng chat AI dạng stream.

**Identity: tự viết bằng Quarkus (Keycloak là phương án thay thế)**

> ⚠️ **Chưa chốt.** Plan hiện viết theo phương án tự viết; phương án Keycloak và những gì phải đổi nếu chọn nó xem mục 12.

- Chọn tự viết vì hệ thống đã thống nhất **một format JWT chung** (HS256, claim `sub`, `uid`, `roles`, `perms`; xem mục 6). Identity chỉ cần phát token đúng format này; các service tự kiểm tra chữ ký, không phải gọi sang identity.
- Dùng Quarkus + SmallRye JWT (`smallrye-jwt-build` để ký token) + Hibernate Panache. Đây là bài toán CRUD và transaction thông thường, không cần reactive.
- Keycloak (bản thân chạy trên Quarkus) có sẵn OAuth2/OIDC, quản lý user/role và đăng nhập mạng xã hội. Nhưng nếu dùng thì phải đổi hợp đồng JWT sang RS256/JWKS theo cấu trúc claim của Keycloak, và mọi service phải cấu hình theo.

**Media: Quarkus**
- Service nhỏ, chỉ nhận upload, đẩy file vào nơi lưu trữ (Supabase Storage ở profile `dev`, thư mục trên ổ đĩa ở profile `local`) và lưu metadata. Ưu tiên khởi động nhanh và tốn ít tài nguyên.
- Quarkus xử lý multipart sẵn; Supabase Storage được gọi qua S3 API bằng AWS SDK v2.

**Product/Catalog: Quarkus + MongoDB**
- Có extension **MongoDB with Panache**, viết repository cho document linh hoạt (`specs`, `compat`) rất gọn.
- Catalog là service đọc nhiều nhất, thường phải chạy nhiều instance. Quarkus tốn ít RAM và khởi động nhanh nên scale ngang rẻ hơn.
- **SmallRye Reactive Messaging** giúp publish event `product.updated` lên Kafka dễ dàng, để AI service re-embed.

**Inventory: Quarkus + PostgreSQL**
- Tồn kho là phần cần **transaction và khóa chặt chẽ nhất** (optimistic lock bằng `version`, giữ hàng có thời hạn).
- Quarkus cho phép viết **imperative** với `@Transactional` và Hibernate Panache: dễ đọc, dễ kiểm chứng tính đúng đắn, tránh độ phức tạp của reactive transaction ở chỗ không cần thiết.
- Có `@Scheduled` để định kỳ nhả các reservation quá hạn, và Reactive Messaging để tham gia Saga qua Kafka.

**Cart: Spring WebFlux + Redis**
- Giỏ hàng bị đọc/ghi liên tục với thao tác rất nhỏ, gần như toàn bộ thời gian là chờ Redis, nên rất hợp với mô hình non-blocking.
- **Spring Data Redis Reactive** (Lettuce) hỗ trợ tốt thao tác Hash và TTL.
- Khi hiển thị giỏ cần gọi song song Catalog (giá mới) và Inventory (còn hàng). `Mono.zip` / `Flux.flatMap` của Reactor làm việc này gọn gàng.

**Order & Payment: Spring WebFlux + R2DBC + PostgreSQL**
- Đặt hàng là luồng **điều phối nhiều I/O**: kiểm tra giỏ, lấy giá, áp voucher, giữ tồn kho, tạo link thanh toán, chờ callback. WebFlux xử lý chuỗi bất đồng bộ này hiệu quả.
- **R2DBC** truy cập PostgreSQL không chặn và hỗ trợ transaction reactive (`TransactionalOperator`) cho việc ghi đơn hàng cùng outbox event.
- Gọi cổng thanh toán (VNPay/MoMo) qua `WebClient`, dễ kết hợp **Resilience4j** cho timeout, retry và circuit breaker.
- Đây là nơi thể hiện rõ nhất năng lực reactive của đề tài (Saga, outbox, xử lý lỗi bằng toán tử Reactor).

**AI/RAG: Quarkus + quarkus-langchain4j**
- **quarkus-langchain4j** (Quarkiverse) cho phép khai báo AI service bằng interface và annotation, có sẵn tool calling (`@Tool`), bộ nhớ hội thoại, RAG, và tích hợp pgvector, OpenAI, Gemini, Ollama.
- Hỗ trợ stream câu trả lời bằng `Multi<String>` qua SSE.
- **SmallRye Fault Tolerance** (`@Timeout`, `@Retry`, `@Fallback`) rất cần khi gọi LLM, vốn chậm và đôi khi lỗi.
- Dev mode hot reload giúp chỉnh prompt và thử nghiệm nhanh.

**Review: Spring WebFlux + MongoDB**
- Ghi nhiều, đọc theo trang, dữ liệu dạng document, nên dùng **Reactive MongoDB** là phù hợp.
- Giữ một service đọc-ghi Mongo bằng WebFlux để đề tài thể hiện cả hai cách truy cập Mongo (WebFlux Reactive Repository so với Quarkus Panache), làm dữ liệu cho phần so sánh trong báo cáo.

**Notification: Quarkus**
- Service chủ yếu nhận event từ Kafka rồi gửi email/WebSocket, nên cần nhẹ và chạy nền ổn định.
- Có sẵn extension **Reactive Messaging Kafka**, **Mailer** và **WebSockets Next**, ít code cấu hình.

#### Gợi ý cho chương báo cáo

Có thể đo và so sánh **thời gian khởi động**, **RAM khi rảnh** và **throughput** (bằng k6/Gatling) giữa một service WebFlux và một service Quarkus có chức năng tương đương, ví dụ Review và Catalog cùng đọc Mongo. Số liệu thực tế sẽ là minh chứng thuyết phục hơn mọi lập luận lý thuyết.

---

## 4. Thiết kế cơ sở dữ liệu

Chi tiết từng cột xem file **`pc-shop-schema.dbml`** (39 bảng/collection, 30 quan hệ, đã kiểm tra cú pháp).

### Nguyên tắc

- **Database-per-service.** Mỗi service sở hữu CSDL riêng, được tách bằng schema.
- **Không có khóa ngoại xuyên service.** Cột tham chiếu sang service khác chỉ là liên kết logic, ghi rõ trong note.
- **Cột audit chuẩn:** `created_by`, `created_at`, `updated_by`, `updated_at`, được điền tự động khi lưu. Cột `is_delete` **không** nằm trong nhóm cột chung (xem mục Vòng đời dữ liệu).
- **Trạng thái/loại** dùng integer, các giá trị được liệt kê trong note từng cột.
- **Tiền tệ** dùng `numeric(15,2)`, đơn vị VND.

### Bảng / collection theo service

| Service | CSDL | Bảng / collection chính |
|---|---|---|
| identity | PostgreSQL | `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `user_addresses`, `refresh_tokens` |
| media | PostgreSQL | `files` (lưu key của file trong Supabase Storage hoặc trên ổ đĩa, không lưu `bytea`) |
| inventory | PostgreSQL | `warehouses`, `inventories`, `stock_reservations`, `stock_movements`, `outbox_events`, `processed_events` |
| ordering | PostgreSQL | `orders`, `order_items`, `order_status_histories`, `vouchers`, `voucher_usages`, `payments`, `refunds`, `outbox_events`, `processed_events` |
| ai | PostgreSQL + pgvector | `knowledge_documents`, `document_chunks`, `ai_request_logs`, `eval_cases`, `eval_results` |
| catalog | MongoDB | `products`, `categories`, `brands`, `compatibility_rules`, `pc_builds`, `price_histories` |
| review | MongoDB | `reviews`, `review_summaries` |
| chat | MongoDB | `chat_sessions`, `chat_messages` |
| notification | MongoDB | `notifications` |
| cart | Redis | key `cart:{userId}` / `cart:guest:{guestKey}` (Hash: sku → quantity), TTL 30 ngày với khách vãng lai |

### Các quyết định thiết kế đáng chú ý

1. **`products` có hai trường thông số tách biệt.**
   - `specs`: thông số để hiển thị, khác nhau theo từng loại linh kiện.
   - `compat`: thông số đã chuẩn hóa để rule engine kiểm tra tương thích, ví dụ:

   ```json
   { "sku": "CPU-I5-14600K", "category_code": "CPU", "brand_code": "INTEL", "price": 7990000,
     "specs":  { "cores": 14, "threads": 20, "boost_clock_ghz": 5.3 },
     "compat": { "socket": "LGA1700", "memory_types": ["DDR4", "DDR5"], "tdp_w": 125 } }
   ```

2. **`order_items` lưu snapshot** tên, giá, ảnh và bảo hành, để đơn hàng không bị ảnh hưởng khi catalog đổi giá.
3. **Optimistic lock (`version`)** ở hai chỗ có ghi đồng thời:
   - `inventories.version`: chống bán vượt tồn kho khi nhiều người đặt cùng lúc. Số lượng có thể bán = `quantity - reserved_quantity`.
   - `vouchers.version`: nhiều đơn cùng dùng một voucher thì `used_count` không bị ghi đè; xung đột trả 409.
4. **`stock_reservations`** là một bước trong Saga đặt hàng. Khi cần bù trừ, bản ghi chuyển sang trạng thái `RELEASED`; khi quá hạn chưa thanh toán thì tự chuyển `EXPIRED`.
5. **Transactional Outbox** (`outbox_events`) cùng **idempotent consumer** (`processed_events`) đảm bảo sự kiện Kafka không bị mất và không bị xử lý trùng.
6. **Địa chỉ dùng mô hình hành chính 2 cấp:** tỉnh/thành và phường/xã.
7. **Index pgvector** tạo bằng SQL migration, vì DBML không biểu diễn được:

   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   CREATE INDEX idx_chunks_embedding ON ai.document_chunks USING hnsw (embedding vector_cosine_ops);
   CREATE INDEX idx_chunks_tsv       ON ai.document_chunks USING gin (content_tsv);
   CREATE INDEX idx_chunks_metadata  ON ai.document_chunks USING gin (metadata jsonb_path_ops);
   ```

### Vòng đời dữ liệu: audit và xóa

**Không dùng bảng audit chung** (kiểu lưu JSON trước/sau của mọi thay đổi). Những gì cần truy vết đều có bảng lịch sử theo nghiệp vụ, vừa đủ dùng vừa có ý nghĩa hơn khi demo:

| Câu hỏi cần trả lời | Bảng |
|---|---|
| Đơn hàng đổi trạng thái lúc nào, ai đổi, vì sao? | `order_status_histories` |
| Tồn kho tăng/giảm vì đâu? | `stock_movements` (chỉ thêm, không sửa) |
| Thanh toán thành công chưa, cổng thanh toán trả về gì? | `payments.raw_response`, `refunds` |
| Voucher đã dùng cho đơn nào? | `voucher_usages` |
| Giá sản phẩm thay đổi thế nào? | `price_histories` (mới) – AI dùng được để trả lời "đang giảm giá không" |
| Giá lúc khách mua là bao nhiêu? | Snapshot trong `order_items` |
| AI đã trả lời gì, gọi tool nào? | `ai_request_logs`, `chat_messages` |
| Ai tạo/sửa bản ghi gần nhất? | 4 cột audit |

**Mỗi bảng chỉ dùng một cơ chế vòng đời**, không để `is_active`, `status` và `is_delete` cùng tồn tại trên một bảng:

| Cơ chế | Áp dụng cho | Ý nghĩa của "xóa" |
|---|---|---|
| `is_delete` (xóa mềm) | **Chỉ `users`** – đơn hàng, review, cấu hình PC vẫn tham chiếu tới | `is_delete = 1` |
| `status` | `products` (DRAFT/ACTIVE/HIDDEN/DISCONTINUED), `orders`, `reviews` (thêm DELETED_BY_USER), `knowledge_documents` (thêm ARCHIVED) | Chuyển sang trạng thái kết thúc |
| `is_active` | `roles`, `categories`, `brands`, `warehouses`, `vouchers`, `compatibility_rules` | Ngừng hoạt động |
| Không bao giờ xóa | `orders`, `order_items`, `payments`, `refunds`, `voucher_usages`, các bảng lịch sử và log | Hủy đơn = `CANCELLED` |
| Xóa thật | `user_addresses`, `pc_builds`, `chat_sessions`/`chat_messages`, `notifications` (TTL 90 ngày), `outbox_events` (SENT sau 7 ngày), `processed_events`, `refresh_tokens`, `stock_reservations` đã kết thúc, **`document_chunks`** | Xóa bản ghi; đơn hàng đã giữ snapshot nên không mất dữ liệu |

**Ba điểm phải xử lý đi kèm:**
1. **RAG không được gợi ý sản phẩm đã ẩn.** Khi sản phẩm chuyển `HIDDEN`/`DISCONTINUED`, catalog bắn event `product.hidden`; AI service xóa thật chunk khỏi pgvector và chuyển tài liệu sang `ARCHIVED` (xem 5.1). Tool `getPrice`/`checkStock` cũng trả lỗi với sản phẩm không còn bán.
2. **Unique trên bảng xóa mềm dùng partial index**, để user đã xóa không chặn người mới đăng ký trùng tên:
   ```sql
   CREATE UNIQUE INDEX uk_users_username ON identity.users (lower(username)) WHERE is_delete = 0;
   CREATE UNIQUE INDEX uk_users_email    ON identity.users (lower(email))    WHERE is_delete = 0;
   ```
3. **Mọi truy vấn `users` phải lọc `is_delete = 0`.** Giữ xóa mềm ở đúng một bảng là cách giảm rủi ro quên lọc.

### Chiến lược migration

**Nguyên tắc chung:**
- Mỗi service tự quản lý migration của CSDL mình sở hữu và tự chạy migration khi khởi động.
- Migration được commit cùng code. Đã chạy thì **không sửa**, muốn thay đổi thì viết migration mới.
- **Không dùng** chức năng tự sinh schema của framework (`hibernate.ddl-auto`, auto-index-creation của Spring Data, auto-create-table của LangChain4j). Schema chỉ được thay đổi thông qua migration.

| CSDL | Service | Công cụ | Vị trí file |
|---|---|---|---|
| PostgreSQL | identity, inventory, media, ai — Quarkus | `quarkus-flyway` (`quarkus.flyway.migrate-at-start=true`) | `src/main/resources/db/migration/V1__init.sql` |
| PostgreSQL | ordering — Spring WebFlux + R2DBC | Flyway (`flyway-core` + `flyway-database-postgresql` + JDBC driver, cấu hình `spring.flyway.url` riêng vì R2DBC không có DataSource) | `src/main/resources/db/migration/` |
| MongoDB | catalog, ai (chat), notification — Quarkus | `quarkus-liquibase-mongodb` | `src/main/resources/db/changelog/` |
| MongoDB | review — Spring WebFlux | Mongock (kiểm tra bản hỗ trợ Spring Boot 4; nếu chưa có thì dùng runner khởi động gọi `ReactiveMongoTemplate.indexOps().ensureIndex(...)`, lệnh này idempotent) | class `@ChangeUnit` trong package `migration` |
| Redis | cart | Không cần migration | – |

**Migration với MongoDB gồm 3 việc:**
1. **Tạo index**, đặc biệt là unique index như `sku`, `slug`. Đây là "ràng buộc" duy nhất mà Mongo thực sự kiểm tra.
2. **Seed dữ liệu nền:** danh mục, thương hiệu, `compatibility_rules`.
3. **Chuyển đổi dữ liệu** khi đổi cấu trúc document, ví dụ đổi tên field hoặc bổ sung `compat` cho sản phẩm cũ. Dùng `updateMany` trong một changeset mới.

**Lưu ý với pgvector:**
- Bảng `ai.document_chunks` do Flyway tạo. Phải tắt chế độ tự tạo bảng của LangChain4j.
- Truy vấn hybrid (vector + `tsvector` + lọc metadata) được viết thành `ContentRetriever` riêng bằng SQL.
- Khi đổi model embedding sang số chiều khác, cần viết migration đổi kiểu cột rồi chạy lại job index toàn bộ tài liệu.

---

## 5. Thiết kế AI/RAG

### 5.1 Pipeline ingest

1. **Nguồn tri thức:** mô tả và thông số sản phẩm, quy tắc tương thích, hướng dẫn build PC, chính sách bảo hành/đổi trả, FAQ.
2. **Chunking:** mỗi sản phẩm là một chunk. Tài liệu dài chia khoảng 500 token, overlap khoảng 50 token.
3. **Embedding:** model đa ngôn ngữ có hỗ trợ tiếng Việt, ví dụ `bge-m3` (1024 chiều) hoặc `multilingual-e5` qua Ollama, hoặc embedding API của OpenAI/Gemini.
4. **Lưu trữ:** pgvector, kèm metadata (category, brand, price, sku) để lọc.
5. **Đồng bộ với catalog qua Kafka:**
   - `product.updated`: re-embed sản phẩm; nếu `content_hash` không đổi thì bỏ qua.
   - `product.hidden` (sản phẩm chuyển `HIDDEN`/`DISCONTINUED`): **xóa thật** chunk của sản phẩm khỏi `document_chunks`, tài liệu chuyển `ARCHIVED`. Sản phẩm bật lại `ACTIVE` thì index lại từ đầu.
   - Re-index một tài liệu luôn là: xóa thật chunk cũ, rồi ghi chunk mới trong cùng transaction.

### 5.2 Pipeline truy vấn

1. LLM phân tích câu hỏi thành ý định và bộ lọc có cấu trúc, ví dụ `{category: GPU, maxPrice: 10tr, useCase: gaming 2K}`.
2. **Hybrid retrieval:** tìm vector kết hợp lọc metadata và full-text (`tsvector`).
3. Re-rank kết quả (tùy chọn).
4. **Tool calling:** LLM gọi `getPrice(sku)`, `checkStock(sku)`, `checkCompatibility(build)` để lấy dữ liệu **thời gian thực**.
   > Giá và tồn kho **không bao giờ** lấy từ vector store, để LLM không bịa giá.
5. Sinh câu trả lời dạng stream qua SSE, kèm link sản phẩm.

### 5.3 Các tính năng AI

| Tính năng | Cách làm |
|---|---|
| Chatbot tư vấn | RAG + tool calling + bộ nhớ hội thoại (`chat_sessions`, `chat_messages`) |
| AI PC Builder | Từ ngân sách và nhu cầu, thuật toán chọn ứng viên theo tỷ lệ phân bổ ngân sách; LLM tinh chỉnh rồi giải thích lựa chọn |
| Kiểm tra tương thích | **Rule engine tất định** dựa trên `compatibility_rules` (socket CPU–main, DDR4/DDR5, tổng TDP so với PSU, chiều dài VGA so với case, form factor). LLM chỉ diễn giải lỗi và gợi ý linh kiện thay thế |
| Tìm kiếm ngữ nghĩa | Embedding câu truy vấn kết hợp lọc theo giá |
| Gợi ý sản phẩm | "Thường mua kèm" dựa trên lịch sử đơn; sản phẩm tương tự theo độ gần vector |
| Tóm tắt đánh giá | LLM tóm tắt ưu/nhược điểm từ review (`review_summaries`) |

> Tách **rule tất định** khỏi **LLM** là luận điểm mạnh khi bảo vệ: nó cho thấy nhóm hiểu giới hạn của LLM.

### 5.4 Đánh giá chất lượng AI

- Bộ test 50–100 câu hỏi kèm đáp án mong đợi, lưu trong `eval_cases`.
- Các chỉ số đo, lưu trong `eval_results`:
  - Recall@k của bước truy xuất
  - Tỷ lệ trả lời đúng giá và tồn kho
  - Tỷ lệ cấu hình gợi ý tương thích
  - Độ trễ
- So sánh 3 cấu hình: **không RAG**, **RAG thuần**, **RAG + tool calling**.
- Log chi phí và độ trễ từng request trong `ai_request_logs`.

### 5.5 Lựa chọn LLM

- **Demo:** Gemini hoặc OpenAI API.
- **Dự phòng:** Ollama chạy local (Qwen2.5, Llama 3.x), không tốn phí, dùng cho giai đoạn phát triển.

---

## 6. Kỹ thuật Microservices

- **Saga (choreography qua Kafka):** đặt hàng → giữ tồn kho → thanh toán → xác nhận. Mỗi bước có hành động bù trừ khi thất bại.
- **Circuit breaker / retry:** Resilience4j cho WebFlux, SmallRye Fault Tolerance cho Quarkus. Quan trọng nhất là khi gọi LLM.
- **Distributed tracing:** OpenTelemetry + Jaeger/Zipkin.
- **Metrics:** Prometheus + Grafana.
- **Bảo mật:** JWT, xác thực tại gateway, phân quyền theo role/permission ở từng service.
- **Thanh toán:** VNPay hoặc MoMo sandbox, có lưu callback/IPN gốc để đối soát.
- **Triển khai:** Docker Compose; thêm Kubernetes (minikube) nếu còn thời gian. CI dùng GitHub Actions.

### Công cụ build và cấu trúc mã nguồn

**Quyết định:** dùng **Maven cho toàn bộ dự án**, tổ chức thành monorepo multi-module, có Maven Wrapper (`mvnw`) để cả nhóm dùng cùng một phiên bản Maven.

**Lý do chọn Maven:**
- Quarkus thân thiện với Maven hơn. Tài liệu chính thức, code.quarkus.io và các extension (kể cả quarkus-langchain4j) đều hướng dẫn Maven trước.
- Spring Boot hỗ trợ cả Maven lẫn Gradle như nhau, nên Maven là mẫu số chung ít rủi ro nhất.
- Không trộn Gradle và Maven. Trộn hai công cụ sẽ nhân đôi cấu hình build, Dockerfile và CI, đồng thời khó chia sẻ module chung.
- Với quy mô khoảng 8 service, lợi thế tốc độ build của Gradle không đáng kể.

**Cấu trúc:**

```
pc-shop/
├── pom.xml                  ← aggregator: modules, maven.compiler.release, plugin chung
├── mvnw, .mvn/              ← Maven Wrapper
├── common/
│   ├── shared-events/       ← DTO event Kafka, Java thuần, không phụ thuộc framework
│   ├── shared-contracts/    ← ResponseData, PageResponse, mã lỗi – Java thuần
│   ├── common-webflux/      ← exception handler, JWT filter, CurrentUser, audit entity (Spring)
│   └── common-quarkus/      ← ExceptionMapper, CurrentUser, audit entity (Quarkus)
├── gateway/                 ← Spring Boot
├── cart-service/            ← Spring Boot
├── ordering-service/        ← Spring Boot
├── review-service/          ← Spring Boot
├── catalog-service/         ← Quarkus
├── inventory-service/       ← Quarkus
├── ai-service/              ← Quarkus
├── media-service/           ← Quarkus
├── notification-service/    ← Quarkus
└── docker-compose.yml
```

**Quy tắc quản lý dependency:**
- POM cha **không** import `spring-boot-dependencies` và `quarkus-bom` cùng lúc. Hai BOM này ghim version khác nhau cho Jackson, Netty, Kafka client..., dùng chung sẽ gây xung đột.
- Mỗi service Spring dùng `spring-boot-starter-parent` hoặc tự import BOM Spring Boot.
- Mỗi service Quarkus import `quarkus-bom` và dùng `quarkus-maven-plugin`.
- `shared-events` chỉ chứa Java record kèm annotation Jackson nếu cần, để cả hai phía dùng chung.

### Thư viện dùng chung: thống nhất hợp đồng, không làm CRUD generic

**Thống nhất giữa hai framework** (frontend chỉ thấy JSON, nên đây là thứ bắt buộc giống nhau):

| Hợp đồng | Nội dung | Nằm ở |
|---|---|---|
| Envelope response | `{"error_status", "error_message", "error_code", "data"}` | `shared-contracts` |
| Phân trang | `{"content": [...], "page": {"size", "number", "totalElements", "totalPages"}}` | `shared-contracts` |
| Mã lỗi | `ORDER_NOT_FOUND`, `OUT_OF_STOCK`, `VALIDATION_ERROR`... và HTTP status tương ứng | `shared-contracts` |
| JWT | HS256, secret dùng chung; claim `sub`, `uid`, `roles`, `perms` | Tài liệu + cấu hình từng bên (Quarkus: smallrye-jwt, lấy role từ claim `roles`) |
| Event Kafka | Tên topic, cấu trúc payload | `shared-events` |

**Có làm:**

| Thành phần | Spring WebFlux | Quarkus |
|---|---|---|
| Entity cha với 4 cột audit | `AuditableEntity` + `ReactiveAuditorAware` lấy user từ JWT | `AuditableEntity` + `@PrePersist`/`@PreUpdate` |
| Optimistic lock | `@Version` (chỉ `vouchers`) | `@Version` (chỉ `inventories`) |
| Xử lý lỗi → envelope chung | `GlobalExceptionHandler` + `BusinessException` | `ExceptionMapper` |
| User hiện tại | `CurrentUser` (Reactor Context), `BearerTokenRelay` cho `WebClient` | `CurrentUser` đọc `JsonWebToken` |

**Không làm:** `BaseController`, `BaseCrudService`, `BaseQueryService` generic, criteria động, relation loader, bảng audit chung.

**Lý do:**
- Phía WebFlux chỉ có **một** entity CRUD thuần (`vouchers`); đặt hàng là luồng Saga phải viết riêng.
- Khoảng 7 entity CRUD còn lại nằm trên **ba kiểu truy cập dữ liệu** (R2DBC, Hibernate Panache, MongoDB Panache). Base generic sẽ phải viết ba bản, tốn hơn số code nó tiết kiệm.
- Mỗi entity có logic riêng: product bắn event cho AI, voucher kiểm tra mã trùng, category sinh slug. Hook generic cuối cùng bị override gần hết.
- Panache đã sẵn có `findById`, `persist`, phân trang, sắp xếp.
- Endpoint công khai và endpoint admin khác nhau về đường dẫn và phân quyền; controller viết tường minh giúp Swagger và việc giải thích khi bảo vệ rõ ràng hơn.

**Quy tắc:** viết code trực tiếp trong từng service trước. Đoạn nào bị lặp ở service thứ hai mới chuyển vào `common-*`. Ví dụ catalog-service có 4 collection CRUD cùng kiểu; nếu `categories` và `brands` giống hệt nhau thì rút một lớp nhỏ **ngay trong catalog-service**.

**Lệnh thường dùng:**
- Build toàn bộ: `./mvnw clean package`
- Chạy service Quarkus ở dev mode: `./mvnw -pl catalog-service quarkus:dev`
- Chạy service Spring: `./mvnw -pl cart-service spring-boot:run`

---

## 7. Môi trường phát triển và triển khai CSDL

### 7.1 Không cần nhiều database vật lý

Thiết kế dùng **1 PostgreSQL chia thành nhiều schema** và **1 MongoDB chứa nhiều database**, nên gói miễn phí là đủ:

| Nền tảng | Giới hạn gói free (cần kiểm tra lại khi đăng ký) | Cách dùng trong đề tài |
|---|---|---|
| **Supabase** | Tối đa 2 project mỗi organization; mỗi project 500 MB DB và 1 GB storage; tạm dừng sau 1 tuần không hoạt động | **Project 1 (dev):** chứa 5 schema `identity`, `media`, `inventory`, `ordering`, `ai`. **Project 2 (demo):** môi trường sạch để demo và bảo vệ |
| **MongoDB Atlas M0** | 1 cluster free mỗi project; 0,5 GB; tối đa 100 database, 500 kết nối, khoảng 100 thao tác/giây; tạm dừng sau 30 ngày không có kết nối | 1 cluster chứa 4 database `catalog`, `review`, `chat`, `notification` |

**Ước lượng dung lượng:**
- Mỗi embedding 1024 chiều khoảng 4 KB. 10.000 chunk khoảng 40 MB, cộng index HNSW vẫn dưới 100 MB.
- 500 sản phẩm, review và lịch sử chat chỉ vài chục MB.

### 7.2 Hai profile cấu hình: `dev` và `local`

Mỗi service có **hai file cấu hình theo môi trường**, cùng tên ở cả Spring lẫn Quarkus:

| Profile | File | CSDL | Dùng khi |
|---|---|---|---|
| **`dev`** (mặc định) | `application-dev.yml` (Spring) / `application-dev.properties` (Quarkus) | **Supabase + MongoDB Atlas dùng chung** | Code hằng ngày: hai người cùng làm việc trên **cùng một bộ dữ liệu** (sản phẩm, embedding, tài liệu tri thức, tài khoản test) |
| **`local`** | `application-local.yml` / `application-local.properties` | **PostgreSQL + MongoDB chạy bằng Docker Compose trên máy** | Thử migration mới trước khi đưa lên DB chung, test luồng Saga end-to-end, load test, làm việc khi không có mạng |

Các thành phần khác ở **cả hai profile** đều chạy local:

| Thành phần | `dev` | `local` | Lý do |
|---|---|---|---|
| PostgreSQL | Supabase | Docker | – |
| MongoDB | Atlas M0 | Docker | – |
| Kafka, Redis | Docker local | Docker local | Dữ liệu tạm; dùng chung sẽ gây lẫn event giữa các thành viên |
| File | Supabase Storage (API tương thích S3) | Thư mục trên ổ đĩa (`./data/uploads`) | Ở `dev`, ảnh sản phẩm và tài liệu tri thức phải dùng chung cùng với DB. Không dùng MinIO (xem 7.6) |

**Cấu trúc file trong mỗi service:**

```
src/main/resources/
├── application.yml          ← cấu hình chung, không có thông tin kết nối DB
├── application-dev.yml      ← Supabase/Atlas, mật khẩu đọc từ biến môi trường
└── application-local.yml    ← localhost (Docker), commit đầy đủ
```

Ví dụ với ordering-service (Spring):

```yaml
# application-dev.yml – được commit, KHÔNG chứa mật khẩu
spring:
  r2dbc:
    url: r2dbc:postgresql://${SUPABASE_DB_HOST}:5432/postgres?schema=ordering
    username: ${SUPABASE_DB_USER}
    password: ${SUPABASE_DB_PASSWORD}
    pool.max-size: 5                      # gói free giới hạn số kết nối
  flyway:
    url: jdbc:postgresql://${SUPABASE_DB_HOST}:5432/postgres
    user: ${SUPABASE_DB_USER}
    password: ${SUPABASE_DB_PASSWORD}
    schemas: ordering
    enabled: false                        # không tự migrate DB chung (xem 7.4)

# application-local.yml – được commit đầy đủ
spring:
  r2dbc:
    url: r2dbc:postgresql://localhost:5432/pcshop?schema=ordering
    username: postgres
    password: postgres
  flyway:
    url: jdbc:postgresql://localhost:5432/pcshop
    user: postgres
    password: postgres
    schemas: ordering
    enabled: true
```

Với Quarkus (ví dụ inventory-service):

```properties
# application.properties (chung): quarkus.flyway.schemas=inventory
#                                 quarkus.hibernate-orm.database.default-schema=inventory
# application-dev.properties
quarkus.datasource.jdbc.url=jdbc:postgresql://${SUPABASE_DB_HOST}:5432/postgres
quarkus.datasource.username=${SUPABASE_DB_USER}
quarkus.datasource.password=${SUPABASE_DB_PASSWORD}
quarkus.datasource.jdbc.max-size=5
quarkus.flyway.migrate-at-start=false

# application-local.properties
quarkus.datasource.jdbc.url=jdbc:postgresql://localhost:5432/pcshop
quarkus.datasource.username=postgres
quarkus.datasource.password=postgres
quarkus.flyway.migrate-at-start=true
```

**Chọn profile khi chạy:**

| | Spring Boot | Quarkus |
|---|---|---|
| `dev` (mặc định) | `./mvnw -pl ordering-service spring-boot:run` (đặt `spring.profiles.default: dev` trong `application.yml`) | `./mvnw -pl inventory-service quarkus:dev`: dev mode tự kích hoạt profile `dev` |
| `local` | `./mvnw -pl ordering-service spring-boot:run -Dspring-boot.run.profiles=local` | `./mvnw -pl inventory-service quarkus:dev -Dquarkus.profile=local` |

**Lưu ý:**
- **Mật khẩu Supabase/Atlas không bao giờ được commit.** File `application-dev.*` chỉ chứa placeholder `${...}`. Giá trị thật để trong file `.env` ở thư mục gốc (đã thêm vào `.gitignore`), gửi riêng cho thành viên. Commit kèm `.env.example` liệt kê đủ tên biến.
- **Tắt Quarkus Dev Services** (`quarkus.devservices.enabled=false` trong `application.properties`). Nếu không tắt, khi thiếu URL Quarkus sẽ tự bật thêm container Postgres/Mongo/Kafka riêng, lệch với Docker Compose của nhóm.
- **Kiểm thử tự động** không dùng profile nào trong hai profile trên. Profile `test` dùng Testcontainers (xem 7.4).

### 7.3 Đồng bộ dữ liệu giữa các thành viên: dữ liệu nằm trong code

- Schema và dữ liệu nền (danh mục, thương hiệu, luật tương thích) nằm trong migration.
- Dữ liệu mẫu (khoảng 500 sản phẩm, user test, đơn hàng mẫu) được commit thành file seed, chạy ở **cả hai profile** `dev` và `local` (không chạy ở production/demo nếu muốn DB sạch):
  - **Flyway:** đặt trong `db/seed`, bật bằng `flyway.locations=classpath:db/migration,classpath:db/seed`.
  - **Liquibase MongoDB:** changeset seed gắn `context: seed`, đọc từ `seed/products.json`.
- Nhờ vậy **DB local và DB chung có cùng schema và dữ liệu nền**. Thành viên mới chỉ cần: clone repo, chạy `docker compose up`, rồi chạy service với profile `local` là có dữ liệu giống DB chung (trừ embedding và dữ liệu nhập tay trên DB chung).

### 7.4 Quy tắc khi dùng chung DB cloud

1. **Migration**
   - Đặt tên theo thời gian (`V20261022_2230__add_refunds.sql`) để hai người không trùng số phiên bản.
   - Profile `dev` **tắt tự động migrate** (`spring.flyway.enabled=false`, `quarkus.flyway.migrate-at-start=false`, `quarkus.liquibase-mongodb.migrate-at-start=false`). Nếu bật, chỉ cần một người chạy service từ nhánh tính năng là migration chưa review đã lên DB chung.
   - Quy trình: viết migration, chạy thử bằng profile `local`, merge vào `main`. Sau đó **một người phụ trách** checkout `main` và chạy service một lần với cờ bật migrate, ví dụ `-Dspring.flyway.enabled=true` hoặc `-Dquarkus.flyway.migrate-at-start=true`.
   - Không sửa file migration đã chạy.
2. **Outbox và Kafka**
   - Khi dùng chung Postgres mà mỗi người chạy Kafka local, job đọc outbox trên máy người này có thể lấy event do người kia tạo.
   - Vì vậy luồng Saga end-to-end test bằng profile `local`. Ở profile `dev`, tại một thời điểm chỉ một người chạy luồng đặt hàng.
3. **Kiểm thử:** integration test dùng **Testcontainers**, không bao giờ chạy vào DB chung.
4. **Connection pool:** khi trỏ lên cloud, giới hạn khoảng 3–5 kết nối mỗi service, ví dụ `spring.r2dbc.pool.max-size=5`, `quarkus.datasource.jdbc.max-size=5`.
5. **Load test:** chỉ chạy bằng profile `local`. Atlas M0 bị throttle khi vượt khoảng 100 thao tác/giây nên số liệu đo trên đó không có giá trị.

### 7.5 Lưu ý khi kết nối Supabase

| Kiểu kết nối | Cổng | Mạng | Prepared statement | Dùng cho |
|---|---|---|---|---|
| Direct | 5432 (`db.<ref>.supabase.co`) | IPv6 (gói free) | Có | Service và migration, nếu mạng có IPv6 |
| Pooler – session mode | 5432 | IPv4 | Có | Service và migration, nếu mạng chỉ có IPv4 |
| Pooler – transaction mode | 6543 | IPv4 | **Không** | **Không dùng** (dành cho serverless; JDBC/R2DBC dùng prepared statement) |

- **pgvector:** Supabase cài extension vào schema `extensions`. Migration nên viết `CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;` để chạy được cả trên local lẫn cloud.
- **Tạm dừng do không hoạt động:** Supabase dừng project sau 1 tuần, Atlas dừng sau 30 ngày. **Kiểm tra và khởi động lại vài ngày trước buổi bảo vệ.**

### 7.6 Lưu trữ file: không dùng MinIO

**Quyết định:** bỏ MinIO. Profile `dev` dùng **Supabase Storage**, profile `local` lưu vào **thư mục trên ổ đĩa**.

**Lý do:**
- Nhóm không có server chung. MinIO chạy trên từng máy thì file upload ở máy này máy kia không có, trong khi DB ở profile `dev` lại dùng chung. Kết quả là bản ghi `media.files` trỏ tới file không tồn tại.
- MinIO bản cộng đồng đã ngừng phát hành Docker image và file cài đặt từ tháng 10/2025, chuyển sang chế độ chỉ bảo trì từ tháng 12/2025, và repo bị archive năm 2026. Không nên đưa thành phần này vào dự án mới.
- Supabase Storage nằm sẵn trong project Supabase của profile `dev`, nên không thêm hạ tầng nào. Gói free giới hạn 50 MB mỗi file, đủ cho ảnh và tài liệu PDF.

**Thiết kế:**

```java
public interface FileStorage {
    Mono<StoredFile> upload(String bucket, String key, Flux<DataBuffer> content, String contentType);
    Mono<Void> delete(String bucket, String key);
    String publicUrl(String bucket, String key);
}
// SupabaseFileStorage  ← profile dev   (S3 API của Supabase, AWS SDK v2)
// LocalDiskFileStorage ← profile local (ghi vào ./data/uploads, phục vụ qua endpoint tĩnh của media-service)
```

- Bucket: `products` (public), `avatars` (public), `reviews` (public), `knowledge-docs` (private).
- Luồng upload: **client → media-service → storage**. Không upload thẳng từ trình duyệt bằng presigned URL, vì dễ vướng CORS và Supabase không hỗ trợ API cấu hình CORS cho bucket.
- Các service khác chỉ lưu `file_id` (tham chiếu logic tới `media.files`) hoặc URL công khai.

**Ảnh sản phẩm seed** (khoảng 500 ảnh crawl về): script chạy một lần upload lên bucket `products` của Supabase, rồi ghi URL công khai vào dữ liệu seed. Profile `local` dùng luôn các URL này để hiển thị. Chỉ file upload mới khi chạy `local` mới ghi ra ổ đĩa. Như vậy không phải commit ảnh vào Git.

**Những chỗ dễ làm upload thất bại (cần cấu hình ngay từ đầu):**

| Vấn đề | Cách xử lý |
|---|---|
| Giới hạn kích thước request ở từng lớp | Đặt thống nhất (ví dụ 20 MB) ở gateway, `spring.webflux.multipart.*` (Spring), `quarkus.http.limits.max-body-size` (Quarkus, mặc định 10 MB) |
| AWS SDK v2 bản mới tự gửi header checksum, Supabase không hỗ trợ (kể cả `Content-MD5`) | Khi tạo `S3Client`, đặt `requestChecksumCalculation(WHEN_REQUIRED)` và `responseChecksumValidation(WHEN_REQUIRED)`; bật `forcePathStyle(true)` |
| Supabase Storage không có versioning | File xóa là mất hẳn; chỉ xóa khi không còn bản ghi nào tham chiếu |
| Kết nối S3 của Supabase chưa bật | Bật S3 connection và tạo access key trong trang Storage settings của Supabase; key để trong `.env`, không commit |

---

## 8. Frontend

**Công nghệ:** React (Next.js) hoặc Vue, kết hợp Tailwind.

**Các trang chính:**

- Trang chủ, danh sách sản phẩm (lọc theo thông số), chi tiết sản phẩm
- **PC Builder:** chọn linh kiện theo từng slot, báo lỗi tương thích ngay khi chọn
- Widget chat AI, hiển thị câu trả lời dạng stream
- Giỏ hàng, checkout, theo dõi đơn hàng
- Trang admin: quản lý sản phẩm, đơn hàng, tồn kho, kho tri thức RAG, dashboard thống kê

---

## 9. Lộ trình thực hiện (16 tuần)

| Tuần | Công việc | Kết quả |
|---|---|---|
| 1–2 | Khảo sát, đặc tả use case, thiết kế kiến trúc và CSDL; chuẩn bị dữ liệu 300–500 sản phẩm | SRS, sơ đồ kiến trúc, schema DBML |
| 3 | Dựng monorepo Maven, hạ tầng Docker Compose (Postgres, Mongo, Redis, Kafka), Gateway, Discovery; viết migration V1 và seed dev cho từng service; tạo Supabase project và Atlas cluster, viết `application-dev` / `application-local` cho từng service, `.env.example` | Khung hệ thống chạy được, schema và dữ liệu mẫu tự tạo khi khởi động, chạy được trên cả local lẫn cloud |
| 4–5 | Identity, Catalog (Quarkus + Mongo), Inventory | CRUD, lọc sản phẩm theo thông số |
| 6–7 | Cart, Order, Payment (WebFlux + R2DBC), Saga qua Kafka | Luồng đặt hàng end-to-end |
| 8 | Frontend: trang sản phẩm, giỏ hàng, checkout | Luồng mua hàng hoàn chỉnh |
| 9 | Rule engine tương thích, giao diện PC Builder | Kiểm tra tương thích hoạt động |
| 10–11 | AI service: ingest, pgvector, chatbot RAG, tool calling, streaming | Chatbot tư vấn |
| 12 | AI PC Builder, tìm kiếm ngữ nghĩa, gợi ý sản phẩm | Đủ các tính năng AI |
| 13 | Admin dashboard, notification, review | Hoàn thiện chức năng |
| 14 | Observability, resilience; kiểm thử (unit, integration với Testcontainers, test tải bằng k6/Gatling) | Báo cáo hiệu năng |
| 15 | Đánh giá AI, sửa lỗi | Bảng số liệu đánh giá |
| 16 | Viết báo cáo, làm slide, quay video demo | Nộp bài |

---

## 10. Bố cục báo cáo

1. **Tổng quan đề tài:** bối cảnh, mục tiêu, phạm vi
2. **Cơ sở lý thuyết:** Microservices, Reactive programming/WebFlux, Quarkus, PostgreSQL/MongoDB, LLM, Embedding, RAG, Vector DB
3. **Phân tích và thiết kế hệ thống:** use case, kiến trúc, CSDL, sequence diagram cho luồng đặt hàng (Saga) và luồng RAG
4. **Triển khai hệ thống**
5. **Kiểm thử và đánh giá:** chức năng, hiệu năng, chất lượng AI
6. **Kết luận và hướng phát triển**

---

## 11. Rủi ro và cách xử lý

| Rủi ro | Cách xử lý |
|---|---|
| Dữ liệu sản phẩm thiếu thông số | Crawl từ các trang bán linh kiện; chuẩn hóa thủ công một tập nhỏ nhưng chất lượng |
| LLM trả lời sai giá hoặc bịa thông tin | Giá và tồn kho chỉ lấy qua tool; prompt yêu cầu chỉ trả lời dựa trên context |
| Chi phí API LLM | Cache câu trả lời; dùng Ollama trong giai đoạn phát triển |
| Quá nhiều service, khó debug | Giới hạn khoảng 8 service; bật tracing ngay từ đầu |
| Reactive khó debug (WebFlux) | Dùng `.log()`, `checkpoint()`; tránh gọi blocking trong pipeline |
| Bán vượt tồn kho khi đặt hàng đồng thời | Optimistic lock (`version`) kết hợp giữ hàng có thời hạn (`stock_reservations`) |
| Chatbot gợi ý sản phẩm đã ẩn hoặc ngừng bán | Event `product.hidden` xóa chunk khỏi pgvector; tool giá/tồn kho từ chối sản phẩm không `ACTIVE` |
| Upload file thất bại hoặc file có ở máy này mà máy kia không có | Không dùng MinIO; profile `dev` dùng Supabase Storage chung; thống nhất giới hạn kích thước request; tắt checksum mặc định của AWS SDK (7.6) |
| Quên lọc bản ghi đã xóa mềm | Chỉ `users` dùng xóa mềm; các bảng khác dùng `status`/`is_active` hoặc xóa thật |
| Thành viên không có cùng dữ liệu | Schema và dữ liệu mẫu nằm trong migration/seed; dùng Docker local là đủ |
| Xung đột migration khi dùng chung DB cloud | Đặt version theo thời gian; chỉ migrate lên DB chung từ nhánh `main` |
| Lẫn event outbox giữa các máy khi dùng chung DB | Test Saga trên Docker local; DB chung chủ yếu dùng để đọc và demo |
| Vượt giới hạn gói free (kết nối, throttle, tạm dừng) | Giới hạn pool 3–5 mỗi service; load test trên local; kiểm tra và mở lại DB trước ngày bảo vệ |

---

## 12. Vấn đề cần hội ý nhóm

> Các mục dưới đây **chưa chốt**. Phần còn lại của plan đang viết theo phương án mặc định; chốt xong thì cập nhật lại các mục liên quan.

### 12.1 Xác thực: tự viết identity-service hay dùng Keycloak?

> **Trạng thái (24/10/2026): đang thử Keycloak trong khung dự án.** Khung code đã dựng theo phương án Keycloak:
> `identity-service` được thay bằng `customer-service` (chỉ giữ `customer_profiles`, `user_addresses`), ID người dùng
> là UUID (`sub`) ở mọi bảng, realm cấu hình trong `infra/keycloak/realm-pcshop.json`.
> File DBML vẫn giữ thiết kế cũ (bigint, bảng `users`/`roles`...) cho tới khi nhóm chốt; migration V1 trong code là bản đang dùng.

**Phương án mặc định:** identity-service tự viết bằng Quarkus, phát JWT HS256 với claim `sub`, `uid`, `roles`, `perms` (mục 3 và mục 6).

**Keycloak là gì:** phần mềm quản lý danh tính và truy cập (IAM) mã nguồn mở của Red Hat, chạy trên Quarkus. Nó chạy như một server riêng và lo:
- Trang đăng nhập, đăng ký, xác thực email, quên mật khẩu, khóa tài khoản khi nhập sai, OTP, đăng nhập Google/Facebook.
- Lưu user, role, group; trang quản trị riêng.
- Phát token chuẩn OAuth2/OpenID Connect, ký RS256. Khóa công khai công bố ở endpoint JWKS để mọi service tự kiểm tra token.
- Cấp token cho chính các service gọi nhau (client credentials).

**Keycloak KHÔNG làm thay:**
- Thiết kế mô hình quyền (có những role/permission nào).
- Kiểm tra quyền ở từng API (`@PreAuthorize`, `@RolesAllowed`): vẫn là code của service.
- Kiểm tra quyền sở hữu (khách chỉ xem đơn của mình, chỉ sửa review của mình): luôn là code của service.

**Nếu chọn Keycloak, cách quản lý user và quyền đề xuất:**
- Realm role: `CUSTOMER`, `STAFF`, `ADMIN`.
- Quyền chi tiết (`product:write`, `order:update-status`, `knowledge:reindex`...) khai báo thành **client role**, tự có trong token và kiểm tra bằng `hasAuthority(...)`.
- Màn hình "Quản lý người dùng / phân quyền" trong trang admin của shop gọi **Keycloak Admin REST API** (thư viện `keycloak-admin-client`). Nhân viên không phải vào trang quản trị của Keycloak.
- Hồ sơ khách tạo khi khách gọi API lần đầu: thấy `sub` chưa có trong `customer_profiles` thì tạo mới từ thông tin trong token.
- Không dùng Keycloak Authorization Services (resource/policy trong Keycloak): quá phức tạp so với đề tài.

**Những gì phải thay đổi nếu chọn Keycloak:**

| Hạng mục | Thay đổi |
|---|---|
| CSDL identity | Bỏ `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `refresh_tokens`. Chỉ giữ `customer_profiles` (khóa chính = `sub`) và `user_addresses`. identity-service có thể đổi thành `customer-service` |
| **ID người dùng** | `sub` là UUID dạng chuỗi. **Mọi cột tham chiếu user trong DBML** (`created_by`, `updated_by`, `orders.user_id`, `reviews.user_id`, `chat_sessions.user_id`...) đổi từ `bigint` sang `uuid`/`varchar(36)`. Kiểu auditor trong `AuditableEntity` đổi theo |
| Hợp đồng JWT | RS256 + JWKS thay cho HS256 + secret. ID user lấy từ `sub`, tên đăng nhập từ `preferred_username`, role từ `realm_access.roles` và `resource_access.<client>.roles`. Không còn claim `perms` |
| Spring | `spring-boot-starter-oauth2-resource-server` + `issuer-uri`; viết một `Converter` ánh xạ `realm_access.roles` thành authority |
| Quarkus | `quarkus-oidc` + `quarkus.oidc.auth-server-url`; đặt đường dẫn claim role `realm_access/roles` |
| Frontend | Luồng Authorization Code + PKCE (`keycloak-js` hoặc `oidc-client-ts`); trang đăng nhập là của Keycloak (có thể đổi theme); không còn API `POST /auth/login` |
| Hạ tầng | Thêm container Keycloak vào Docker Compose (khoảng 0,5–1 GB RAM). Commit file **realm export** (realm, client, role, tài khoản test) và khởi động bằng `--import-realm` |
| Profile `dev` dùng chung DB | Mỗi người chạy Keycloak riêng thì cùng tài khoản test sẽ có `sub` khác nhau, dữ liệu trên Supabase sẽ trỏ tới user không tồn tại ở máy người kia. Phải **cố định `id` tài khoản test trong realm export**, hoặc chạy một Keycloak dùng chung |
| Lợi ích phụ | Kafka consumer cần gọi service khác có thể xin token bằng client credentials; gateway kiểm tra token ngay từ đầu |

**So sánh:**

| | Tự viết | Keycloak |
|---|---|---|
| Khối lượng code | Nhiều: đăng ký, đăng nhập, xác thực email, reset mật khẩu, khóa tài khoản, refresh token | Gần như chỉ có cấu hình |
| Hạ tầng | Đơn giản | Thêm 1 server nặng, thêm file realm phải quản lý |
| Thay đổi so với plan hiện tại | Không | ID sang UUID, sửa DBML, đổi hợp đồng JWT |
| Điểm thể hiện khi bảo vệ | Hiểu rõ cơ chế JWT, tự cài đặt bảo mật | Áp dụng chuẩn OAuth2/OIDC như doanh nghiệp |

**Câu hỏi cần trả lời trước khi chốt:**
1. Giảng viên có yêu cầu nhóm **tự cài đặt** chức năng đăng nhập/đăng ký không? Nếu có thì giữ phương án tự viết.
2. Máy các thành viên có đủ RAM để chạy thêm Keycloak cạnh khoảng 10 service, Kafka, Postgres, Mongo, Redis không?
3. Nhóm muốn dành thời gian cho phần xác thực, hay dồn vào AI/RAG và Saga?
4. Ai phụ trách dựng và duy trì file realm export?

