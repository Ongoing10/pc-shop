import { fakeLatency, useAdminData } from '../../../context/AdminDataContext';
import { useAdminUser } from '../../../context/AdminSessionContext';
import { collectBulkErrors } from '../../../components/admin/bulk';
import { AdminOrder, OrderStatus } from '../../../types/admin';
import { ORDER_STATUS_META, ORDER_TRANSITIONS } from '../../../utils/adminStatus';

/** Đổi trạng thái đơn (đơn lẻ và hàng loạt) trên dữ liệu giả, kiểm tra như backend */
export const useOrderActions = () => {
  const user = useAdminUser();
  const {
    orders: [, setOrders],
    orderHistories: [, setHistories],
  } = useAdminData();

  /**
   * TODO ghép API: một đơn → PATCH /admin/orders/{code}/status {status, reason};
   * nhiều đơn → PATCH /admin/orders/bulk/status {codes, status, reason}, lỗi 400 trả data [{id, reason}].
   * Trả về danh sách lỗi (rỗng = thành công).
   */
  const changeStatus = async (targets: AdminOrder[], status: OrderStatus, reason?: string | null) => {
    await fakeLatency();
    const errors = collectBulkErrors(
      targets,
      (o) => o.code,
      (o) =>
        ORDER_TRANSITIONS[o.status].includes(status)
          ? null
          : `Không thể chuyển từ "${ORDER_STATUS_META[o.status].label}" sang "${ORDER_STATUS_META[status].label}"`
    );
    if (errors.length) return errors;

    const now = new Date().toISOString();
    const codes = new Set(targets.map((o) => o.code));
    setOrders((prev) =>
      prev.map((o) =>
        codes.has(o.code)
          ? {
              ...o,
              status,
              cancelReason: status === 7 ? reason ?? null : o.cancelReason,
              paymentStatus: status === 3 ? 2 : status === 8 && o.paymentStatus === 2 ? 3 : o.paymentStatus,
              completedAt: status === 6 ? now : o.completedAt,
            }
          : o
      )
    );
    setHistories((prev) => [
      ...prev,
      ...targets.map((o, i) => ({
        id: Date.now() + i,
        orderId: o.id,
        fromStatus: o.status,
        toStatus: status,
        reason: reason ?? null,
        createdBy: user.id,
        createdAt: now,
      })),
    ]);
    return [];
  };

  return { changeStatus };
};
