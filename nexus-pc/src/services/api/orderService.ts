import type * as Api from '../../types/api';
import { CartItem } from '../../types/cart';
import {
  CreateOrderPayload,
  Order,
  OrderPayment,
  OrderStatusHistory,
  PaymentInit,
  PurchaseCheck,
} from '../../types/order';
import { BaseService } from './BaseService';
import { isApiError } from './ApiError';
import { PLACEHOLDER_IMAGE, toCategoryId } from './mappers/catalogMapper';

const toOrderItem = (i: Api.OrderItem): CartItem => ({
  id: i.sku,
  name: i.productName,
  category: toCategoryId(i.categoryCode ?? ''),
  brand: '',
  price: i.unitPrice,
  rating: 0,
  reviews: 0,
  stock: 0,
  specs: [],
  image: i.productImageUrl ?? PLACEHOLDER_IMAGE,
  warrantyMonths: i.warrantyMonths ?? undefined,
  qty: i.quantity,
});

const toHistory = (h: Api.OrderStatusHistory): OrderStatusHistory => ({
  fromStatus: h.fromStatus,
  toStatus: h.toStatus,
  reason: h.reason ?? undefined,
  bySystem: h.createdBy === null,
  createdAt: h.createdAt,
});

const toPayment = (p: Api.Payment): OrderPayment => ({
  paymentCode: p.paymentCode,
  method: p.method,
  amount: p.amount,
  status: p.status,
  paidAt: p.paidAt ?? undefined,
  expiredAt: p.expiredAt ?? undefined,
  createdAt: p.createdAt,
});

/**
 * OrderDetail của backend → Order của FE (id = mã đơn). Lịch sử trạng thái và thanh toán nằm ở API riêng
 * nên danh sách đơn để trống hai phần này; trang chi tiết gọi thêm timeline + payments.
 */
const toOrder = (detail: Api.OrderDetail, history: Api.OrderStatusHistory[] = [], payments: Api.Payment[] = []): Order => {
  const o = detail.order;
  return {
    id: o.code,
    createdAt: o.placedAt ?? o.createdAt ?? '',
    items: detail.items.map(toOrderItem),
    subtotal: o.subtotalAmount,
    discountAmount: o.discountAmount,
    voucherCode: o.voucherCode ?? undefined,
    totalAmount: o.totalAmount,
    shippingFee: o.shippingFee,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    // Backend lưu địa chỉ dạng một chuỗi "chi tiết, phường, tỉnh"
    shippingAddress: {
      fullName: o.receiverName,
      phone: o.receiverPhone,
      city: '',
      address: o.shippingAddress,
      note: o.note ?? undefined,
    },
    status: o.status,
    statusHistory: history.map(toHistory),
    payments: payments.map(toPayment),
    refunds: [],
    cancelReason: o.cancelReason ?? undefined,
  };
};

/** Số đơn lấy cho danh sách "Đơn hàng của tôi" (mỗi đơn cần thêm một lần lấy chi tiết để có sản phẩm) */
const MY_ORDERS_LIMIT = 20;

/** ordering-service: đơn hàng, thanh toán */
class OrderService extends BaseService {
  constructor() {
    super('');
  }

  /**
   * POST /orders: trả đơn status 1 (đang giữ hàng); vài giây sau Saga chuyển thành 4 (COD) / 2 (online) / 7 (hết hàng).
   * `requestId` = header Idempotency-Key: gửi lại cùng key trả đúng đơn đã tạo.
   */
  async createOrder(payload: CreateOrderPayload, requestId?: string): Promise<Order> {
    const body: Api.PlaceOrderRequest = {
      addressId: Number(payload.addressId),
      paymentMethod: payload.paymentMethod,
      voucherCode: payload.voucherCode ?? null,
      note: payload.note ?? null,
      expectedTotal: payload.expectedTotal ?? null,
    };
    const detail = await this.post<Api.OrderDetail>('/orders', body, {
      headers: requestId ? { 'Idempotency-Key': requestId } : undefined,
    });
    return toOrder(detail, [
      { id: 0, orderId: detail.order.id, fromStatus: null, toStatus: detail.order.status, reason: 'Đặt hàng', createdBy: detail.order.userId, createdAt: detail.order.placedAt ?? '' },
    ]);
  }

  /** Chi tiết + lịch sử trạng thái + thanh toán; 404 → null */
  async getOrderByCode(code: string): Promise<Order | null> {
    const id = encodeURIComponent(code.trim());
    try {
      const [detail, history, payments] = await Promise.all([
        this.get<Api.OrderDetail>(`/orders/${id}`),
        this.get<Api.OrderStatusHistory[]>(`/orders/${id}/timeline`),
        this.getPayments(code),
      ]);
      return toOrder(detail, history, payments);
    } catch (e) {
      if (isApiError(e) && e.status === 404) return null;
      throw e;
    }
  }

  /** GET /orders/my (mới nhất trước) rồi lấy chi tiết từng đơn để có danh sách sản phẩm */
  async getUserOrders(): Promise<Order[]> {
    const page = await this.get<Api.PageResponse<Api.Order>>('/orders/my', { page: 0, size: MY_ORDERS_LIMIT });
    const details = await Promise.all(page.content.map((o) => this.get<Api.OrderDetail>(`/orders/${encodeURIComponent(o.code)}`)));
    return details.map((d) => toOrder(d));
  }

  /** Chỉ chủ đơn, khi đơn chưa thanh toán (status 1, 2, 4) */
  async cancelOrder(code: string, reason: string): Promise<Order> {
    await this.post<Api.Order>(`/orders/${encodeURIComponent(code)}/cancel`, { reason } satisfies Api.CancelOrderRequest);
    return (await this.getOrderByCode(code))!;
  }

  /** POST /payments/{orderCode}: mỗi lần một payment_code mới; `paymentUrl` là trang cổng thanh toán (VNPay hoặc giả lập của backend) */
  startPayment(code: string): Promise<PaymentInit> {
    return this.post<PaymentInit>(`/payments/${encodeURIComponent(code)}`);
  }

  getPayments(code: string): Promise<Api.Payment[]> {
    return this.get<Api.Payment[]>(`/payments/${encodeURIComponent(code)}`);
  }

  /** GET /orders/purchased?sku=: đơn HOÀN TẤT gần nhất chứa sản phẩm (review có nhãn "Đã mua hàng") */
  async getPurchase(sku: string): Promise<PurchaseCheck> {
    const p = await this.get<Api.PurchaseCheck>('/orders/purchased', { sku });
    return { purchased: p.purchased, orderCode: p.orderCode };
  }
}

export const orderService = new OrderService();
