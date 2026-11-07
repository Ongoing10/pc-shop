import { useQuery } from '@tanstack/react-query';
import { productService } from '../services/api/productService';

export const categoryKeys = {
  all: ['categories'] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: () => productService.getCategories(),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}
