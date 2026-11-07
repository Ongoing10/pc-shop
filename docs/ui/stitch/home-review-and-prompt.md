# Đánh giá `home.html` (Stitch) và prompt sửa lại

Đối tượng: [home.html](home.html), bản Stitch sinh ra cho K01 Trang chủ.
Đối chiếu với: [design-brief.md](../design-brief.md) (phương án A "Datasheet"), [frontend-context.md](../frontend-context.md), dữ liệu seed trong [seed.ts](../../../design/mockups/src/data/seed.ts).

Cách đánh giá: đọc toàn bộ 2.520 dòng mã, đối chiếu từng chỗ với brief và dữ liệu thật, chạy `detect.mjs` của Impeccable (1 phát hiện).
Chưa chụp màn hình thật của file này nên mọi nhận xét về bố cục dựa trên mã. Chạy ở chế độ một ngữ cảnh (không tách hai tác tử độc lập).

---

## 1. Điểm tổng quát

| # | Tiêu chí (Nielsen) | Điểm | Vấn đề chính |
|---|---|---|---|
| 1 | Trạng thái hệ thống | 3 | Có toast, tổng tiền cập nhật, banner tương thích. Thiếu trạng thái tải, rỗng, lỗi; menu không đánh dấu mục đang mở |
| 2 | Hợp ngôn ngữ người dùng | 2 | Trộn Anh-Việt trong tiêu đề ("Hardware Compatibility Engine", "Peak Watts", "Power Headroom", "ERP Đồng bộ") |
| 3 | Kiểm soát, tự do | 2 | Modal không đóng bằng Esc; "Mua Ngay" bỏ qua giỏ mà không báo trước |
| 4 | Nhất quán | 2 | Cùng một xanh dương cho thương hiệu, giá, nút mua, link; badge lúc là số lượng lúc là quảng cáo; tồn kho khi xanh lá khi xanh dương |
| 5 | Ngăn lỗi | 3 | Danh sách mainboard tự lọc theo socket CPU: đây là điểm hay nhất của trang |
| 6 | Nhận diện thay vì nhớ | 3 | Menu có chữ, nhưng chuông, giỏ, nút đóng modal chỉ có icon, không có nhãn truy cập |
| 7 | Linh hoạt, hiệu quả | 2 | Không có bộ lọc nhanh, không phím tắt, focus ring bị tắt ở ô chọn |
| 8 | Tối giản | **1** | Cùng một lời hứa lặp 5-7 lần, nút vào PC Builder lặp 6 lần, header 3 tầng |
| 9 | Phục hồi lỗi | 2 | Không vẽ trạng thái lỗi nào, kể cả cảnh báo tương thích (giá trị cốt lõi của shop) |
| 10 | Trợ giúp | 3 | Có chat AI, bảng tra socket, mục hướng dẫn ở footer |
| | **Tổng** | **23/40** | Chấp nhận được, cần sửa đáng kể |

**Nhận xét tính riêng biệt:** hai chỗ thuộc về shop này: mini builder lọc mainboard theo socket, và dòng "Chiều dài 272 mm" trên thẻ card đồ họa.
Phần còn lại (băng hứa hẹn, 8 thẻ danh mục giống nhau, thương hiệu dạng chữ, footer 4 cột) đổi sang shop điện máy nào cũng dùng được.
Chip khớp nối và đường nối bus, thứ brief chốt làm điểm nhấn riêng (mục 1.7), **hoàn toàn vắng mặt**.

---

## 2. Việc cần sửa

### P0: chặn việc dùng được

