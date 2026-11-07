import { Order, CreateOrderPayload, OrderStatus, OrderStatusHistory } from '../../types/order';
import { CartItem } from '../../types/cart';
import { storageService } from '../storage/storageService';
import { initialProducts } from './mockData';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ORDERS_KEY = 'nexus_orders';

const daysAgo = (days: number, hour = 9) => {
  const d = new Date(Date.now() - days * 86400000);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
};

const itemOf = (productId: string, qty: number): CartItem => {
  const product = initialProducts.find((p) => p.id === productId)!;
  return { ...product, qty };
};

const buildDemoOrder = (
  id: string,
  items: CartItem[],
  history: Array<[OrderStatus, number, string?]>,
  extra: Partial<Order> = {}
): Order => {
  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const discountAmount = extra.discountAmount ?? 0;
  const shippingFee = extra.shippingFee ?? 0;
  const statusHistory: OrderStatusHistory[] = history.map(([toStatus, days, reason], i) => ({
    fromStatus: i === 0 ? null : history[i - 1][0],
    toStatus,
    reason,
    createdAt: daysAgo(days, 9 + i * 2),
  }));
  return {
    id,
    createdAt: statusHistory[0].createdAt,
    items,
    subtotal,
    discountAmount,
    shippingFee,
    totalAmount: subtotal - discountAmount + shippingFee,
    paymentMethod: 'cod',
    shippingAddress: {
      fullName: 'Khách hàng NEXUS',
      phone: '0988888888',
      city: 'Thành phố Hà Nội',
      address: 'Số 18 Trần Thái Tông, Phường Cầu Giấy',
    },
    status: history[history.length - 1][0],
    statusHistory,
    estimatedDelivery: '2-3 ngày làm việc',
    ...extra,
  };
};

// Vài đơn mẫu đủ các trạng thái để xem giao diện khi chưa có backend
const DEMO_ORDERS: Order[] = [
  buildDemoOrder('NX20261042', [itemOf('gpu4060', 1), itemOf('psu_deepcool', 1)], [['pending', 0]]),
  buildDemoOrder(
    'NX20261031',
    [itemOf('cpu7800', 1), itemOf('mb650', 1), itemOf('ramking', 1)],
    [
      ['pending', 3],
      ['processing', 2],
      ['shipping', 1, 'Đã bàn giao cho đơn vị vận chuyển'],
    ],
    { voucherCode: 'WELCOME10', discountAmount: 500000 }
  ),
  buildDemoOrder(
    'NX20260987',
    [itemOf('ssd990', 2), itemOf('cooler_thermal', 1)],
    [
      ['pending', 14],
      ['processing', 13],
      ['shipping', 12],
      ['delivered', 10],
    ]
  ),
  buildDemoOrder(
    'NX20260950',
    [itemOf('case_corsair', 1)],
    [
      ['pending', 20],
      ['cancelled', 20, 'Tôi muốn đổi sang mẫu khác'],
    ],
    { cancelReason: 'Tôi muốn đổi sang mẫu khác', shippingFee: 30000 }
  ),
];

/** Đơn lưu bởi phiên bản cũ thiếu vài trường: bù cho đủ để giao diện không vỡ */
const normalize = (o: Order): Order => {
  const subtotal = o.subtotal ?? o.items.reduce((sum, it) => sum + it.price * it.qty, 0);
  return {
    ...o,
    subtotal,
    discountAmount: o.discountAmount ?? 0,
    paymentMethod: o.paymentMethod === 'vnpay' ? 'vnpay' : 'cod',
    statusHistory: o.statusHistory ?? [{ fromStatus: null, toStatus: o.status, createdAt: o.createdAt }],
  };
};

const readOrders = (): Order[] =>
  (storageService.get<Order[] | null>(ORDERS_KEY, null) ?? DEMO_ORDERS).map(normalize);

const writeOrders = (orders: Order[]) => storageService.set(ORDERS_KEY, orders);

/** Khách chỉ được hủy khi đơn chưa xử lý (backend: PENDING/AWAITING_PAYMENT) */
export const canCancelOrder = (status: OrderStatus) => status === 'pending';

// Mock trên localStorage. Bản thật: ordering-service (/orders/my, /orders/{code}, /timeline, /cancel; POST /orders thuộc Đợt 2).
export const orderService = {
  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    await delay(350);

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const subtotal = payload.items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const discountAmount = payload.discountAmount ?? 0;
    const shippingFee = payload.shippingFee ?? 0;
    const createdAt = new Date().toISOString();

    const order: Order = {
      id: `NX2026${randomSuffix}`,
      createdAt,
      items: payload.items,
      subtotal,
      discountAmount,
      voucherCode: payload.voucherCode,
      shippingFee,
      totalAmount: Math.max(0, subtotal - discountAmount + shippingFee),
      paymentMethod: payload.paymentMethod,
      shippingAddress: payload.shippingAddress,
      status: 'pending',
      statusHistory: [{ fromStatus: null, toStatus: 'pending', createdAt }],
      estimatedDelivery: '2-3 ngày làm việc',
    };

    writeOrders([order, ...readOrders()]);
    return order;
  },

  async getOrderByCode(code: string): Promise<Order | null> {
    await delay(150);
    const trimmed = code.trim().toUpperCase();
    return readOrders().find((o) => o.id.toUpperCase() === trimmed) ?? null;
  },

  async getUserOrders(): Promise<Order[]> {
    await delay(150);
    return readOrders();
  },

  async cancelOrder(code: string, reason: string): Promise<Order> {
    await delay(250);
    const orders = readOrders();
    const order = orders.find((o) => o.id === code);
    if (!order) throw new Error('Không tìm thấy đơn hàng.');
    if (!canCancelOrder(order.status)) throw new Error('Đơn hàng đã được xử lý, không thể hủy.');

    const cancelled: Order = {
      ...order,
      status: 'cancelled',
      cancelReason: reason,
      statusHistory: [
        ...order.statusHistory,
        { fromStatus: order.status, toStatus: 'cancelled', reason, createdAt: new Date().toISOString() },
      ],
    };
    writeOrders(orders.map((o) => (o.id === code ? cancelled : o)));
    return cancelled;
  },
};
