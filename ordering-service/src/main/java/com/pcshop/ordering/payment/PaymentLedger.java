package com.pcshop.ordering.payment;

import com.pcshop.ordering.order.Order;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Ghi sổ tiền của đơn khi đơn đổi trạng thái (gọi từ OrderService.transition, trong transaction của nó):
 * COD hoàn tất → dòng payments SUCCESS; hủy → các lần thanh toán đang chờ hết hạn; hủy/trả đơn đã thu tiền → yêu cầu hoàn tiền.
 * Không phụ thuộc OrderService (PaymentService mới phụ thuộc), tránh vòng phụ thuộc.
 */
@Component
public class PaymentLedger {

    private static final Logger log = LoggerFactory.getLogger(PaymentLedger.class);

    private final PaymentRepository payments;
    private final RefundRepository refunds;

    public PaymentLedger(PaymentRepository payments, RefundRepository refunds) {
        this.payments = payments;
        this.refunds = refunds;
    }

    /** COD giao xong: tiền mặt đã thu, ghi một lần thanh toán SUCCESS (để trả hàng thì có cái mà hoàn). */
    public Mono<Void> recordCod(Order order) {
        LocalDateTime now = LocalDateTime.now();
        Payment p = new Payment();
        p.setOrderId(order.getId());
        p.setPaymentCode("COD-" + order.getCode());
        p.setMethod(Order.PAYMENT_COD);
        p.setAmount(order.getTotalAmount());
        p.setStatus(Payment.SUCCESS);
        p.setPaidAt(now);
        p.setCreatedAt(now);
        p.setUpdatedAt(now);
        return payments.save(p).then();
    }

    /**
     * Nhân viên xác nhận tay "đã thanh toán" (chuyển khoản, trả tại quầy...): ghi một lần thanh toán SUCCESS để hủy/trả
     * đơn sau này có cái mà hoàn tiền. Cổng thanh toán báo về thì đã có dòng riêng, không đi qua đây.
     */
    public Mono<Void> recordManual(Order order) {
        LocalDateTime now = LocalDateTime.now();
        Payment p = new Payment();
        p.setOrderId(order.getId());
        p.setPaymentCode("MANUAL-" + order.getCode());
        p.setMethod(order.getPaymentMethod());
        p.setAmount(order.getTotalAmount());
        p.setStatus(Payment.SUCCESS);
        p.setPaidAt(now);
        p.setCreatedAt(now);
        p.setUpdatedAt(now);
        return payments.save(p).then();
    }

    public Mono<Void> expirePending(Order order) {
        return payments.expirePending(order.getId()).then();
    }

    /**
     * Tạo yêu cầu hoàn tiền cho lần thanh toán thành công gần nhất của đơn (mỗi lần thanh toán tối đa một yêu cầu).
     * Đơn đã thu tiền nhưng không có dòng payments (dữ liệu mẫu cũ) thì chỉ ghi log để nhân viên tự xử lý.
     */
    public Mono<Void> requestRefund(Order order, String reason, UUID actor) {
        return payments.findFirstByOrderIdAndStatusOrderByIdDesc(order.getId(), Payment.SUCCESS)
                .switchIfEmpty(Mono.fromRunnable(() ->
                        log.warn("Đơn {} đã thu tiền nhưng không có dòng payments, không tạo được yêu cầu hoàn tiền", order.getCode())))
                .flatMap(payment -> requestRefund(payment, reason, actor));
    }

    public Mono<Void> requestRefund(Payment payment, String reason, UUID actor) {
        return refunds.existsByPaymentId(payment.getId()).flatMap(exists -> {
            if (exists) {
                return Mono.empty();
            }
            LocalDateTime now = LocalDateTime.now();
            Refund r = new Refund();
            r.setPaymentId(payment.getId());
            r.setAmount(payment.getAmount());
            r.setReason(reason == null ? null : reason.length() > 255 ? reason.substring(0, 255) : reason);
            r.setStatus(Refund.PENDING);
            r.setCreatedBy(actor);
            r.setCreatedAt(now);
            r.setUpdatedAt(now);
            return refunds.save(r).then();
        });
    }
}
