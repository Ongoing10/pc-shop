export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userDisplayName: string;
  rating: number;
  title: string;
  content: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
  status: ReviewStatus;
  adminReply?: { content: string; repliedAt: string };
  createdAt: string;
}

/** Giống GET /reviews/stats?productId= (chỉ tính đánh giá APPROVED) */
export interface ReviewStats {
  average: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface CreateReviewPayload {
  productId: string;
  rating: number;
  title: string;
  content: string;
}

export interface PriceHistoryEntry {
  oldPrice: number;
  newPrice: number;
  reason: string;
  changedAt: string;
}
