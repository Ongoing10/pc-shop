package com.pcshop.ordering.payment;

import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.contracts.ResponseData;
import com.pcshop.ordering.order.Order;
import com.pcshop.ordering.order.OrderRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Yêu cầu hoàn tiền (tạo tự động khi hủy/trả đơn đã thu tiền). Chưa gọi API hoàn tiền của cổng: nhân viên hoàn trên
 * trang quản trị VNPay (hoặc trả tiền mặt với COD) rồi bấm "Đã hoàn". Xem: STAFF/ADMIN; đánh dấu: order:update-status.
 */
@RestController
@RequestMapping("/api/v1/admin/refunds")
public class AdminRefundController {

    public record RefundView(Long id, String orderCode, String paymentCode, Integer method, BigDecimal amount,
                             String reason, Integer status, String providerRefundId, LocalDateTime createdAt,
                             LocalDateTime updatedAt) {
    }

    public record CompleteRequest(@Size(max = 100) String providerRefundId) {
    }

    private final DatabaseClient db;
    private final RefundRepository refunds;
    private final PaymentRepository payments;
    private final OrderRepository orders;

    public AdminRefundController(DatabaseClient db, RefundRepository refunds, PaymentRepository payments,
                                 OrderRepository orders) {
        this.db = db;
        this.refunds = refunds;
        this.payments = payments;
        this.orders = orders;
    }

    /** Danh sách yêu cầu hoàn tiền, mới nhất trước; status 1 = chờ hoàn, 2 = đã hoàn. */
    @GetMapping
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public Mono<ResponseData<List<RefundView>>> list(@RequestParam(required = false) Integer status) {
        DatabaseClient.GenericExecuteSpec sql = db.sql("""
                SELECT r.id, o.code AS order_code, p.payment_code, p.method, r.amount, r.reason, r.status,
                       r.provider_refund_id, r.created_at, r.updated_at
                FROM refunds r JOIN payments p ON p.id = r.payment_id JOIN orders o ON o.id = p.order_id
                WHERE (:status IS NULL OR r.status = :status)
                ORDER BY r.id DESC LIMIT 500""");
        sql = status == null ? sql.bindNull("status", Integer.class) : sql.bind("status", status);
        return sql.map(row -> new RefundView(row.get("id", Long.class), row.get("order_code", String.class),
                        row.get("payment_code", String.class), row.get("method", Integer.class),
                        row.get("amount", BigDecimal.class), row.get("reason", String.class),
                        row.get("status", Integer.class), row.get("provider_refund_id", String.class),
                        row.get("created_at", LocalDateTime.class), row.get("updated_at", LocalDateTime.class)))
                .all()
                .collectList()
                .map(ResponseData::success);
    }

    /**
     * Đánh dấu đã hoàn tiền: refund COMPLETED, payment REFUNDED, đơn paymentStatus = 3 (đã hoàn tiền) nếu đơn không còn
     * lần thanh toán thành công nào khác.
     */
    @PatchMapping("/{id}/complete")
    @PreAuthorize("hasAuthority('order:update-status')")
    @Transactional
    public Mono<ResponseData<Refund>> complete(@PathVariable Long id, @Valid @RequestBody(required = false) CompleteRequest body) {
        return refunds.findById(id)
                .switchIfEmpty(Mono.error(() -> BusinessException.notFound("yêu cầu hoàn tiền", id)))
                .flatMap(refund -> {
                    if (refund.getStatus() == Refund.COMPLETED) {
                        return Mono.error(new BusinessException(ErrorCode.BAD_REQUEST, "Yêu cầu này đã hoàn tiền"));
                    }
                    refund.setStatus(Refund.COMPLETED);
                    refund.setProviderRefundId(body == null ? null : body.providerRefundId());
                    refund.setUpdatedAt(LocalDateTime.now());
                    return refunds.save(refund)
                            .flatMap(saved -> payments.findById(saved.getPaymentId())
                                    .flatMap(p -> {
                                        p.setStatus(Payment.REFUNDED);
                                        p.setUpdatedAt(LocalDateTime.now());
                                        return payments.save(p);
                                    })
                                    // tiền thừa của lần thanh toán khác (đơn vẫn còn một lần SUCCESS) → đơn giữ "đã thanh toán"
                                    .flatMap(p -> payments.findFirstByOrderIdAndStatusOrderByIdDesc(p.getOrderId(), Payment.SUCCESS)
                                            .hasElement()
                                            .filter(stillPaid -> !stillPaid)
                                            .flatMap(x -> orders.findById(p.getOrderId())))
                                    .flatMap(order -> {
                                        order.setPaymentStatus(Order.PAYMENT_STATUS_REFUNDED);
                                        return orders.save(order);
                                    })
                                    .thenReturn(saved));
                })
                .map(ResponseData::success);
    }
}
