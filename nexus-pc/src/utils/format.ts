import { Product } from '../types/product';

/**
 * Format currency in VND or specified format
 */
export function formatCurrency(amount: number, locale = 'vi-VN'): string {
  if (isNaN(amount)) return '0 ₫';
  return new Intl.NumberFormat(locale).format(amount) + ' ₫';
}

/**
 * Calculate discount percentage
 */
export function calculateDiscountPercent(price: number, oldPrice?: number): number {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

/**
 * Calculate total price of PC build rig
 */
export function calculateRigTotal(rig: Partial<Record<string, Product>>): number {
  return Object.values(rig).reduce((sum, product) => {
    return sum + (product?.price || 0);
  }, 0);
}

/**
 * Get category name from categories list with fallback
 */
export function getCategoryName(
  categoryId: string,
  categories: Array<{ id: string; name: string }> = []
): string {
  const found = categories.find((c) => c.id === categoryId);
  if (found) return found.name;

  const fallbacks: Record<string, string> = {
    gpu: 'Card đồ họa',
    cpu: 'Bộ vi xử lý',
    mainboard: 'Bo mạch chủ',
    ram: 'Bộ nhớ RAM',
    ssd: 'Ổ cứng SSD',
    psu: 'Nguồn máy tính',
    case: 'Vỏ case',
    cooler: 'Tản nhiệt',
  };

  return fallbacks[categoryId] || 'Linh kiện';
}
