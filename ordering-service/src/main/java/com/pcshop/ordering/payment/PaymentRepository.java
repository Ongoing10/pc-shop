package com.pcshop.ordering.payment;

import io.r2dbc.postgresql.codec.Json;
import org.springframework.data.r2dbc.repository.Modifying;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;

public interface PaymentRepository extends R2dbcRepository<Payment, Long> {

    Mono<Payment> findByPaymentCode(String paymentCode);

    Flux<Payment> findAllByOrderIdOrderByIdDesc(Long orderId);

    Mono<Long> countByOrderId(Long orderId);

    Mono<Payment> findFirstByOrderIdAndStatusOrderByIdDesc(Long orderId, Integer status);

    /**
     * Ghi kết quả cổng thanh toán, chỉ khi lần thanh toán còn PENDING/EXPIRED. IPN và return URL có thể đến cùng lúc:
     * UPDATE có điều kiện + khóa dòng của Postgres bảo đảm chỉ một bên được 1 dòng, bên kia 0 dòng (đã xử lý).
     */
    @Modifying
    @Query("""
            UPDATE payments SET status = :status, provider_transaction_id = :transactionId, bank_code = :bankCode,
                   raw_response = :raw, paid_at = :paidAt, updated_at = now()
            WHERE id = :id AND status IN (1, 4)""")
    Mono<Long> claimResult(Long id, Integer status, String transactionId, String bankCode, Json raw,
                           LocalDateTime paidAt);

    /** Đơn hủy: các lần thanh toán còn chờ chuyển EXPIRED (cổng báo thành công sau đó → hoàn tiền). */
    @Modifying
    @Query("UPDATE payments SET status = 4, updated_at = now() WHERE order_id = :orderId AND status = 1")
    Mono<Long> expirePending(Long orderId);
}
