import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { App } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/api/notificationService';
import { AppNotification } from '../types/notification';
import { createQueryKeys, useApiMutation, useApiQuery } from './BaseHook';

const keys = createQueryKeys('notifications');

export const notificationKeys = { all: keys.all };

/**
 * Danh sách thông báo. Thông báo mới đến qua stream (useNotificationStream) nên không cần hỏi lại định kỳ.
 */
export function useNotifications(enabled = true) {
  return useApiQuery(notificationKeys.all, () => notificationService.getNotifications(), { enabled });
}

/**
 * Mở stream thông báo realtime (SSE) khi đã đăng nhập: thông báo mới chèn đầu danh sách (badge tăng ngay) và hiện toast.
 * Gắn một lần ở chuông thông báo. Việc lấy vé, mở EventSource và nối lại khi mất kết nối nằm ở notificationService.subscribe.
 */
export function useNotificationStream(enabled: boolean) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { notification } = App.useApp();

  useEffect(() => {
    if (!enabled) return;
    return notificationService.subscribe((e) => {
      if (e.event !== 'notification') return;
      const n = e.data;
      queryClient.setQueryData<AppNotification[]>(notificationKeys.all, (prev) => (prev ? [n, ...prev] : prev));
      notification.info({
        key: n.id,
        title: n.title,
        description: n.content,
        placement: 'bottomRight',
        onClick: () => {
          if (n.link) navigate(n.link);
          notification.destroy(n.id);
        },
      });
    });
  }, [enabled, queryClient, navigate, notification]);
}

export function useMarkNotificationRead() {
  return useApiMutation((id: string) => notificationService.markRead(id), { invalidate: [notificationKeys.all] });
}

export function useMarkAllNotificationsRead() {
  return useApiMutation(() => notificationService.markAllRead(), { invalidate: [notificationKeys.all] });
}
