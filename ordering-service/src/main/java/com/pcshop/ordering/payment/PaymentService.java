package com.pcshop.ordering.payment;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcshop.contracts.AuthUser;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import com.pcshop.ordering.order.Order;
import com.pcshop.ordering.order.OrderRepository;
import com.pcshop.ordering.order.OrderService;
import io.r2dbc.postgresql.codec.Json;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * Thanh toán online cho đơn AWAITING_PAYMENT.
 * <ol>
 *   <li>POST /payments/{orderCode}: tạo dòng payments PENDING, trả URL cổng thanh toán (VNPay, hoặc trang giả lập khi
 *       chưa cấu hình khóa VNPay).</li>
 *   <li>Cổng báo kết quả (IPN / return URL / trang giả lập) → {@link #complete}: SUCCESS → đơn PAID; FAILED → khách thử lại
 *       được đến khi hết hạn. Tiền về khi đơn đã bị hủy (quá hạn) → tạo yêu cầu hoàn tiền.</li>
 * </ol>
 * MoMo chưa tích hợp: đơn MoMo cũng đi qua trang giả lập.
 */
@Service
public class PaymentService {

    /** Kết quả POST /payments/{orderCode}. */
    public record PaymentInit(String paymentCode, String paymentUrl, BigDecimal amount, LocalDateTime expiresAt,
                              String gateway) {
    }

    /** Kết quả xử lý thông báo của cổng thanh toán. */
    public enum Outcome { PAID, FAILED, REFUND_PENDING, ALREADY_PROCESSED, NOT_FOUND, AMOUNT_MISMATCH }

    public record CompleteResult(Outcome outcome, String orderCode) {
    }

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository payments;
    private final OrderRepository orders;
    private final OrderService orderService;
    private final PaymentLedger ledger;
    private final VnpayClient vnpay;
    private final PaymentProperties properties;
    private final ObjectMapper mapper;
    private final Duration timeout;

    public PaymentService(PaymentRepository payments, OrderRepository orders, OrderService orderService,
                          PaymentLedger ledger, VnpayClient vnpay, PaymentProperties properties, ObjectMapper mapper,
                          @Value("${pcshop.order.payment-timeout:PT15M}") Duration timeout) {
        this.payments = payments;
        this.orders = orders;
        this.orderService = orderService;
        this.ledger = ledger;
        this.vnpay = vnpay;
        this.properties = properties;
        this.mapper = mapper;
        this.timeout = timeout;
    }

    /** Chủ đơn bắt đầu (hoặc thử lại) thanh toán. Mỗi lần một payment_code mới: <mã đơn>-<lần>. */
    @Transactional
    public Mono<PaymentInit> start(String orderCode, AuthUser user, String clientIp) {
        return findOrder(orderCode)
                .flatMap(order -> {
                    if (!order.getUserId().equals(user.id())) {
                        return Mono.error(BusinessException.forbidden("Đây không phải đơn của bạn"));
                    }
                    if (Integer.valueOf(Order.PAYMENT_COD).equals(order.getPaymentMethod())) {
                        return Mono.error(new BusinessException(ErrorCode.BAD_REQUEST, "Đơn thanh toán khi nhận hàng (COD)"));
                    }
                    if (!Integer.valueOf(Order.AWAITING_PAYMENT).equals(order.getStatus())) {
                        return Mono.error(new BusinessException(ErrorCode.BAD_REQUEST, "Đơn không ở trạng thái chờ thanh toán"));
                    }
                    LocalDateTime expiresAt = order.getPlacedAt().plus(timeout);
                    if (LocalDateTime.now().isAfter(expiresAt)) {
                        return Mono.error(new BusinessException(ErrorCode.BAD_REQUEST, "Đơn đã quá hạn thanh toán"));
                    }
                    return payments.countByOrderId(order.getId()).flatMap(count -> {
                        LocalDateTime now = LocalDateTime.now();
                        Payment p = new Payment();
                        p.setOrderId(order.getId());
                        p.setPaymentCode(order.getCode() + "-" + String.format("%02d", count + 1));
                        p.setMethod(order.getPaymentMethod());
                        p.setAmount(order.getTotalAmount());
                        p.setStatus(Payment.PENDING);
                        p.setExpiredAt(expiresAt);
                        p.setCreatedAt(now);
                        p.setUpdatedAt(now);
                        return payments.save(p);
                    }).map(p -> init(order, p, clientIp));
                });
    }

    private PaymentInit init(Order order, Payment p, String clientIp) {
        boolean useVnpay = Integer.valueOf(Order.PAYMENT_VNPAY).equals(order.getPaymentMethod()) && properties.vnpay().configured();
        if (useVnpay) {
            String url = vnpay.payUrl(properties.vnpay(), p.getPaymentCode(), p.getAmount(),
                    "Thanh toan don hang " + order.getCode(), clientIp, p.getExpiredAt(),
                    properties.publicBaseUrl() + "/api/v1/payments/vnpay/return");
            return new PaymentInit(p.getPaymentCode(), url, p.getAmount(), p.getExpiredAt(), "VNPAY");
        }
        if (!properties.mockEnabled()) {
            throw new BusinessException(ErrorCode.EXTERNAL_SERVICE_ERROR, "Chưa cấu hình cổng thanh toán");
        }
        return new PaymentInit(p.getPaymentCode(), properties.publicBaseUrl() + "/api/v1/payments/mock/" + p.getPaymentCode(),
                p.getAmount(), p.getExpiredAt(), "MOCK");
    }

    /** Các lần thanh toán của đơn (chủ đơn hoặc nhân viên), mới nhất trước. */
    public Flux<Payment> listForOrder(String orderCode, AuthUser user) {
        return orderService.findVisible(orderCode, user)
                .flatMapMany(order -> payments.findAllByOrderIdOrderByIdDesc(order.getId()));
    }

    /**
     * Ghi kết quả một lần thanh toán. Gọi lại nhiều lần (IPN + return URL, cổng gửi lại) chỉ xử lý lần đầu.
     *
     * @param amount số tiền cổng báo đã thu (null = không kiểm tra, dùng cho trang giả lập)
     */
    @Transactional
    public Mono<CompleteResult> complete(String paymentCode, boolean success, BigDecimal amount,
                                         String providerTransactionId, String bankCode, Map<String, String> raw) {
        return payments.findByPaymentCode(paymentCode)
                .flatMap(p -> orders.findById(p.getOrderId()).flatMap(order -> {
                    if (p.getStatus() == Payment.SUCCESS || p.getStatus() == Payment.FAILED
                            || p.getStatus() == Payment.REFUNDED) {
                        return Mono.just(new CompleteResult(Outcome.ALREADY_PROCESSED, order.getCode()));
                    }
                    if (amount != null && amount.compareTo(p.getAmount()) != 0) {
                        return Mono.just(new CompleteResult(Outcome.AMOUNT_MISMATCH, order.getCode()));
                    }
                    boolean expiredBefore = p.getStatus() == Payment.EXPIRED;
                    LocalDateTime now = LocalDateTime.now();
                    int status = success ? Payment.SUCCESS : Payment.FAILED;
                    return payments.claimResult(p.getId(), status, providerTransactionId, bankCode, toJson(raw),
                            success ? now : null).flatMap(rows -> {
                        if (rows == 0) {
                            // bên kia (IPN / return URL) vừa ghi xong
                            return Mono.just(new CompleteResult(Outcome.ALREADY_PROCESSED, order.getCode()));
                        }
                        if (!success) {
                            return Mono.just(new CompleteResult(Outcome.FAILED, order.getCode()));
                        }
                        if (Integer.valueOf(Order.AWAITING_PAYMENT).equals(order.getStatus())) {
                            return orderService.markPaid(order, "Thanh toán thành công (" + paymentCode + ")")
                                    .thenReturn(new CompleteResult(Outcome.PAID, order.getCode()));
                        }
                        // Tiền về khi đơn đã hủy (quá hạn / khách hủy) hoặc đơn đã được thanh toán bằng lần khác: hoàn tiền
                        log.warn("Thanh toán {} thành công nhưng đơn {} ở trạng thái {}{}, tạo yêu cầu hoàn tiền",
                                paymentCode, order.getCode(), order.getStatus(),
                                expiredBefore ? " (lần thanh toán đã hết hạn)" : "");
                        p.setStatus(status);
                        return ledger.requestRefund(p, "Tiền về khi đơn không còn chờ thanh toán", null)
                                .thenReturn(new CompleteResult(Outcome.REFUND_PENDING, order.getCode()));
                    });
                }))
                .defaultIfEmpty(new CompleteResult(Outcome.NOT_FOUND, null));
    }

    private Mono<Order> findOrder(String code) {
        return orders.findByCode(code).switchIfEmpty(Mono.error(() -> BusinessException.notFound("đơn hàng", code)));
    }

    private Json toJson(Map<String, String> raw) {
        if (raw == null || raw.isEmpty()) {
            return null;
        }
        try {
            return Json.of(mapper.writeValueAsString(raw));
        } catch (JsonProcessingException e) {
            return null;
        }
    }
}
