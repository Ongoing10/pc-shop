/** Giống Notification.type của notification-service */
export type NotificationType = 'ORDER_STATUS' | 'PAYMENT' | 'PROMOTION' | 'STOCK_BACK' | 'REVIEW_REPLY';

/** Dữ liệu điều hướng (snake_case như backend) */
export interface NotificationData {
  order_code?: string;
  status?: number;
  review_id?: string;
  sku?: string;
  product_id?: string;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  data?: NotificationData;
  /** Đường dẫn trong app, suy từ data (backend không trả link) */
  link?: string;
  read: boolean;
  createdAt: string;
}

/** Event của stream GET /notifications/stream (SSE) */
export type NotificationStreamEvent =
  | { event: 'unread-count'; data: { count: number } }
  | { event: 'notification'; data: AppNotification };
