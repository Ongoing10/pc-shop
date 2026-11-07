# Design brief: mockup giao diện PC Shop

Tài liệu chốt hướng thiết kế và danh sách màn hình **trước khi** vẽ mockup và làm frontend thật (Next.js + Tailwind, plan mục 8).
Dữ liệu trên từng màn hình lấy theo **trường API thật** trong code (đã đối chiếu entity/record ngày 2026-10-27), không theo DBML.

> **Trạng thái:** chờ duyệt. Cần nhóm chọn (1) phương án phong cách ở mục 1.2 và (2) duyệt danh sách màn hình ở mục 2,
> kể cả các câu hỏi ở mục 2.4. Token ở mục 1.3–1.6 viết theo phương án đề xuất (A); chọn B hoặc C thì chỉ đổi bảng màu và font,
> spacing/bo góc giữ nguyên.

Nguồn đã dùng: `CLAUDE.md`, plan mục 2/5/8, `docs/api-backlog.md`, `docs/api-changelog.md`, code các service;
tra cứu `ui-ux-pro-max` (design-system, style, color, typography), quy trình của `frontend-design`, cách tạo theme của `theme-factory`.

---

## 1. Định hướng thiết kế

### 1.1 Sản phẩm, người dùng, việc chính

- **Sản phẩm:** shop linh kiện PC bằng tiếng Việt, điểm khác biệt là **kiểm tra tương thích tất định** và **tư vấn AI có giá/tồn kho thật**.
- **Người dùng khách:** sinh viên, game thủ, người tự build PC lần đầu (18–35 tuổi), xem nhiều trên điện thoại, so thông số trên máy tính.
  Họ lo nhất hai điều: *mua về có lắp được không* và *giá/tồn kho có đúng không*.
- **Người dùng admin:** nhân viên kho, nhân viên xử lý đơn, admin. Làm việc lâu trên desktop, cần bảng dày đặc, thao tác hàng loạt, ít trang trí.
- **Cảm giác thương hiệu:** chuyên nghiệp, đáng tin, đậm chất công nghệ nhưng không rối. "Công nghệ" đến từ **cách trình bày thông số**
  (chính xác, có đơn vị, có so khớp) chứ không đến từ neon, glow hay hiệu ứng.

### 1.2 Ba phương án phong cách

Cả ba đều dùng chung lưới, spacing, bo góc (mục 1.4–1.5) và cùng một **điểm nhấn riêng** (mục 1.7). Khác nhau ở màu, font và độ "đậm".

#### Phương án A: "Bảng thông số" (Datasheet sáng), **đề xuất**

Lấy cảm hứng từ datasheet của nhà sản xuất linh kiện: nền sáng xám lạnh, chữ mực xanh đen, thông số canh cột có đơn vị,
các đường kẻ mảnh chia nhóm thông tin. Màu chỉ dùng khi có nghĩa: xanh cobalt cho điều hướng, cam cho tiền và nút mua,
xanh lá / vàng / đỏ **chỉ** cho kết quả tương thích và trạng thái.

| Vai trò | Tên | Hex | Ghi chú |
|---|---|---|---|
| Nền trang | Giấy lạnh | `#F3F5F8` | xám lạnh, không phải kem |
| Bề mặt (thẻ, bảng) | Trắng | `#FFFFFF` | |
| Bề mặt chìm (ô lọc, hàng xen kẽ) | Xám khói | `#EAEEF3` | |
| Chữ chính | Mực | `#0F1B2D` | 15.8:1 trên nền trang |
| Chữ phụ | Chì | `#5B6878` | 5.2:1 trên nền trang |
| Đường kẻ | Kẻ mảnh | `#D9DFE6` | |
| Thương hiệu, link, focus, bộ lọc đang chọn | Cobalt | `#1D4ED8` | 6.7:1 trên trắng |
| **Nút mua, giá bán** | Cam tín hiệu | `#C2410C` (hover `#9A3412`, nền nhạt `#FDEBDD`) | chữ trắng 5.2:1 |
| Tương thích OK / thành công | Lục | `#166534` trên `#E7F5EC` | |
| **Cảnh báo tương thích** (severity 2) | Hổ phách | chữ `#7A4F00` trên `#FFF3C4`, viền `#E9B200` | 6.4:1 |
| **Lỗi tương thích** (severity 1), lỗi form | Đỏ | `#B91C1C` trên `#FDECEC` | 5.7:1 |

- **Font:** `Be Vietnam Pro` cho cả tiêu đề và nội dung (font do người Việt thiết kế cho tiếng Việt, dấu chồng không bị cắt);
  `JetBrains Mono` **chỉ** cho mã SKU và mã đơn (đúng bản chất là mã, cần phân biệt `0/O`, `1/I`). Số tiền, thông số dùng
  `font-variant-numeric: tabular-nums` của Be Vietnam Pro để canh cột. Cả hai có subset `vietnamese` trên Google Fonts.
- **Vì sao đề xuất:** khớp đúng hai nỗi lo của khách (lắp được không, giá đúng không) bằng cách làm thông số dễ so sánh;
  dễ đọc lâu, in/chụp màn hình cho báo cáo đẹp; admin dùng lại nguyên bộ token chỉ cần giảm độ đậm. Rủi ro: dễ thành "trang
  thương mại điện tử bình thường" nếu bỏ điểm nhấn ở mục 1.7, nên điểm nhấn đó là bắt buộc với phương án này.

#### Phương án B: "Bo mạch" (PCB tối)

Nền tối màu phủ mạch in xanh đen, chữ trắng như lớp in lụa trên bo, nút mua màu đồng như đường mạch, trạng thái tương thích
như đèn LED trên bo.