| Chỗ | Chi tiết | Cách sửa |
|---|---|---|
| Header không dùng được trên điện thoại | Header cố định 176px (20% màn 900px), logo + ô tìm kiếm + nút Builder + chuông + giỏ + tài khoản xếp một hàng, không có nút menu. Dải tiện ích 3 lời hứa cũng không ẩn. Ở 390px sẽ tràn | Header 2 tầng (~108px). Mobile: logo, biểu tượng tìm kiếm, giỏ, nút menu; ô tìm kiếm mở riêng |
| Ảnh sản phẩm không có `alt` | Cả 4 ảnh card đồ họa dùng `data-alt`, không có `alt` | Đổi thành `alt` thật (tên sản phẩm) |
| Thanh cuộn bị ẩn toàn trang | `::-webkit-scrollbar { display: none }` làm thanh menu 10 mục cuộn ngang mà không thấy dấu hiệu còn mục bị che | Bỏ quy tắc, hoặc bọc menu bằng mờ dần hai đầu |

### P1: lệch brief hoặc sai nội dung

1. **Sai phương án phong cách.** Brief chốt: Be Vietnam Pro, cobalt `#1D4ED8` cho thương hiệu, **cam `#C2410C` cho giá và nút mua**, nền `#F3F5F8`, mực `#0F1B2D`.
   Bản này dùng Inter (detector cũng báo "overused font"), xanh `#0057C2` cho mọi thứ, nền xám trung tính `#F9F9F9`, và xanh lá làm màu phụ.
   Hệ quả: nút "Tìm kiếm", "Xây dựng cấu hình PC", "Mua Ngay", chuông, giỏ, nút chat đều cùng một xanh, không có nút nào nổi lên là hành động chính. Giá cũng xanh nên không phân biệt được với link.
2. **Xanh lá bị dùng sai nghĩa.** Brief dành xanh lá chỉ cho "tương thích OK". Bản này dùng xanh lá cho huy hiệu "120+ mẫu sẵn kho", "Khuyến mại sâu", chấm "đang trực tuyến", nhãn tồn kho. Khách sẽ không biết xanh lá nghĩa là gì.
3. **Thông tin bịa, trái với những gì backend làm được.** Đây là đồ án; trang này nói như một doanh nghiệp thật:
   - "Hotline 1800 6868", "12 showroom", địa chỉ 45 Thái Hà / 242 Bùi Thị Xuân, "Giấy phép ĐKKD số 0108927482", "© 2025 PC Shop Vietnam JSC": số ĐKKD và địa chỉ giả trên sản phẩm có thể bị đọc nhầm là thật.
   - "Compatibility Engine v4.2", "hơn 12.500 linh kiện", "2.418 người đang dựng cấu hình", "ERP Đồng bộ", "Cam kết 0% lỗi", "tương thích 100%": backend có 8 danh mục, vài chục sản phẩm seed, không có ERP, không có bộ đếm người dùng.
   - "Trả góp 0%", "VNPAY / Momo", "Bảo hành tại nhà", "Đổi mới 30 ngày", "Giao hỏa tốc 2 giờ", "thu cũ đổi mới": **chưa có tính năng nào**. Thanh toán hiện chỉ COD, VNPay là "sắp có", `POST /orders` chưa tồn tại. Chip chat "Kiểm tra trả góp 0%" hứa một việc AI không làm được.
   - "Cam kết 100%" là lời hứa pháp lý. Rule engine tất định chỉ bảo đảm trên **các luật đã có** (socket, RAM, công suất, chiều dài card, form factor mainboard).
   - Tên sản phẩm (i5-13400F, RTX 4060, RX 7700 XT) không có trong seed (`CPU-I5-14600K`, `MB-ASUS-B760M-D5`, `GPU-MSI-4070S-12G`, …), nên mockup không khớp API khi ghép vào frontend thật.
