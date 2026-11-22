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
import { t } from '../i18n/t';

type Meta = { label: string; color: string };

export const PRODUCT_STATUS_META: Record<ProductStatus, Meta> = {
  1: { get label() { return t('admin.common.draft', 'Nháp'); }, color: 'default' },
  2: { get label() { return t('admin.common.onSale', 'Đang bán'); }, color: 'green' },
  3: { get label() { return t('admin.status.hidden', 'Đã ẩn'); }, color: 'orange' },
  4: { get label() { return t('admin.status.discontinued', 'Ngừng bán'); }, color: 'red' },
};

export const ORDER_STATUS_META: Record<OrderStatus, Meta> = {
  1: { get label() { return t('admin.status.reservingStock', 'Đang giữ hàng'); }, color: 'gold' },
  2: { get label() { return t('admin.status.awaitingPayment', 'Chờ thanh toán'); }, color: 'orange' },
  3: { get label() { return t('admin.status.paid', 'Đã thanh toán'); }, color: 'lime' },
  4: { get label() { return t('admin.status.confirmed', 'Đã xác nhận'); }, color: 'blue' },
  5: { get label() { return t('admin.status.shipping', 'Đang giao'); }, color: 'cyan' },
  6: { get label() { return t('admin.common.done', 'Hoàn tất'); }, color: 'green' },
  7: { get label() { return t('admin.status.cancelled', 'Đã hủy'); }, color: 'red' },
  8: { get label() { return t('admin.status.returned', 'Trả hàng'); }, color: 'magenta' },
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
  1: { get label() { return t('admin.status.unpaid', 'Chưa thanh toán'); }, color: 'default' },
  2: { get label() { return t('admin.status.paid', 'Đã thanh toán'); }, color: 'green' },
  3: { get label() { return t('admin.status.refunded', 'Đã hoàn tiền'); }, color: 'purple' },
};

export const PAYMENT_RECORD_STATUS_META: Record<PaymentRecordStatus, Meta> = {
  1: { get label() { return t('admin.status.pending', 'Đang chờ'); }, color: 'gold' },
  2: { get label() { return t('admin.status.succeeded', 'Thành công'); }, color: 'green' },
  3: { get label() { return t('admin.status.failed', 'Thất bại'); }, color: 'red' },
  4: { get label() { return t('admin.common.expired', 'Hết hạn'); }, color: 'default' },
  5: { get label() { return t('admin.status.refunded', 'Đã hoàn tiền'); }, color: 'purple' },
};

export const REFUND_STATUS_META: Record<RefundStatus, Meta> = {
  1: { get label() { return t('admin.status.awaitingRefund', 'Chờ hoàn'); }, color: 'orange' },
  2: { get label() { return t('admin.common.refunded', 'Đã hoàn'); }, color: 'green' },
};

export const REVIEW_STATUS_META: Record<ReviewStatus, Meta> = {
  1: { get label() { return t('admin.status.pendingReview', 'Chờ duyệt'); }, color: 'gold' },
  2: { get label() { return t('admin.common.approved', 'Đã duyệt'); }, color: 'green' },
  3: { get label() { return t('admin.common.rejected', 'Từ chối'); }, color: 'red' },
  4: { get label() { return t('admin.status.removedByAuthor', 'Người viết đã gỡ'); }, color: 'default' },
};

export const VOUCHER_TYPE_LABEL: Record<VoucherType, string> = {
  get 1() { return t('admin.common.percentageOff', 'Giảm theo %'); },
  get 2() { return t('admin.common.amountOff', 'Giảm số tiền'); },
  get 3() { return t('admin.common.freeShipping', 'Miễn phí vận chuyển'); },
};

export const MOVEMENT_TYPE_META: Record<StockMovementType, Meta> = {
  1: { get label() { return t('admin.common.stockIn', 'Nhập kho'); }, color: 'green' },
  2: { get label() { return t('admin.status.sale', 'Xuất bán'); }, color: 'blue' },
  3: { get label() { return t('admin.status.return', 'Hoàn trả'); }, color: 'purple' },
  4: { get label() { return t('admin.status.adjustment', 'Điều chỉnh'); }, color: 'orange' },
};

export const SEVERITY_META: Record<CompatSeverity, Meta> = {
  1: { get label() { return t('admin.common.error', 'Lỗi'); }, color: 'red' },
  2: { get label() { return t('admin.common.warning', 'Cảnh báo'); }, color: 'gold' },
};

export const ROLE_LABEL: Record<RealmRole, string> = {
  get CUSTOMER() { return t('admin.common.customer', 'Khách hàng'); },
  get STAFF() { return t('admin.status.staff', 'Nhân viên'); },
  get ADMIN() { return t('admin.common.admin', 'Quản trị'); },
};

export const PERMISSION_LABEL: Record<Permission, string> = {
  get 'product:write'() {
    return t('admin.status.manageProductsCategoriesCompatibilityRules', 'Quản lý sản phẩm, danh mục, luật tương thích');
  },
  get 'order:update-status'() {
    return t('admin.status.changeOrderStatus', 'Đổi trạng thái đơn hàng');
  },
  get 'inventory:write'() {
    return t('admin.status.receiveStockAdjustInventory', 'Nhập kho, điều chỉnh tồn');
  },
  get 'knowledge:write'() {
    return t('admin.common.aiKnowledgeBase', 'Kho tri thức AI');
  },
};

export type VoucherPhase = 'upcoming' | 'running' | 'expired';

export const VOUCHER_PHASE_META: Record<VoucherPhase, Meta> = {
  upcoming: { get label() { return t('admin.common.notStarted', 'Chưa bắt đầu'); }, color: 'blue' },
  running: { get label() { return t('admin.common.running', 'Đang chạy'); }, color: 'green' },
  expired: { get label() { return t('admin.common.expired', 'Hết hạn'); }, color: 'default' },
};

/** Nhãn thời gian của voucher tính từ startAt/endAt */
export const voucherPhase = (v: Pick<AdminVoucher, 'startAt' | 'endAt'>, now = Date.now()): VoucherPhase => {
  if (v.startAt && new Date(v.startAt).getTime() > now) return 'upcoming';
  if (v.endAt && new Date(v.endAt).getTime() < now) return 'expired';
  return 'running';
};

/** Số lượng có thể bán của một dòng tồn kho */
export const availableQty = (row: { quantity: number; reservedQuantity: number }) => row.quantity - row.reservedQuantity;
