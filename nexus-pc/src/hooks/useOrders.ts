import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/api/orderService';
import { CreateOrderPayload } from '../types/order';

export const orderKeys = {
  all: ['orders'] as const,
  detail: (code: string) => [...orderKeys.all, 'detail', code] as const,
  userList: () => [...orderKeys.all, 'user'] as const,
  purchase: (productId: string) => [...orderKeys.all, 'purchase', productId] as const,
  payment: (paymentCode: string) => [...orderKeys.all, 'payment', paymentCode] as const,
};

/** {@code requestId}: header Idempotency-Key, một khóa cho mỗi lần vào trang thanh toán (bấm lại không tạo đơn thứ hai) */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload, requestId }: { payload: CreateOrderPayload; requestId: string }) =>
      orderService.createOrder(payload, requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

/**
 * Chi tiết đơn. Đơn đang giữ hàng (1) đọc lại mỗi giây cho đến khi Saga xong (thường 1–3 giây);
 * đơn chờ thanh toán (2) đọc lại mỗi 15 giây để thấy đơn bị hủy khi quá hạn.
 */
export function useOrderDetail(code: string | undefined) {
  return useQuery({
    queryKey: orderKeys.detail(code || ''),
    queryFn: () => orderService.getOrderByCode(code || ''),
    enabled: Boolean(code),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 1 ? 1000 : status === 2 ? 15000 : false;
    },
  });
}

export function useUserOrders() {
  return useQuery({
    queryKey: orderKeys.userList(),
    queryFn: () => orderService.getUserOrders(),
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ code, reason }: { code: string; reason: string }) => orderService.cancelOrder(code, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

/** POST /payments/{orderCode} → PaymentInit; trang gọi rồi chuyển tới paymentUrl */
export function useStartPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => orderService.startPayment(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.all }),
  });
}

export function usePayment(paymentCode: string | undefined) {
  return useQuery({
    queryKey: orderKeys.payment(paymentCode || ''),
    queryFn: () => orderService.getPayment(paymentCode || ''),
    enabled: Boolean(paymentCode),
  });
}

/** Chỉ dùng cho trang cổng giả lập: bản thật do cổng thanh toán / backend ghi kết quả */
export function useCompletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentCode, success }: { paymentCode: string; success: boolean }) =>
      orderService.completePayment(paymentCode, success),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKeys.all }),
  });
}

/** GET /orders/purchased?sku=: người đang đăng nhập đã mua (đơn hoàn tất) sản phẩm này chưa */
export function usePurchase(productId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: orderKeys.purchase(productId || ''),
    queryFn: () => orderService.getPurchase(productId || ''),
    enabled: Boolean(productId) && enabled,
  });
}
