// Ảnh giữ chỗ dạng nét vẽ: seed chưa có ảnh sản phẩm (images rỗng). Khi có ảnh thật thì thay bằng <img>.

type Props = { categoryCode: string; className?: string };

export function PartArt({ categoryCode, className = '' }: Props) {
  return (
    <svg viewBox="0 0 96 96" aria-hidden className={`text-ink-muted ${className}`} fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinejoin="round">
      {categoryCode === 'RAM' ? <Ram /> : <Mainboard />}
    </svg>
  );
}

function Mainboard() {
  return (
    <>
      <rect x="14" y="10" width="68" height="76" rx="3" />
      {/* socket CPU */}
      <rect x="24" y="20" width="22" height="22" rx="1.5" />
      <rect x="29" y="25" width="12" height="12" rx="1" strokeOpacity=".6" />
      {/* 4 khe RAM */}
      {[54, 59, 64, 69].map((x) => (
        <line key={x} x1={x} y1="18" x2={x} y2="46" />
      ))}
      {/* khe PCIe x16 và M.2 */}
      <rect x="22" y="54" width="52" height="5" rx="1" />
      <rect x="22" y="66" width="34" height="4" rx="1" strokeOpacity=".6" />
      <circle cx="68" cy="74" r="4" strokeOpacity=".6" />
    </>
  );
}

function Ram() {
  return (
    <>
      <path d="M8 34h80v26H54l-2 4h-8l-2-4H8z" />
      {[14, 28, 42, 56, 70].map((x) => (
        <rect key={x} x={x} y="39" width="11" height="12" rx="1" strokeOpacity=".6" />
      ))}
      {[12, 18, 24, 30, 36, 60, 66, 72, 78, 84].map((x) => (
        <line key={x} x1={x} y1="60" x2={x} y2="64" strokeOpacity=".6" />
      ))}
    </>
  );
}
