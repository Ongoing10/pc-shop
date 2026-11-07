import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/api/orderService';
import { CreateOrderPayload } from '../types/order';

export const orderKeys = {
  all: ['orders'] as const,
  detail: (code: string) => [...orderKeys.all, 'detail', code] as const,
  userList: () => [...orderKeys.all, 'user'] as const,
};

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => orderService.createOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

export function useOrderDetail(code: string | undefined) {
  return useQuery({
    queryKey: orderKeys.detail(code || ''),
    queryFn: () => orderService.getOrderByCode(code || ''),
    enabled: Boolean(code),
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
