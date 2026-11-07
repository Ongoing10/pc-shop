import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Button, Empty, Popconfirm, Progress, Rate, Tag, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { FiCheckCircle, FiCornerDownRight } from 'react-icons/fi';
import { ReviewFormModal } from './ReviewFormModal';
import { useAuth } from '../../context/AuthContext';
import { useDeleteReview, useProductReviews, useReviewStats } from '../../hooks/useReviews';
import { Product } from '../../types/product';
import { formatDate } from '../../utils/orderStatus';

export const ReviewSection: React.FC<{ product: Product }> = ({ product }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { data: stats } = useReviewStats(product.id);
  const { data: reviews = [], isLoading } = useProductReviews(product.id, user?.id);
  const deleteReview = useDeleteReview();
  const [formOpen, setFormOpen] = useState(false);
  const [starFilter, setStarFilter] = useState<number | null>(null);

  const hasMine = reviews.some((r) => r.userId === user?.id);
  const visible = starFilter ? reviews.filter((r) => r.rating === starFilter) : reviews;

  const handleWrite = () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/product/${product.id}`)}`);
      return;
    }
    setFormOpen(true);
  };

  return (
    <div className="reviews">
      <aside className="review-summary">
        <div className="review-score">
          <b>{stats?.average.toFixed(1) ?? '–'}</b>
          <span>
            <Rate disabled allowHalf value={stats?.average ?? 0} />
            <small>{t('common.reviews', { count: stats?.count ?? 0, defaultValue: `${stats?.count ?? 0} đánh giá` })}</small>
          </span>
        </div>

        <ul className="review-bars">
          {([5, 4, 3, 2, 1] as const).map((star) => {
            const count = stats?.distribution[star] ?? 0;
            const ratio = stats && stats.count > 0 ? count / stats.count : 0;
            return (
              <li key={star}>
                <button
                  type="button"
                  className={starFilter === star ? 'active' : ''}
                  aria-pressed={starFilter === star}
                  onClick={() => setStarFilter(starFilter === star ? null : star)}
                >
                  <span>{star} ★</span>
                  <Progress percent={ratio * 100} showInfo={false} size="small" strokeColor="var(--warn)" />
                  <small className="num">{count}</small>
                </button>
              </li>
            );
          })}
        </ul>

        <Button type="primary" block onClick={handleWrite} disabled={hasMine}>
          {hasMine
            ? t('review.alreadyReviewed', 'Bạn đã đánh giá sản phẩm này')
            : isAuthenticated
              ? t('review.write', 'Viết đánh giá')
              : t('review.loginToWrite', 'Đăng nhập để viết đánh giá')}
        </Button>
      </aside>

      <div className="review-list">
        {starFilter && (
          <div className="review-filter">
            {t('review.filtering', { star: starFilter, defaultValue: `Đang lọc đánh giá ${starFilter} sao` })}
            <Button type="link" size="small" onClick={() => setStarFilter(null)}>
              {t('catalog.clearFilters', 'Xóa lọc')}
            </Button>
          </div>
        )}

        {!isLoading && visible.length === 0 ? (
          <Empty
            description={
              starFilter
                ? t('review.noneForStar', 'Chưa có đánh giá ở mức sao này')
                : t('review.none', 'Chưa có đánh giá nào. Hãy là người đầu tiên!')
            }
          />
        ) : (
          visible.map((r) => {
            const isMine = r.userId === user?.id;
            return (
              <article key={r.id} className={`review-item ${isMine ? 'mine' : ''}`}>
                <header>
                  <Avatar className="avatar" size={32} aria-hidden="true">
                    {r.userDisplayName.trim().split(' ').slice(-1)[0]?.charAt(0).toUpperCase()}
                  </Avatar>
                  <span>
                    <b>{r.userDisplayName}</b>
                    {r.verifiedPurchase && (
                      <small className="verified">
                        <FiCheckCircle aria-hidden="true" /> {t('review.verified', 'Đã mua hàng')}
                      </small>
                    )}
                  </span>
                  <time dateTime={r.createdAt}>{formatDate(r.createdAt)}</time>
                </header>
                <div className="review-rating">
                  <Rate disabled value={r.rating} />
                  {r.status === 'PENDING' && <Tag color="gold">{t('review.pending', 'Đang chờ duyệt')}</Tag>}
                </div>
                {r.title && <h4>{r.title}</h4>}
                <p>{r.content}</p>
                {r.adminReply && (
                  <div className="admin-reply">
                    <FiCornerDownRight aria-hidden="true" />
                    <div>
                      <b>{t('review.shopReply', 'NEXUS PC phản hồi')}</b>
                      <p>{r.adminReply.content}</p>
                    </div>
                  </div>
                )}
                {isMine && (
                  <Popconfirm
                    title={t('review.deleteConfirm', 'Xóa đánh giá của bạn?')}
                    okText={t('common.remove', 'Xóa')}
                    cancelText={t('common.cancel', 'Hủy')}
                    okButtonProps={{ danger: true }}
                    onConfirm={() =>
                      deleteReview.mutate(r.id, {
                        onSuccess: () => message.success(t('review.deleted', 'Đã xóa đánh giá.')),
                      })
                    }
                  >
                    <Button type="link" danger size="small" style={{ paddingInline: 0 }}>
                      {t('review.delete', 'Xóa đánh giá')}
                    </Button>
                  </Popconfirm>
                )}
              </article>
            );
          })
        )}
      </div>

      <ReviewFormModal open={formOpen} product={product} onClose={() => setFormOpen(false)} />
    </div>
  );
};
