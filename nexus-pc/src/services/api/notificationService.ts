import { AppNotification } from '../../types/notification';
import { storageService } from '../storage/storageService';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const NOTIFICATIONS_KEY = 'nexus_notifications';

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3600000).toISOString();

const DEMO_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'nt_01',
    type: 'ORDER',
    title: 'Đơn hàng NX20261031 đang được giao',
    content: 'Đơn hàng đã bàn giao cho đơn vị vận chuyển, dự kiến giao trong 1-2 ngày.',
    link: '/account/orders/NX20261031',
    read: false,
    createdAt: hoursAgo(2),
  },
  {
    id: 'nt_02',
    type: 'PROMOTION',
    title: 'Mã BUILD500K cho cấu hình trọn bộ',
    content: 'Giảm 500.000 ₫ cho đơn từ 20 triệu. Áp dụng đến hết 31/12.',
    link: '/builder',
    read: false,
    createdAt: hoursAgo(20),
  },
  {
    id: 'nt_03',
    type: 'REVIEW',
    title: 'NEXUS PC đã trả lời đánh giá của bạn',
    content: 'Cảm ơn bạn đã đánh giá Samsung 990 PRO 1TB NVMe M.2.',
    link: '/product/ssd990#reviews',
    read: true,
    createdAt: hoursAgo(72),
  },
  {
    id: 'nt_04',
    type: 'ORDER',
    title: 'Đơn hàng NX20260987 đã giao thành công',
    content: 'Hãy để lại đánh giá để nhận ưu đãi cho lần mua tiếp theo.',
    link: '/account/orders/NX20260987',
    read: true,
    createdAt: hoursAgo(240),
  },
];

const read = (): AppNotification[] =>
  storageService.get<AppNotification[] | null>(NOTIFICATIONS_KEY, null) ?? DEMO_NOTIFICATIONS;
const write = (list: AppNotification[]) => storageService.set(NOTIFICATIONS_KEY, list);

// Mock trên localStorage. Bản thật: notification-service (/notifications, /unread-count, /{id}/read, /read-all).
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
};
