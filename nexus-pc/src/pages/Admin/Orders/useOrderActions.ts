import { fakeLatency, useAdminData } from '../../../context/AdminDataContext';
import { useAdminUser } from '../../../context/AdminSessionContext';
import { collectBulkErrors } from '../../../components/admin/bulk';
import { AdminOrder, AdminPayment, AdminRefund, OrderStatus } from '../../../types/admin';
import { ORDER_STATUS_META, ORDER_TRANSITIONS } from '../../../utils/adminStatus';

/** Đổi trạng thái đơn và hoàn tiền trên dữ liệu giả, kiểm tra và tác dụng phụ như backend (OrderService.transition) */
export const useOrderActions = () => {
  const user = useAdminUser();
  const {
    orders: [, setOrders],
    orderHistories: [, setHistories],
    payments: [payments, setPayments],
    refunds: [refunds, setRefunds],
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
    const ids = new Set(targets.map((o) => o.id));
    let nextPaymentId = Math.max(0, ...payments.map((p) => p.id)) + 1;
    let nextRefundId = Math.max(0, ...refunds.map((r) => r.id)) + 1;
    const newPayments: AdminPayment[] = [];
    const newRefunds: AdminRefund[] = [];

    const record = (o: AdminOrder, paymentCode: string): AdminPayment => ({
      id: nextPaymentId++,
      orderId: o.id,
      paymentCode,
      method: o.paymentMethod,
      amount: o.totalAmount,
      status: 2,
      providerTransactionId: null,
      bankCode: null,
      paidAt: now,
      expiredAt: null,
      createdAt: now,
    });

    targets.forEach((o) => {
      // Nhân viên xác nhận tay "đã thanh toán" (chuyển khoản, trả tại quầy): ghi dòng MANUAL-<mã> để sau này hoàn được
      if (status === 3) newPayments.push(record(o, `MANUAL-${o.code}`));
      // COD giao xong: tiền mặt đã thu
      if (status === 6 && o.paymentMethod === 1) newPayments.push(record(o, `COD-${o.code}`));
      // Hủy / trả đơn đã thu tiền → yêu cầu hoàn tiền cho lần thanh toán thành công gần nhất
      if ((status === 7 || status === 8) && o.paymentStatus === 2) {
        const paid = payments.filter((p) => p.orderId === o.id && p.status === 2).pop();
        if (paid && !refunds.some((r) => r.paymentCode === paid.paymentCode)) {
          newRefunds.push({
            id: nextRefundId++,
            orderCode: o.code,
            paymentCode: paid.paymentCode,
            method: paid.method,
            amount: paid.amount,
            reason: `${status === 7 ? 'Hủy đơn' : 'Trả hàng'}: ${reason ?? ''}`,
            status: 1,
            providerRefundId: null,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    });

    setOrders((prev) =>
      prev.map((o) =>
        codes.has(o.code)
          ? {
              ...o,
              status,
              cancelReason: status === 7 ? reason ?? null : o.cancelReason,
              // Trả hàng / hủy giữ "đã thanh toán" đến khi nhân viên đánh dấu hoàn tiền xong
              paymentStatus: status === 3 || (status === 6 && o.paymentMethod === 1) ? 2 : o.paymentStatus,
              completedAt: status === 6 ? now : o.completedAt,
            }
          : o
      )
    );
    setPayments((prev) => [
      // hủy đơn: các lần thanh toán còn chờ hết hạn (tiền về sau đó sẽ thành yêu cầu hoàn tiền)
      ...prev.map((p) => (status === 7 && ids.has(p.orderId) && p.status === 1 ? { ...p, status: 4 as const } : p)),
      ...newPayments,
    ]);
    if (newRefunds.length) setRefunds((prev) => [...newRefunds, ...prev]);
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

  /**
   * TODO ghép API: PATCH /admin/refunds/{id}/complete {providerRefundId}. Refund → đã hoàn, payment → REFUNDED,
   * đơn → paymentStatus 3 nếu không còn lần thanh toán thành công nào khác (hoàn tiền thừa không đổi trạng thái đơn).
   */
  const completeRefund = async (refund: AdminRefund, providerRefundId: string | null) => {
    await fakeLatency();
    const now = new Date().toISOString();
    setRefunds((prev) =>
      prev.map((r) => (r.id === refund.id ? { ...r, status: 2, providerRefundId, updatedAt: now } : r))
    );
    const nextPayments = payments.map((p) =>
      p.paymentCode === refund.paymentCode ? { ...p, status: 5 as const } : p
    );
    setPayments(nextPayments);
    const orderId = payments.find((p) => p.paymentCode === refund.paymentCode)?.orderId;
    const stillPaid = nextPayments.some((p) => p.orderId === orderId && p.status === 2);
    if (!stillPaid) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: 3 } : o)));
    }
  };

  return { changeStatus, completeRefund };
};
