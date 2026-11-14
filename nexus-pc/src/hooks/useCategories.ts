import { productService } from '../services/api/productService';
import { MINUTE, createQueryKeys, useApiQuery } from './BaseHook';

const keys = createQueryKeys('categories');

export const categoryKeys = { all: keys.all };

export function useCategories() {
  return useApiQuery(categoryKeys.all, () => productService.getCategories(), { staleTime: 30 * MINUTE });
}
