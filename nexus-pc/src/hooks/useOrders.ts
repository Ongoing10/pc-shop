import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/api/orderService';
import { CreateOrderPayload } from '../types/order';

export const orderKeys = {
  all: ['orders'] as const,
  track: (id: string) => [...orderKeys.all, 'track', id] as const,
  userList: () => [...orderKeys.all, 'user'] as const,
};

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => orderService.createOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.userList() });
    },
  });
}

export function useTrackOrder(orderId: string, enabled = false) {
  return useQuery({
    queryKey: orderKeys.track(orderId),
    queryFn: () => orderService.trackOrder(orderId),
    enabled: enabled && Boolean(orderId.trim()),
    staleTime: 1000 * 60,
  });
}

export function useUserOrders() {
  return useQuery({
    queryKey: orderKeys.userList(),
    queryFn: () => orderService.getUserOrders(),
  });
}
