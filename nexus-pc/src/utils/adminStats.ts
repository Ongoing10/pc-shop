import dayjs from 'dayjs';
import { AdminOrder } from '../types/admin';

/** Một điểm của biểu đồ theo ngày. Backend chưa có API theo ngày nên tính từ danh sách đơn (GET /admin/orders). */
export interface DailyStat {
  date: string;
  orders: number;
  /** doanh thu gộp (trừ hủy, trả) */
  revenue: number;
}

/** Đơn tính vào doanh thu gộp: mọi đơn trừ đã hủy (7) và trả hàng (8), giống `grossRevenue` của backend */
const counted = (o: AdminOrder) => o.status !== 7 && o.status !== 8;
const orderDate = (o: AdminOrder) => (o.placedAt ?? o.createdAt ?? '').slice(0, 10);

export const buildDailyStats = (orders: AdminOrder[], from: string, to: string): DailyStat[] => {
  const byDate = new Map<string, DailyStat>();
  // đủ mọi ngày trong khoảng, ngày không có đơn vẫn có điểm 0
  for (let d = dayjs(from); !d.isAfter(dayjs(to), 'day'); d = d.add(1, 'day')) {
    const key = d.format('YYYY-MM-DD');
    byDate.set(key, { date: key, orders: 0, revenue: 0 });
  }
  orders.forEach((o) => {
    const row = byDate.get(orderDate(o));
    if (!row) return;
    row.orders += 1;
    if (counted(o)) row.revenue += o.totalAmount;
  });
  return [...byDate.values()];
};
