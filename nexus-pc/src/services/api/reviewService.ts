import { CreateReviewPayload, Review, ReviewStats } from '../../types/review';
import { storageService } from '../storage/storageService';
import { initialProducts } from './mockData';
import { orderService } from './orderService';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const MY_REVIEWS_KEY = 'nexus_my_reviews';

const REVIEW_POOL: Array<Pick<Review, 'userDisplayName' | 'rating' | 'title' | 'content' | 'verifiedPurchase' | 'helpfulCount'> & { reply?: string }> = [
  {
    userDisplayName: 'Minh Tuấn',
    rating: 5,
    title: 'Đúng như mô tả, đóng gói kỹ',
    content: 'Hàng chính hãng, tem bảo hành đầy đủ. Lắp vào chạy ổn định, nhiệt độ mát hơn mình nghĩ.',
    verifiedPurchase: true,
    helpfulCount: 12,
    reply: 'Cảm ơn anh Tuấn đã tin tưởng NEXUS PC. Chúc anh có trải nghiệm thật tốt!',
  },
  {
    userDisplayName: 'Hoàng Long',
    rating: 5,
    title: 'Hiệu năng tốt trong tầm giá',
    content: 'Chơi game 2K mượt, không thấy coil whine. Nhân viên tư vấn cấu hình nhiệt tình.',
    verifiedPurchase: true,
    helpfulCount: 7,
  },
  {
    userDisplayName: 'Thu Hà',
    rating: 4,
    title: 'Ổn, giao hơi chậm',
    content: 'Sản phẩm tốt, tuy nhiên giao mất 4 ngày do cuối tuần. Đóng gói chống sốc cẩn thận.',
    verifiedPurchase: true,
    helpfulCount: 3,
    reply: 'NEXUS PC xin lỗi chị Hà vì thời gian giao hàng. Bên em đã ghi nhận để cải thiện ạ.',
  },
  {
    userDisplayName: 'Quang Huy',
    rating: 4,
    title: 'Đáng tiền',
    content: 'So với mấy chỗ khác giá tốt hơn một chút, bảo hành dài. Trừ một sao vì hộp hơi móp.',
    verifiedPurchase: false,
    helpfulCount: 1,
  },
];

/** Băm đơn giản để mỗi sản phẩm có bộ đánh giá mẫu cố định */
const hashOf = (text: string) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const sampleReviews = (productId: string): Review[] => {
  const start = hashOf(productId) % REVIEW_POOL.length;
  return [0, 1, 2].map((offset, i) => {
    const r = REVIEW_POOL[(start + offset) % REVIEW_POOL.length];
    const createdAt = new Date(Date.now() - (i * 9 + 3) * 86400000).toISOString();
    return {
      id: `rv_${productId}_${i}`,
      productId,
      userId: `usr_sample_${i}`,
      userDisplayName: r.userDisplayName,
      rating: r.rating,
      title: r.title,
      content: r.content,
      verifiedPurchase: r.verifiedPurchase,
      helpfulCount: r.helpfulCount,
      status: 'APPROVED',
      adminReply: r.reply ? { content: r.reply, repliedAt: createdAt } : undefined,
      createdAt,
    };
  });
};

const readMine = (): Review[] => storageService.get<Review[]>(MY_REVIEWS_KEY, []);

// Mock. Bản thật: review-service (GET /reviews?productId=, GET /reviews/stats, POST/PUT/DELETE /reviews).
export const reviewService = {
  /** Đánh giá đã duyệt của mọi người + đánh giá của chính mình (kể cả đang chờ duyệt) */
  async getReviews(productId: string, userId?: string): Promise<Review[]> {
    await delay(150);
    const mine = readMine().filter((r) => r.productId === productId && r.userId === userId);
    return [...mine, ...sampleReviews(productId)];
  },

  async getStats(productId: string): Promise<ReviewStats> {
    await delay(100);
    const product = initialProducts.find((p) => p.id === productId);
    const count = product?.reviews ?? 0;
    const average = product?.rating ?? 0;
    // Phân bố xấp xỉ theo điểm trung bình của sản phẩm mẫu
    const weights =
      average >= 4.8 ? [0.01, 0.01, 0.03, 0.12, 0.83] : average >= 4.5 ? [0.02, 0.04, 0.07, 0.22, 0.65] : [0.05, 0.08, 0.12, 0.3, 0.45];
    const counts = weights.map((w) => Math.round(w * count));
    counts[4] += count - counts.reduce((a, b) => a + b, 0);
    return {
      average,
      count,
      distribution: { 1: counts[0], 2: counts[1], 3: counts[2], 4: counts[3], 5: counts[4] },
    };
  },

  /** Backend tự hỏi ordering (GET /orders/purchased): có đơn hoàn tất chứa sản phẩm → verifiedPurchase + orderCode */
  async createReview(payload: CreateReviewPayload, user: { id: string; fullName: string }): Promise<Review> {
    await delay(250);
    const purchase = await orderService.getPurchase(payload.productId);
    const review: Review = {
      id: `rv_${Date.now()}`,
      ...payload,
      userId: user.id,
      userDisplayName: user.fullName || 'Khách hàng',
      verifiedPurchase: purchase.purchased,
      orderCode: purchase.orderCode,
      helpfulCount: 0,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    storageService.set(MY_REVIEWS_KEY, [review, ...readMine()]);
    return review;
  },

  /** Khách chỉ xóa được đánh giá của mình (backend chuyển sang DELETED_BY_USER) */
  async deleteReview(id: string): Promise<void> {
    await delay(150);
    storageService.set(
      MY_REVIEWS_KEY,
      readMine().filter((r) => r.id !== id)
    );
  },

  /** Sản phẩm (trong đơn) mà user đã viết đánh giá */
  async getReviewedProductIds(userId: string): Promise<string[]> {
    await delay(60);
    return readMine()
      .filter((r) => r.userId === userId)
      .map((r) => r.productId);
  },
};
