import { AppNotification, NotificationData, NotificationStreamEvent, NotificationType } from '../../types/notification';
import { storageService } from '../storage/storageService';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const NOTIFICATIONS_KEY = 'nexus_notifications_v2';

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3600000).toISOString();

/** Đường dẫn trong app từ data của thông báo (backend chỉ trả data) */
export const linkOf = (data?: NotificationData): string | undefined => {
  if (data?.order_code) return `/account/orders/${data.order_code}`;
  if (data?.product_id) return `/product/${data.product_id}#reviews`;
  return undefined;
};

const DEMO_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'nt_01',
    type: 'ORDER_STATUS',
    title: 'Đơn hàng đang được giao',
    content: 'Đơn DH20261105001003 đã bàn giao cho đơn vị vận chuyển.',
    data: { order_code: 'DH20261105001003', status: 5 },
    read: false,
    createdAt: hoursAgo(2),
  },
  {
    id: 'nt_02',
    type: 'PROMOTION',
    title: 'Mã BUILD500K cho cấu hình trọn bộ',
    content: 'Giảm 500.000 ₫ cho đơn từ 20 triệu. Áp dụng đến hết 31/12.',
    read: false,
    createdAt: hoursAgo(20),
  },
  {
    id: 'nt_03',
    type: 'REVIEW_REPLY',
    title: 'Cửa hàng đã trả lời đánh giá của bạn',
    content: 'Cảm ơn bạn đã đánh giá Samsung 990 PRO 1TB NVMe M.2.',
    data: { product_id: 'ssd990' },
    read: true,
    createdAt: hoursAgo(72),
  },
  {
    id: 'nt_04',
    type: 'ORDER_STATUS',
    title: 'Giao hàng thành công',
    content: 'Đơn DH20261025001001 đã giao xong. Hãy đánh giá sản phẩm bạn đã mua nhé!',
    data: { order_code: 'DH20261025001001', status: 6 },
    read: true,
    createdAt: hoursAgo(240),
  },
];

const read = (): AppNotification[] =>
  (storageService.get<AppNotification[] | null>(NOTIFICATIONS_KEY, null) ?? DEMO_NOTIFICATIONS).map((n) => ({
    ...n,
    link: n.link ?? linkOf(n.data),
  }));
const write = (list: AppNotification[]) => storageService.set(NOTIFICATIONS_KEY, list);

type Listener = (event: NotificationStreamEvent) => void;
const listeners = new Set<Listener>();

// Mock trên localStorage. Bản thật: notification-service (/notifications, /unread-count, /{id}/read, /read-all)
// và stream SSE: POST /notifications/stream-ticket rồi new EventSource(`/api/v1/notifications/stream?ticket=...`).
export const notificationService = {
  async getNotifications(): Promise<AppNotification[]> {
    await delay(120);
    return [...read()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async markRead(id: string): Promise<void> {
    await delay(60);
    write(read().map((n) => (n.id === id ? { ...n, read: true } : n)));
  },

  async markAllRead(): Promise<void> {
    await delay(100);
    write(read().map((n) => ({ ...n, read: true })));
  },

  /**
   * Giả lập stream SSE: gửi ngay "unread-count", sau đó "notification" mỗi khi có thông báo mới.
   * Bản thật: EventSource, addEventListener('unread-count' | 'notification'); trả về hàm đóng stream.
   */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    listener({ event: 'unread-count', data: { count: read().filter((n) => !n.read).length } });
    return () => listeners.delete(listener);
  },

  /**
   * Phía backend: NotificationConsumer sinh thông báo từ event (order.status-changed, review.replied).
   * Mock: orderService gọi hàm này khi đơn đổi trạng thái.
   */
  push(type: NotificationType, title: string, content: string, data?: NotificationData): AppNotification {
    const n: AppNotification = {
      id: `nt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      title,
      content,
      data,
      link: linkOf(data),
      read: false,
      createdAt: new Date().toISOString(),
    };
    write([n, ...read()]);
    listeners.forEach((l) => l({ event: 'notification', data: n }));
    return n;
  },
};
