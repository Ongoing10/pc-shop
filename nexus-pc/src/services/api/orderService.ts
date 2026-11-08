import {
  CreateOrderPayload,
  Order,
  OrderPayment,
  OrderStatus,
  OrderStatusHistory,
  PaymentInit,
  PaymentMethod,
  PaymentResult,
  PurchaseCheck,
} from '../../types/order';
import { CartItem } from '../../types/cart';
import { storageService } from '../storage/storageService';
import { initialProducts } from './mockData';
import { notificationService } from './notificationService';
import { formatCurrency } from '../../utils/format';
import { PAYMENT_TIMEOUT_MS, canCancelOrder, isOnlinePayment } from '../../utils/orderStatus';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ORDERS_KEY = 'nexus_orders_v2';
const REQUESTS_KEY = 'nexus_order_requests';
const SEQ_KEY = 'nexus_order_seq';
/** Saga giữ hàng ở backend mất 1–3 giây; mock dùng 1,5 giây */
const RESERVE_DELAY_MS = 1500;

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString();
const daysAgo = (days: number, hour = 9) => {
  const d = new Date(Date.now() - days * 86400000);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
};

const itemOf = (productId: string, qty: number): CartItem => {
  const product = initialProducts.find((p) => p.id === productId)!;
  return { ...product, qty };
};

const ADDRESS = {
  fullName: 'Khách hàng NEXUS',
  phone: '0988888888',
  provinceCode: '01',
  city: 'Thành phố Hà Nội',
  address: 'Số 18 Trần Thái Tông, Phường Cầu Giấy',
};

type Step = [OrderStatus, string, string?, boolean?]; // [trạng thái, thời điểm, lý do, do hệ thống]

const buildDemoOrder = (id: string, method: PaymentMethod, items: CartItem[], steps: Step[], extra: Partial<Order> = {}): Order => {
  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const discountAmount = extra.discountAmount ?? 0;
  const shippingFee = extra.shippingFee ?? 0;
  const statusHistory: OrderStatusHistory[] = steps.map(([toStatus, at, reason, bySystem], i) => ({
    fromStatus: i === 0 ? null : steps[i - 1][0],
    toStatus,
    reason: reason ?? (i === 0 ? 'Đặt hàng' : undefined),
    bySystem,
    createdAt: at,
  }));
  const status = steps[steps.length - 1][0];
  const total = subtotal - discountAmount + shippingFee;
  const paidStep = steps.find(([s]) => s === 3);
  const payments: OrderPayment[] = paidStep
    ? [{ paymentCode: `${id}-01`, method, amount: total, status: 2, paidAt: paidStep[1], createdAt: paidStep[1] }]
    : method === 1 && steps.some(([s]) => s === 6)
      ? [{ paymentCode: `COD-${id}`, method, amount: total, status: 2, paidAt: steps.find(([s]) => s === 6)![1], createdAt: steps.find(([s]) => s === 6)![1] }]
      : [];
  return {
    id,
    createdAt: statusHistory[0].createdAt,
    items,
    subtotal,
    discountAmount,
    shippingFee,
    totalAmount: total,
    paymentMethod: method,
    paymentStatus: payments.some((p) => p.status === 2) ? 2 : 1,
    shippingAddress: ADDRESS,
    status,
    statusHistory,
    payments,
    refunds: [],
    estimatedDelivery: '2-3 ngày làm việc',
    ...extra,
  };
};

