import { Order, OrderStatus, PaymentMethod, PaymentRecordStatus, PaymentStatus } from '../types/order';

type Meta = { labelKey: string; label: string; color: string };

/** Nhãn/màu trạng thái đơn phía khách (cùng mã và màu với trang quản trị, utils/adminStatus) */
export const ORDER_STATUS_META: Record<OrderStatus, Meta> = {
  1: { labelKey: 'orderStatus.1', label: 'Đang giữ hàng', color: 'gold' },
  2: { labelKey: 'orderStatus.2', label: 'Chờ thanh toán', color: 'orange' },
  3: { labelKey: 'orderStatus.3', label: 'Đã thanh toán', color: 'lime' },
  4: { labelKey: 'orderStatus.4', label: 'Đã xác nhận', color: 'blue' },
  5: { labelKey: 'orderStatus.5', label: 'Đang giao', color: 'cyan' },
  6: { labelKey: 'orderStatus.6', label: 'Hoàn tất', color: 'green' },
  7: { labelKey: 'orderStatus.7', label: 'Đã hủy', color: 'red' },
  8: { labelKey: 'orderStatus.8', label: 'Trả hàng', color: 'magenta' },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, Meta> = {
  1: { labelKey: 'paymentStatus.1', label: 'Chưa thanh toán', color: 'default' },
  2: { labelKey: 'paymentStatus.2', label: 'Đã thanh toán', color: 'green' },
  3: { labelKey: 'paymentStatus.3', label: 'Đã hoàn tiền', color: 'purple' },
};

export const PAYMENT_RECORD_STATUS_META: Record<PaymentRecordStatus, Meta> = {
  1: { labelKey: 'paymentRecord.1', label: 'Đang chờ', color: 'gold' },
  2: { labelKey: 'paymentRecord.2', label: 'Thành công', color: 'green' },
  3: { labelKey: 'paymentRecord.3', label: 'Thất bại', color: 'red' },
  4: { labelKey: 'paymentRecord.4', label: 'Hết hạn', color: 'default' },
  5: { labelKey: 'paymentRecord.5', label: 'Đã hoàn tiền', color: 'purple' },
};

export const PAYMENT_METHOD_META: Record<PaymentMethod, { labelKey: string; label: string }> = {
  1: { labelKey: 'checkout.cod', label: 'Thanh toán khi nhận hàng (COD)' },
  2: { labelKey: 'checkout.vnpay', label: 'Ví VNPay / thẻ ngân hàng' },
  3: { labelKey: 'checkout.momo', label: 'Ví MoMo' },
};

export const isOnlinePayment = (method: PaymentMethod) => method !== 1;

/** Thời hạn thanh toán đơn online (pcshop.order.payment-timeout của ordering-service) */
export const PAYMENT_TIMEOUT_MS = 15 * 60 * 1000;

/** Các bước của đơn bình thường theo cách thanh toán (đơn hủy/trả hàng không nằm trong luồng này) */
export const orderFlow = (method: PaymentMethod): OrderStatus[] =>
  isOnlinePayment(method) ? [1, 2, 3, 4, 5, 6] : [1, 4, 5, 6];

/** Khách tự hủy khi đơn ở 1, 2 hoặc 4 và chưa thanh toán (đã trả tiền thì phải liên hệ cửa hàng để hoàn) */
export const canCancelOrder = (order: Pick<Order, 'status' | 'paymentStatus'>) =>
  [1, 2, 4].includes(order.status) && order.paymentStatus !== 2;

/** Hạn thanh toán của đơn online đang chờ (placedAt + 15 phút) */
export const paymentDeadline = (order: Pick<Order, 'createdAt'>) =>
  new Date(new Date(order.createdAt).getTime() + PAYMENT_TIMEOUT_MS);

/** Nhóm lọc ở trang "Đơn của tôi" (frontend-context K07) */
export type OrderFilter = 'all' | 'processing' | 'shipping' | 'completed' | 'closed';
export const ORDER_FILTER_STATUSES: Record<Exclude<OrderFilter, 'all'>, OrderStatus[]> = {
  processing: [1, 2, 3, 4],
  shipping: [5],
  completed: [6],
  closed: [7, 8],
};
export const ORDER_FILTER_LABEL: Record<OrderFilter, { labelKey: string; label: string }> = {
  all: { labelKey: 'orders.all', label: 'Tất cả' },
  processing: { labelKey: 'orders.filterProcessing', label: 'Đang xử lý' },
  shipping: { labelKey: 'orders.filterShipping', label: 'Đang giao' },
  completed: { labelKey: 'orders.filterCompleted', label: 'Hoàn tất' },
  closed: { labelKey: 'orders.filterClosed', label: 'Đã hủy, trả' },
};

export const formatDateTime = (iso: string, locale = 'vi-VN') =>
  new Date(iso).toLocaleString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export const formatDate = (iso: string, locale = 'vi-VN') => new Date(iso).toLocaleDateString(locale);
