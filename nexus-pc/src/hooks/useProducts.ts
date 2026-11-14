import { productService } from '../services/api/productService';
import { ProductFilterParams } from '../types/product';
import { MINUTE, createQueryKeys, useApiQuery } from './BaseHook';

const keys = createQueryKeys('products');

export const productKeys = {
  all: keys.all,
  lists: () => keys.of('list'),
  list: (params?: ProductFilterParams) => keys.of('list', params),
  featured: (limit: number) => keys.of('featured', limit),
  deals: (limit: number) => keys.of('deals', limit),
  details: () => keys.of('detail'),
  detail: (id: string) => keys.of('detail', id),
};

export function useProducts(params?: ProductFilterParams) {
  return useApiQuery(productKeys.list(params), () => productService.getProducts(params), { staleTime: 5 * MINUTE });
}

export function useFeaturedProducts(limit = 4) {
  return useApiQuery(productKeys.featured(limit), () => productService.getFeaturedProducts(limit), { staleTime: 5 * MINUTE });
}

export function useDealProducts(limit = 4) {
  return useApiQuery(productKeys.deals(limit), () => productService.getDealProducts(limit), { staleTime: 5 * MINUTE });
}
