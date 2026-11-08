/**
 * Kiểu dữ liệu cho khu quản trị /admin.
 * Đặt tên trường giống hệt API thật (docs/ui/api-types.ts) để khi ghép API chỉ cần thay nguồn dữ liệu.
 * Mã trạng thái là số nguyên như backend.
 */

export type RealmRole = 'CUSTOMER' | 'STAFF' | 'ADMIN';
export type Permission = 'product:write' | 'order:update-status' | 'inventory:write' | 'knowledge:write';

/** 1 Nháp · 2 Đang bán · 3 Đã ẩn · 4 Ngừng bán */
export type ProductStatus = 1 | 2 | 3 | 4;
/** 1 Đang giữ hàng · 2 Chờ thanh toán · 3 Đã thanh toán · 4 Đã xác nhận · 5 Đang giao · 6 Hoàn tất · 7 Đã hủy · 8 Trả hàng */
export type OrderStatus = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
/** 1 COD · 2 VNPay · 3 MoMo */
export type PaymentMethod = 1 | 2 | 3;
/** 1 Chưa thanh toán · 2 Đã thanh toán · 3 Đã hoàn tiền */
export type PaymentStatus = 1 | 2 | 3;
/** Một lần thanh toán: 1 Đang chờ · 2 Thành công · 3 Thất bại · 4 Hết hạn · 5 Đã hoàn tiền */
export type PaymentRecordStatus = 1 | 2 | 3 | 4 | 5;
/** Yêu cầu hoàn tiền: 1 Chờ hoàn · 2 Đã hoàn */
export type RefundStatus = 1 | 2;
/** 1 Chờ duyệt · 2 Đã duyệt · 3 Từ chối · 4 Người viết đã gỡ */
export type ReviewStatus = 1 | 2 | 3 | 4;
/** 1 Giảm theo % · 2 Giảm số tiền · 3 Miễn phí vận chuyển */
export type VoucherType = 1 | 2 | 3;
/** 1 Nhập kho · 2 Xuất bán · 3 Hoàn trả · 4 Điều chỉnh */
export type StockMovementType = 1 | 2 | 3 | 4;
/** 1 Lỗi · 2 Cảnh báo */
export type CompatSeverity = 1 | 2;
export type ActiveFlag = 0 | 1;

export type SpecValue = string | number | boolean | string[] | null;

/** Người đang đăng nhập khu admin (lấy từ token Keycloak khi ghép API) */
export interface AdminSessionUser {
  id: string;
  username: string;
  fullName: string;
  realmRoles: RealmRole[];
  permissions: Permission[];
}

// ---------- catalog ----------

export interface SpecField {
  key: string;
  label: string;
  group: 'specs' | 'compat';
  type: 'string' | 'integer' | 'decimal' | 'boolean' | 'string_list';
  required: boolean;
  unit: string | null;
  options: string[] | null;
}

export interface AdminCategory {
  id: string;
  code: string;
  name: string;
  slug: string;
  pcSlot: string | null;
  sortOrder: number | null;
  isActive: ActiveFlag;
  specSchema: SpecField[] | null;
  updatedAt: string | null;
}

export interface AdminBrand {
  id: string;
  code: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  isActive: ActiveFlag;
  updatedAt: string | null;
}

export interface ProductImage {
  fileId: number | null;
  url: string;
  isPrimary: boolean | null;
}

export interface AdminProduct {
  id: string;
  sku: string;
  name: string;
  slug: string;
  categoryCode: string;
  brandCode: string | null;
  shortDescription: string | null;
  description: string | null;
  price: number;
  originalPrice: number | null;
  images: ProductImage[] | null;
  specs: Record<string, SpecValue> | null;
  compat: Record<string, SpecValue> | null;
  tags: string[] | null;
  warrantyMonths: number | null;
  status: ProductStatus;
  soldCount: number | null;
  updatedAt: string | null;
}

export interface CompatibilityRule {
  id: string;
  code: string;
  name: string;
  sourceCategory: string;
  targetCategory: string;
  ruleType: 'EQUALS' | 'IN' | 'LTE' | 'SUM_TDP_LTE_WATTAGE';
  sourceField: string;
  targetField: string;
  margin: number | null;
  severity: CompatSeverity;
  messageTemplate: string;
  isActive: ActiveFlag;
}

