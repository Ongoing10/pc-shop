export type ProductCategory =
  | 'gpu'
  | 'cpu'
  | 'mainboard'
  | 'ram'
  | 'ssd'
  | 'psu'
  | 'case'
  | 'cooler';

export interface Category {
  id: ProductCategory;
  name: string;
  count: number;
  icon: string;
  description?: string;
}

export type ProductTag = 'BEST SELLER' | 'HOT' | 'GIÁ TỐT' | 'HIGH-END' | 'GAMING' | 'NEW';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  brand: string;
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  stock: number;
  tag?: ProductTag | string;
  specs: string[];
  image: string;
  description?: string;
  warrantyMonths?: number;
  compat?: ProductCompat;
}

/**
 * Thông số chuẩn hóa để kiểm tra tương thích (giống `product.compat` của catalog-service).
 * Chỉ khai trường mà danh mục đó có.
 */
export interface ProductCompat {
  socket?: string; // CPU, mainboard
  memoryType?: 'DDR4' | 'DDR5'; // RAM, mainboard
  formFactor?: 'ATX' | 'mATX' | 'ITX'; // mainboard
  tdp?: number; // W tiêu thụ ước tính (CPU, GPU)
  wattage?: number; // W công suất nguồn (PSU)
  supportedSockets?: string[]; // tản nhiệt
  supportedFormFactors?: Array<'ATX' | 'mATX' | 'ITX'>; // vỏ case
}

export type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'discount' | 'rating';

export interface ProductFilterParams {
  category?: string;
  search?: string;
  sort?: SortOption;
  brands?: string[];
  maxPrice?: number;
}

export type BuilderSlotId =
  | 'cpu'
  | 'mainboard'
  | 'ram'
  | 'gpu'
  | 'ssd'
  | 'psu'
  | 'case'
  | 'cooler';

export interface BuilderSlotDefinition {
  id: BuilderSlotId;
  name: string;
  iconName: string;
  required?: boolean;
}

export type RigBuild = Partial<Record<BuilderSlotId, Product>>;
