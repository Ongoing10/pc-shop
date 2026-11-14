import type * as Api from '../../types/api';
import { CheckoutPreview, Voucher, VoucherValidation } from '../../types/order';
import { formatCurrency } from '../../utils/format';
import { BaseService } from './BaseService';
import { toUserAddress } from './addressService';
import { toCartItem } from './cartService';
import { toCategoryCode } from './mappers/catalogMapper';

/**
 * Quy tắc phí vận chuyển giống pcshop.shipping của ordering-service. Chỉ để ước tính khi chưa có địa chỉ
 * (trang giỏ hàng); số chính thức ở trang thanh toán lấy từ POST /checkout/preview.
 */
export const FREE_SHIPPING_THRESHOLD = 5000000;
/** Tỉnh có kho: TP.HCM (79), Hà Nội (01) */
export const INNER_PROVINCES = ['79', '01'];
export const INNER_SHIPPING_FEE = 20000;
export const OUTER_SHIPPING_FEE = 40000;

export const calculateShippingFee = (amountAfterDiscount: number, provinceCode?: string): number => {
  if (amountAfterDiscount === 0 || amountAfterDiscount >= FREE_SHIPPING_THRESHOLD) return 0;
  return provinceCode && INNER_PROVINCES.includes(provinceCode) ? INNER_SHIPPING_FEE : OUTER_SHIPPING_FEE;
};

const VOUCHER_TYPE: Record<Api.VoucherType, Voucher['type']> = { 1: 'percent', 2: 'fixed', 3: 'freeship' };

const describeVoucher = (v: Api.PublicVoucher): string => {
  const parts: string[] = [];
  if (v.type === 1) parts.push(`Giảm ${v.value}%${v.maxDiscountAmount ? ` tối đa ${formatCurrency(v.maxDiscountAmount)}` : ''}`);
  else if (v.type === 2) parts.push(`Giảm ${formatCurrency(v.value)}`);
  else parts.push('Miễn phí vận chuyển');
  if (v.minOrderAmount) parts.push(`cho đơn từ ${formatCurrency(v.minOrderAmount)}`);
  return parts.join(' ');
};

export const toVoucher = (v: Api.PublicVoucher): Voucher => ({
  code: v.code,
  name: v.name,
  description: describeVoucher(v),
  type: VOUCHER_TYPE[v.type],
  value: v.value,
  maxDiscount: v.maxDiscountAmount ?? undefined,
  minSubtotal: v.minOrderAmount ?? 0,
  expiresAt: v.endAt ?? '',
});

export const toVoucherValidation = (v: Api.VoucherEvaluation): VoucherValidation => ({
  valid: v.valid,
  code: v.code,
  name: v.name ?? undefined,
  discountAmount: v.discountAmount,
  freeShipping: v.freeShipping,
  reason: v.reason ?? undefined,
});

/** ordering-service: voucher và tính tiền thanh toán (/vouchers, /checkout) */
class CheckoutService extends BaseService {
  constructor() {
    super('');
  }

  /** Mã dùng được ngay (đang bật, trong hạn, còn lượt) */
  async getVouchers(): Promise<Voucher[]> {
    return (await this.get<Api.PublicVoucher[]>('/vouchers')).map(toVoucher);
  }

  /** `categories`: id danh mục FE của các món trong giỏ (voucher có thể chỉ áp cho vài danh mục) */
  async validateVoucher(code: string, subtotal: number, categories: string[] = []): Promise<VoucherValidation> {
    const body: Api.VoucherValidateRequest = {
      code: code.trim(),
      subtotal,
      categories: [...new Set(categories.map(toCategoryCode))],
    };
    return toVoucherValidation(await this.post<Api.VoucherEvaluation>('/vouchers/validate', body));
  }

  /** Giá hiện tại, giảm giá, phí ship, tổng và cảnh báo hết hàng từ giỏ trên server; không tạo đơn */
  async preview(voucherCode?: string, addressId?: string): Promise<CheckoutPreview> {
    const body: Api.CheckoutPreviewRequest = {
      voucherCode: voucherCode || null,
      addressId: addressId ? Number(addressId) : null,
    };
    const p = await this.post<Api.CheckoutPreview>('/checkout/preview', body);
    return {
      items: p.items.map(toCartItem),
      subtotal: p.subtotal,
      discountAmount: p.discountAmount,
      shippingFee: p.shippingFee,
      totalAmount: p.totalAmount,
      voucher: p.voucher ? toVoucherValidation(p.voucher) : null,
      address: p.address ? toUserAddress(p.address) : null,
      warnings: p.warnings,
      canPlaceOrder: p.canPlaceOrder,
    };
  }
}

export const checkoutService = new CheckoutService();
