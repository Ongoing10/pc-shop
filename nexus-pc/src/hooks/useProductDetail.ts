import { productService } from '../services/api/productService';
import { MINUTE, useApiQuery } from './BaseHook';
import { productKeys } from './useProducts';

export function useProductDetail(id: string | undefined) {
  return useApiQuery(productKeys.detail(id || ''), () => productService.getProductById(id!), {
    enabled: Boolean(id),
    staleTime: 10 * MINUTE,
  });
}
