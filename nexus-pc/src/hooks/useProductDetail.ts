import { useQuery } from '@tanstack/react-query';
import { productService } from '../services/api/productService';
import { productKeys } from './useProducts';

export function useProductDetail(id: string | undefined) {
  return useQuery({
    queryKey: productKeys.detail(id || ''),
    queryFn: () => (id ? productService.getProductById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 10,
  });
}
