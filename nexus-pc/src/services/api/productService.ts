import type * as Api from '../../types/api';
import { Category, Product, ProductFilterParams, SortOption } from '../../types/product';
import { PriceHistoryEntry } from '../../types/review';
import { BaseService } from './BaseService';
import { isApiError } from './ApiError';
import { inventoryService } from './inventoryService';
import { toCategory, toCategoryCode, toPriceHistory, toProduct } from './mappers/catalogMapper';

const REFS_TTL_MS = 10 * 60 * 1000;

interface CatalogRefs {
  brandNames: Map<string, string>;
  specSchemas: Map<string, Api.SpecField[] | null>;
  categories: Api.Category[];
}

const SERVER_SORT: Partial<Record<SortOption, Api.ProductSort>> = {
  'price-asc': 'price,asc',
  'price-desc': 'price,desc',
  rating: 'rating,desc',
  featured: 'sold,desc',
};

const discountOf = (p: Product) => (p.oldPrice ? p.oldPrice - p.price : 0);

/** Sắp xếp phía FE cho trường hợp backend không hỗ trợ (giảm giá nhiều) hoặc dữ liệu đến từ /products/search */
const sortProducts = (list: Product[], sort?: SortOption): Product[] => {
  switch (sort) {
    case 'price-asc':
      return [...list].sort((a, b) => a.price - b.price);
    case 'price-desc':
      return [...list].sort((a, b) => b.price - a.price);
    case 'discount':
      return [...list].sort((a, b) => discountOf(b) - discountOf(a));
    case 'rating':
      return [...list].sort((a, b) => b.rating - a.rating);
    default:
      return list;
  }
};

/** catalog-service: danh mục, thương hiệu, sản phẩm. Trả về kiểu của FE (xem mappers/catalogMapper) */
class ProductService extends BaseService {
  private refs: Promise<CatalogRefs> | null = null;
  private refsAt = 0;

  constructor() {
    super('');
  }

  /** Danh mục + thương hiệu dùng chung cho mọi lần đổi sản phẩm (tên hãng, nhãn thông số); cache 10 phút */
  private getRefs(): Promise<CatalogRefs> {
    if (!this.refs || Date.now() - this.refsAt > REFS_TTL_MS) {
      this.refsAt = Date.now();
      this.refs = Promise.all([this.get<Api.Category[]>('/categories'), this.get<Api.Brand[]>('/brands')])
        .then(([categories, brands]) => ({
          categories,
          brandNames: new Map(brands.map((b) => [b.code, b.name])),
          specSchemas: new Map(categories.map((c) => [c.code, c.specSchema])),
        }))
        .catch((e) => {
          this.refs = null;
          throw e;
        });
    }
    return this.refs;
  }

  /** Đổi sản phẩm backend sang kiểu FE và gắn tồn kho (một lần gọi inventory cho cả danh sách) */
  private async toProducts(list: Api.Product[]): Promise<Product[]> {
    if (list.length === 0) return [];
    const [refs, stock] = await Promise.all([this.getRefs(), inventoryService.getAvailability(list.map((p) => p.sku))]);
    return list.map((p) => toProduct(p, refs, stock.get(p.sku) ?? 0));
  }

  /** GET /categories + số sản phẩm đang bán của từng danh mục (đọc `page.totalElements` của trang đầu) */
  async getCategories(): Promise<Category[]> {
    const { categories } = await this.getRefs();
    const counts = await Promise.all(
      categories.map((c) =>
        this.get<Api.PageResponse<Api.Product>>('/products', { category: c.code, size: 1 }).then((p) => p.page.totalElements)
      )
    );
    return categories.map((c, i) => toCategory(c, counts[i]));
  }

  /**
   * Lọc/tìm/sắp xếp. Danh mục, giá, một thương hiệu, sắp xếp chạy ở backend (GET /products);
   * tìm kiếm dùng GET /products/search (text index) rồi lọc tiếp phía FE vì endpoint đó chỉ nhận `q`.
   */
  async getProducts(params: ProductFilterParams = {}): Promise<Product[]> {
    const { category, search, sort, brands, maxPrice } = params;
    const refs = await this.getRefs();
    const brandCodes = new Map([...refs.brandNames].map(([code, name]) => [name, code]));
    const categoryCode = category && category !== 'all' ? toCategoryCode(category) : undefined;
    const query = search?.trim();

    let raw: Api.Product[];
    if (query) {
      raw = await this.getAllPages<Api.Product>('/products/search', { q: query });
      if (categoryCode) raw = raw.filter((p) => p.categoryCode === categoryCode);
      if (maxPrice) raw = raw.filter((p) => p.price <= maxPrice);
    } else {
      raw = await this.getAllPages<Api.Product>('/products', {
        category: categoryCode,
        maxPrice: maxPrice && maxPrice > 0 ? maxPrice : undefined,
        brand: brands?.length === 1 ? brandCodes.get(brands[0]) : undefined,
        sort: sort ? SERVER_SORT[sort] : undefined,
      });
    }

    let list = await this.toProducts(raw);
    if (brands && brands.length > 0) list = list.filter((p) => brands.includes(p.brand));
    // Kết quả tìm kiếm không có sắp xếp của backend; 'discount' backend không hỗ trợ
    return query || sort === 'discount' ? sortProducts(list, sort) : list;
  }

  /** GET /products/{sku}; id sản phẩm ở FE chính là SKU. 404 → null để trang hiện "không tìm thấy" */
  async getProductById(id: string): Promise<Product | null> {
    try {
      const product = await this.get<Api.Product>(`/products/${encodeURIComponent(id)}`);
      return (await this.toProducts([product]))[0] ?? null;
    } catch (e) {
      if (isApiError(e) && e.status === 404) return null;
      throw e;
    }
  }

  /** Nhiều SKU (cấu hình PC đã lưu): lấy chi tiết từng SKU nhưng chỉ gọi tồn kho một lần; SKU không còn bán bị bỏ qua */
  async getProductsBySkus(skus: string[]): Promise<Product[]> {
    const raw = await Promise.all(
      [...new Set(skus)].map((sku) =>
        this.get<Api.Product>(`/products/${encodeURIComponent(sku)}`).catch((e) => {
          if (isApiError(e) && e.status === 404) return null;
          throw e;
        })
      )
    );
    return this.toProducts(raw.filter((p): p is Api.Product => p !== null));
  }

  /** Bán chạy nhất (soldCount giảm dần) */
  async getFeaturedProducts(limit = 4): Promise<Product[]> {
    const page = await this.get<Api.PageResponse<Api.Product>>('/products', { sort: 'sold,desc', size: limit });
    return this.toProducts(page.content);
  }

  /** Giảm giá nhiều nhất: backend chưa có bộ lọc giảm giá nên lấy danh sách rồi lọc phía FE */
  async getDealProducts(limit = 4): Promise<Product[]> {
    const all = await this.getAllPages<Api.Product>('/products');
    const deals = await this.toProducts(all.filter((p) => p.originalPrice && p.originalPrice > p.price));
    return sortProducts(deals, 'discount').slice(0, limit);
  }

  /** GET /products/{sku}/price-history */
  async getPriceHistory(id: string): Promise<PriceHistoryEntry[]> {
    return toPriceHistory(await this.get<Api.PriceHistory[]>(`/products/${encodeURIComponent(id)}/price-history`));
  }
}

export const productService = new ProductService();
