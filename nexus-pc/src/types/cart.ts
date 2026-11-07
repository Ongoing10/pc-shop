import { Product } from './product';

export interface CartItem extends Product {
  qty: number;
}

export interface CartSummary {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  totalItems: number;
}
