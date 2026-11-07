/**
 * Nội dung các trang chính sách. Sửa điều khoản ở đây, trang /policy/:slug tự cập nhật.
 * Các con số (thời gian giao, số ngày đổi trả...) là bản đề xuất, cần nhóm xác nhận trước khi công bố.
 */

export type PolicyBlock =
  | { type: 'p'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; head: [string, string]; rows: [string, string][] };

export interface PolicySection {
  heading: string;
  blocks: PolicyBlock[];
}

export interface Policy {
  slug: string;
  title: string;
  summary: string;
  updated: string;
  facts: { label: string; value: string }[];
  sections: PolicySection[];
}

export const POLICIES: Policy[] = [
  {
    slug: 'shipping',
    title: 'Chính sách vận chuyển',
    summary: 'Giao hàng toàn quốc, miễn phí vận chuyển, đóng gói chống sốc cho từng linh kiện.',
    updated: '01/11/2026',
    facts: [
      { label: 'Phí vận chuyển', value: 'Miễn phí toàn quốc' },
      { label: 'Nội thành Hà Nội', value: '1–2 ngày' },
      { label: 'Tỉnh thành khác', value: '2–5 ngày' },
    ],
    sections: [
      {
        heading: 'Phạm vi và thời gian giao hàng',
        blocks: [
          {
            type: 'p',
            text: 'NEXUS PC giao hàng tới tất cả tỉnh thành. Sau khi bạn đặt hàng, nhân viên sẽ gọi xác nhận đơn trong giờ làm việc (8:00–21:30), rồi đơn được bàn giao cho đơn vị vận chuyển.',
          },
          {
            type: 'table',
            head: ['Khu vực', 'Thời gian dự kiến'],
            rows: [
              ['Nội thành Hà Nội', '1–2 ngày làm việc'],
              ['Các tỉnh miền Bắc', '2–3 ngày làm việc'],
              ['Miền Trung, miền Nam', '3–5 ngày làm việc'],
            ],
          },
          {
            type: 'p',
            text: 'Thời gian tính từ lúc đơn được xác nhận, không gồm Chủ nhật và ngày lễ. Đơn có bộ PC lắp sẵn cần thêm 1 ngày để lắp ráp và chạy thử.',
          },
        ],
      },
      {
        heading: 'Đóng gói',
        blocks: [
          {
            type: 'list',
            items: [
              'Linh kiện được giữ nguyên hộp và seal của hãng, bọc thêm lớp chống sốc bên ngoài.',
              'Card đồ họa, mainboard và bộ PC lắp sẵn được chèn xốp định hình để không xê dịch khi vận chuyển.',
              'Mỗi kiện hàng có phiếu ghi danh sách sản phẩm và số serial.',
            ],
          },
        ],
      },
      {
        heading: 'Khi nhận hàng',
        blocks: [
          {
            type: 'p',
            text: 'Bạn được kiểm tra bên ngoài kiện hàng trước khi thanh toán. Nếu hộp bị móp, rách hoặc mất seal, hãy từ chối nhận và gọi hotline 1900 6868, chúng tôi sẽ gửi lại đơn mới.',
          },
          {
            type: 'p',
            text: 'Bạn có thể theo dõi trạng thái đơn ở trang Tra cứu đơn hàng hoặc mục Đơn hàng của tôi trong tài khoản.',
          },
        ],
      },
    ],
  },
  {
    slug: 'warranty',
    title: 'Chính sách bảo hành',
    summary: 'Sản phẩm được bảo hành chính hãng theo thời hạn ghi trên trang sản phẩm và phiếu bảo hành.',
    updated: '01/11/2026',
    facts: [
      { label: 'Hình thức', value: 'Bảo hành chính hãng' },
      { label: 'Thời hạn', value: 'Theo từng sản phẩm' },
      { label: 'Xử lý tại cửa hàng', value: '3–7 ngày' },
    ],
    sections: [
      {
        heading: 'Thời hạn bảo hành',
        blocks: [
          {
            type: 'p',
            text: 'Thời hạn bảo hành của từng sản phẩm được ghi trên trang chi tiết sản phẩm và trên phiếu bảo hành kèm theo, thường từ 12 đến 84 tháng tùy hãng và dòng sản phẩm. Thời hạn tính từ ngày bạn nhận hàng.',
          },
        ],
      },
      {
        heading: 'Điều kiện được bảo hành',
        blocks: [
          {
            type: 'list',
            items: [
              'Sản phẩm còn trong thời hạn bảo hành, tem bảo hành và số serial còn nguyên, trùng với hóa đơn.',
              'Lỗi phát sinh do nhà sản xuất trong quá trình sử dụng bình thường.',
            ],
          },
        ],
      },
      {
        heading: 'Trường hợp không được bảo hành',
        blocks: [
          {
            type: 'list',
            items: [
              'Sản phẩm bị rơi vỡ, cong vênh, cháy nổ, vào nước hoặc côn trùng.',
              'Chân socket CPU/mainboard bị cong, gãy do lắp đặt.',
              'Tự ý sửa chữa, ép xung vượt thông số hãng cho phép, hoặc thay đổi BIOS/firmware không chính thức.',
              'Tem bảo hành hoặc số serial bị rách, tẩy xóa.',
            ],
          },
        ],
      },
      {
        heading: 'Quy trình bảo hành',
        blocks: [
          {
            type: 'list',
            items: [
              'Gọi hotline 1900 6868 hoặc mang sản phẩm tới cửa hàng kèm hóa đơn.',
              'Kỹ thuật viên kiểm tra và báo kết quả trong ngày nếu lỗi rõ ràng.',
              'Sản phẩm cần gửi hãng được xử lý trong 3–7 ngày làm việc; chúng tôi thông báo tiến độ qua điện thoại.',
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'returns',
    title: 'Đổi trả & hoàn tiền',
    summary: 'Đổi mới khi sản phẩm lỗi do nhà sản xuất trong 7 ngày đầu; hoàn tiền về đúng phương thức bạn đã thanh toán.',
    updated: '01/11/2026',
    facts: [
      { label: 'Lỗi nhà sản xuất', value: 'Đổi mới trong 7 ngày' },
      { label: 'Đổi ý (còn seal)', value: 'Trong 3 ngày' },
      { label: 'Hoàn tiền', value: '3–7 ngày làm việc' },
    ],
    sections: [
      {
        heading: 'Đổi mới do lỗi nhà sản xuất',
        blocks: [
          {
            type: 'p',
            text: 'Trong 7 ngày kể từ ngày nhận hàng, nếu sản phẩm lỗi do nhà sản xuất, bạn được đổi sang sản phẩm mới cùng mẫu. Nếu mẫu đó hết hàng, bạn chọn đổi sang sản phẩm khác (bù trừ chênh lệch) hoặc hoàn tiền.',
          },
          {
            type: 'p',
            text: 'Sản phẩm đổi cần còn đủ hộp, phụ kiện, quà tặng kèm và không có dấu hiệu va đập.',
          },
        ],
      },
      {
        heading: 'Đổi trả khi không có lỗi',
        blocks: [
          {
            type: 'list',
            items: [
              'Áp dụng trong 3 ngày kể từ ngày nhận hàng, sản phẩm còn nguyên seal, chưa kích hoạt hoặc lắp đặt.',
              'Phí đổi trả 10% giá trị sản phẩm để bù chi phí vận chuyển và kiểm tra.',
              'Không áp dụng cho phần mềm bản quyền và sản phẩm đặt hàng riêng theo yêu cầu.',
            ],
          },
        ],
      },
      {
        heading: 'Hoàn tiền',
        blocks: [
          {
            type: 'table',
            head: ['Bạn đã thanh toán bằng', 'Cách hoàn tiền'],
            rows: [
              ['Tiền mặt khi nhận hàng (COD)', 'Chuyển khoản tới tài khoản bạn cung cấp'],
              ['Chuyển khoản ngân hàng', 'Hoàn về tài khoản đã chuyển'],
              ['Thẻ qua cổng thanh toán', 'Hoàn về thẻ, thời gian tùy ngân hàng phát hành'],
            ],
          },
          {
            type: 'p',
            text: 'Tiền được hoàn trong 3–7 ngày làm việc sau khi chúng tôi nhận lại và kiểm tra sản phẩm.',
          },
        ],
      },
    ],
  },
  {
    slug: 'payment',
    title: 'Hình thức thanh toán',
    summary: 'Thanh toán khi nhận hàng, chuyển khoản ngân hàng hoặc thẻ qua cổng thanh toán.',
    updated: '01/11/2026',
    facts: [
      { label: 'COD', value: 'Trả tiền khi nhận hàng' },
      { label: 'Chuyển khoản', value: 'Mã QR sau khi đặt' },
      { label: 'Thẻ', value: 'Qua cổng thanh toán' },
    ],
    sections: [
      {
        heading: 'Thanh toán khi nhận hàng (COD)',
        blocks: [
          {
            type: 'p',
            text: 'Bạn thanh toán bằng tiền mặt cho nhân viên giao hàng sau khi kiểm tra bên ngoài kiện hàng. Với đơn giá trị lớn, nhân viên có thể đề nghị đặt cọc trước khi giao.',
          },
        ],
      },
      {
        heading: 'Chuyển khoản ngân hàng',
        blocks: [
          {
            type: 'p',
            text: 'Sau khi xác nhận đơn, trang thanh toán hiển thị mã QR kèm nội dung chuyển khoản là mã đơn hàng. Đơn được xử lý ngay khi hệ thống nhận được tiền.',
          },
        ],
      },
      {
        heading: 'Thẻ ATM nội địa, Visa, Mastercard',
        blocks: [
          {
            type: 'p',
            text: 'Bạn được chuyển sang cổng thanh toán của đối tác để nhập thông tin thẻ. NEXUS PC không lưu số thẻ của bạn.',
          },
        ],
      },
      {
        heading: 'Hóa đơn',
        blocks: [
          {
            type: 'p',
            text: 'Hóa đơn điện tử được gửi qua email sau khi đơn hoàn tất. Nếu cần xuất hóa đơn công ty, hãy ghi mã số thuế trong phần ghi chú khi đặt hàng.',
          },
        ],
      },
    ],
  },
  {
    slug: 'privacy',
    title: 'Bảo mật thông tin',
    summary: 'Chúng tôi chỉ thu thập thông tin cần để giao hàng và hỗ trợ bạn, và không bán dữ liệu cho bên thứ ba.',
    updated: '01/11/2026',
    facts: [
      { label: 'Mục đích', value: 'Giao hàng & hỗ trợ' },
      { label: 'Chia sẻ', value: 'Chỉ đơn vị vận chuyển, thanh toán' },
      { label: 'Yêu cầu xóa', value: 'support@nexuspc.vn' },
    ],
    sections: [
      {
        heading: 'Thông tin chúng tôi thu thập',
        blocks: [
          {
            type: 'list',
            items: [
              'Họ tên, số điện thoại, email và địa chỉ giao hàng bạn nhập khi đặt hàng hoặc tạo tài khoản.',
              'Lịch sử đơn hàng và sổ địa chỉ trong tài khoản của bạn.',
              'Giỏ hàng, danh sách so sánh và yêu thích được lưu trên trình duyệt của bạn.',
            ],
          },
        ],
      },
      {
        heading: 'Cách chúng tôi sử dụng',
        blocks: [
          {
            type: 'list',
            items: [
              'Xác nhận đơn, giao hàng, bảo hành và liên hệ khi cần hỗ trợ.',
              'Gửi email thông báo trạng thái đơn hàng.',
            ],
          },
        ],
      },
      {
        heading: 'Chia sẻ với bên thứ ba',
        blocks: [
          {
            type: 'p',
            text: 'Thông tin giao hàng chỉ được chia sẻ với đơn vị vận chuyển; thông tin thanh toán thẻ do cổng thanh toán xử lý trực tiếp. Chúng tôi không bán hay cho thuê dữ liệu cá nhân.',
          },
        ],
      },
      {
        heading: 'Quyền của bạn',
        blocks: [
          {
            type: 'p',
            text: 'Bạn có thể xem và sửa thông tin trong mục Tài khoản. Để yêu cầu xóa tài khoản và dữ liệu, gửi email tới support@nexuspc.vn từ địa chỉ email đã đăng ký.',
          },
        ],
      },
    ],
  },
];

export const findPolicy = (slug?: string): Policy | undefined =>
  POLICIES.find((p) => p.slug === slug);
