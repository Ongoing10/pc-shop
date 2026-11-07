import type { ReactNode } from 'react';
import { Bot, Check, Cpu, SendHorizontal, ShoppingCart, X } from 'lucide-react';
import { productBySku, stockOf } from '../data/seed';
import { formatMoney } from '../format';
import { CompatChip } from './CompatChip';
import { PartArt } from './PartArt';
import { StockLine } from './ProductRow';

// Hội thoại mẫu. POST /ai/chat chỉ trả {sessionId, answer}: frontend tìm SKU trong answer
// rồi gọi POST /products/batch + /inventory/batch để vẽ thẻ, nên giá và tồn kho trong thẻ là số thật của API.

type Props = { variant: 'docked' | 'sheet' };

export function ChatPanel({ variant }: Props) {
  const docked = variant === 'docked';
  return (
    <section
      aria-label="Tư vấn AI"
      className={
        docked
          ? 'sticky top-[110px] flex h-[calc(100vh-110px)] flex-col'
          : 'flex h-full flex-col rounded-t-layer bg-surface shadow-layer'
      }
    >
      <header className="flex items-center gap-3 border-b border-line px-5 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-tint text-brand">
          <Bot aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">Tư vấn AI</h2>
          <p className="text-[12px] text-ink-muted">Giá và tồn kho lấy trực tiếp từ cửa hàng</p>
        </div>
        <button type="button" aria-label="Đóng tư vấn" className="grid size-10 place-items-center rounded-control hover:bg-sunken">
          <X aria-hidden className="size-5" />
        </button>
      </header>

      <div className="flex-1 space-y-3.5 overflow-y-auto px-5 py-3.5">
        <UserMessage>Ryzen 5 7600X nên đi với mainboard nào? Tầm 4 triệu.</UserMessage>

        <div className="space-y-2.5 text-[15px]">
          <p>Ryzen 5 7600X dùng socket AM5 và RAM DDR5. Mainboard khớp socket, vừa ngân sách:</p>
          <SuggestionCard sku="MB-GIGABYTE-B650M-D5" match={{ label: 'Socket', value: 'AM5' }} />
          <p>Hai mẫu B760 dùng LGA1700 nên không lắp được. RAM đi kèm đang còn hàng:</p>
          <SuggestionCard sku="RAM-KINGSTON-32G-D5" match={{ label: '', value: 'DDR5' }} />
          <p className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted">
            <Check aria-hidden className="size-3.5 text-ok" strokeWidth={2.5} />
            Đã tra giá và tồn kho lúc 14:05
          </p>
        </div>
      </div>

      <form className="border-t border-line px-4 pb-4 pt-3" onSubmit={(e) => e.preventDefault()}>
        {/* Câu hỏi gợi ý nằm sát ô nhập, một hàng cuộn ngang, không bị đẩy khuất khi hội thoại dài */}
        <div className="-mx-4 mb-2.5 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
          {['Gợi ý cả bộ PC', 'So sánh B650M, B760M'].map((q) => (
            <button key={q} type="button" className="h-9 shrink-0 whitespace-nowrap rounded-control border border-brand/40 px-3 text-[13px] font-medium text-brand hover:bg-brand-tint">
              {q}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2 rounded-control border border-line bg-page p-1.5 pl-3 focus-within:border-brand">
          <label className="flex-1">
            <span className="sr-only">Câu hỏi</span>
            <textarea
              rows={1}
              placeholder="Hỏi về linh kiện hoặc cấu hình…"
              className="block w-full resize-none bg-transparent py-1.5 text-[15px] outline-none placeholder:text-ink-muted"
            />
          </label>
          <button type="submit" aria-label="Gửi" className="grid size-10 shrink-0 place-items-center rounded-control bg-brand text-white">
            <SendHorizontal aria-hidden className="size-[18px]" />
          </button>
        </div>
        <p className="mt-2 text-[12px] text-ink-muted">
          AI có thể nhầm. Tương thích do luật của cửa hàng kiểm tra.
        </p>
      </form>
    </section>
  );
}

function UserMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] rounded-card rounded-br-sm bg-brand px-3.5 py-2.5 text-[15px] text-white">{children}</p>
    </div>
  );
}

function SuggestionCard({ sku, match }: { sku: string; match: { label: string; value: string } }) {
  const p = productBySku(sku);
  const stock = stockOf(sku);
  return (
    <article className="grid grid-cols-[56px_minmax(0,1fr)] gap-3 rounded-card border border-line p-3">
      <a href="#" aria-label={p.name} className="grid aspect-square place-items-center rounded-control bg-sunken">
        <PartArt categoryCode={p.categoryCode} className="size-[80%]" />
      </a>
      <div className="min-w-0">
        <h3 className="text-[14px] font-semibold leading-snug">
          <a href="#" className="hover:text-brand">{p.name}</a>
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-code text-[11.5px] text-ink-muted">{p.sku}</span>
          <CompatChip label={match.label} value={match.value} tone="match" />
        </div>
        <div className="mt-1.5 flex items-end justify-between gap-2">
          <div>
            <p className="text-[15px] font-bold text-buy tabular">{formatMoney(p.price)}</p>
            <StockLine stock={stock} compact />
          </div>
          <div className="flex gap-1.5">
            <button type="button" aria-label="Thêm vào PC Builder" className="grid size-10 place-items-center rounded-control border border-line hover:border-brand hover:text-brand">
              <Cpu aria-hidden className="size-[18px]" />
            </button>
            <button
              type="button"
              aria-label="Thêm vào giỏ"
              disabled={!stock.inStock}
              className="grid size-10 place-items-center rounded-control bg-buy text-white hover:bg-buy-hover disabled:bg-sunken disabled:text-ink-muted"
            >
              <ShoppingCart aria-hidden className="size-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
