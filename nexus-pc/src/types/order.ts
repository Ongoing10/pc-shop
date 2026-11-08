import { CartItem } from './cart';
import type {
  OrderStatus as ApiOrderStatus,
  PaymentMethod as ApiPaymentMethod,
  PaymentStatus as ApiPaymentStatus,
} from './admin';

/**
 * Trạng thái đơn đúng mã của ordering-service (docs/ui/frontend-context.md mục g):
 * 1 Đang giữ hàng · 2 Chờ thanh toán · 3 Đã thanh toán · 4 Đã xác nhận · 5 Đang giao · 6 Hoàn tất · 7 Đã hủy · 8 Trả hàng
 */
export type OrderStatus = ApiOrderStatus;
/** 1 COD · 2 VNPay · 3 MoMo */
export type PaymentMethod = ApiPaymentMethod;
/** 1 Chưa thanh toán · 2 Đã thanh toán · 3 Đã hoàn tiền */
export type PaymentStatus = ApiPaymentStatus;

export interface ShippingAddress {
  fullName: string;
  phone: string;
  email?: string;
  provinceCode?: string;
  city: string;
  district?: string;
  address: string;
  note?: string;
}

/** Một dòng lịch sử trạng thái (giống `order_status_histories` / GET /orders/{code}/timeline) */
export interface OrderStatusHistory {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  reason?: string;
  /** true = hệ thống (Saga giữ hàng, cổng thanh toán, hủy đơn quá hạn), giống createdBy = null */
  bySystem?: boolean;
  createdAt: string;
}

/** 1 Đang chờ · 2 Thành công · 3 Thất bại · 4 Hết hạn · 5 Đã hoàn tiền (giống GET /payments/{orderCode}) */
export type PaymentRecordStatus = 1 | 2 | 3 | 4 | 5;

/** Một lần thanh toán của đơn (payments) */
export interface OrderPayment {
  paymentCode: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentRecordStatus;
  paidAt?: string;
  expiredAt?: string;
  createdAt: string;
}

/** Yêu cầu hoàn tiền tự sinh khi hủy/trả đơn đã thu tiền (refunds): 1 chờ hoàn, 2 đã hoàn */
export interface OrderRefund {
  paymentCode: string;
  amount: number;
  reason: string;
  status: 1 | 2;
  createdAt: string;
}

export interface Order {
  /** Mã đơn DH<yyyyMMdd><6 số> */
  id: string;
  createdAt: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  voucherCode?: string;
  totalAmount: number;
  shippingFee: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  shippingAddress: ShippingAddress;
  status: OrderStatus;
  statusHistory: OrderStatusHistory[];
  payments: OrderPayment[];
  refunds: OrderRefund[];
  cancelReason?: string;
  estimatedDelivery?: string;
}

export interface CreateOrderPayload {
  items: CartItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
  voucherCode?: string;
  discountAmount?: number;
  shippingFee?: number;
}

/** POST /payments/{orderCode} */
export interface PaymentInit {
  paymentCode: string;
  /** chuyển trình duyệt tới đây */
  paymentUrl: string;
  amount: number;
  expiresAt: string;
  /** MOCK = trang thanh toán giả lập (MoMo, hoặc chưa cấu hình VNPay) */
  gateway: 'VNPAY' | 'MOCK';
}

/** ?result= của trang /orders/payment-result (backend redirect về sau khi thanh toán) */
export type PaymentResult = 'success' | 'failed' | 'refund' | 'invalid';

/** GET /orders/purchased?sku= */
export interface PurchaseCheck {
  purchased: boolean;
  orderCode: string | null;
}

export interface Voucher {
  code: string;
  name: string;
  description: string;
  type: 'percent' | 'fixed' | 'freeship';
  value: number;
  maxDiscount?: number;
  minSubtotal: number;
  expiresAt: string;
}

/** Kết quả áp mã (giống POST /vouchers/validate) */
export interface VoucherValidation {
  valid: boolean;
  code: string;
  name?: string;
  discountAmount: number;
  freeShipping: boolean;
  reason?: string;
}
