import {
  CompatSeverity,
  OrderStatus,
  PaymentMethod,
  PaymentRecordStatus,
  PaymentStatus,
  Permission,
  RefundStatus,
  ProductStatus,
  RealmRole,
  ReviewStatus,
  StockMovementType,
  VoucherType,
  AdminVoucher,
} from '../types/admin';

type Meta = { label: string; color: string };

export const PRODUCT_STATUS_META: Record<ProductStatus, Meta> = {
  1: { label: 'Nháp', color: 'default' },
  2: { label: 'Đang bán', color: 'green' },
  3: { label: 'Đã ẩn', color: 'orange' },
  4: { label: 'Ngừng bán', color: 'red' },
};

export const ORDER_STATUS_META: Record<OrderStatus, Meta> = {
  1: { label: 'Đang giữ hàng', color: 'gold' },
  2: { label: 'Chờ thanh toán', color: 'orange' },
  3: { label: 'Đã thanh toán', color: 'lime' },
  4: { label: 'Đã xác nhận', color: 'blue' },
  5: { label: 'Đang giao', color: 'cyan' },
  6: { label: 'Hoàn tất', color: 'green' },
  7: { label: 'Đã hủy', color: 'red' },
  8: { label: 'Trả hàng', color: 'magenta' },
};

/**
 * Bước nhân viên được chuyển tay (frontend-context mục g.2). 1 Đang giữ hàng là bước Saga (vài giây): hệ thống tự chuyển
 * sang 4 (COD) / 2 (online) / 7 (hết hàng), nhân viên chỉ được hủy. 2 → 3: xác nhận tay khi khách chuyển khoản / trả tại quầy.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  1: [7],
  2: [3, 7],
  3: [4, 7],
  4: [5, 7],
  5: [6, 8],
  6: [8],
  7: [],
  8: [],
};

/** Chuyển sang 7 hoặc 8 bắt buộc nhập lý do */
export const ORDER_STATUS_NEEDS_REASON: OrderStatus[] = [7, 8];

/** Luồng chuẩn để vẽ mờ các bước tương lai ở timeline */
export const ORDER_MAIN_FLOW: OrderStatus[] = [1, 4, 5, 6];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = { 1: 'COD', 2: 'VNPay', 3: 'MoMo' };

export const PAYMENT_STATUS_META: Record<PaymentStatus, Meta> = {
  1: { label: 'Chưa thanh toán', color: 'default' },
  2: { label: 'Đã thanh toán', color: 'green' },
  3: { label: 'Đã hoàn tiền', color: 'purple' },
};

export const PAYMENT_RECORD_STATUS_META: Record<PaymentRecordStatus, Meta> = {
  1: { label: 'Đang chờ', color: 'gold' },
  2: { label: 'Thành công', color: 'green' },
  3: { label: 'Thất bại', color: 'red' },
  4: { label: 'Hết hạn', color: 'default' },
  5: { label: 'Đã hoàn tiền', color: 'purple' },
};

export const REFUND_STATUS_META: Record<RefundStatus, Meta> = {
  1: { label: 'Chờ hoàn', color: 'orange' },
  2: { label: 'Đã hoàn', color: 'green' },
};

export const REVIEW_STATUS_META: Record<ReviewStatus, Meta> = {
  1: { label: 'Chờ duyệt', color: 'gold' },
  2: { label: 'Đã duyệt', color: 'green' },
  3: { label: 'Từ chối', color: 'red' },
  4: { label: 'Người viết đã gỡ', color: 'default' },
};

export const VOUCHER_TYPE_LABEL: Record<VoucherType, string> = {
  1: 'Giảm theo %',
  2: 'Giảm số tiền',
  3: 'Miễn phí vận chuyển',
};

export const MOVEMENT_TYPE_META: Record<StockMovementType, Meta> = {
  1: { label: 'Nhập kho', color: 'green' },
  2: { label: 'Xuất bán', color: 'blue' },
  3: { label: 'Hoàn trả', color: 'purple' },
  4: { label: 'Điều chỉnh', color: 'orange' },
};

export const SEVERITY_META: Record<CompatSeverity, Meta> = {
  1: { label: 'Lỗi', color: 'red' },
  2: { label: 'Cảnh báo', color: 'gold' },
};

export const ROLE_LABEL: Record<RealmRole, string> = {
  CUSTOMER: 'Khách hàng',
  STAFF: 'Nhân viên',
  ADMIN: 'Quản trị',
};

export const PERMISSION_LABEL: Record<Permission, string> = {
  'product:write': 'Quản lý sản phẩm, danh mục, luật tương thích',
  'order:update-status': 'Đổi trạng thái đơn hàng',
  'inventory:write': 'Nhập kho, điều chỉnh tồn',
  'knowledge:write': 'Kho tri thức AI',
};

export type VoucherPhase = 'upcoming' | 'running' | 'expired';

export const VOUCHER_PHASE_META: Record<VoucherPhase, Meta> = {
  upcoming: { label: 'Chưa bắt đầu', color: 'blue' },
  running: { label: 'Đang chạy', color: 'green' },
  expired: { label: 'Hết hạn', color: 'default' },
};

/** Nhãn thời gian của voucher tính từ startAt/endAt */
export const voucherPhase = (v: Pick<AdminVoucher, 'startAt' | 'endAt'>, now = Date.now()): VoucherPhase => {
  if (v.startAt && new Date(v.startAt).getTime() > now) return 'upcoming';
  if (v.endAt && new Date(v.endAt).getTime() < now) return 'expired';
  return 'running';
};

/** Số lượng có thể bán của một dòng tồn kho */
export const availableQty = (row: { quantity: number; reservedQuantity: number }) => row.quantity - row.reservedQuantity;