// ---------- ordering ----------

export interface AdminOrder {
  id: number;
  code: string;
  userId: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  subtotalAmount: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  voucherCode: string | null;
  receiverName: string;
  receiverPhone: string;
  shippingAddress: string;
  note: string | null;
  cancelReason: string | null;
  placedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface AdminOrderItem {
  id: number;
  orderId: number;
  sku: string;
  productName: string;
  productImageUrl: string | null;
  categoryCode: string | null;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  lineTotal: number;
  warrantyMonths: number | null;
}

export interface AdminOrderStatusHistory {
  id: number;
  orderId: number;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  reason: string | null;
  /** null = hệ thống */
  createdBy: string | null;
  createdAt: string;
}

/** GET /payments/{orderCode}: mỗi lần khách bấm thanh toán một dòng; COD hoàn tất "COD-<mã>", nhân viên xác nhận tay "MANUAL-<mã>" */
export interface AdminPayment {
  id: number;
  orderId: number;
  paymentCode: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentRecordStatus;
  providerTransactionId: string | null;
  bankCode: string | null;
  paidAt: string | null;
  expiredAt: string | null;
  createdAt: string;
}

/** GET /admin/refunds (RefundView): tự tạo khi hủy/trả đơn đã thu tiền hoặc tiền về sau khi đơn đã hủy */
export interface AdminRefund {
  id: number;
  orderCode: string;
  paymentCode: string;
  method: PaymentMethod;
  amount: number;
  reason: string | null;
  status: RefundStatus;
  providerRefundId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminVoucher {
  id: number;
  code: string;
  name: string;
  type: VoucherType;
  value: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number | null;
  /** rỗng = mọi danh mục */
  applicableCategories: string[];
  usageLimit: number | null;
  usedCount: number | null;
  perUserLimit: number | null;
  startAt: string | null;
  endAt: string | null;
  isActive: ActiveFlag;
  version: number;
}

export interface StatsOverview {
  from: string;
  to: string;
  totalOrders: number;
  revenue: number;
  grossRevenue: number;
  ordersByStatus: Partial<Record<`${OrderStatus}`, number>>;
}

export interface TopProduct {
  sku: string;
  productName: string;
  quantity: number;
  revenue: number;
}

// ---------- inventory ----------

export interface Warehouse {
  id: number;
  code: string;
  name: string;
  address: string | null;
  isActive: ActiveFlag;
}

export interface Inventory {
  id: number;
  sku: string;
  warehouseId: number;
  quantity: number;
  reservedQuantity: number;
  minQuantity: number;
  version: number;
}

export interface StockMovement {
  id: number;
  sku: string;
  warehouseId: number;
  type: StockMovementType;
  quantity: number;
  quantityAfter: number | null;
  referenceType: string | null;
  referenceCode: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

// ---------- review ----------

export interface AdminReview {
  id: string;
  productId: string;
  sku: string;
  userId: string;
  userDisplayName: string;
  orderCode: string | null;
  rating: number;
  title: string | null;
  content: string | null;
  verifiedPurchase: boolean;
  status: ReviewStatus;
  helpfulCount: number;
  adminReply: { content: string; repliedBy: string; repliedAt: string } | null;
  createdAt: string;
}

// ---------- customer (Keycloak) ----------

export interface AdminUser {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
  active: boolean;
  phoneNumber: string | null;
  createdTimestamp: number | null;
  realmRoles: RealmRole[];
  permissions: Permission[];
}

// ---------- import Excel ----------

/** Lỗi của một dòng; `row` là số dòng như Excel hiển thị (dòng tiêu đề là 1) */
export interface ImportRowError {
  row: number;
  messages: string[];
}

/** POST .../import/validate → kết quả kiểm tra (tên trường snake_case như backend) */
export interface ImportValidateResult<P = Record<string, unknown>> {
  import_id: string;
  mode: 'CREATE_ONLY' | 'UPSERT' | 'IMPORT';
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  errors: ImportRowError[];
  /** tối đa 20 dòng hợp lệ */
  preview: P[];
}

export interface ImportResult {
  total_rows: number;
  created: number;
  updated: number;
  failed: number;
  errors: ImportRowError[];
}
