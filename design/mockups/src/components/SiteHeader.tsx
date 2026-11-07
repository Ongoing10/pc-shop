import type { ReactNode } from 'react';
import { Bell, Bot, Cpu, Search, ShoppingCart } from 'lucide-react';
import { categories, me } from '../data/seed';

type Props = { activeCategory: string; chatOpen: boolean };

/** Header khách: logo, tìm kiếm, PC Builder, tư vấn AI, thông báo, giỏ hàng, tài khoản; dưới là menu danh mục. */
export function SiteHeader({ activeCategory, chatOpen }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="flex h-14 items-center gap-3 px-4 lg:h-16 lg:gap-6 lg:px-8">
        <Logo />

        <label className="relative hidden max-w-[520px] flex-1 lg:block">
          <span className="sr-only">Tìm linh kiện</span>
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            placeholder="Tìm linh kiện, ví dụ RTX 4070"
            className="h-10 w-full rounded-control border border-line bg-page pl-10 pr-3 text-[15px] placeholder:text-ink-muted"
          />
        </label>

        <nav aria-label="Công cụ" className="ml-auto flex items-center gap-1 lg:gap-2">
          <a href="#" className="hidden h-10 items-center gap-2 rounded-control px-3 text-[15px] font-medium hover:bg-sunken lg:inline-flex">
            <Cpu aria-hidden className="size-[18px]" />
            Build PC
          </a>
          <a
            href="#"
            aria-current={chatOpen ? 'true' : undefined}
            className={`hidden h-10 items-center gap-2 rounded-control px-3 text-[15px] font-medium lg:inline-flex ${
              chatOpen ? 'bg-brand-tint text-brand' : 'hover:bg-sunken'
            }`}
          >
            <Bot aria-hidden className="size-[18px]" />
            Tư vấn AI
          </a>
          <IconLink label="Thông báo, 2 chưa đọc" badge={2}>
            <Bell aria-hidden className="size-5" />
          </IconLink>
          <IconLink label="Giỏ hàng, 1 sản phẩm" badge={1}>
            <ShoppingCart aria-hidden className="size-5" />
          </IconLink>
          <a href="#" className="ml-1 inline-flex h-10 items-center gap-2 rounded-control pl-1 pr-1 hover:bg-sunken lg:pr-3">
            <span className="grid size-8 place-items-center rounded-full bg-ink text-[13px] font-semibold text-white">KM</span>
            <span className="hidden text-[15px] font-medium lg:inline">{me.displayName}</span>
          </a>
        </nav>
      </div>

      {/* Mobile: ô tìm kiếm xuống dòng riêng */}
      <div className="px-4 pb-3 lg:hidden">
        <label className="relative block">
          <span className="sr-only">Tìm linh kiện</span>
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            placeholder="Tìm linh kiện, ví dụ RTX 4070"
            className="h-11 w-full rounded-control border border-line bg-page pl-10 pr-3 text-base placeholder:text-ink-muted"
          />
        </label>
      </div>

      <nav aria-label="Danh mục" className="border-t border-line">
        <ul className="flex h-11 items-stretch gap-1 overflow-x-auto px-2 [scrollbar-width:none] lg:gap-2 lg:px-6">
          {categories.map((c) => {
            const active = c.code === activeCategory;
            return (
              <li key={c.code} className="flex">
                <a
                  href="#"
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex items-center whitespace-nowrap px-2.5 text-[15px] ${
                    active ? 'font-semibold text-brand' : 'text-ink hover:text-brand'
                  }`}
                >
                  {c.name}
                  {active && <span aria-hidden className="absolute inset-x-2.5 bottom-0 h-0.5 rounded-full bg-brand" />}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

function Logo() {
  return (
    <a href="#" className="flex shrink-0 items-center gap-2.5" aria-label="PC Shop, trang chủ">
      <svg viewBox="0 0 28 28" className="size-7" aria-hidden>
        <rect width="28" height="28" rx="7" className="fill-brand" />
        <rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="white" strokeWidth="2" />
        {[11, 17].map((v) => (
          <g key={v} stroke="white" strokeWidth="2" strokeLinecap="round">
            <line x1={v} y1="4.5" x2={v} y2="6.5" />
            <line x1={v} y1="21.5" x2={v} y2="23.5" />
            <line x1="4.5" y1={v} x2="6.5" y2={v} />
            <line x1="21.5" y1={v} x2="23.5" y2={v} />
          </g>
        ))}
      </svg>
      <span className="text-lg font-bold tracking-tight">PC Shop</span>
    </a>
  );
}

function IconLink({ label, badge, children }: { label: string; badge: number; children: ReactNode }) {
  return (
    <a href="#" aria-label={label} className="relative grid size-11 place-items-center rounded-control hover:bg-sunken lg:size-10">
      {children}
      {badge > 0 && (
        <span className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-buy px-1 text-[11px] font-semibold leading-none text-white tabular">
          {badge}
        </span>
      )}
    </a>
  );
}
