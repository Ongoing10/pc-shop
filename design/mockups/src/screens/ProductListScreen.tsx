import { ArrowUpDown, Bot, ChevronDown, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { ChatPanel } from '../components/ChatPanel';
import { FilterPanel } from '../components/FilterPanel';
import { ProductRow } from '../components/ProductRow';
import { SiteHeader } from '../components/SiteHeader';
import { mainboards, stockOf } from '../data/seed';

/** K02: danh sách sản phẩm (danh mục Bo mạch chủ, sắp theo giá tăng dần) + widget chat AI. */
export function ProductListScreen({ chatOpen }: { chatOpen: boolean }) {
  return (
    // Mobile khi mở chat: khóa cuộn trang nền, chat là bottom sheet
    <div className={chatOpen ? 'max-lg:h-dvh max-lg:overflow-hidden' : ''}>
      <SiteHeader activeCategory="MAINBOARD" chatOpen={chatOpen} />

      <div className="flex">
        <main className="min-w-0 flex-1 px-4 pb-16 pt-5 lg:px-8 lg:pt-6">
          <nav aria-label="Đường dẫn" className="flex items-center gap-1 text-[13px] text-ink-muted">
            <a href="#" className="hover:text-brand">Trang chủ</a>
            <ChevronRight aria-hidden className="size-3.5" />
            <span aria-current="page" className="text-ink">Bo mạch chủ</span>
          </nav>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[26px] font-bold lg:text-[30px]">Bo mạch chủ</h1>
              <p className="text-sm text-ink-muted">{mainboards.length} sản phẩm</p>
            </div>
            <div className="flex w-full gap-2 lg:w-auto">
              <button type="button" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-control border border-line bg-surface px-3 text-[15px] font-medium lg:hidden">
                <SlidersHorizontal aria-hidden className="size-[18px]" />
                Lọc
              </button>
              <button type="button" className="inline-flex h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-control border border-line bg-surface px-3 text-[15px] lg:h-10 lg:flex-none">
                <ArrowUpDown aria-hidden className="size-4 text-ink-muted" />
                Giá tăng dần
                <ChevronDown aria-hidden className="size-4 text-ink-muted" />
              </button>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-8">
            <FilterPanel />
            <div className="min-w-0 flex-1">
              <div className="overflow-hidden rounded-card border border-line bg-surface">
                {mainboards.map((p) => (
                  <ProductRow key={p.sku} product={p} stock={stockOf(p.sku)} />
                ))}
              </div>
              <p className="mt-4 text-center text-[13px] text-ink-muted">Đã hiển thị {mainboards.length}/{mainboards.length} sản phẩm</p>
            </div>
          </div>
        </main>

        {chatOpen && (
          <div className="hidden w-[400px] shrink-0 border-l border-line bg-surface lg:block">
            <ChatPanel variant="docked" />
          </div>
        )}
      </div>

      {chatOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div aria-hidden className="absolute inset-0 bg-ink/40" />
          <div className="absolute inset-x-0 bottom-0 top-8">
            <ChatPanel variant="sheet" />
          </div>
        </div>
      ) : (
        // Nút nổi cố định góc phải dưới; ảnh full-page thấy nó ở đáy màn hình đầu tiên, đúng như khi khách vừa mở trang
        <button type="button" className="fixed bottom-4 right-4 z-20 inline-flex h-12 items-center gap-2 rounded-full bg-brand px-5 text-[15px] font-semibold text-white shadow-layer lg:hidden">
          <Bot aria-hidden className="size-5" />
          Tư vấn AI
        </button>
      )}
    </div>
  );
}
