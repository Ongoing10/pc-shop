import { BulkErrorItem, bulkErrorsOf } from '../../../components/admin/bulk';
import { useChangeOrderStatus, useCompleteRefund } from '../../../hooks/admin/useAdminApi';
import { AdminOrder, AdminRefund, OrderStatus } from '../../../types/admin';

/**
 * Đổi trạng thái đơn và hoàn tiền qua API. Backend kiểm tra chuyển trạng thái hợp lệ và tự sinh tác dụng phụ
 * (ghi lịch sử, dòng thanh toán MANUAL-/COD-, yêu cầu hoàn tiền, nhả hàng).
 */
export const useOrderActions = () => {
  const changeOrderStatus = useChangeOrderStatus();
  const completeRefundMutation = useCompleteRefund();

  /**
   * Một đơn → PATCH /admin/orders/{code}/status; nhiều đơn → PATCH /admin/orders/bulk/status ("tất cả hoặc không").
   * Trả về danh sách lỗi theo đơn (rỗng = thành công).
   */
  const changeStatus = async (targets: AdminOrder[], status: OrderStatus, reason?: string | null): Promise<BulkErrorItem[]> => {
    try {
      await changeOrderStatus.mutateAsync({ codes: targets.map((o) => o.code), status, reason });
      return [];
    } catch (e) {
      return bulkErrorsOf(e) ?? [{ id: targets.length === 1 ? targets[0].code : '*', reason: (e as Error).message }];
    }
  };

  /** PATCH /admin/refunds/{id}/complete: hoàn tiền xong → payment REFUNDED, đơn paymentStatus 3 */
  const completeRefund = async (refund: AdminRefund, providerRefundId: string | null) => {
    await completeRefundMutation.mutateAsync({ id: refund.id, providerRefundId });
  };

  return { changeStatus, completeRefund };
};