// Đơn mẫu đủ các tình huống để xem giao diện khi chưa có backend (mã đơn theo dạng của ordering-service)
const demoOrders = (): Order[] => [
  buildDemoOrder('DH20261108001010', 2, [itemOf('gpu4060', 1), itemOf('psu_deepcool', 1)], [
    [1, minutesAgo(3)],
    [2, minutesAgo(3), 'Đã giữ hàng, chờ thanh toán', true],
  ]),
  buildDemoOrder(
    'DH20261105001003',
    1,
    [itemOf('cpu7800', 1), itemOf('mb650', 1), itemOf('ramking', 1)],
    [
      [1, daysAgo(3)],
      [4, daysAgo(3, 10), 'Đã giữ hàng, chờ giao', true],
      [5, daysAgo(1)],
    ],
    { voucherCode: 'WELCOME10', discountAmount: 500000 }
  ),
  buildDemoOrder('DH20261102001006', 2, [itemOf('cooler_thermal', 1)], [
    [1, daysAgo(6)],
    [2, daysAgo(6, 10), 'Đã giữ hàng, chờ thanh toán', true],
    [3, daysAgo(6, 11), 'Thanh toán thành công (DH20261102001006-01)', true],
    [4, daysAgo(5)],
  ], { shippingFee: 20000 }),
  buildDemoOrder(
    'DH20261025001001',
    1,
    [itemOf('ssd990', 2), itemOf('cooler_thermal', 1)],
    [
      [1, daysAgo(14)],
      [4, daysAgo(14, 10), 'Đã giữ hàng, chờ giao', true],
      [5, daysAgo(13)],
      [6, daysAgo(11)],
    ]
  ),
  buildDemoOrder(
    'DH20261019001002',
    1,
    [itemOf('case_corsair', 1)],
    [
      [1, daysAgo(20)],
      [4, daysAgo(20, 10), 'Đã giữ hàng, chờ giao', true],
      [7, daysAgo(20, 12), 'Tôi muốn đổi sang mẫu khác'],
    ],
    { cancelReason: 'Tôi muốn đổi sang mẫu khác', shippingFee: 20000 }
  ),
];

const readOrders = (): Order[] => storageService.get<Order[] | null>(ORDERS_KEY, null) ?? demoOrders();
const writeOrders = (orders: Order[]) => storageService.set(ORDERS_KEY, orders);

const nextCode = () => {
  const seq = storageService.get<number>(SEQ_KEY, 1100) + 1;
  storageService.set(SEQ_KEY, seq);
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `DH${ymd}${String(seq).padStart(6, '0')}`;
};

/** Nội dung thông báo theo trạng thái, giống NotificationConsumer của notification-service */
const notifyStatus = (order: Order, status: OrderStatus, reason?: string) => {
  const code = order.id;
  const money = formatCurrency(order.totalAmount);
  const texts: Partial<Record<OrderStatus, [string, string]>> = {
    2: ['Chờ thanh toán', `Đơn ${code} đã được giữ hàng. Vui lòng thanh toán ${money} trong 15 phút.`],
    3: ['Thanh toán thành công', `Đã nhận ${money} cho đơn ${code}.`],
    4: ['Đơn hàng đã được xác nhận', `Đơn ${code} đã được xác nhận và đang chuẩn bị hàng.`],
    5: ['Đơn hàng đang được giao', `Đơn ${code} đã bàn giao cho đơn vị vận chuyển.`],
    6: ['Giao hàng thành công', `Đơn ${code} đã giao xong. Hãy đánh giá sản phẩm bạn đã mua nhé!`],
    7: ['Đơn hàng đã bị hủy', `Đơn ${code} đã bị hủy${reason ? `: ${reason}` : '.'}`],
    8: ['Đơn hàng đã được trả', `Đơn ${code} đã được ghi nhận trả hàng${reason ? `: ${reason}` : '.'}`],
  };
  const text = texts[status];
  if (text) notificationService.push(status === 3 ? 'PAYMENT' : 'ORDER_STATUS', text[0], text[1], { order_code: code, status });
};

/** Đổi trạng thái + lịch sử + thông báo; hủy thì hết hạn các lần thanh toán đang chờ (như OrderService.transition) */
const transition = (order: Order, to: OrderStatus, reason?: string, bySystem = false): Order => {
  const now = new Date().toISOString();
  let next: Order = {
    ...order,
    status: to,
    statusHistory: [...order.statusHistory, { fromStatus: order.status, toStatus: to, reason, bySystem, createdAt: now }],
  };
  if (to === 7) {
    next = {
      ...next,
      cancelReason: reason,
      payments: next.payments.map((p) => (p.status === 1 ? { ...p, status: 4 } : p)),
    };
  }
  if (to === 3) next = { ...next, paymentStatus: 2 };
  notifyStatus(next, to, reason);
  return next;
};

/**
 * Phần việc của backend chạy ngầm, tính theo thời gian: Saga giữ hàng (1 → 4 / 2 / 7) và hủy đơn online quá hạn
 * thanh toán (2 → 7). Trả về đơn đã cập nhật và cờ "có thay đổi".
 */