| Vai trò | Hex |
|---|---|
| Nền / bề mặt / đường kẻ | `#0B1A16` / `#12261F` / `#1F3D33` |
| Chữ chính / chữ phụ | `#E6EEEA` (15.2:1) / `#9FB5AB` (7.3:1) |
| Link, focus | `#5EEAD4` |
| Nút mua, giá | Đồng `#E0913F`, chữ `#1A0F05` (7.4:1) |
| OK / cảnh báo / lỗi | `#34D399` / `#FBBF24` / `#F87171` |

- **Font:** `Saira` (tiêu đề, dáng vuông kỹ thuật, có tiếng Việt) + `Be Vietnam Pro` (nội dung) + `JetBrains Mono` (SKU).
- **Ưu:** rất "chất công nghệ", hợp game thủ, nổi bật khi demo. **Nhược:** ảnh sản phẩm nền trắng của hãng bị lệch tông trên nền tối;
  đọc thông số dài mỏi mắt; khó tạo cảm giác "đáng tin" cho người mua lần đầu; admin không nên dùng nền tối này (phải làm hai theme).

#### Phương án C: "Hộp bán lẻ" (khối màu theo danh mục)

Gợi ý mặc định của `ui-ux-pro-max` cho e-commerce là "Vibrant & Block-based". Bản này lấy từ vỏ hộp linh kiện: nền trắng,
mỗi danh mục có một màu khối riêng (CPU xanh dương, GPU xanh lá…), chữ tiêu đề rộng và đậm, nút mua vàng như tem "giá sốc".

| Vai trò | Hex |
|---|---|
| Nền / chữ | `#FFFFFF` / `#121417` (18.5:1) |
| Nút mua | Vàng tem `#FFD200`, chữ `#121417` (12.7:1) |
| Link, thương hiệu | `#2747E0` |
| OK / cảnh báo / lỗi | `#15803D` / `#C2410C` (nền) / `#DC2626` |
| Màu khối danh mục | 8 màu, chỉ dùng ở dải danh mục và nhãn slot |

- **Font:** `Archivo` (có trục độ rộng, dùng bản rộng cho tiêu đề) + `Be Vietnam Pro` (nội dung).
- **Ưu:** năng động, nhận diện danh mục nhanh. **Nhược:** 8 màu danh mục cộng 3 màu trạng thái cộng màu mua là quá nhiều màu, đúng thứ
  "rối" cần tránh; màu khối danh mục dễ bị đọc nhầm thành trạng thái tương thích.

#### Đã cân nhắc và loại

- Bảng màu `ui-ux-pro-max` sinh ra ban đầu (`#059669` xanh lá chủ đạo + cam): xanh lá làm màu thương hiệu sẽ trùng với màu
  "tương thích OK", khách không phân biệt được "nút" và "đã khớp".
- Cyberpunk/neon: cũng là gợi ý của `ui-ux-pro-max` cho "gaming hardware", nhưng trái với yêu cầu "đáng tin, không rối".
- Theme có sẵn của `theme-factory` (Tech Innovation, Modern Minimalist): dùng font DejaVu, không hợp tiếng Việt trên web, màu chung chung.
  Theo hướng dẫn của skill, bộ token ở mục 1.3 là **theme tự tạo** tên "Datasheet"; sẽ chốt thành file sau khi nhóm chọn phương án.

### 1.3 Token (phương án A, theme "Datasheet")

Định nghĩa một lần ở `docs/ui/mockups/assets/tokens.css`, mockup và frontend Next.js (Tailwind `theme.extend`) đều đọc cùng tên.

```css
:root {
  /* Màu */
  --bg: #F3F5F8;  --surface: #FFFFFF;  --surface-sunken: #EAEEF3;
  --ink: #0F1B2D; --ink-muted: #5B6878; --line: #D9DFE6;
  --brand: #1D4ED8; --brand-tint: #E6EDFC;
  --buy: #C2410C; --buy-hover: #9A3412; --buy-tint: #FDEBDD;   /* nút mua + giá bán */
  --ok: #166534; --ok-tint: #E7F5EC;
  --warn: #7A4F00; --warn-tint: #FFF3C4; --warn-line: #E9B200; /* severity 2 */
  --error: #B91C1C; --error-tint: #FDECEC;                    /* severity 1 */

  /* Chữ */
  --font-sans: "Be Vietnam Pro", "Noto Sans", system-ui, sans-serif;
  --font-code: "JetBrains Mono", ui-monospace, monospace;     /* chỉ SKU, mã đơn */
  --text-xs: 12px; --text-sm: 14px; --text-md: 16px; --text-lg: 18px;
  --text-xl: 20px; --text-2xl: 24px; --text-3xl: 30px; --text-4xl: 38px; --text-5xl: 48px;
  --leading-body: 1.55;   /* tiếng Việt cần leading cao hơn tiếng Anh vì dấu chồng */
  --leading-heading: 1.25;

  /* Khoảng cách: lưới 4px */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-5: 20px;
  --space-6: 24px; --space-8: 32px; --space-10: 40px; --space-12: 48px; --space-16: 64px;

  /* Bo góc: theo cấp, không một bán kính cho mọi thứ */
  --radius-control: 6px;  /* nút, ô nhập, chip */
  --radius-card: 10px;    /* thẻ sản phẩm, khối nội dung */
  --radius-layer: 14px;   /* modal, drawer, widget chat */

  /* Đổ bóng: chỉ cho lớp nổi, thẻ phẳng dùng viền --line */
  --shadow-raise: 0 1px 2px rgba(15, 27, 45, .06);
  --shadow-layer: 0 12px 32px rgba(15, 27, 45, .16);
}
```

### 1.4 Chữ

| Cấp | Cỡ / độ đậm | Dùng cho |
|---|---|---|
| Display | 48 / 700, tracking -0.02em | tiêu đề hero trang chủ (chỉ một chỗ) |
| H1 | 30 / 700 | tên trang, tên sản phẩm ở trang chi tiết |
| H2 | 24 / 600 | tiêu đề khối |
| H3 | 18 / 600 | tiêu đề thẻ, nhóm thông số |
| Body | 16 / 400, line-height 1.55 | nội dung khách |
| Small | 14 / 400 | admin (cỡ mặc định của bảng), chú thích |
| Caption | 12 / 500 | nhãn phụ; không nhỏ hơn 12px |
| Giá | 20–30 / 700, tabular-nums, màu `--buy` | giá bán; giá gốc 14 gạch ngang màu `--ink-muted` |
| SKU | 13 / 500, `--font-code` | mã SKU, mã đơn `DH2026…` |

