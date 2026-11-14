import { keepPreviousData } from '@tanstack/react-query';
import { compatibilityService } from '../services/api/compatibilityService';
import { createQueryKeys, useApiQuery } from './BaseHook';

const keys = createQueryKeys('compatibility');

export interface CompatibilityInput {
  sku: string;
  quantity: number;
}

/**
 * POST /compatibility/check cho một danh sách linh kiện. Key theo nội dung danh sách (đã sắp xếp) nên đổi thứ tự
 * không gọi lại; giữ kết quả cũ trong lúc chờ kết quả mới để panel không nhấp nháy khi chọn thêm linh kiện.
 */
export function useCompatibility(lines: CompatibilityInput[], enabled = true) {
  const signature = [...lines].sort((a, b) => a.sku.localeCompare(b.sku)).map((l) => `${l.sku}x${l.quantity}`);
  return useApiQuery(keys.of(signature), () => compatibilityService.check(lines), {
    enabled: enabled && lines.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}
