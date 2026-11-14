import { API_BASE_URL } from '../../config/env';
import type * as Api from '../../types/api';
import { AppNotification, NotificationData, NotificationStreamEvent } from '../../types/notification';
import { BaseService } from './BaseService';

/** Đường dẫn trong app từ data của thông báo (backend chỉ trả data, id sản phẩm trên URL FE là SKU) */
export const linkOf = (data?: NotificationData | null): string | undefined => {
  if (data?.order_code) return `/account/orders/${data.order_code}`;
  if (data?.sku) return `/product/${data.sku}#reviews`;
  return undefined;
};

const toNotification = (n: Api.Notification): AppNotification => {
  const data = (n.data ?? undefined) as NotificationData | undefined;
  return {
    id: n.id,
    type: n.type as AppNotification['type'],
    title: n.title,
    content: n.content,
    data,
    link: linkOf(data),
    read: n.isRead,
    createdAt: n.createdAt,
  };
};

type Listener = (event: NotificationStreamEvent) => void;

const STREAM_RETRY_MS = 5000;
const LIST_SIZE = 50;

/** notification-service: thông báo trong ứng dụng + stream realtime (SSE) */
class NotificationService extends BaseService {
  constructor() {
    super('/notifications');
  }

  /** Chỉ lấy kênh IN_APP (kênh EMAIL là bản ghi gửi thư, không hiển thị trong chuông) */
  async getNotifications(): Promise<AppNotification[]> {
    const page = await this.get<Api.PageResponse<Api.Notification>>('', { page: 0, size: LIST_SIZE });
    return page.content.filter((n) => n.channel === 'IN_APP').map(toNotification);
  }

  async markRead(id: string): Promise<void> {
    await this.patch(`/${id}/read`);
  }

  async markAllRead(): Promise<void> {
    await this.patch('/read-all');
  }

  /**
   * Stream SSE: POST /notifications/stream-ticket lấy vé dùng một lần (EventSource không gửi được header
   * Authorization) rồi mở /notifications/stream?ticket=. Mất kết nối thì chờ vài giây, lấy vé mới và mở lại.
   * Trả về hàm đóng stream.
   */
  subscribe(listener: Listener): () => void {
    let source: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let closed = false;

    const open = async () => {
      try {
        const { ticket } = await this.post<Api.StreamTicket>('/stream-ticket');
        if (closed) return;
        source = new EventSource(`${API_BASE_URL}/notifications/stream?ticket=${encodeURIComponent(ticket)}`);
        source.addEventListener('unread-count', (e) =>
          listener({ event: 'unread-count', data: JSON.parse((e as MessageEvent).data) })
        );
        source.addEventListener('notification', (e) =>
          listener({ event: 'notification', data: toNotification(JSON.parse((e as MessageEvent).data)) })
        );
        source.onerror = () => {
          // vé chỉ dùng một lần nên không để EventSource tự nối lại
          source?.close();
          scheduleRetry();
        };
      } catch {
        scheduleRetry();
      }
    };

    const scheduleRetry = () => {
      if (!closed) retryTimer = setTimeout(open, STREAM_RETRY_MS);
    };

    open();

    return () => {
      closed = true;
      clearTimeout(retryTimer);
      source?.close();
    };
  }
}

export const notificationService = new NotificationService();