Quy tắc: viết hoa kiểu câu (không ALL CAPS cho nhãn), dòng chữ nội dung tối đa ~75 ký tự, tiêu đề không tô màu riêng một từ.

### 1.5 Lưới, spacing, độ "đậm" theo khu vực

| | Giao diện khách | Giao diện admin |
|---|---|---|
| Độ đậm | Đậm hơn: ảnh sản phẩm lớn, nút mua cam, điểm nhấn tương thích | Nhạt: nền trắng/xám, cobalt chỉ cho hành động chính, **không dùng cam** (admin không "mua") |
| Lưới desktop | 12 cột, nội dung tối đa 1280px, lề 32px | sidebar 240px + nội dung tràn rộng, lề 24px |
| Lưới mobile | 4 cột, lề 16px | không làm mobile |
| Khoảng giữa khối | 48–64px | 24px |
| Padding thẻ | 16–20px | 12–16px |
| Hàng bảng | 56px | 40px, header bảng dính khi cuộn |
| Cỡ chữ gốc | 16px | 14px |
| Vùng chạm tối thiểu | 44×44px (mobile) | 32px chiều cao nút |

### 1.6 Thành phần và trạng thái dùng chung

- **Nút:** chính (nền `--buy` ở khách, `--brand` ở admin), phụ (viền `--line`), nguy hiểm (chữ `--error`). Mỗi nút có hover, focus
  (vòng 2px `--brand`, cách 2px), disabled, đang xử lý (spinner thay icon, giữ nguyên chiều rộng).
- **Nhãn trạng thái** (ánh xạ từ số nguyên của API, luôn có chữ, không chỉ dùng màu):
  - Sản phẩm `status`: 1 Nháp (xám) · 2 Đang bán (lục) · 3 Đã ẩn (hổ phách) · 4 Ngừng bán (xám đậm).
  - Đơn `status`: 1 Chờ xử lý · 2 Chờ thanh toán · 3 Đã thanh toán · 4 Đã xác nhận · 5 Đang giao · 6 Hoàn tất · 7 Đã hủy · 8 Trả hàng.
  - Review `status`: 1 Chờ duyệt · 2 Đã duyệt · 3 Từ chối · 4 Người viết đã gỡ.
  - Voucher `type`: 1 Giảm % · 2 Giảm tiền · 3 Miễn phí ship. Kho `type` biến động: 1 Nhập · 2 Bán · 3 Trả · 4 Điều chỉnh.
  - Tương thích `severity`: 1 Lỗi (đỏ, icon chặn) · 2 Cảnh báo (hổ phách, icon tam giác).
- **Tiền:** `29.990.000 ₫` (dấu chấm ngăn nghìn, ký hiệu sau). **Ngày giờ:** `27/10/2026 14:05`.
- **Icon:** Lucide (SVG, nét 1.5px), không dùng emoji làm icon.
- **Rỗng:** một câu nói tình trạng + một hành động ("Giỏ hàng trống. Xem linh kiện").
- **Lỗi:** nói chuyện gì xảy ra và cách sửa, lấy `error_message` của `ResponseData`; lỗi hàng loạt (`data: [{id, reason}]`) hiển thị theo từng dòng.
- **Đang tải:** skeleton giữ đúng kích thước nội dung (không nhảy layout). Mockup chỉ vẽ skeleton ở danh sách sản phẩm.

### 1.7 Điểm nhấn riêng: "đường khớp nối"

Chỗ duy nhất được phép đậm, mọi thứ khác giữ yên:

- **Chip thông số tương thích:** các trường `compat` quan trọng (`socket`, `memory_type`, `form_factor`, `wattage`, `length_mm`) hiện thành chip
  có một khấc nhỏ ở cạnh trái như chân cắm. Xuất hiện ở thẻ sản phẩm, trang chi tiết, PC Builder, gợi ý của chatbot.
- **Đường nối trong PC Builder:** các slot xếp dọc, nối bằng một đường "bus". Đoạn nối giữa hai slot đổi màu theo kết quả rule
  (vd đoạn CPU–Mainboard đỏ khi `CPU_MB_SOCKET` lỗi, kèm thông báo ngay tại đoạn đó). Cấu trúc ở đây là thông tin: nhìn đường là
  biết linh kiện nào không khớp với linh kiện nào.
- **Đồng hồ công suất:** `estimatedWattage` so với `compat.wattage` của PSU, thanh ngang đổi lục → hổ phách → đỏ.
- Chuyển động duy nhất tự chạy: khi `compatibility/check` trả kết quả, đoạn nối đổi màu trong 200ms. Tôn trọng `prefers-reduced-motion`.

### 1.8 Tự rà soát theo `frontend-design`

- Bỏ bảng màu xanh lá mặc định (lý do ở 1.2), bỏ font mặc định Rubik/Nunito Sans của gợi ý e-commerce chung: chọn Be Vietnam Pro vì hỗ trợ tiếng Việt.
- Không dùng monospace cho mọi nhãn nhỏ (dấu hiệu "trang AI sinh ra"); mono chỉ cho SKU/mã đơn vì đó thật sự là mã.
- Không dùng nhãn ALL CAPS phía trên mỗi tiêu đề, không đánh số 01/02/03 trang trí. Chỉ đánh số ở chỗ thật sự là trình tự: 3 bước import Excel, timeline đơn.
- Không chặt mọi thứ thành thẻ cùng bo góc cùng bóng: bo góc 3 cấp, thẻ phẳng có viền, bóng chỉ cho lớp nổi.
- Hero trang chủ không dùng mẫu "số to + nhãn nhỏ + gradient": dùng PC Builder thu nhỏ (mục 2.1, K01), vì đó là thứ đặc trưng nhất của shop.

