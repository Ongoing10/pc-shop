package com.pcshop.ordering.payment;

import org.springframework.data.r2dbc.repository.R2dbcRepository;
import reactor.core.publisher.Mono;

public interface RefundRepository extends R2dbcRepository<Refund, Long> {

    Mono<Boolean> existsByPaymentId(Long paymentId);
}
