import { CartItem } from './cart';

export type PaymentMethod = 'cod' | 'bank' | 'card';
export type OrderStatus = 'pending' | 'processing' | 'shipping' | 'delivered' | 'cancelled';

export interface ShippingAddress {
  fullName: string;
  phone: string;
  email: string;
  city: string;
  district?: string;
  address: string;
  note?: string;
}

export interface Order {
  id: string;
  createdAt: string;
  items: CartItem[];
  totalAmount: number;
  shippingFee: number;
  paymentMethod: PaymentMethod;
  shippingAddress: ShippingAddress;
  status: OrderStatus;
  estimatedDelivery?: string;
}

export interface CreateOrderPayload {
  items: CartItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
}
