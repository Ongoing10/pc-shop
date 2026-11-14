import { Product } from './product';

export interface CartItem extends Product {
  qty: number;
  /** false: không đặt được (hết hàng, ngừng bán...); chỉ có ở giỏ lấy từ server */
  purchasable?: boolean;
  /** Lý do khi purchasable = false, hiển thị nguyên văn */
  unavailableReason?: string;
}

export interface CartSummary {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  totalItems: number;
}

/** Giỏ hàng từ GET /cart (giá và tồn kho luôn mới) */
export interface CartView {
  items: CartItem[];
  /** Tổng số lượng mọi dòng, dùng cho badge giỏ hàng */
  totalQuantity: number;
  /** Tạm tính, chỉ gồm dòng đặt được */
  subtotal: number;
  warnings: string[];
}
