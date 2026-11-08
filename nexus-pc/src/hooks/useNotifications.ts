import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { App } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/api/notificationService';
import { AppNotification } from '../types/notification';

export const notificationKeys = {
  all: ['notifications'] as const,
};

/**
 * Danh sách thông báo. Thông báo mới đến qua stream (useNotificationStream) nên không cần hỏi lại định kỳ;
 * bản thật nên fallback GET /notifications/unread-count mỗi 60 giây khi stream lỗi.
 */
export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.all,
    queryFn: () => notificationService.getNotifications(),
    enabled,
  });
}

/**
 * Mở stream thông báo realtime (SSE) khi đã đăng nhập: thông báo mới chèn đầu danh sách (badge tăng ngay) và hiện toast.
 * Gắn một lần ở chuông thông báo. Bản thật: POST /notifications/stream-ticket → EventSource(...?ticket=),
 * mất kết nối thì đóng, chờ vài giây, lấy vé mới rồi mở lại.
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