4. **Điểm nhấn riêng của brief vắng mặt.** Không có chip khớp nối, không có đường nối trong builder, không có đồng hồ công suất. Mini builder chỉ hiện banner xanh lá chung chung "Đã nhận diện Socket LGA1700".
5. **Chữ.** Có chữ 10px và 11px ở nhãn, thẻ, chú thích (brief: không dưới 12px); nút thẻ sản phẩm cao 36px với chữ 12px (brief: vùng chạm 44px ở mobile).
   Tiêu đề viết hoa mỗi chữ cái ("Xây Dựng Cấu Hình PC Chuẩn Xác 100% Không Lo Lỗi…"), trái với brief (viết hoa kiểu câu), và dùng đúng thủ pháp brief cấm: **tô màu riêng một cụm** ("Chuẩn Xác 100%").
   Có nhãn viết hoa tracking rộng phía trên 3 tiêu đề (brief cấm). H1 38px, brief đặt 48px.
6. **Tương phản.** `text-outline` (`#727786`) dùng cho mọi chú thích 12px: 4,48:1 trên trắng và khoảng 4,0:1 trên `#F3F3F3`, dưới ngưỡng AA 4,5:1.
   Dòng "Kho 45 Thái Hà sẵn sàng…" trong khung chat dùng `#C1C6D7` trên nền xanh nhạt, khoảng 1,7:1: gần như không đọc được. Thương hiệu dạng chữ còn thêm `opacity-75`.
7. **Bo góc và bóng không theo cấp.** Cấu hình Tailwind ghi đè `rounded-full` thành 12px (nên avatar, huy hiệu số, nút chat nổi không tròn), còn `rounded-2xl` không khai báo nên rơi về 16px mặc định.
   Mọi thẻ đều `shadow-sm` mà không có viền trên nền xám gần như cùng độ sáng: các khối gần như chìm vào nhau. Brief: bo 3 cấp (6/10/14), thẻ phẳng có viền, bóng chỉ cho lớp nổi.
8. **Ảnh sản phẩm bị cắt.** `object-cover` trong khung 192px cắt mất cạnh card đồ họa. Dùng `object-contain` trên nền trắng.

### P2: bố cục và nhịp trang

1. **Lặp.** "Tương thích 100%" xuất hiện ở dải tiện ích, nhãn hero, thẻ hero, banner mini builder, khối kỹ thuật thứ nhất, footer. "Bảo hành chính hãng" ở dải tiện ích, dải thương hiệu, footer. Lối vào PC Builder: nút header, 2 nút hero, nút trong mini builder, nút khối kỹ thuật, nút modal.
   Mỗi lời hứa chỉ nên có một chỗ, đặt đúng nơi nó chứng minh được.
2. **Tám danh mục xuất hiện hai lần** (thanh menu + 8 thẻ giống hệt nhau) cộng thêm "Cấu hình đề xuất" không có API nào. 8 thẻ cùng kích thước, cùng bo góc, cùng bóng, mỗi thẻ có icon + nhãn + mô tả + chân thẻ: đúng mẫu "bộ thẻ SaaS" mà brief muốn tránh. Biểu tượng cũng sai nghĩa: RAM dùng `straighten` (cái thước).
3. **Hero quá tải.** Cột trái có 1 nhãn, 1 tiêu đề 4 dòng, 1 đoạn mô tả, 3 thẻ cam kết, 2 nút, 1 bộ đếm. Mini builder bên phải mới là hero thật (đúng brief) nhưng bị chia sức nặng.
4. **Nhịp trang đều.** Mọi mục cùng `py-8` (32px), brief chốt 48 đến 64px giữa các khối.
5. **Thẻ sản phẩm** xếp 5 tầng (ảnh, 2 hàng nhãn, tên, hộp thông số 3 dòng, giá, 2 nút) trong khi thiếu thứ khách cần: số sao, bảo hành, và đơn vị tồn kho đồng nhất.
   "Mua Ngay" cạnh "Vào PC Builder": thiếu "Thêm vào giỏ", là hành động đúng với giỏ hàng hiện có.
