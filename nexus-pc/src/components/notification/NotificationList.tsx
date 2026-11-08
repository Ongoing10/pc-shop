import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiPackage, FiTag, FiMessageSquare, FiCreditCard, FiBox } from 'react-icons/fi';
import { AppNotification, NotificationType } from '../../types/notification';
import { useMarkNotificationRead } from '../../hooks/useNotifications';

const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
  ORDER_STATUS: <FiPackage />,
  PAYMENT: <FiCreditCard />,
  PROMOTION: <FiTag />,
  REVIEW_REPLY: <FiMessageSquare />,
  STOCK_BACK: <FiBox />,
};

/** Lớp màu của icon (index.css: .notif-icon.order / .promotion / .review) */
const TYPE_CLASS: Record<NotificationType, string> = {
  ORDER_STATUS: 'order',
  PAYMENT: 'order',
  PROMOTION: 'promotion',
  REVIEW_REPLY: 'review',
  STOCK_BACK: 'promotion',
};

/** "2 giờ trước", "3 ngày trước" theo ngôn ngữ đang chọn */
export function formatRelativeTime(iso: string, locale: string): string {
  const diffSeconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, seconds] of units) {
    if (Math.abs(diffSeconds) >= seconds) return rtf.format(Math.round(diffSeconds / seconds), unit);
  }
  return rtf.format(0, 'minute');
}

interface NotificationListProps {
  items: AppNotification[];
  compact?: boolean;
  onNavigate?: () => void;
}

export const NotificationList: React.FC<NotificationListProps> = ({ items, compact = false, onNavigate }) => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const markRead = useMarkNotificationRead();
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN';

  const handleOpen = (n: AppNotification) => {
    if (!n.read) markRead.mutate(n.id);
    if (n.link) {
      onNavigate?.();
      navigate(n.link);
    }
  };

  return (
    <ul className={`notif-list ${compact ? 'compact' : ''}`}>
      {items.map((n) => (
        <li key={n.id}>
          <button type="button" className={n.read ? '' : 'unread'} onClick={() => handleOpen(n)}>
            <span className={`notif-icon ${TYPE_CLASS[n.type] ?? ''}`} aria-hidden="true">
              {TYPE_ICON[n.type]}
            </span>
            <span className="notif-text">
              <b>{n.title}</b>
              {!compact && <span>{n.content}</span>}
              <time dateTime={n.createdAt}>{formatRelativeTime(n.createdAt, locale)}</time>
            </span>
            {!n.read && <i className="notif-dot" aria-label="Chưa đọc" />}
          </button>
        </li>
      ))}
    </ul>
  );
};
