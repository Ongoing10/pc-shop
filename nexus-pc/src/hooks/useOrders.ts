import { orderService } from '../services/api/orderService';
import { CreateOrderPayload } from '../types/order';
import { cartKeys } from './useCartApi';
import { createQueryKeys, useApiMutation, useApiQuery } from './BaseHook';

const keys = createQueryKeys('orders');

export const orderKeys = {
  all: keys.all,
  detail: (code: string) => keys.of('detail', code),
  userList: () => keys.of('user'),
  purchase: (productId: string) => keys.of('purchase', productId),
};

/** `requestId`: header Idempotency-Key, một khóa cho mỗi lần vào trang thanh toán (bấm lại không tạo đơn thứ hai) */
export function useCreateOrder() {
  return useApiMutation(
    ({ payload, requestId }: { payload: CreateOrderPayload; requestId: string }) => orderService.createOrder(payload, requestId),
    // Backend xóa giỏ sau khi đặt đơn
    { invalidate: [orderKeys.all, cartKeys.all] }
  );
}

/**
 * Chi tiết đơn. Đơn đang giữ hàng (1) đọc lại mỗi giây cho đến khi Saga xong (thường 1–3 giây);
 * đơn chờ thanh toán (2) đọc lại mỗi 15 giây để thấy đơn bị hủy khi quá hạn.
 */
export function useOrderDetail(code: string | undefined) {
  return useApiQuery(orderKeys.detail(code || ''), () => orderService.getOrderByCode(code!), {
    enabled: Boolean(code),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 1 ? 1000 : status === 2 ? 15000 : false;
    },
  });
}

export function useUserOrders(enabled = true) {
  return useApiQuery(orderKeys.userList(), () => orderService.getUserOrders(), { enabled });
}

export function useCancelOrder() {
  return useApiMutation(({ code, reason }: { code: string; reason: string }) => orderService.cancelOrder(code, reason), {
    invalidate: [orderKeys.all],
  });
}

/** POST /payments/{orderCode} → PaymentInit; trang gọi rồi chuyển tới paymentUrl */
export function useStartPayment() {
  return useApiMutation((code: string) => orderService.startPayment(code), { invalidate: [orderKeys.all] });
}

/** GET /orders/purchased?sku=: người đang đăng nhập đã mua (đơn hoàn tất) sản phẩm này chưa */
export function usePurchase(productId: string | undefined, enabled = true) {
  return useApiQuery(orderKeys.purchase(productId || ''), () => orderService.getPurchase(productId!), {
    enabled: Boolean(productId) && enabled,
  });
}
