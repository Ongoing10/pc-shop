import { reviewService } from '../services/api/reviewService';
import { productService } from '../services/api/productService';
import { CreateReviewPayload } from '../types/review';
import { MINUTE, createQueryKeys, useApiMutation, useApiQuery } from './BaseHook';
import { productKeys } from './useProducts';

const keys = createQueryKeys('reviews');

export const reviewKeys = {
  all: keys.all,
  list: (productId: string, userId?: string) => keys.of('list', productId, userId),
  stats: (productId: string) => keys.of('stats', productId),
  reviewedIds: (userId: string) => keys.of('reviewed', userId),
  priceHistory: (productId: string) => ['price-history', productId] as const,
};

export function useProductReviews(productId: string | undefined, userId?: string) {
  return useApiQuery(reviewKeys.list(productId || '', userId), () => reviewService.getReviews(productId!, userId), {
    enabled: Boolean(productId),
  });
}

export function useReviewStats(productId: string | undefined) {
  return useApiQuery(reviewKeys.stats(productId || ''), () => reviewService.getStats(productId!), {
    enabled: Boolean(productId),
  });
}

export function useReviewedProductIds(userId: string | undefined) {
  return useApiQuery(reviewKeys.reviewedIds(userId || ''), () => reviewService.getReviewedProductIds(userId!), {
    enabled: Boolean(userId),
  });
}

// Đánh giá được duyệt mới vào điểm của sản phẩm (ratingAvg), nên làm mới cả nhóm sản phẩm khi gửi/gỡ đánh giá
export function useCreateReview() {
  return useApiMutation(
    ({ payload, user }: { payload: CreateReviewPayload; user: { id: string; fullName: string } }) =>
      reviewService.createReview(payload, user),
    { invalidate: [reviewKeys.all] }
  );
}

export function useDeleteReview() {
  return useApiMutation((id: string) => reviewService.deleteReview(id), { invalidate: [reviewKeys.all, productKeys.all] });
}

export function usePriceHistory(productId: string | undefined) {
  return useApiQuery(reviewKeys.priceHistory(productId || ''), () => productService.getPriceHistory(productId!), {
    enabled: Boolean(productId),
    staleTime: 10 * MINUTE,
  });
}