6. **Hai khối kỹ thuật cuối trang** là hai khối chữ dài nằm sau ~1.900px cuộn. Báo cáo "Live check" là thứ đặc trưng nhất của shop nhưng bốn dòng đều xanh lá, không cho thấy khi lỗi trông ra sao. Khung chat mẫu khuyên chọn CPU nhưng không có thẻ sản phẩm kèm giá và tồn kho từ hệ thống (K09 yêu cầu).
7. **Footer:** các mục là `<li>` có `cursor-pointer`, không phải liên kết, bàn phím không tới được.

### P3: làm mượt

- Nút chat nổi có `animate-ping` chạy mãi và chấm `animate-pulse`: chuyển động tự chạy không phục vụ thông tin, không có `prefers-reduced-motion`.
- Modal thiếu `role="dialog"`, `aria-modal`, bẫy focus, đóng bằng Esc; các lớp `animate-in fade-in zoom-in-95` không tồn tại trong Tailwind CDN nên không có hiệu ứng nào. Toast thiếu `role="status"`.
- Radio và ô chọn bị `focus:ring-0`: mất vòng focus.
- `main` đệm trên 176px nhưng header thực chỉ ~160px, dư 16px trống.
- Tên người dùng, huy hiệu "VIP" và chuông "3" làm trang chủ trông như đã đăng nhập; trang công khai nên mặc định là khách ("Đăng nhập"). Không có khái niệm VIP trong dữ liệu.
- `cdn.tailwindcss.com` và token kiểu Material (`on-surface-variant`, `surface-container-low`…) không khớp token trong brief: khi chuyển sang Next.js phải đổi tên toàn bộ.

### Điểm tốt nên giữ

- Mini builder chọn CPU rồi tự lọc mainboard cùng socket, tổng tạm tính đúng (4.990.000 + 4.450.000 = 9.440.000).
- Dòng thông số dạng datasheet trên thẻ card đồ họa (chiều dài mm, cổng, bộ nhớ) và "Nguồn khuyên dùng".
- Giá, giá gạch, mức giảm tính đúng; định dạng `29.990.000 ₫` đúng quy ước.
- Toàn bộ chữ tiếng Việt, có cấu trúc rõ.

---

## 3. Prompt cho Stitch (không áp phong cách, để AI tự chọn)

Khác bản trước: prompt **không ghi màu, font, bo góc hay điểm nhấn**. Chỉ giữ ba thứ: sự thật sản phẩm (shop làm gì, dữ liệu thật), việc khách cần làm, và những điều cấm (bịa thông tin, lỗi truy cập).
Mỗi công cụ tự chọn hướng thị giác, nên kết quả sẽ khác nhau. Prompt buộc AI nêu hướng đã chọn trước khi vẽ, để bạn so sánh và loại bản nào rơi vào mẫu "web bán điện máy" chung chung.
Cách dùng: dán **Prompt chính**, chọn Desktop. Muốn nhiều phương án thì chạy lại 2 đến 3 lần. Sau đó dùng **prompt tinh chỉnh** ở mục 4.

### Prompt chính (Desktop 1440 px)

