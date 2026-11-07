import { Cpu, PackageCheck, PackageX, Star } from 'lucide-react';
import { brands, mainboardSpecSchema, type Product, type Stock } from '../data/seed';
import { formatMoney, formatRating } from '../format';
import { CompatChip } from './CompatChip';
import { PartArt } from './PartArt';

type Props = { product: Product; stock: Stock };

const chipKeys = ['socket', 'memory_type', 'form_factor'];

/** Một dòng kiểu datasheet: ảnh · tên + thông số tương thích · giá + tồn kho + nút mua. */
export function ProductRow({ product, stock }: Props) {
  const brand = brands.find((b) => b.code === product.brandCode)?.name ?? product.brandCode;
  // Chip cho 3 trường quyết định lắp được hay không; số khe để ở dòng mô tả phụ.
  const compatFields = mainboardSpecSchema.filter((f) => chipKeys.includes(f.key) && product.compat[f.key] !== undefined);

  return (
    <article className="grid grid-cols-[88px_minmax(0,1fr)] gap-x-4 gap-y-4 border-t border-line p-4 first:border-t-0 md:grid-cols-[112px_minmax(0,1fr)_200px] md:gap-x-6 md:p-5">
      <a href="#" className="grid aspect-square place-items-center rounded-control bg-sunken" aria-label={product.name}>
        <PartArt categoryCode={product.categoryCode} className="size-[72%]" />
      </a>

      <div className="min-w-0">
        <p className="text-[13px] text-ink-muted">{brand}</p>
        <h3 className="text-[17px] font-semibold">
          <a href="#" className="hover:text-brand">{product.name}</a>
        </h3>
        <p className="mt-0.5 font-code text-[12px] text-ink-muted">{product.sku}</p>
        <p className="mt-2 text-[14px] text-ink-muted">{product.shortDescription}</p>

        <ul aria-label="Thông số tương thích" className="mt-3 flex flex-wrap gap-1.5">
          {compatFields.map((f) => (
            <li key={f.key}>
              <CompatChip label={f.label} value={String(product.compat[f.key])} compactOnMobile />
            </li>
          ))}
        </ul>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-muted">
          <span>{product.compat.ram_slots} khe RAM, {product.compat.m2_slots} khe M.2</span>
          {product.ratingAvg !== null && (
            <span className="inline-flex items-center gap-1">
              <Star aria-hidden className="size-3.5 fill-warn-line text-warn-line" />
              <span className="font-semibold text-ink">{formatRating(product.ratingAvg)}</span>
              <span>({product.ratingCount} đánh giá)</span>
            </span>
          )}
          <span>Đã bán {product.soldCount}</span>
          <span>Bảo hành {product.warrantyMonths} tháng</span>
        </div>
      </div>

      {/* Mobile: hàng dưới cùng trải 2 cột; desktop: cột giá bên phải */}
      <div className="col-span-2 flex items-end justify-between gap-4 md:col-span-1 md:flex-col md:items-stretch md:justify-start">
        <div>
          <p className="text-xl font-bold text-buy tabular">{formatMoney(product.price)}</p>
          {product.originalPrice && (
            <p className="text-sm text-ink-muted line-through tabular">{formatMoney(product.originalPrice)}</p>
          )}
          <StockLine stock={stock} />
        </div>
        <div className="flex flex-col gap-2 md:mt-3">
          {stock.inStock ? (
            <button type="button" className="h-11 rounded-control bg-buy px-4 text-[15px] font-semibold text-white hover:bg-buy-hover md:h-10">
              Thêm vào giỏ
            </button>
          ) : (
            <button type="button" disabled className="h-11 rounded-control bg-sunken px-4 text-[15px] font-semibold text-ink-muted md:h-10">
              Tạm hết hàng
            </button>
          )}
          <button type="button" className="hidden h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-control border border-line px-3 text-sm font-medium hover:border-brand hover:text-brand md:inline-flex">
            <Cpu aria-hidden className="size-4" />
            Thêm vào PC Builder
          </button>
        </div>
      </div>
    </article>
  );
}

export function StockLine({ stock, compact = false }: { stock: Stock; compact?: boolean }) {
  const size = compact ? 'text-[12px]' : 'text-[13px]';
  return stock.inStock ? (
    <p className={`mt-1 inline-flex items-center gap-1 text-ok ${size}`}>
      <PackageCheck aria-hidden className="size-3.5" />
      Còn {stock.available} sản phẩm
    </p>
  ) : (
    <p className={`mt-1 inline-flex items-center gap-1 text-ink-muted ${size}`}>
      <PackageX aria-hidden className="size-3.5" />
      Hết hàng
    </p>
  );
}
