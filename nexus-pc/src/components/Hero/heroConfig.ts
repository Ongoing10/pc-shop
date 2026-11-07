export const IMAGES = {
  bgOffice:   "https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1600&auto=format&fit=crop", // phòng làm việc sáng, làm nền mờ
  bgGaming:   "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1600&auto=format&fit=crop", // phòng gaming tối, làm nền mờ
  deskOffice: "https://images.unsplash.com/photo-1587831994791-bc36ed55b58c?q=80&w=2560&auto=format&fit=crop", // bàn trắng + PC
  pcOffice:   "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?q=80&w=2560&auto=format&fit=crop", // case trắng/bạc (ảnh thường, chưa tách nền)
  deskGaming: "https://images.unsplash.com/photo-1616469829941-c7200edec809?q=80&w=2560&auto=format&fit=crop", // bàn tối + PC
  pcGaming:   "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?q=80&w=2560&auto=format&fit=crop", // case đen, quạt RGB (ảnh thường, chưa tách nền)
} as const;

export const ANIM = { SINK: 240, RISE: 820, DEPTH: 0.27 } as const;

export const COPY = {
  headline1: "Build PC trong mơ",
  headline2Pre: "với giá",
  headline2Highlight: "linh kiện tốt nhất",
  officeLabel: "Văn phòng",
  officeSub: "Từ 8 triệu",
  gamingLabel: "Gaming",
  gamingSub: "Từ 25 triệu",
  ctaBuilder: "Tự build PC",
  ctaBrowse: "Xem linh kiện",
  caption: "CPU, VGA, RAM, mainboard chính hãng. Tư vấn cấu hình miễn phí, giao hàng toàn quốc.",
} as const;
