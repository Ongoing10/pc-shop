export type NotificationType = 'ORDER' | 'PROMOTION' | 'REVIEW' | 'SYSTEM';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  link?: string;
  read: boolean;
  createdAt: string;
}
