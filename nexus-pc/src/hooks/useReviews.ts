import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewService } from '../services/api/reviewService';
import { productService } from '../services/api/productService';
import { CreateReviewPayload } from '../types/review';

export const reviewKeys = {
  all: ['reviews'] as const,
  list: (productId: string, userId?: string) => [...reviewKeys.all, 'list', productId, userId] as const,
  stats: (productId: string) => [...reviewKeys.all, 'stats', productId] as const,
  reviewedIds: (userId: string) => [...reviewKeys.all, 'reviewed', userId] as const,
  priceHistory: (productId: string) => ['price-history', productId] as const,
};

export function useProductReviews(productId: string | undefined, userId?: string) {
  return useQuery({
    queryKey: reviewKeys.list(productId || '', userId),
    queryFn: () => reviewService.getReviews(productId || '', userId),
    enabled: Boolean(productId),
  });
}

export function useReviewStats(productId: string | undefined) {
  return useQuery({
    queryKey: reviewKeys.stats(productId || ''),
    queryFn: () => reviewService.getStats(productId || ''),
    enabled: Boolean(productId),
  });
}

export function useReviewedProductIds(userId: string | undefined) {
  return useQuery({
    queryKey: reviewKeys.reviewedIds(userId || ''),
    queryFn: () => reviewService.getReviewedProductIds(userId || ''),
    enabled: Boolean(userId),
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload, user }: { payload: CreateReviewPayload; user: { id: string; fullName: string } }) =>
      reviewService.createReview(payload, user),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reviewKeys.all }),
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => reviewService.deleteReview(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reviewKeys.all }),
  });
}

export function usePriceHistory(productId: string | undefined) {
  return useQuery({
    queryKey: reviewKeys.priceHistory(productId || ''),
    queryFn: () => productService.getPriceHistory(productId || ''),
    enabled: Boolean(productId),
    staleTime: 1000 * 60 * 10,
  });
}
