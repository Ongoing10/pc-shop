import { useMutation, useQuery } from '@tanstack/react-query';
import { checkoutService } from '../services/api/checkoutService';

export function useVouchers() {
  return useQuery({
    queryKey: ['vouchers'],
    queryFn: () => checkoutService.getVouchers(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useValidateVoucher() {
  return useMutation({
    mutationFn: ({ code, subtotal }: { code: string; subtotal: number }) =>
      checkoutService.validateVoucher(code, subtotal),
  });
}