```
Design the home page of "PC Shop", a Vietnamese online store selling PC components
(CPU, mainboard, RAM, graphics card, storage, power supply, case, cooler).

WHAT MAKES THIS SHOP DIFFERENT (the design should make these two things obvious)
1. A rule engine checks, with a fixed answer every time, whether chosen parts fit together:
   CPU socket vs mainboard, RAM type vs mainboard, graphics card length vs case,
   power supply wattage vs estimated load.
2. An AI assistant answers questions and shows REAL price and stock pulled from the system.
Customers are students, gamers and first-time PC builders (18-35). Their two worries:
"will these parts actually fit together?" and "is the price and stock correct?".

STEP 0, BEFORE DRAWING
In two or three sentences, state the visual direction you chose for this brand and why it
fits PC hardware buyers: mood, colour logic, type personality, how it feels different from a
generic electronics store. Pick a direction with a clear point of view; do not default to
"blue and white tech store" or to the look you would give any e-commerce site. Then apply it
consistently. You choose palette, fonts, shapes, density, imagery and motion.

OPENING SCREEN: A FULL-VIEWPORT HERO STAGE THAT ADVANCES BY ITSELF
The first thing a visitor sees is a hero that fills the entire first screen (100% of the
viewport height and width, like a landing page), with the header sitting on top of it.
THE HERO IS PRODUCT-LED. Big product photography is the main thing on screen, taking at least
half of the viewport. Text is minimal: per scene one headline of at most 6 words, one support
line of at most 12 words, the product name, its price, at most 2 key specs, and ONE button.
No paragraphs, no bullet lists, no badges, no feature grids, no chat windows and no form
controls inside the hero. Think of a product launch page, not an explainer.
The stage is a sequence of 4 scenes. Each scene features one product or one bundle as a
full-screen composition (not a small card in a corner). Photos are clean studio shots, large,
uncropped, with generous space around them, and may overlap the layout or break out of frames.
(Real photos are not available yet, so create convincing placeholder product imagery.)
The stage moves to the next scene automatically about every 7 seconds with a transition you
choose (slide, fade, zoom, wipe) that fits your visual direction.
Scenes, in order:
  1. Hero product: graphics card "MSI GeForce RTX 4070 SUPER 12GB Ventus 2X", 16.990.000 ₫
     (old price 17.200.000 ₫). Specs: "12 GB GDDR6X", "dài 242 mm". Button "Xem sản phẩm".
  2. Ready-made build: a complete PC from Intel Core i5-14600K, ASUS TUF B760M-PLUS WIFI DDR5,
     Kingston Fury Beast 32GB DDR5, MSI RTX 4070 SUPER and Corsair RM750e. Show the parts together
     as one product with the bundle price and a small mark "Đã kiểm tra tương thích".
     Button "Mở trong PC Builder".
  3. Processor: "Intel Core i5-14600K", 7.990.000 ₫, specs "socket LGA1700", "14 nhân".
     Button "Xem sản phẩm".
  4. Memory or storage: "Kingston Fury Beast 32GB (2x16GB) DDR5 6000", 2.790.000 ₫.
     Button "Xem sản phẩm".
  The scenes are ordered by importance. The shop's two differences (fit check, AI assistant)
  appear only as one small line or mark in the hero, and get their full sections below it.
Controls the stage must show: a progress indicator per scene (the current one fills over time),
previous and next arrows, a pause/play button, and a scroll cue pointing to the rest of the
page below. Auto-advance must stop while the visitor hovers or focuses anything inside the
stage, and must stop for good after the visitor clicks any control in it. Show a paused state. With reduced-motion enabled, scenes do not advance on their own.
The page itself never scrolls by itself: only the stage changes scenes. Below the stage the
page scrolls normally and continues with the remaining content, in this order: the
interactive mini PC Builder, the 8 categories, a shelf of graphics cards, the compatibility
explanation, the AI assistant section, the footer. Do not repeat in the lower page the exact
products a hero scene already showed in full.

CONTENT AND FUNCTION TO COVER (you choose layout, order and emphasis)
- Header: logo, search (by name, part code or socket), link to the PC Builder tool, notifications,
  cart with item count, sign-in for a guest visitor, and navigation for exactly these 8 categories:
  Bộ vi xử lý, Bo mạch chủ, RAM, Card đồ họa, Ổ cứng, Nguồn, Vỏ case, Tản nhiệt.
  It must stay readable over every scene.
- Interactive PC Builder section, the first block under the hero (NOT inside the hero).
  The visitor picks a CPU and the page
  immediately lists only mainboards with the same socket, with price, stock and a clear
  "fits / does not fit" result, plus a running subtotal and a button to continue in the full
  PC Builder. Sample data: CPU "Intel Core i5-14600K" 7.990.000 ₫ (socket LGA1700);
  mainboards "ASUS TUF B760M-PLUS WIFI DDR5" 4.290.000 ₫ (LGA1700, DDR5, mATX) and
  "MSI PRO B760-P DDR4" 3.590.000 ₫ (LGA1700, DDR4, ATX). Also show what happens when the
  choice is wrong: Ryzen 5 7600X (AM5) with an LGA1700 mainboard gives the error
  "CPU dùng socket AM5, không khớp bo mạch chủ LGA1700".
- Category entry points to the 8 categories (do not repeat the same long list twice).
- A shelf of 4 graphics cards. Each product shows: photo, name, key compatibility specs with
  units (length in mm, power draw in W, recommended power supply in W), star rating if any,
  stock status, price, old price only if discounted, and two actions: "Thêm vào giỏ" and
  add to PC Builder. Products: "MSI GeForce RTX 4070 SUPER 12GB Ventus 2X" 16.990.000 ₫
  (old price 17.200.000 ₫, 242 mm, 220 W, PSU 650 W); "ASUS TUF Gaming GeForce RTX 4080 SUPER 16GB"
  32.990.000 ₫ (348 mm, 320 W, PSU 850 W); plus two more with plausible names and prices.
- An explanation of the compatibility check that SHOWS it working instead of describing it:
  a sample result with several passing checks and one failing check
  ("Card đồ họa dài 348 mm, vỏ case chỉ chứa tối đa 330 mm") and an estimated power meter
  ("Công suất ước tính 345 W / nguồn 750 W").
- An AI assistant section with a sample conversation. The assistant's reply contains a product
  card with part code, name, price, stock and "Thêm vào giỏ". A caption says price and stock come
  straight from the system. Three suggested questions the visitor can tap:
  "Tư vấn card chơi game 2K", "CPU nào hợp với mainboard B760?",
  "Nguồn 650W có đủ cho RTX 4070 SUPER không?".
- Footer: guides (socket table, power estimate, card and case clearance), policies (warranty,
  returns, cash on delivery), contact (email and a clearly fictional placeholder address).
- A persistent entry to the AI chat on every screen.

LANGUAGE
All visible text is Vietnamese, sentence case. No English jargon in headings. Plain words:
say "công suất nguồn", not "power headroom". Write headings that say what the visitor gets.

HARD RULES (these override style choices)
- Do not invent facts the shop cannot back up: no hotline, no showroom count, no business
  licence number, no "100% compatible" guarantee, no visitor counters, no version numbers,
  no installment (trả góp), no e-wallet logos, no "ERP" claims, no home-service warranty.
  Payment is cash on delivery only. Warranty comes from the product data (36 months).
- Say each promise once, where the page can prove it. Do not repeat the PC Builder button more
  than three times on the page.
- Status colours must stay unambiguous: whatever palette you choose, "compatible",
  "warning" and "error" need three clearly different treatments that never double as decoration
  or as the price/buy colour. Never rely on colour alone; add an icon and words.
- Accessibility floor: body text at least 16px, captions at least 12px, text contrast at least
  4.5:1, tap targets at least 44px, visible keyboard focus, real alt text on photos, labelled
  icon-only buttons, links that are real links, respect reduced-motion. Motion is allowed
  for the hero scene transitions and for explaining a change (for example the fit/no-fit
  result); no looping pulse or ping, and no scene text that disappears faster than it can be read.
  The hero must be pausable and keyboard-operable (arrow keys change scene, Space pauses).
- Product photos must not be cropped: show the whole card on a clean ground.
- Avoid the generic template look: eight identical rounded cards in a grid, an uppercase
  letter-spaced label above every heading, a single highlighted word in a heading, gradient
  washes, the same shadow on everything, and a row of trust badges.
```