---

## 2. Danh sách màn hình

Quy ước: **Vai trò** theo `docs/api-backlog.md` (public / user / owner / STAFF / ADMIN / `perm:x`). **Dữ liệu** ghi đúng tên trường API
(JSON camelCase, trừ kết quả import Excel dùng snake_case). Mọi danh sách phân trang dùng `PageResponse {content, page{size, number, totalElements, totalPages}}`.
**Trạng thái:** những biến thể cần vẽ thành ảnh riêng.

Khung chung của khách (header): logo · ô tìm kiếm (`GET /products/search?q=`) · menu danh mục (`GET /categories`: `code`, `name`, `pcSlot`, `sortOrder`) ·
lối vào PC Builder · chuông thông báo (`GET /notifications/unread-count`) · giỏ hàng (`totalQuantity` của `GET /cart`) · tài khoản (đăng nhập qua trang Keycloak).

### 2.1 Giao diện khách (desktop 1440×900 + mobile 390×844)

#### K01. Trang chủ
- **Mục đích:** giới thiệu điểm khác biệt (build PC có kiểm tra tương thích, tư vấn AI), đưa khách vào danh mục.
- **Vai trò:** public.
- **Dữ liệu:** `GET /categories` (8 danh mục có `pcSlot`); `GET /brands` (`code`, `name`, `logoUrl`); một dải sản phẩm từ `GET /products?category=GPU&sort=price,asc&size=8`
  (thẻ sản phẩm như K02). Hero là PC Builder thu nhỏ: chọn CPU mẫu (`CPU-I5-14600K`) → hiện mainboard khớp socket.
- **Hành động chính:** mở PC Builder, vào danh mục, tìm kiếm, mở chat AI.
- **Trạng thái:** bình thường.
- **Ghi chú dữ liệu:** chưa có API "bán chạy"/"nổi bật" công khai (`top-products` là API admin), nên dải sản phẩm chỉ lọc theo danh mục + giá.

#### K02. Danh sách sản phẩm + bộ lọc
- **Mục đích:** duyệt và lọc linh kiện theo thông số.
- **Vai trò:** public.
- **Dữ liệu:**
  - Bộ lọc: `GET /products/facets?category=` → `brands[]`, `priceRange{min, max}`, `compat{socket[], memory_type[], form_factor[], …}`.
  - Kết quả: `GET /products?category=&brand=&minPrice=&maxPrice=&socket=&memoryType=&formFactor=&sort=&page=&size=` → `Product`:
    `sku`, `name`, `slug`, `brandCode`, `price`, `originalPrice`, `images[{url, isPrimary}]`, `compat`, `ratingAvg`, `ratingCount`, `soldCount`, `warrantyMonths`.
  - Còn hàng: `POST /inventory/batch {skus}` cho SKU của trang hiện tại → `available`, `inStock`.
- **Hành động chính:** chọn bộ lọc (chip bộ lọc đang áp dụng, xóa từng cái), đổi sắp xếp (`price,asc` / `price,desc`), thêm vào giỏ, mở chi tiết, mở chat AI (K09).
- **Trạng thái:** bình thường (danh mục MAINBOARD, lọc AM5 + DDR5) · rỗng (không sản phẩm khớp bộ lọc) · đang tải (skeleton) · kết quả tìm kiếm (`/products/search?q=rtx 4070`).
- **Mobile:** bộ lọc mở thành bottom sheet, nút "Lọc (3)" dính đáy.

#### K03. Chi tiết sản phẩm
- **Mục đích:** đủ thông tin để quyết định mua, thấy ngay thông số tương thích.
- **Vai trò:** public (viết review: user).
- **Dữ liệu:**
  - `GET /products/{sku}` → `name`, `sku`, `brandCode`, `categoryCode`, `shortDescription`, `description`, `price`, `originalPrice`, `images[]`, `specs`, `compat`, `tags`, `warrantyMonths`, `ratingAvg`, `ratingCount`.
  - Nhãn và đơn vị thông số: `GET /categories/{code}` → `specSchema[{key, label, group: specs|compat, type, unit, options}]`; nhóm `compat` hiện bằng chip khớp nối.
  - Tồn kho: `GET /inventory/{sku}` → `available`, `inStock`.
  - Review: `GET /reviews/stats?productId=` → `average`, `count`, `distribution{1..5}`; `GET /reviews?productId=` → `userDisplayName`, `rating`, `title`, `content`, `verifiedPurchase`, `helpfulCount`, `adminReply{content, repliedAt}`, `createdAt`.
  - Lịch sử giá: `GET /products/{sku}/price-history` → `oldPrice`, `newPrice`, `reason`, `changedAt` (biểu đồ bậc thang).
- **Hành động chính:** thêm vào giỏ (số lượng 1–99), thêm vào PC Builder, viết đánh giá.
- **Trạng thái:** bình thường (GPU-MSI-4070S-12G, đang giảm giá) · hết hàng (`inStock=false`, nút mua tắt, ghi "Hết hàng") · chưa có đánh giá.

#### K04. PC Builder
- **Mục đích:** ráp cấu hình theo slot, biết ngay chỗ không tương thích và tổng công suất.
- **Vai trò:** public (lưu cấu hình: user).
- **Dữ liệu:**
  - Slot: danh mục có `pcSlot` (CPU, MAINBOARD, RAM, GPU, STORAGE, PSU, CASE, COOLER). Mỗi slot: `name`, `sku`, `price`, ảnh, chip `compat`, số lượng (1–8).
  - Chọn linh kiện: modal danh sách lọc sẵn theo linh kiện đã chọn, vd chọn CPU AM5 thì mainboard mở với `socket=AM5`.
  - Kiểm tra: `POST /compatibility/check {skus}` → `compatible`, `issues[{ruleCode, severity, message}]`, `estimatedWattage`. So với `compat.wattage` của PSU.
  - Lưu: `POST /pc-builds {name, purpose, budget, items[{sku, quantity}], isPublic}` → `code`, `totalPrice`, `estimatedWattage`, `compatibilityResult`.
