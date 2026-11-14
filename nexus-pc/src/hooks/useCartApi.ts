import { useQueryClient } from '@tanstack/react-query';
import { cartService } from '../services/api/cartService';
import { CartView } from '../types/cart';
import { createQueryKeys, useApiMutation, useApiQuery } from './BaseHook';

const keys = createQueryKeys('cart');

export const cartKeys = { all: keys.all };

export const EMPTY_CART: CartView = { items: [], totalQuantity: 0, subtotal: 0, warnings: [] };

/** GET /cart: chỉ gọi khi đã đăng nhập; token đổi (đăng xuất) thì CartContext tắt query và xóa cache */
export function useCartQuery(enabled: boolean) {
  return useApiQuery(cartKeys.all, () => cartService.getCart(), { enabled, staleTime: 30 * 1000 });
}

/** Mọi API /cart trả giỏ đầy đủ sau thao tác: ghi thẳng vào cache, không gọi lại GET /cart */
function useCartMutation<TVars>(mutationFn: (vars: TVars) => Promise<CartView>) {
  const queryClient = useQueryClient();
  return useApiMutation(mutationFn, {
    onSuccess: (view) => {
      queryClient.setQueryData(cartKeys.all, view);
    },
  });
}

export const useAddCartItem = () =>
  useCartMutation(({ sku, quantity }: { sku: string; quantity: number }) => cartService.addItem(sku, quantity));

export const useAddCartItems = () =>
  useCartMutation((items: Array<{ sku: string; quantity: number }>) => cartService.addItems(items));

export const useSetCartQuantity = () =>
  useCartMutation(({ sku, quantity }: { sku: string; quantity: number }) => cartService.setQuantity(sku, quantity));

export const useRemoveCartItem = () => useCartMutation((sku: string) => cartService.removeItem(sku));

export function useClearCart() {
  const queryClient = useQueryClient();
  return useApiMutation(() => cartService.clear(), {
    onSuccess: () => {
      queryClient.setQueryData(cartKeys.all, EMPTY_CART);
    },
  });
}