### Prompt mobile (390 px), chạy sau khi desktop ổn

```
Create the mobile (390 x 844) version of this home page, keeping the visual direction you
chose. The product-led hero stage fills the whole first screen below a compact header, keeps its
4 scenes with one large product photo each and auto-advance, adds swipe left/right to change scene, and keeps pause and progress controls
within thumb reach. Header collapses to logo, search, cart and menu. The 8 categories become a horizontally
scrollable row with a visible hint that it continues. The mini PC Builder stays near the top
and is fully usable with one thumb. The product shelf scrolls horizontally with snap. The
compatibility sample and the chat sample stack under their headings. Tap targets are at
least 44px, and the main action of each block sits in the lower half of the screen.
Keep a floating entry to the AI chat.
```

### Cách tạo nhiều hướng khác nhau (nếu muốn so sánh)

Thêm đúng một dòng này vào cuối Prompt chính mỗi lần chạy, để mỗi lần đi một hướng khác thay vì để máy tự trùng:

- Lần 1: `Direction hint: calm and precise, like a manufacturer datasheet.`
- Lần 2: `Direction hint: confident and energetic, like gaming hardware packaging, but still trustworthy.`
- Lần 3: `Direction hint: editorial and spacious, like a well-made magazine about technology.`

Hoặc không thêm gì để từng công cụ tự chọn hoàn toàn.

