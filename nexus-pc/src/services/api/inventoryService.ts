import type * as Api from '../../types/api';
import { BaseService } from './BaseService';

class InventoryService extends BaseService {
  constructor() {
    super('/inventory');
  }

  /** POST /inventory/batch (public): số có thể bán theo SKU; SKU chưa có dòng tồn kho trả 0 */
  async getAvailability(skus: string[]): Promise<Map<string, number>> {
    const unique = [...new Set(skus)];
    if (unique.length === 0) return new Map();
    // Backend nhận tối đa 100 SKU mỗi lần
    const chunks = Array.from({ length: Math.ceil(unique.length / 100) }, (_, i) => unique.slice(i * 100, i * 100 + 100));
    const results = await Promise.all(
      chunks.map((chunk) => this.post<Api.StockResponse[]>('/batch', { skus: chunk } satisfies Api.SkuBatchRequest))
    );
    return new Map(results.flat().map((s) => [s.sku, s.available]));
  }
}

export const inventoryService = new InventoryService();