- **Hành động chính:** chọn/đổi/bỏ linh kiện từng slot, lưu cấu hình, chia sẻ link (`isPublic`), thêm cả cấu hình vào giỏ (`POST /cart/items/bulk`).
- **Trạng thái:** trống (chưa chọn gì) · hợp lệ (bộ mẫu i5-14600K + B760M + 32GB DDR5 + 4070S + RM750e) · có lỗi (i5-14600K + B650M: sai socket; 4080S + A500DN: thiếu công suất) · modal chọn linh kiện.
- **Mobile:** slot xếp thành danh sách, tổng tiền + công suất + nút "Thêm vào giỏ" dính đáy.

#### K05. Giỏ hàng
- **Mục đích:** xem lại, chỉnh số lượng, phát hiện món không mua được.
- **Vai trò:** public (khách vãng lai qua `X-Guest-Key`) và user.
- **Dữ liệu:** `GET /cart` → `items[{sku, quantity, name, slug, imageUrl, categoryCode, unitPrice, lineTotal, available, purchasable, message, warrantyMonths}]`, `totalQuantity`, `subtotal`, `warnings[]`.
- **Hành động chính:** đổi số lượng (`PUT /cart/items/{sku}`, 0 = xóa), xóa món, xóa hết, kiểm tra tương thích của giỏ, thanh toán (bắt đăng nhập; sau đăng nhập gọi `POST /cart/merge`).
- **Trạng thái:** bình thường · rỗng · có món không mua được (`purchasable=false` kèm `message`, ví dụ hết hàng).

#### K06. Thanh toán
- **Mục đích:** chọn địa chỉ, áp voucher, xem tổng tiền cuối trước khi đặt.
- **Vai trò:** user.
- **Dữ liệu:**
  - Địa chỉ: `GET /addresses` → `id`, `receiverName`, `receiverPhone`, `provinceName`, `wardName`, `addressDetail`, `isDefault`. Thêm nhanh: `GET /locations/provinces`, `GET /locations/provinces/{code}/wards`.
  - Voucher: `GET /vouchers` (gợi ý), `POST /vouchers/validate` → `valid`, `code`, `name`, `type`, `discountAmount`, `freeShipping`, `reason`.
  - Tổng: `POST /checkout/preview {voucherCode, addressId}` → `items[]`, `subtotal`, `discountAmount`, `shippingFee`, `totalAmount`, `voucher`, `address`, `warnings[]`, `canPlaceOrder`.
  - Thanh toán: COD (`paymentMethod=1`); VNPay vẽ ở trạng thái "sắp có".
- **Hành động chính:** chọn/thêm địa chỉ, áp/bỏ voucher, đặt hàng (nút tắt khi `canPlaceOrder=false`).
- **Trạng thái:** bình thường (voucher WELCOME10 đã áp) · voucher không hợp lệ (hiện `reason`) · chưa có địa chỉ · không đặt được (`warnings` hết hàng).
- **Ghi chú dữ liệu:** `POST /orders` thuộc Đợt 2 (Saga), mockup vẽ nút và màn "Đặt hàng thành công" theo dữ liệu `Order`.

#### K07. Đơn của tôi + timeline
- **Mục đích:** theo dõi đơn, hủy khi còn được hủy.
- **Vai trò:** user / owner.
- **Dữ liệu:**
  - Danh sách: `GET /orders/my` → `code`, `status`, `totalAmount`, `placedAt`, `paymentMethod`, `paymentStatus`.
  - Chi tiết: `GET /orders/{code}` → `order{receiverName, receiverPhone, shippingAddress, subtotalAmount, discountAmount, shippingFee, totalAmount, voucherCode, note, cancelReason}`,
    `items[{sku, productName, productImageUrl, unitPrice, quantity, lineTotal, warrantyMonths}]`.
  - Timeline: `GET /orders/{code}/timeline` → `fromStatus`, `toStatus`, `reason`, `createdAt`.
- **Hành động chính:** xem chi tiết, hủy đơn khi `status` 1/2 (modal nhập lý do, `POST /orders/{code}/cancel`), viết đánh giá cho món đã nhận.
- **Trạng thái:** danh sách · danh sách rỗng · chi tiết đang giao · chi tiết đã hủy (hiện `cancelReason`) · modal hủy đơn.
- **Ghi chú dữ liệu:** danh sách đơn không kèm sản phẩm, nên thẻ đơn chỉ có mã, ngày, trạng thái, tổng tiền (muốn có ảnh thì cần thêm API).

#### K08. Tài khoản (hồ sơ, sổ địa chỉ)
- **Mục đích:** quản lý thông tin cá nhân và địa chỉ giao hàng.
- **Vai trò:** user.
- **Dữ liệu:** `GET /me` → `username`, `email`, `roles`, `profile{displayName, email, phoneNumber, gender, birthDate, avatarFileId}`. Địa chỉ như K06.
  Cấu hình đã lưu: `GET /pc-builds/my` → `code`, `name`, `totalPrice`, `estimatedWattage`, `compatibilityResult.isCompatible`, `isPublic`.
- **Hành động chính:** sửa hồ sơ (`PUT /me`: `phoneNumber` dạng `0xxxxxxxxx`, `gender`, `birthDate`; tên/email đổi ở Keycloak), thêm/sửa/xóa địa chỉ, đặt mặc định, xóa nhiều cấu hình PC.
- **Trạng thái:** hồ sơ · sổ địa chỉ (có địa chỉ mặc định) · sổ địa chỉ rỗng · form địa chỉ có lỗi (số điện thoại sai).

