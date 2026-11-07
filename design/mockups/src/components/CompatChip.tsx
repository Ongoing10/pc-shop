import { Check } from 'lucide-react';

type Props = {
  label: string;
  value: string;
  /** "match": thông số này khớp với linh kiện đang so (vd socket khớp CPU). */
  tone?: 'plain' | 'match';
  /** Chip trong bộ lọc: bấm được, có trạng thái chọn. */
  selectable?: boolean;
  selected?: boolean;
  /** Ẩn nhãn trên màn hẹp, chỉ giữ giá trị (LGA1700, DDR5, mATX tự giải thích được). */
  compactOnMobile?: boolean;
};

/**
 * Chip thông số tương thích (brief mục 1.7): vạch nhỏ bên trái gợi chân cắm,
 * dùng chung cho thẻ sản phẩm, bộ lọc, PC Builder và gợi ý của chatbot.
 */
export function CompatChip({
  label, value, tone = 'plain', selectable = false, selected = false, compactOnMobile = false,
}: Props) {
  const match = tone === 'match';
  const box = [
    'relative inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-control border pl-3 pr-2.5 text-[13px] leading-none',
    match ? 'border-ok/40 bg-ok-tint text-ok' : selected ? 'border-brand bg-brand-tint text-brand' : 'border-line bg-surface text-ink',
    selectable ? 'cursor-pointer hover:border-brand/60' : '',
  ].join(' ');
  const pin = match ? 'bg-ok' : selected ? 'bg-brand' : 'bg-ink-muted/70';

  const content = (
    <>
      <span aria-hidden className={`absolute -left-px top-1/2 h-3 w-[3px] -translate-y-1/2 rounded-r-sm ${pin}`} />
      {label && (
        <span className={`${match || selected ? '' : 'text-ink-muted'} ${compactOnMobile ? 'max-md:sr-only' : ''}`}>{label}</span>
      )}
      <span className="font-semibold">{value}</span>
      {match && <Check aria-hidden className="size-3.5" strokeWidth={2.5} />}
    </>
  );

  return selectable ? (
    <button type="button" aria-pressed={selected} className={box}>
      {content}
    </button>
  ) : (
    <span className={box}>{content}</span>
  );
}
