import type { ReactNode } from 'react';
import { brands, mainboardFacets, mainboardSpecSchema } from '../data/seed';
import { formatMoney } from '../format';
import { CompatChip } from './CompatChip';

// Bộ lọc dựng từ GET /products/facets: brands, priceRange, compat{socket, memory_type, form_factor}.
// Nhãn nhóm compat lấy từ specSchema của danh mục. Facets không trả số lượng nên không hiện "(3)".
const compatFilters = ['socket', 'memory_type', 'form_factor'];

export function FilterPanel() {
  const { min, max } = mainboardFacets.priceRange;
  return (
    <aside aria-label="Bộ lọc" className="hidden w-[232px] shrink-0 lg:block">
      <div className="flex items-baseline justify-between pb-3">
        <h2 className="text-base font-semibold">Bộ lọc</h2>
        <button type="button" disabled className="text-sm text-ink-muted disabled:opacity-60">
          Xóa lọc
        </button>
      </div>

      <Group title="Khoảng giá">
        <div className="flex items-center gap-2">
          <PriceInput label="Giá từ" placeholder={formatMoney(min)} />
          <span aria-hidden className="text-ink-muted">–</span>
          <PriceInput label="Giá đến" placeholder={formatMoney(max)} />
        </div>
      </Group>

      <Group title="Thương hiệu">
        <ul className="space-y-1">
          {mainboardFacets.brands.map((code) => (
            <li key={code}>
              <label className="flex h-8 cursor-pointer items-center gap-2.5 text-[15px]">
                <input type="checkbox" className="size-4 rounded accent-brand" />
                {brands.find((b) => b.code === code)?.name ?? code}
              </label>
            </li>
          ))}
        </ul>
      </Group>

      {compatFilters.map((key) => (
        <Group key={key} title={mainboardSpecSchema.find((f) => f.key === key)?.label ?? key}>
          <div className="flex flex-wrap gap-2">
            {mainboardFacets.compat[key].map((v) => (
              <CompatChip key={v} label="" value={v} selectable />
            ))}
          </div>
        </Group>
      ))}
    </aside>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function PriceInput({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="min-w-0 flex-1">
      <span className="sr-only">{label}</span>
      <input
        inputMode="numeric"
        placeholder={placeholder}
        className="h-9 w-full rounded-control border border-line bg-surface px-2 text-[13px] tabular placeholder:text-ink-muted"
      />
    </label>
  );
}
