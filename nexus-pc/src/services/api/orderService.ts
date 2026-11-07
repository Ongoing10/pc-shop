import { Order, CreateOrderPayload } from '../../types/order';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ORDERS_KEY = 'nexus_orders';

export const orderService = {
  /**
   * Create new order
   */
  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    await delay(350);

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newOrderId = `NX2026${randomSuffix}`;
    const totalAmount = payload.items.reduce((sum, item) => sum + item.price * item.qty, 0);

    const order: Order = {
      id: newOrderId,
      createdAt: new Date().toISOString(),
      items: payload.items,
      totalAmount,
      shippingFee: 0, // Free shipping standard
      paymentMethod: payload.paymentMethod,
      shippingAddress: payload.shippingAddress,
      status: 'processing',
      estimatedDelivery: '2-3 ngày làm việc',
    };

    // Store in localStorage for demo continuity
    if (typeof window !== 'undefined') {
      try {
        const stored = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
        stored.unshift(order);
        localStorage.setItem(ORDERS_KEY, JSON.stringify(stored));
      } catch (err) {
        console.error('Failed to save order to localStorage', err);
      }
    }

    return order;
  },

  /**
   * Track order by code
   */
  async trackOrder(orderId: string): Promise<Order | null> {
    await delay(250);
    const trimmed = orderId.trim().toUpperCase();

    if (typeof window !== 'undefined') {
      try {
        const stored: Order[] = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
        const found = stored.find((o) => o.id.toUpperCase() === trimmed);
        if (found) return found;
      } catch (err) {
        console.error('Failed to read orders from localStorage', err);
      }
    }

    // Default fallback order if searching for demo ID
    if (trimmed === 'NX20260001' || trimmed.startsWith('NX')) {
      return {
        id: trimmed,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        items: [],
        totalAmount: 19490000,
        shippingFee: 0,
        paymentMethod: 'cod',
        shippingAddress: {
          fullName: 'Nguyễn Văn A',
          phone: '0988 123 456',
          email: 'nguyenvana@gmail.com',
          city: 'Hà Nội',
          address: 'Số 18 Phố Huế, Hoàn Kiếm',
        },
        status: 'shipping',
        estimatedDelivery: 'Hôm nay (dự kiến trước 18:00)',
      };
    }

    return null;
  },

  /**
   * Get all user orders
   */
  async getUserOrders(): Promise<Order[]> {
    await delay(150);
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
      } catch {
        return [];
      }
    }
    return [];
  },
};
