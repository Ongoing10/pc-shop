import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Popover } from 'antd';
import { useTranslation } from 'react-i18next';
import { FiBell } from 'react-icons/fi';
import { NotificationList } from './NotificationList';
import { useMarkAllNotificationsRead, useNotificationStream, useNotifications } from '../../hooks/useNotifications';

const PREVIEW_COUNT = 5;

export const NotificationBell: React.FC = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data: notifications = [] } = useNotifications();
  // Chuông chỉ hiện khi đã đăng nhập: mở stream realtime ở đây (một kết nối cho cả ứng dụng)
  useNotificationStream(true);
  const markAllRead = useMarkAllNotificationsRead();
  const unread = notifications.filter((n) => !n.read).length;

  const content = (
    <div className="notif-pop">
      <header>
        <b>{t('account.tabNotifications', 'Thông báo')}</b>
        {unread > 0 && (
          <Button type="link" size="small" onClick={() => markAllRead.mutate()}>
            {t('notifications.markAllReadShort', 'Đọc tất cả')}
          </Button>
        )}
      </header>
      {notifications.length === 0 ? (
        <p className="notif-empty">{t('notifications.empty', 'Chưa có thông báo nào')}</p>
      ) : (
        <NotificationList items={notifications.slice(0, PREVIEW_COUNT)} compact onNavigate={() => setOpen(false)} />
      )}
      <Link to="/account/notifications" onClick={() => setOpen(false)} className="notif-all">
        {t('notifications.viewAll', 'Xem tất cả thông báo')}
      </Link>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={setOpen}
      arrow={false}
    >
      <button
        type="button"
        aria-label={t('notifications.bellLabel', { count: unread, defaultValue: `Thông báo (${unread} chưa đọc)` })}
      >
        <Badge count={unread} offset={[2, -2]} overflowCount={9} color="var(--accent-solid)" style={{ color: 'var(--on-accent)', fontWeight: 700 }}>
          <FiBell style={{ fontSize: 20, color: 'var(--text)' }} aria-hidden="true" />
        </Badge>
      </button>
    </Popover>
  );
};
