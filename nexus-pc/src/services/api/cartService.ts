import type * as Api from '../../types/api';
import { CartItem, CartView } from '../../types/cart';
import { BaseService } from './BaseService';
import { PLACEHOLDER_IMAGE, toCategoryId } from './mappers/catalogMapper';

/** Dòng giỏ/checkout của backend → CartItem của FE (id = SKU). Giá, tồn kho do server tính lại mỗi lần xem giỏ */
export const toCartItem = (line: Api.CartLine | Api.CheckoutLine): CartItem => ({
  id: line.sku,
  name: line.name ?? line.sku,
  category: toCategoryId(line.categoryCode ?? ''),
  brand: '',
  price: line.unitPrice ?? 0,
  rating: 0,
  reviews: 0,
  stock: line.purchasable ? (line.available ?? 0) : 0,
  specs: [],
  image: line.imageUrl ?? PLACEHOLDER_IMAGE,
  warrantyMonths: line.warrantyMonths ?? undefined,
  qty: line.quantity,
  purchasable: line.purchasable,
  unavailableReason: line.message ?? undefined,
});

export const toCartView = (cart: Api.CartView): CartView => ({
  items: cart.items.map(toCartItem),
  totalQuantity: cart.totalQuantity,
  subtotal: cart.subtotal,
  warnings: cart.warnings,
});

/** cart-service: giỏ hàng của người dùng đăng nhập (Redis). FE yêu cầu đăng nhập trước khi thêm nên không dùng X-Guest-Key */
class CartService extends BaseService {
  constructor() {
    super('/cart');
  }

  async getCart(): Promise<CartView> {
    return toCartView(await this.get<Api.CartView>());
  }

  /** Cộng dồn vào số lượng hiện có */
  async addItem(sku: string, quantity: number): Promise<CartView> {
    return toCartView(await this.post<Api.CartView>('/items', { sku, quantity } satisfies Api.AddCartItemRequest));
  }

  /** Thêm nhiều món một lần (cả cấu hình PC); một món lỗi thì không thêm gì */
  async addItems(items: Api.AddCartItemRequest[]): Promise<CartView> {
    return toCartView(await this.post<Api.CartView>('/items/bulk', { items } satisfies Api.BulkAddCartRequest));
  }

  /** Đặt số lượng tuyệt đối; 0 = xóa dòng */
  async setQuantity(sku: string, quantity: number): Promise<CartView> {
    return toCartView(
      await this.put<Api.CartView>(`/items/${encodeURIComponent(sku)}`, { quantity } satisfies Api.SetCartQuantityRequest)
    );
  }

  async removeItem(sku: string): Promise<CartView> {
    return toCartView(await this.remove<Api.CartView>(`/items/${encodeURIComponent(sku)}`));
  }

  async clear(): Promise<void> {
    await this.remove();
  }
}

export const cartService = new CartService();
