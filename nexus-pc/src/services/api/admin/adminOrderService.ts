import type * as Api from '../../../types/api';
import { BaseService } from '../BaseService';
import type { DownloadedFile } from './adminCatalogService';

/** ordering-service phía quản trị: đơn hàng, hoàn tiền, voucher, thống kê (/admin/**) */
class AdminOrderService extends BaseService {
  constructor() {
    super('');
  }

  // ----- đơn hàng -----
  listOrders(query: Api.AdminOrderListQuery = {}) {
    return this.getAllPages<Api.Order>('/admin/orders', { ...query });
  }
  getOrder(code: string) {
    return this.get<Api.OrderDetail>(`/admin/orders/${encodeURIComponent(code)}`);
  }
  /** Nhân viên được xem lịch sử và thanh toán của mọi đơn */
  getTimeline(code: string) {
    return this.get<Api.OrderStatusHistory[]>(`/orders/${encodeURIComponent(code)}/timeline`);
  }
  getPayments(code: string) {
    return this.get<Api.Payment[]>(`/payments/${encodeURIComponent(code)}`);
  }
  changeStatus(code: string, body: Api.OrderStatusRequest) {
    return this.patch<Api.Order>(`/admin/orders/${encodeURIComponent(code)}/status`, body);
  }
  /** "Tất cả hoặc không": lỗi trả 400 kèm data [{id, reason}] (ApiError.data) */
  changeStatusBulk(codes: string[], status: Api.OrderStatus, reason?: string | null) {
    return this.patch<Api.Order[]>('/admin/orders/bulk/status', { codes, status, reason: reason ?? null } satisfies Api.BulkOrderStatusRequest);
  }
  exportOrders(query: Pick<Api.AdminOrderListQuery, 'status' | 'from' | 'to'>): Promise<DownloadedFile> {
    return this.download('/admin/orders/export', { ...query });
  }

  // ----- hoàn tiền -----
  listRefunds(status?: Api.RefundStatus) {
    return this.get<Api.RefundView[]>('/admin/refunds', { status });
  }
  completeRefund(id: number, providerRefundId: string | null) {
    return this.patch<Api.Refund>(`/admin/refunds/${id}/complete`, { providerRefundId } satisfies Api.CompleteRefundRequest);
  }

  // ----- voucher -----
  listVouchers() {
    return this.get<Api.AdminVoucher[]>('/admin/vouchers');
  }
  createVoucher(body: Api.CreateVoucherRequest) {
    return this.post<Api.AdminVoucher>('/admin/vouchers', body);
  }
  updateVoucher(id: number, body: Api.UpdateVoucherRequest) {
    return this.put<Api.AdminVoucher>(`/admin/vouchers/${id}`, body);
  }
  setVouchersActive(ids: number[], active: boolean) {
    return this.patch<Api.AdminVoucher[]>('/admin/vouchers/bulk/active', { ids, active } satisfies Api.BulkActiveIdsRequest);
  }

  // ----- thống kê -----
  getOverview(from?: string, to?: string) {
    return this.get<Api.StatsOverview>('/admin/stats/overview', { from, to });
  }
  getTopProducts(from?: string, to?: string, limit = 10) {
    return this.get<Api.TopProduct[]>('/admin/stats/top-products', { from, to, limit });
  }
}

export const adminOrderService = new AdminOrderService();