#### K09. Widget chat AI
- **Mục đích:** tư vấn bằng ngôn ngữ tự nhiên, gợi ý sản phẩm thật với giá/tồn kho thật.
- **Vai trò:** public. Mở dạng panel bên phải trên K02 (mobile: toàn màn hình).
- **Dữ liệu:** `POST /ai/chat {sessionId, message}` → `sessionId`, `answer` (văn bản). Thẻ gợi ý: frontend tìm mã SKU trong `answer`
  rồi gọi `POST /products/batch` (`sku`, `name`, `price`, `imageUrl`) + `POST /inventory/batch` để vẽ thẻ có giá và tồn kho **lấy trực tiếp từ API**, không từ câu trả lời.
- **Hành động chính:** gửi câu hỏi, bấm câu hỏi gợi ý, mở sản phẩm, thêm vào giỏ / vào PC Builder từ thẻ gợi ý.
- **Trạng thái:** chào (câu hỏi gợi ý) · đang trả lời · câu trả lời kèm 2–3 thẻ sản phẩm · lỗi (AI tạm không phản hồi).
- **Ghi chú dữ liệu:** API hiện chỉ trả văn bản, chưa stream (SSE là việc số 4 trong CLAUDE.md) và chưa có danh sách sản phẩm có cấu trúc. Xem câu hỏi Q3.

### 2.2 Giao diện admin (desktop 1440×900)

Khung chung: sidebar theo quyền (STAFF thấy Đơn hàng, Tồn kho, Review; ADMIN thấy thêm Sản phẩm, Voucher, Người dùng, Dashboard; mục cần `perm:x` thì ẩn khi thiếu quyền), header có tên user và role.

#### A01. Dashboard thống kê
- **Mục đích:** nhìn nhanh doanh thu, đơn, hàng sắp hết.
- **Vai trò:** ADMIN (sắp hết hàng: STAFF).
- **Dữ liệu:** `GET /admin/stats/overview?from=&to=` → `totalOrders`, `revenue`, `grossRevenue`, `ordersByStatus{1..8}`;
  `GET /admin/stats/top-products?from=&to=&limit=10` → `sku`, `productName`, `quantity`, `revenue`;
  `GET /admin/stats/low-stock` → `sku`, `warehouseId`, `quantity`, `reservedQuantity`, `minQuantity`.
- **Hành động chính:** đổi khoảng ngày, mở đơn theo trạng thái, mở tồn kho sắp hết.
- **Trạng thái:** bình thường (tháng 10/2026) · khoảng ngày không có đơn.
- **Ghi chú dữ liệu:** chưa có doanh thu theo ngày nên không vẽ biểu đồ đường; dùng cột ngang "đơn theo trạng thái" và bảng top sản phẩm.

#### A02. Quản lý sản phẩm
- **Mục đích:** tìm, lọc, thao tác hàng loạt trên sản phẩm.
- **Vai trò:** `perm:product:write`.
- **Dữ liệu:** `GET /admin/products?status=&category=&q=&page=&size=` → ảnh, `sku`, `name`, `categoryCode`, `brandCode`, `price`, `originalPrice`, `status`, `updatedAt`, `updatedBy`.
- **Hành động chính:** tạo, sửa, chọn nhiều dòng → đổi trạng thái (`PATCH /admin/products/bulk/status`) / đổi giá (`PATCH /admin/products/bulk/price` + lý do), import/export Excel.
- **Trạng thái:** bình thường · đang chọn nhiều dòng (thanh thao tác hàng loạt) · lỗi hàng loạt 400 (`data[{id, reason}]` đánh dấu từng dòng) · rỗng theo bộ lọc.

#### A03. Form sản phẩm
- **Mục đích:** tạo/sửa sản phẩm, ô thông số đổi theo danh mục.
- **Vai trò:** `perm:product:write`.
- **Dữ liệu:** `sku` (A-Z, 0-9, -; khóa khi sửa), `name`, `slug`, `categoryCode`, `brandCode`, `shortDescription`, `description`, `price`, `originalPrice`, `images[{fileId, url, isPrimary}]` (upload `POST /media/upload`, bucket `products`), `tags`, `warrantyMonths`, `status` (khi tạo: 1 Nháp / 2 Đang bán).
  Ô thông số sinh từ `specSchema` của danh mục: `label`, `unit`, `type`, `required`, `options` (dropdown), chia 2 nhóm "Thông số" (`specs`) và "Tương thích" (`compat`).
  Khi sửa: đổi giá qua modal riêng (`PATCH .../price {price, originalPrice, reason}`), đổi trạng thái riêng, khung lịch sử giá.
- **Hành động chính:** lưu, đổi danh mục (ô thông số đổi theo), đổi giá, đổi trạng thái.
- **Trạng thái:** tạo CPU (ô socket, memory_types, tdp_w…) · sửa GPU (ô length_mm, tdp_w, recommended_psu_w) · lỗi kiểm tra (SKU sai định dạng, giá gốc < giá bán) · danh mục chưa có `specSchema` (thông báo, chỉ còn trường chung).

#### A04. Import Excel 3 bước
- **Mục đích:** nhập nhiều sản phẩm (hoặc phiếu nhập kho) từ file, sửa lỗi theo dòng trước khi ghi.
- **Vai trò:** `perm:product:write` (sản phẩm), `perm:inventory:write` (nhập kho).
- **Dữ liệu:**
  1. **Tải mẫu:** chọn danh mục + chế độ `CREATE_ONLY` / `UPSERT`, tải `GET /admin/products/import/template?category=`, chọn file.
  2. **Kết quả kiểm tra:** `POST .../import/validate` → `import_id`, `total_rows`, `valid_rows`, `invalid_rows`, `errors[{row, messages[]}]`, `preview[]`; tải `.../{importId}/result-file` (cột Lỗi tô đỏ).
  3. **Kết quả import:** `POST .../import {importId}` → `created`, `updated`, `failed`.
  Nhập kho dùng cùng 3 bước dưới `/admin/inventory/import/excel/...`, bước 1 thêm ô `referenceCode` (số phiếu, bắt buộc, ≤ 50 ký tự); "tất cả hoặc không".
