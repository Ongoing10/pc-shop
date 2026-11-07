import { OrderStatus } from '../types/order';

export const ORDER_STATUS_META: Record<OrderStatus, { labelKey: string; label: string; color: string }> = {
  pending: { labelKey: 'orderStatus.pending', label: 'Chờ xác nhận', color: 'gold' },
  processing: { labelKey: 'orderStatus.processing', label: 'Đang chuẩn bị', color: 'blue' },
  shipping: { labelKey: 'orderStatus.shipping', label: 'Đang giao', color: 'cyan' },
  delivered: { labelKey: 'orderStatus.delivered', label: 'Đã giao', color: 'green' },
  cancelled: { labelKey: 'orderStatus.cancelled', label: 'Đã hủy', color: 'red' },
};

/** Thứ tự các bước của đơn bình thường (đơn hủy không nằm trong luồng này) */
export const ORDER_FLOW: OrderStatus[] = ['pending', 'processing', 'shipping', 'delivered'];

export const formatDateTime = (iso: string, locale = 'vi-VN') =>
  new Date(iso).toLocaleString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export const formatDate = (iso: string, locale = 'vi-VN') => new Date(iso).toLocaleDateString(locale);