const advance = (order: Order): [Order, boolean] => {
  const age = Date.now() - new Date(order.createdAt).getTime();
  if (order.status === 1 && age >= RESERVE_DELAY_MS) {
    const short = order.items.find((it) => {
      const stock = initialProducts.find((p) => p.id === it.id)?.stock ?? 0;
      return stock < it.qty;
    });
    if (short) {
      const stock = initialProducts.find((p) => p.id === short.id)?.stock ?? 0;
      return [transition(order, 7, `Không đủ hàng: ${short.name} (cần ${short.qty}, còn ${stock})`, true), true];
    }
    return isOnlinePayment(order.paymentMethod)
      ? [transition(order, 2, 'Đã giữ hàng, chờ thanh toán', true), true]
      : [transition(order, 4, 'Đã giữ hàng, chờ giao', true), true];
  }
  if (order.status === 2 && age >= PAYMENT_TIMEOUT_MS) {
    return [transition(order, 7, 'Quá hạn thanh toán', true), true];
  }
  return [order, false];
};

/** Đọc đơn, chạy phần việc ngầm (nếu có) rồi lưu lại */
const loadOrders = (): Order[] => {
  let changed = false;
  const orders = readOrders().map((o) => {
    const [next, c] = advance(o);
    changed = changed || c;
    return next;
  });
  if (changed) writeOrders(orders);
  return orders;
};

// Giữ cho "Saga" và job quá hạn chạy cả khi người dùng đang ở trang khác (để thông báo đến đúng lúc)
let ticker: ReturnType<typeof setInterval> | null = null;
const ensureTicker = () => {
  if (ticker || typeof window === 'undefined') return;
  ticker = setInterval(() => {
    const orders = loadOrders();
    if (!orders.some((o) => o.status === 1 || o.status === 2)) {
      clearInterval(ticker!);
      ticker = null;
    }
  }, 1000);
};

const findOrder = (orders: Order[], code: string) => orders.find((o) => o.id.toUpperCase() === code.trim().toUpperCase());