- **Hành động chính:** tải mẫu, tải lên, tải file kết quả, xác nhận import, làm lại.
- **Trạng thái:** bước 1 · bước 2 có lỗi theo dòng (fixture `products-cpu-invalid.xlsx`: 1 hợp lệ, 4 lỗi) · bước 2 toàn bộ hợp lệ · lỗi cả file 400 (sai mẫu, > 5 MB, > 1000 dòng) · bước 3 thành công · phiên hết hạn (404, `importId` quá 1 giờ).

#### A05. Tồn kho + phiếu nhập
- **Mục đích:** xem tồn theo kho, nhập kho, xem biến động.
- **Vai trò:** STAFF (nhập/điều chỉnh: `perm:inventory:write`; thêm/sửa kho: ADMIN).
- **Dữ liệu:** `GET /warehouses` → `id`, `code`, `name`, `address`, `isActive`; `GET /admin/inventory?warehouseId=&lowStock=` → `sku`, `warehouseId`, `quantity`, `reservedQuantity`, `minQuantity` (còn bán = `quantity - reservedQuantity`);
  `GET /admin/inventory/movements?sku=&from=&to=` → `type`, `quantity`, `quantityAfter`, `referenceType`, `referenceCode`, `note`, `createdBy`, `createdAt`.
  Phiếu nhập: `POST /admin/inventory/import {warehouseId, referenceCode, note, lines[{sku, quantity}]}`. Điều chỉnh: `PUT /inventory/{sku}/adjust?warehouseId=&delta=`.
- **Hành động chính:** lọc theo kho / sắp hết, tạo phiếu nhập (form nhiều dòng), nhập từ Excel (A04), xuất Excel, điều chỉnh tồn, quản lý kho.
- **Trạng thái:** bảng tồn kho · lọc sắp hết hàng · form phiếu nhập · lịch sử biến động của một SKU.
- **Ghi chú dữ liệu:** dòng tồn kho không có tên sản phẩm, frontend ghép bằng `POST /products/batch`.

#### A06. Đơn hàng + đổi trạng thái
- **Mục đích:** xử lý đơn theo luồng trạng thái.
- **Vai trò:** STAFF (đổi trạng thái: `perm:order:update-status`).
- **Dữ liệu:** `GET /admin/orders?status=&from=&to=&q=&page=&size=` → `code`, `receiverName`, `receiverPhone`, `totalAmount`, `status`, `paymentMethod`, `paymentStatus`, `placedAt`;
  `GET /admin/orders/{code}` → `order` + `items[]`; timeline như K07.
- **Hành động chính:** đổi trạng thái (chỉ hiện bước hợp lệ; 7 Hủy / 8 Trả hàng bắt buộc lý do), đổi trạng thái nhiều đơn, xuất Excel.
- **Trạng thái:** danh sách (lọc theo trạng thái) · chi tiết + timeline · modal đổi trạng thái có lý do · lỗi hàng loạt 400.

#### A07. Duyệt review
- **Mục đích:** duyệt/từ chối/trả lời đánh giá.
- **Vai trò:** STAFF.
- **Dữ liệu:** `GET /admin/reviews?status=1&page=&size=` → `sku`, `userDisplayName`, `rating`, `title`, `content`, `verifiedPurchase`, `orderCode`, `status`, `adminReply`, `createdAt`.
- **Hành động chính:** duyệt, từ chối, trả lời (≤ 2000 ký tự), duyệt/từ chối nhiều.
- **Trạng thái:** hàng chờ duyệt · đã chọn một review (khung trả lời) · hàng chờ rỗng.

#### A08. Voucher
- **Mục đích:** tạo và quản lý mã giảm giá.
- **Vai trò:** ADMIN.
- **Dữ liệu:** `GET /admin/vouchers` → `code`, `name`, `type`, `value`, `maxDiscountAmount`, `minOrderAmount`, `applicableCategories[]`, `usageLimit`, `usedCount`, `perUserLimit`, `startAt`, `endAt`, `isActive`, `version`.
- **Hành động chính:** tạo, sửa (gửi kèm `version`), bật/tắt, bật/tắt nhiều.
- **Trạng thái:** danh sách (thanh tiến độ `usedCount/usageLimit`) · form tạo/sửa · xung đột 409 (người khác vừa sửa, tải lại).

#### A09. Người dùng & phân quyền
- **Mục đích:** quản lý tài khoản, tạo nhân viên, gán quyền.
- **Vai trò:** ADMIN.
- **Dữ liệu:** `GET /admin/users?keyword=&page=&size=` → `id`, `username`, `email`, `fullName`, `active`, `phoneNumber`;
  `GET /admin/users/{id}` → `firstName`, `lastName`, `emailVerified`, `createdTimestamp`, `profile`, `realmRoles[]`, `permissions[]`.
  Ma trận quyền: realm role CUSTOMER / STAFF / ADMIN; permission `product:write`, `order:update-status`, `inventory:write`, `knowledge:write`.
- **Hành động chính:** khóa/mở khóa, tạo nhân viên (`username`, `email`, `firstName`, `lastName`, `password`, `temporaryPassword`, `realmRoles`, `permissions`), đặt lại role/permission.
- **Trạng thái:** danh sách · chi tiết + ma trận quyền · form tạo nhân viên · xác nhận khóa tài khoản.

### 2.3 Số lượng ảnh dự kiến

| | Màn | Trạng thái | Ảnh desktop | Ảnh mobile |
|---|---|---|---|---|
| Khách | 9 | 32 | 32 | 32 |
| Admin | 9 | 34 | 34 | 0 |
| **Tổng** | **18** | **66** | **66** | **32** → **98 ảnh** |

