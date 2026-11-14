/**
 * Kiểu dữ liệu cho khu quản trị /admin. Các kiểu dữ liệu là chính kiểu response của backend (types/api.ts),
 * đặt lại tên theo ngữ cảnh admin. Mã trạng thái là số nguyên như backend.
 */
import type * as Api from './api';

export type RealmRole = Api.RealmRole;
export type Permission = Api.Permission;

export type ProductStatus = Api.ProductStatus;
export type OrderStatus = Api.OrderStatus;
export type PaymentMethod = Api.PaymentMethod;
export type PaymentStatus = Api.PaymentStatus;
export type PaymentRecordStatus = Api.PaymentRecordStatus;
export type RefundStatus = Api.RefundStatus;
export type ReviewStatus = Api.ReviewStatus;
export type VoucherType = Api.VoucherType;
export type StockMovementType = Api.StockMovementType;
export type CompatSeverity = Api.CompatSeverity;
export type ActiveFlag = Api.ActiveFlag;
export type SpecValue = Api.SpecValue;

/** Người đang đăng nhập khu admin (từ GET /me: role và permission trong token Keycloak) */
export interface AdminSessionUser {
  id: string;
  username: string;
  fullName: string;
  realmRoles: RealmRole[];
  permissions: Permission[];
}

// ---------- catalog ----------
export type SpecField = Api.SpecField;
export type AdminCategory = Api.Category;
export type AdminBrand = Api.Brand;
export type ProductImage = Api.ProductImage;
export type AdminProduct = Api.Product;
export type CompatibilityRule = Api.CompatibilityRule;

// ---------- ordering ----------
export type AdminOrder = Api.Order;
export type AdminOrderItem = Api.OrderItem;
export type AdminOrderStatusHistory = Api.OrderStatusHistory;
export type AdminPayment = Api.Payment;
/** GET /admin/refunds (RefundView): tự tạo khi hủy/trả đơn đã thu tiền hoặc tiền về sau khi đơn đã hủy */
export type AdminRefund = Api.RefundView;
export type AdminVoucher = Api.AdminVoucher;
export type StatsOverview = Api.StatsOverview;
export type TopProduct = Api.TopProduct;

// ---------- inventory ----------
export type Warehouse = Api.Warehouse;
export type Inventory = Api.Inventory;
export type StockMovement = Api.StockMovement;

// ---------- review ----------
export type AdminReview = Api.Review;

// ---------- customer (Keycloak) ----------
/** Một dòng danh sách + chi tiết role (GET /admin/users và GET /admin/users/{id} gộp lại cho màn quản lý) */
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
export type ImportRowError = Api.ImportRowError;
export type ImportValidateResult<P = Record<string, unknown>> = Api.ImportValidateResult<P>;
export type ImportResult = Api.ImportResult;
