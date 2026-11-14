import type * as Api from '../../../types/api';
import { Category, Product, ProductCategory, ProductCompat } from '../../../types/product';
import { PriceHistoryEntry } from '../../../types/review';

/**
 * Mã danh mục của backend (CPU, STORAGE...) ↔ id danh mục của FE (cpu, ssd...).
 * FE dùng id này trong URL (?category=gpu) và làm slot PC Builder nên giữ nguyên, đổi ở tầng service.
 */
const CODE_TO_ID: Record<string, ProductCategory> = {
  CPU: 'cpu',
  MAINBOARD: 'mainboard',
  RAM: 'ram',
  GPU: 'gpu',
  STORAGE: 'ssd',
  PSU: 'psu',
  CASE: 'case',
  COOLER: 'cooler',
};
const ID_TO_CODE = Object.fromEntries(Object.entries(CODE_TO_ID).map(([code, id]) => [id, code]));

/** Danh mục lạ (admin mới tạo) giữ nguyên mã viết thường */
export const toCategoryId = (code: string): ProductCategory => CODE_TO_ID[code] ?? (code.toLowerCase() as ProductCategory);
export const toCategoryCode = (id: string): string => ID_TO_CODE[id] ?? id.toUpperCase();

const CATEGORY_DESCRIPTIONS: Partial<Record<ProductCategory, string>> = {
  gpu: 'VGA gaming, render 3D cao cấp từ NVIDIA RTX & AMD Radeon',
  cpu: 'Intel Core & AMD Ryzen thế hệ mới nhất',
  mainboard: 'Bo mạch chủ ATX, mATX, ITX cho Intel & AMD',
  ram: 'RAM DDR4, DDR5 tốc độ cao có tản nhiệt & LED RGB',
  ssd: 'SSD NVMe PCIe 4.0 & 5.0 tốc độ đọc ghi vượt trội',
  psu: 'Nguồn chuẩn 80 Plus Gold, Platinum công suất chuẩn',
  case: 'Vỏ case kính cường lực, đối lưu khí airflow tối ưu',
  cooler: 'Tản nhiệt nước AIO 240/360 & tản khí hiệu năng cao',
};

export const toCategory = (c: Api.Category, count: number): Category => {
  const id = toCategoryId(c.code);
  return { id, name: c.name, count, icon: '', description: CATEGORY_DESCRIPTIONS[id] };
};

const asString = (v: Api.SpecValue | undefined) => (typeof v === 'string' ? v : undefined);
const asNumber = (v: Api.SpecValue | undefined) => (typeof v === 'number' ? v : undefined);
const asStringList = (v: Api.SpecValue | undefined) => (Array.isArray(v) ? v : undefined);

/** `product.compat` (snake_case, chuẩn hóa cho rule engine) → ProductCompat của FE */
export const toCompat = (compat: Api.ProductCompat | null): ProductCompat | undefined => {
  if (!compat) return undefined;
  const result: ProductCompat = {
    socket: asString(compat.socket),
    memoryType: (asString(compat.memory_type) ?? asStringList(compat.memory_types)?.[0]) as ProductCompat['memoryType'],
    formFactor: asString(compat.form_factor) as ProductCompat['formFactor'],
    tdp: asNumber(compat.tdp_w),
    wattage: asNumber(compat.wattage),
    supportedSockets: asStringList(compat.supported_sockets),
    supportedFormFactors: asStringList(compat.supported_form_factors) as ProductCompat['supportedFormFactors'],
  };
  // Bỏ khóa không có giá trị để `compat?.socket` đúng nghĩa "danh mục này không khai"
  return Object.fromEntries(Object.entries(result).filter(([, v]) => v !== undefined)) as ProductCompat;
};

const formatSpecValue = (value: Api.SpecValue, field?: Api.SpecField): string | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value ? (field?.label ?? 'Có') : null;
  const text = Array.isArray(value) ? value.join(', ') : String(value);
  return field?.unit ? `${text} ${field.unit}` : text;
};

/** `product.specs` → danh sách dòng ngắn "Nhãn: giá trị đơn vị" theo thứ tự specSchema của danh mục */
export const toSpecLines = (specs: Api.ProductSpecs | null, schema: Api.SpecField[] | null): string[] => {
  if (!specs) return [];
  const fields = (schema ?? []).filter((f) => f.group === 'specs');
  const known = new Set(fields.map((f) => f.key));
  const lines = fields.flatMap((f) => {
    const value = specs[f.key];
    const text = formatSpecValue(value, f);
    if (!text) return [];
    // boolean true chỉ hiện nhãn ("Ray Tracing"), không ghép "Nhãn: Nhãn"
    return [typeof value === 'boolean' ? text : `${f.label}: ${text}`];
  });
  const extra = Object.entries(specs)
    .filter(([key]) => !known.has(key))
    .flatMap(([key, value]) => {
      const text = formatSpecValue(value);
      return text ? [typeof value === 'boolean' ? key : `${key}: ${text}`] : [];
    });
  return [...lines, ...extra];
};

export const PLACEHOLDER_IMAGE = '/logo.svg';

export const primaryImage = (images: Api.ProductImage[] | null): string =>
  images?.find((i) => i.isPrimary)?.url ?? images?.[0]?.url ?? PLACEHOLDER_IMAGE;

interface CatalogRefs {
  brandNames: Map<string, string>;
  specSchemas: Map<string, Api.SpecField[] | null>;
}

/** `stock` chưa biết ở đây: inventory-service trả riêng, service gắn sau bằng POST /inventory/batch */
export const toProduct = (p: Api.Product, refs: CatalogRefs, stock = 0): Product => ({
  id: p.sku,
  name: p.name,
  category: toCategoryId(p.categoryCode),
  brand: (p.brandCode && refs.brandNames.get(p.brandCode)) || p.brandCode || '',
  price: p.price,
  oldPrice: p.originalPrice && p.originalPrice > p.price ? p.originalPrice : undefined,
  rating: p.ratingAvg ?? 0,
  reviews: p.ratingCount ?? 0,
  stock,
  tag: p.tags?.[0],
  specs: toSpecLines(p.specs, refs.specSchemas.get(p.categoryCode) ?? null),
  image: primaryImage(p.images),
  description: p.description ?? p.shortDescription ?? undefined,
  warrantyMonths: p.warrantyMonths ?? undefined,
  compat: toCompat(p.compat),
});

/** Backend trả mới nhất trước; biểu đồ cần cũ nhất trước, dòng khởi tạo (oldPrice null) lấy chính giá mở bán */
export const toPriceHistory = (rows: Api.PriceHistory[]): PriceHistoryEntry[] =>
  [...rows].reverse().map((r) => ({
    oldPrice: r.oldPrice ?? r.newPrice,
    newPrice: r.newPrice,
    reason: r.reason,
    changedAt: r.changedAt,
  }));
