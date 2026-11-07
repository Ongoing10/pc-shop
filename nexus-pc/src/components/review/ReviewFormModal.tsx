import React, { useEffect, useState } from 'react';
import { Modal, Rate, Input, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useCreateReview } from '../../hooks/useReviews';

interface ReviewFormModalProps {
  open: boolean;
  product: { id: string; name: string; image: string } | null;
  onClose: () => void;
}

const MIN_CONTENT = 10;
const RATING_LABELS = ['Rất tệ', 'Chưa tốt', 'Bình thường', 'Tốt', 'Tuyệt vời'];

export const ReviewFormModal: React.FC<ReviewFormModalProps> = ({ open, product, onClose }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const createReview = useCreateReview();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setRating(5);
      setTitle('');
      setContent('');
      setTouched(false);
    }
  }, [open]);

  const contentError = content.trim().length < MIN_CONTENT;

  const handleSubmit = () => {
    setTouched(true);
    if (!product || !user || contentError || rating < 1) return;
    createReview.mutate(
      {
        payload: { productId: product.id, rating, title: title.trim(), content: content.trim() },
        user: { id: user.id, fullName: user.fullName },
      },
      {
        onSuccess: () => {
          message.success(t('review.submitted', 'Đã gửi đánh giá. Đánh giá sẽ hiển thị sau khi được duyệt.'));
          onClose();
        },
        onError: () => message.error(t('common.errorOccurred', 'Có lỗi xảy ra, vui lòng thử lại')),
      }
    );
  };

  return (
    <Modal
      open={open}
      title={t('review.writeTitle', 'Viết đánh giá')}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={t('review.submit', 'Gửi đánh giá')}
      cancelText={t('common.cancel', 'Hủy')}
      confirmLoading={createReview.isPending}
    >
      {product && (
        <div className="review-form">
          <div className="review-form-product">
            <img src={product.image} alt="" />
            <b>{product.name}</b>
          </div>

          <div className="review-form-rating">
            <Rate value={rating} onChange={setRating} aria-label={t('review.rating', 'Số sao')} />
            <span>{t(`review.ratingLabel${rating}`, RATING_LABELS[rating - 1] ?? '')}</span>
          </div>

          <label>
            {t('review.titleLabel', 'Tiêu đề (không bắt buộc)')}
            <Input
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('review.titlePlaceholder', 'Tóm tắt cảm nhận của bạn')}
            />
          </label>

          <label>
            {t('review.contentLabel', 'Nội dung')} *
            <Input.TextArea
              value={content}
              rows={4}
              maxLength={2000}
              showCount
              status={touched && contentError ? 'error' : undefined}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('review.contentPlaceholder', 'Hiệu năng, nhiệt độ, độ ồn, đóng gói, giao hàng...')}
            />
            {touched && contentError && (
              <small className="field-error">
                {t('review.contentTooShort', { count: MIN_CONTENT, defaultValue: `Nội dung tối thiểu ${MIN_CONTENT} ký tự.` })}
              </small>
            )}
          </label>
        </div>
      )}
    </Modal>
  );
};