/** Lỗi theo envelope ResponseData của backend, để trang hiển thị error_message */
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Mock trên localStorage, hành vi giống ordering-service:
// POST /orders (Idempotency-Key), GET /orders/my, GET /orders/{code}, POST /orders/{code}/cancel,
// POST /payments/{orderCode}, GET /payments/{orderCode}, GET /orders/purchased?sku=.
export const orderService = {
  /**
   * Đặt hàng: trả đơn status 1 (đang giữ hàng); vài giây sau thành 4 (COD) / 2 (online) / 7 (hết hàng).
   * {@code requestId} = header Idempotency-Key: gửi lại cùng key trả đúng đơn đã tạo.
   */
  async createOrder(payload: CreateOrderPayload, requestId?: string): Promise<Order> {
    await delay(350);
    const requests = storageService.get<Record<string, string>>(REQUESTS_KEY, {});
    if (requestId && requests[requestId]) {
      const existing = findOrder(loadOrders(), requests[requestId]);
      if (existing) return existing;
    }

    const subtotal = payload.items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const discountAmount = payload.discountAmount ?? 0;
    const shippingFee = payload.shippingFee ?? 0;
    const createdAt = new Date().toISOString();
    const order: Order = {
      id: nextCode(),
      createdAt,
      items: payload.items,
      subtotal,
      discountAmount,
      voucherCode: payload.voucherCode,
      shippingFee,
      totalAmount: Math.max(0, subtotal - discountAmount + shippingFee),
      paymentMethod: payload.paymentMethod,
      paymentStatus: 1,
      shippingAddress: payload.shippingAddress,
      status: 1,
      statusHistory: [{ fromStatus: null, toStatus: 1, reason: 'Đặt hàng', createdAt }],
      payments: [],
      refunds: [],
      estimatedDelivery: '2-3 ngày làm việc',
    };

    writeOrders([order, ...loadOrders()]);
    if (requestId) storageService.set(REQUESTS_KEY, { ...requests, [requestId]: order.id });
    ensureTicker();
    return order;
  },

  async getOrderByCode(code: string): Promise<Order | null> {
    await delay(150);
    const order = findOrder(loadOrders(), code) ?? null;
    if (order && (order.status === 1 || order.status === 2)) ensureTicker();
    return order;
  },

  async getUserOrders(): Promise<Order[]> {
    await delay(150);
    const orders = loadOrders();
    if (orders.some((o) => o.status === 1 || o.status === 2)) ensureTicker();
    return orders;
  },

  async cancelOrder(code: string, reason: string): Promise<Order> {
    await delay(250);
    const orders = loadOrders();
    const order = findOrder(orders, code);
    if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng.');
    if (!canCancelOrder(order)) {
      throw new ApiError(400, 'Đơn đã thanh toán hoặc đang giao, không thể tự hủy. Vui lòng liên hệ cửa hàng');
    }
    const cancelled = transition(order, 7, reason);
    writeOrders(orders.map((o) => (o.id === order.id ? cancelled : o)));
    return cancelled;
  },

  /** POST /payments/{orderCode}: mỗi lần một payment_code mới <mã đơn>-<lần> */
  async startPayment(code: string): Promise<PaymentInit> {
    await delay(200);
    const orders = loadOrders();
    const order = findOrder(orders, code);
    if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng.');
    if (!isOnlinePayment(order.paymentMethod)) throw new ApiError(400, 'Đơn thanh toán khi nhận hàng (COD)');
    if (order.status !== 2) throw new ApiError(400, 'Đơn không ở trạng thái chờ thanh toán');
    const expiresAt = new Date(new Date(order.createdAt).getTime() + PAYMENT_TIMEOUT_MS).toISOString();
    const payment: OrderPayment = {
      paymentCode: `${order.id}-${String(order.payments.length + 1).padStart(2, '0')}`,
      method: order.paymentMethod,
      amount: order.totalAmount,
      status: 1,
      expiredAt: expiresAt,
      createdAt: new Date().toISOString(),
    };
    writeOrders(orders.map((o) => (o.id === order.id ? { ...o, payments: [...o.payments, payment] } : o)));
    // Bản thật: VNPay có khóa → URL sandbox.vnpayment.vn; còn lại → trang giả lập do backend phục vụ
    return { paymentCode: payment.paymentCode, paymentUrl: `/payment/mock/${payment.paymentCode}`, amount: payment.amount, expiresAt, gateway: 'MOCK' };
  },

  /** Thông tin một lần thanh toán (cho trang cổng giả lập) */
  async getPayment(paymentCode: string): Promise<{ order: Order; payment: OrderPayment } | null> {
    await delay(100);
    for (const order of loadOrders()) {
      const payment = order.payments.find((p) => p.paymentCode === paymentCode);
      if (payment) return { order, payment };
    }
    return null;
  },

  /**
   * Cổng thanh toán báo kết quả (backend: IPN / return URL / trang giả lập → PaymentService.complete).
   * Trả ?result= mà backend gắn khi chuyển về trang /orders/payment-result.
   */
  async completePayment(paymentCode: string, success: boolean): Promise<{ orderCode: string | null; result: PaymentResult }> {
    await delay(300);
    const orders = loadOrders();
    const order = orders.find((o) => o.payments.some((p) => p.paymentCode === paymentCode));
    if (!order) return { orderCode: null, result: 'invalid' };
    const payment = order.payments.find((p) => p.paymentCode === paymentCode)!;
    if (payment.status !== 1 && payment.status !== 4) {
      // đã xử lý (IPN và return URL cùng báo một lần thanh toán)
      return { orderCode: order.id, result: payment.status === 2 ? 'success' : 'failed' };
    }
    const now = new Date().toISOString();
    const done: OrderPayment = { ...payment, status: success ? 2 : 3, paidAt: success ? now : undefined };
    let next: Order = { ...order, payments: order.payments.map((p) => (p.paymentCode === paymentCode ? done : p)) };
    let result: PaymentResult = success ? 'success' : 'failed';
    if (success) {
      if (next.status === 2) {
        next = transition(next, 3, `Thanh toán thành công (${paymentCode})`, true);
      } else {
        // tiền về khi đơn đã hủy (quá hạn / khách hủy): tạo yêu cầu hoàn tiền
        next = {
          ...next,
          refunds: [...next.refunds, { paymentCode, amount: done.amount, reason: 'Tiền về khi đơn không còn chờ thanh toán', status: 1, createdAt: now }],
        };
        result = 'refund';
      }
    }
    writeOrders(orders.map((o) => (o.id === order.id ? next : o)));
    return { orderCode: order.id, result };
  },

  /** GET /orders/purchased?sku=: đơn HOÀN TẤT gần nhất chứa sản phẩm (review có nhãn "Đã mua hàng") */
  async getPurchase(productId: string): Promise<PurchaseCheck> {
    await delay(80);
    const order = loadOrders()
      .filter((o) => o.status === 6 && o.items.some((it) => it.id === productId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return { purchased: Boolean(order), orderCode: order?.id ?? null };
  },
};
