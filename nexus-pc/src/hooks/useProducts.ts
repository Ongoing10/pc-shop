import { useQuery } from '@tanstack/react-query';
import { productService } from '../services/api/productService';
import { ProductFilterParams } from '../types/product';

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params?: ProductFilterParams) => [...productKeys.lists(), params] as const,
  featured: (limit: number) => [...productKeys.all, 'featured', limit] as const,
  deals: (limit: number) => [...productKeys.all, 'deals', limit] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

export function useProducts(params?: ProductFilterParams) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productService.getProducts(params),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

export function useFeaturedProducts(limit = 4) {
  return useQuery({
    queryKey: productKeys.featured(limit),
    queryFn: () => productService.getFeaturedProducts(limit),
    staleTime: 1000 * 60 * 5,
  });
}

export function useDealProducts(limit = 4) {
  return useQuery({
    queryKey: productKeys.deals(limit),
    queryFn: () => productService.getDealProducts(limit),
    staleTime: 1000 * 60 * 5,
  });
}
