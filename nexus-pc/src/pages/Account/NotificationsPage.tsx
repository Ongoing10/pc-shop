import React, { useState } from 'react';
import { Button, Empty, Segmented } from 'antd';
import { useTranslation } from 'react-i18next';
import { AccountShell } from '../../components/account/AccountShell';
import { NotificationList } from '../../components/notification/NotificationList';
import { OrderListSkeleton } from '../../components/common/CustomSkeleton';
import { useAuth } from '../../context/AuthContext';
import { useMarkAllNotificationsRead, useNotifications } from '../../hooks/useNotifications';

export const NotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { data: notifications = [], isLoading } = useNotifications(isAuthenticated);
  const markAllRead = useMarkAllNotificationsRead();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unread = notifications.filter((n) => !n.read).length;
  const visible = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  return (
    <AccountShell
      title={t('account.tabNotifications', 'Thông báo')}
      subtitle={t('notifications.subtitle', 'Cập nhật đơn hàng, khuyến mãi và phản hồi đánh giá.')}
      actions={
        <Button disabled={unread === 0} loading={markAllRead.isPending} onClick={() => markAllRead.mutate()}>
          {t('notifications.markAllRead', 'Đánh dấu đã đọc tất cả')}
        </Button>
      }
    >
      <Segmented
        value={filter}
        onChange={(v) => setFilter(v as 'all' | 'unread')}
        options={[
          { value: 'all', label: `${t('notifications.all', 'Tất cả')} (${notifications.length})` },
          { value: 'unread', label: `${t('notifications.unread', 'Chưa đọc')} (${unread})` },
        ]}
        style={{ marginBottom: 16 }}
      />

      {isLoading ? (
        <OrderListSkeleton count={3} />
      ) : visible.length === 0 ? (
        <div className="emptybox">
          <Empty
            description={
              filter === 'unread'
                ? t('notifications.noUnread', 'Bạn đã đọc hết thông báo')
                : t('notifications.empty', 'Chưa có thông báo nào')
            }
          />
        </div>
      ) : (
        <NotificationList items={visible} />
      )}
    </AccountShell>
  );
};