Nếu nhiều quá cho vòng đầu: vòng 1 chỉ vẽ trạng thái "bình thường" (18 desktop + 9 mobile = 27 ảnh), vòng 2 vẽ các trạng thái còn lại.

### 2.4 Câu hỏi cần nhóm quyết định

- **Q1. Màn chưa có trong danh sách**, có làm mockup không: Đăng nhập/đăng ký (đang dùng trang Keycloak, muốn đồng bộ giao diện thì phải làm theme Keycloak) ·
  Thông báo (dropdown chuông) · Admin danh mục, thương hiệu, luật tương thích (có API, dùng lại mẫu bảng A02) · Admin kho tri thức RAG (plan mục 2, có `POST /ai/knowledge`, `sync-products`) · Đặt hàng thành công.
- **Q2. Mockup vẽ theo API hiện tại hay theo API mong muốn?** Các chỗ API còn thiếu: "bán chạy" công khai (K01), ảnh sản phẩm trong danh sách đơn (K07), tên sản phẩm trong tồn kho (A05, ghép được), doanh thu theo ngày (A01).
  Đề xuất: vẽ theo API hiện tại, ghi chú ngay trên mockup chỗ cần API mới.
- **Q3. Thẻ sản phẩm trong chat AI:** (a) frontend tìm SKU trong `answer` rồi gọi batch (làm được ngay) hay (b) đổi `ChatResponse` trả thêm `products[{sku}]` từ tool calling (sạch hơn, cần sửa ai-service). Đề xuất (b) khi làm việc số 4.
- **Q4. Chế độ tối:** phương án A có cần bản tối cho khách không? Đề xuất: chưa làm ở vòng mockup.

---

## 3. Kích thước chụp

| Khu vực | Viewport | Ghi chú |
|---|---|---|
| Mọi màn hình | Desktop **1440×900** | chụp đúng khung nhìn (above the fold); trang dài chụp thêm bản cả trang hậu tố `--full` |
| Màn hình khách (K01–K09) | Mobile **390×844** | cùng quy tắc |

Chụp với `deviceScaleFactor: 2` để ảnh nét khi đưa vào báo cáo (file PNG thực tế 2880×1800 / 780×1688, tỉ lệ hiển thị vẫn đúng 1440×900 / 390×844).

---

## 4. Cấu trúc thư mục mockup và cách chụp

> **Đã đổi (2026-10-27):** mockup làm bằng Vite + React + TS + Tailwind ở `design/mockups/` (token trong `src/styles.css`,
> dữ liệu giả từ seed trong `src/data/seed.ts`, font qua `@fontsource`), chụp bằng `npm run screenshots` trong thư mục đó.
> Ảnh vẫn lưu ở `docs/ui/screenshots/` theo quy ước tên bên dưới. Cấu trúc HTML tĩnh dưới đây là phương án ban đầu.

```
docs/ui/
├── design-brief.md                  # tài liệu này
├── mockups/                         # HTML tĩnh, mở trực tiếp bằng trình duyệt
│   ├── assets/
│   │   ├── tokens.css               # token mục 1.3 (nguồn duy nhất về màu/font/spacing)
│   │   ├── components.css           # nút, nhãn trạng thái, chip khớp nối, bảng, thẻ
│   │   ├── icons/                   # SVG Lucide dùng trong mockup
│   │   └── img/                     # ảnh sản phẩm giữ chỗ
│   ├── data/                        # JSON response thật, chụp từ API local (xem bước 1)
│   │   ├── categories.json
│   │   ├── products-mainboard-am5.json
│   │   └── …
│   ├── customer/
│   │   ├── k01-home.html
│   │   ├── k02-products.html
│   │   └── …                        # k03 … k09
│   ├── admin/
│   │   ├── a01-dashboard.html
│   │   └── …                        # a02 … a09
│   ├── screens.json                 # danh sách màn × trạng thái × viewport để script chụp
│   └── capture.mjs                  # script Playwright
└── screenshots/
    ├── desktop/
    │   ├── k02-products.png
    │   ├── k02-products--empty.png
    │   └── a04-import--step2-errors.png
    └── mobile/
        └── k04-pc-builder--errors.png
```

- **Tên file:** `<mã màn>-<tên>[--<trạng thái>].png`, mã màn theo mục 2 (K01…, A01…).
- **Trạng thái trong một file HTML:** chọn bằng query `?state=empty`; mỗi file có một đoạn JS nhỏ bật/tắt khối theo `state`, nên không phải nhân bản HTML.
- **Dữ liệu thật:** mockup đọc từ `data/*.json`, là response thật của API local (đúng tên trường, đúng dữ liệu seed), không tự bịa sản phẩm.

### Cách chụp

1. **Lấy dữ liệu** (chạy hạ tầng + service profile `local` như README): gọi các API ở mục 2 qua gateway `:8000` và lưu phần `data` vào `docs/ui/mockups/data/`.
   Sẽ viết sẵn lệnh lấy dữ liệu trong `capture.mjs --fetch` (lấy token bằng tài khoản test giống collection Postman).
2. **Cài Playwright một lần:** `npm i -D playwright@1.48.2` trong `docs/ui/mockups/` rồi `npx playwright install chromium`.
3. **Chụp:** `node docs/ui/mockups/capture.mjs` → đọc `screens.json`, mở từng `file://…html?state=…`, chờ `document.fonts.ready`
   (font Google tải xong mới chụp để dấu tiếng Việt đúng), chụp theo viewport, ghi vào `docs/ui/screenshots/`.
   Chụp một màn: `node capture.mjs k04` · chỉ desktop: `--desktop`.
4. **Kiểm tra trước khi giao:** tương phản ≥ 4.5:1, không cuộn ngang ở 390px, vùng chạm ≥ 44px ở mobile, focus nhìn thấy được,
   chữ tiếng Việt không bị cắt dấu ở tiêu đề (line-height ≥ 1.25).