---

## 4. Prompt tinh chỉnh (dán lần lượt nếu chưa đạt)

Các prompt này không nhắc tới màu hay font cụ thể, chỉ sửa theo vấn đề đã tìm ra ở mục 2.

1. **Header:** `Simplify the header to two rows at most. Remove any top announcement or promise bar. Show a sign-in button for a guest instead of a user name and badge. Keep only the eight real categories in navigation.`
2. **Giảm lặp:** `Remove repeated promises and repeated buttons. Each claim appears once, where it is proven. Remove the brand-logo strip and any marketing badge that is not a fact from the data. Keep one category entry block, not two.`
3. **Trạng thái tương thích:** `Redesign the fit / warning / error states so they are distinct by shape, icon and wording, not only colour, and so the same colours are never used for prices, buttons or decoration. Show all three states side by side for the mini PC Builder.`
4. **Thẻ sản phẩm:** `Make product cards easier to compare: aligned spec rows with units, price as the most visible element, one primary action "Thêm vào giỏ", one secondary action for PC Builder. Do not crop the photo. All text at least 12px and buttons at least 44px tall.`
5. **Trạng thái còn thiếu:** `Show three more states of the product shelf as separate frames: loading (skeleton cards of the same size), one card out of stock (primary action disabled and labelled "Hết hàng"), and an error with the message "Không tải được sản phẩm. Thử lại" and a retry button.`
6. **Bớt giống mẫu:** `The result looks like a generic electronics store. Keep the content but change the structure: break the uniform grid of identical cards, vary the scale of blocks, and make the PC Builder the clear centre of the page.`

---

## 5. Sau khi có bản Stitch mới

Việc cần kiểm tra trước khi đưa vào frontend thật:

- Tên sản phẩm, SKU, giá phải thay bằng dữ liệu từ API (`GET /products?category=GPU&sort=price,asc&size=8`). Thẻ 3 và 4 trong prompt là giữ chỗ.
- Tên token Stitch sinh ra (kiểu Material) phải đổi sang token trong brief mục 1.3 khi chuyển sang Tailwind của Next.js.
- Bỏ `cdn.tailwindcss.com`, bỏ `::-webkit-scrollbar { display:none }`, kiểm tra `alt` ảnh, nhãn truy cập cho icon, `role="dialog"` cho modal.
- Chọn một hướng thị giác rồi ghi token (màu, font, bo góc) vào `design-brief.md` nếu khác phương án A.
- Chạy lại detector: `node <skill>/scripts/detect.mjs --json docs/ui/stitch/home.html`.
- Kiểm tra tương phản bằng công cụ thật: mọi chữ phụ phải đạt ≥ 4,5:1.
