import { Voucher, VoucherValidation } from '../../types/order';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Quy tắc phí vận chuyển giống pcshop.shipping của ordering-service */
export const FREE_SHIPPING_THRESHOLD = 5000000;
/** Tỉnh có kho: TP.HCM (79), Hà Nội (01) */
export const INNER_PROVINCES = ['79', '01'];
export const INNER_SHIPPING_FEE = 20000;
export const OUTER_SHIPPING_FEE = 40000;

/**
 * Phí ship theo tiền hàng SAU giảm giá và tỉnh nhận hàng: đủ ngưỡng → miễn phí; tỉnh có kho 20.000 ₫; còn lại
 * (hoặc chưa chọn địa chỉ) 40.000 ₫. Số chính thức do POST /checkout/preview tính.
 */
export const calculateShippingFee = (amountAfterDiscount: number, provinceCode?: string): number => {
  if (amountAfterDiscount === 0 || amountAfterDiscount >= FREE_SHIPPING_THRESHOLD) return 0;
  return provinceCode && INNER_PROVINCES.includes(provinceCode) ? INNER_SHIPPING_FEE : OUTER_SHIPPING_FEE;
};

const MOCK_VOUCHERS: Voucher[] = [
  {
    code: 'WELCOME10',
    name: 'Chào bạn mới',
    description: 'Giảm 10% tối đa 500.000 ₫ cho đơn từ 1.000.000 ₫',
    type: 'percent',
    value: 10,
    maxDiscount: 500000,
    minSubtotal: 1000000,
    expiresAt: '2026-12-31T23:59:59.000Z',
  },
  {
    code: 'BUILD500K',
    name: 'Ráp PC trọn bộ',
    description: 'Giảm 500.000 ₫ cho đơn từ 20.000.000 ₫',
    type: 'fixed',
    value: 500000,
    minSubtotal: 20000000,
    expiresAt: '2026-12-31T23:59:59.000Z',
  },
  {
    code: 'FREESHIP',
    name: 'Miễn phí vận chuyển',
    description: 'Miễn phí vận chuyển cho đơn từ 500.000 ₫',
    type: 'freeship',
    value: 0,
    minSubtotal: 500000,
    expiresAt: '2026-12-31T23:59:59.000Z',
  },
];

// Mock. Bản thật: GET /vouchers, POST /vouchers/validate, POST /checkout/preview (ordering-service).
export const checkoutService = {
  async getVouchers(): Promise<Voucher[]> {
    await delay(100);
    return MOCK_VOUCHERS;
  },

  async validateVoucher(code: string, subtotal: number): Promise<VoucherValidation> {
    await delay(200);
    const normalized = code.trim().toUpperCase();
    const voucher = MOCK_VOUCHERS.find((v) => v.code === normalized);
    const invalid = (reason: string): VoucherValidation => ({
      valid: false,
      code: normalized,
      discountAmount: 0,
      freeShipping: false,
      reason,
    });

    if (!voucher) return invalid('Mã giảm giá không tồn tại.');
    if (new Date(voucher.expiresAt).getTime() < Date.now()) return invalid('Mã giảm giá đã hết hạn.');
    if (subtotal < voucher.minSubtotal) {
      return invalid(
        `Đơn hàng chưa đạt giá trị tối thiểu ${new Intl.NumberFormat('vi-VN').format(voucher.minSubtotal)} ₫.`
      );
    }

    const discountAmount =
      voucher.type === 'percent'
        ? Math.min(Math.round((subtotal * voucher.value) / 100), voucher.maxDiscount ?? Infinity)
        : voucher.type === 'fixed'
          ? voucher.value
          : 0;

    return {
      valid: true,
      code: voucher.code,
      name: voucher.name,
      discountAmount,
      freeShipping: voucher.type === 'freeship',
    };
  },
};
