import { checkoutService } from '../services/api/checkoutService';
import { MINUTE, createQueryKeys, useApiMutation, useApiQuery } from './BaseHook';

const keys = createQueryKeys('checkout');

export const checkoutKeys = {
  vouchers: () => keys.of('vouchers'),
  preview: (voucherCode?: string, addressId?: string) => keys.of('preview', voucherCode ?? null, addressId ?? null),
};

export function useVouchers(enabled = true) {
  return useApiQuery(checkoutKeys.vouchers(), () => checkoutService.getVouchers(), { enabled, staleTime: 5 * MINUTE });
}

export function useValidateVoucher() {
  return useApiMutation(({ code, subtotal, categories }: { code: string; subtotal: number; categories?: string[] }) =>
    checkoutService.validateVoucher(code, subtotal, categories)
  );
}

/**
 * POST /checkout/preview: tiền chính thức (giá hiện tại, giảm giá, phí ship, tổng) tính từ giỏ trên server.
 * Dùng như truy vấn đọc: đổi voucher/địa chỉ là đổi key nên tự gọi lại.
 */
export function useCheckoutPreview(params: { voucherCode?: string; addressId?: string }, enabled = true) {
  return useApiQuery(
    checkoutKeys.preview(params.voucherCode, params.addressId),
    () => checkoutService.preview(params.voucherCode, params.addressId),
    { enabled, staleTime: 0 }
  );
}
