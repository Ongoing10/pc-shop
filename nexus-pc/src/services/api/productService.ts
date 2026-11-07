import { Product, Category, ProductFilterParams } from '../../types/product';
import { initialProducts, initialCategories } from './mockData';

// Simulated latency helper for realistic async experience
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const productService = {
  /**
   * Fetch all categories
   */
  async getCategories(): Promise<Category[]> {
    await delay(120);
    // Đếm số sản phẩm thật theo danh mục thay cho con số cứng trong mock
    return initialCategories.map((cat) => ({
      ...cat,
      count: initialProducts.filter((p) => p.category === cat.id).length,
    }));
  },

  /**
   * Fetch products with optional filtering, search, sorting
   */
  async getProducts(params?: ProductFilterParams): Promise<Product[]> {
    await delay(150);
    let list = [...initialProducts];

    if (!params) return list;

    const { category, search, sort, brands, maxPrice } = params;

    if (category && category !== 'all') {
      list = list.filter((p) => p.category === category);
    }

    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.specs.some((s) => s.toLowerCase().includes(q))
      );
    }

    if (maxPrice !== undefined && maxPrice > 0) {
      list = list.filter((p) => p.price <= maxPrice);
    }

    if (brands && brands.length > 0) {
      list = list.filter((p) => brands.includes(p.brand));
    }

    if (sort) {
      switch (sort) {
        case 'price-asc':
          list.sort((a, b) => a.price - b.price);
          break;
        case 'price-desc':
          list.sort((a, b) => b.price - a.price);
          break;
        case 'discount':
          list.sort(
            (a, b) => (b.oldPrice ? b.oldPrice - b.price : 0) - (a.oldPrice ? a.oldPrice - a.price : 0)
          );
          break;
        case 'rating':
          list.sort((a, b) => b.rating - a.rating);
          break;
        case 'featured':
        default:
          // Keep default curated order
          break;
      }
    }

    return list;
  },

  /**
   * Get single product by ID
   */
  async getProductById(id: string): Promise<Product | null> {
    await delay(100);
    const found = initialProducts.find((p) => p.id === id);
    return found || null;
  },

  /**
   * Get featured products (e.g. for homepage hero & showcase)
   */
  async getFeaturedProducts(limit = 4): Promise<Product[]> {
    await delay(100);
    return initialProducts.slice(0, limit);
  },

  /**
   * Get deal products (items with highest discounts)
   */
  async getDealProducts(limit = 4): Promise<Product[]> {
    await delay(100);
    const deals = [...initialProducts].filter((p) => p.oldPrice && p.oldPrice > p.price);
    return deals.slice(0, limit);
  },
};
