import type * as Api from '../../types/api';
import { CreateReviewPayload, Review, ReviewStats, ReviewStatus } from '../../types/review';
import { storageService } from '../storage/storageService';
import { BaseService } from './BaseService';
import { isApiError } from './ApiError';

const STATUS: Partial<Record<Api.ReviewStatus, ReviewStatus>> = { 1: 'PENDING', 2: 'APPROVED', 3: 'REJECTED' };

/** productId của FE chính là SKU (id sản phẩm ở FE = SKU) */
export const toReview = (r: Api.Review): Review => ({
  id: r.id,
  productId: r.sku,
  userId: r.userId,
  userDisplayName: r.userDisplayName,
  rating: r.rating,
  title: r.title ?? '',
  content: r.content ?? '',
  verifiedPurchase: r.verifiedPurchase,
  orderCode: r.orderCode,
  helpfulCount: r.helpfulCount,
  status: STATUS[r.status] ?? 'PENDING',
  adminReply: r.adminReply ? { content: r.adminReply.content, repliedAt: r.adminReply.repliedAt } : undefined,
  createdAt: r.createdAt,
});

/**
 * Backend chưa có API "đánh giá của tôi", mà đánh giá đang chờ duyệt không nằm trong danh sách công khai.
 * Nên FE nhớ các đánh giá đã gửi từ trình duyệt này (id + sku + người viết) và lấy lại từng cái bằng GET /reviews/{id}
 * (chủ review xem được cả khi chưa duyệt). Đổi trình duyệt thì chỉ còn thấy các đánh giá đã duyệt.
 */
const MY_REFS_KEY = 'nexus_my_review_refs';
interface ReviewRef {
  id: string;
  sku: string;
  userId: string;
}
const readRefs = (): ReviewRef[] => storageService.get<ReviewRef[]>(MY_REFS_KEY, []);
const writeRefs = (refs: ReviewRef[]) => storageService.set(MY_REFS_KEY, refs);

const PAGE_SIZE = 50;

/** review-service: đánh giá sản phẩm */
class ReviewService extends BaseService {
  constructor() {
    super('/reviews');
  }

  /** Đánh giá đã duyệt của mọi người + đánh giá của chính mình (kể cả đang chờ duyệt, đứng đầu danh sách) */
  async getReviews(productId: string, userId?: string): Promise<Review[]> {
    const [page, mine] = await Promise.all([
      this.get<Api.PageResponse<Api.Review>>('', { sku: productId, page: 0, size: PAGE_SIZE }),
      userId ? this.getMine(userId, productId) : Promise.resolve<Api.Review[]>([]),
    ]);
    const approvedIds = new Set(page.content.map((r) => r.id));
    return [...mine.filter((r) => !approvedIds.has(r.id)), ...page.content].map(toReview);
  }

  private async getMine(userId: string, sku: string): Promise<Api.Review[]> {
    const refs = readRefs().filter((r) => r.userId === userId && r.sku === sku);
    const found = await Promise.all(
      refs.map((ref) =>
        this.get<Api.Review>(`/${ref.id}`).catch((e) => {
          // đã bị xóa / không còn xem được: bỏ khỏi danh sách nhớ
          if (isApiError(e) && (e.status === 404 || e.status === 403)) {
            writeRefs(readRefs().filter((r) => r.id !== ref.id));
            return null;
          }
          throw e;
        })
      )
    );
    return found.filter((r): r is Api.Review => r !== null && r.status !== 4);
  }

  async getStats(productId: string): Promise<ReviewStats> {
    const s = await this.get<Api.ReviewStats>('/stats', { sku: productId });
    return {
      average: s.average,
      count: s.count,
      distribution: { 1: s.distribution['1'], 2: s.distribution['2'], 3: s.distribution['3'], 4: s.distribution['4'], 5: s.distribution['5'] },
    };
  }

  /** Backend tự hỏi ordering: có đơn hoàn tất chứa sản phẩm → verifiedPurchase + orderCode. Mỗi người một đánh giá cho một sản phẩm (409) */
  async createReview(payload: CreateReviewPayload, user: { id: string; fullName: string }): Promise<Review> {
    const body: Api.CreateReviewRequest = {
      sku: payload.productId,
      rating: payload.rating,
      title: payload.title || null,
      content: payload.content || null,
    };
    const created = await this.post<Api.Review>('', body);
    writeRefs([...readRefs(), { id: created.id, sku: created.sku, userId: user.id }]);
    return toReview(created);
  }

  /** Khách chỉ xóa được đánh giá của mình (backend chuyển sang DELETED_BY_USER) */
  async deleteReview(id: string): Promise<void> {
    await this.remove(`/${id}`);
    writeRefs(readRefs().filter((r) => r.id !== id));
  }

  /** SKU sản phẩm mà user đã gửi đánh giá từ trình duyệt này (xem ghi chú ở MY_REFS_KEY) */
  async getReviewedProductIds(userId: string): Promise<string[]> {
    return readRefs()
      .filter((r) => r.userId === userId)
      .map((r) => r.sku);
  }
}

export const reviewService = new ReviewService();
