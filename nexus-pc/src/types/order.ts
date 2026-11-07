import { CartItem } from './cart';

export type PaymentMethod = 'cod' | 'vnpay';
export type OrderStatus = 'pending' | 'processing' | 'shipping' | 'delivered' | 'cancelled';

export interface ShippingAddress {
  fullName: string;
  phone: string;
  email?: string;
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
  createdAt: string;
}

export interface Order {
  id: string;
  createdAt: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  voucherCode?: string;
  totalAmount: number;
  shippingFee: number;
  paymentMethod: PaymentMethod;
  shippingAddress: ShippingAddress;
  status: OrderStatus;
  statusHistory: OrderStatusHistory[];
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
