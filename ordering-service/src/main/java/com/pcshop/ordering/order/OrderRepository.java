package com.pcshop.ordering.order;

import org.springframework.data.r2dbc.repository.R2dbcRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Collection;
import java.util.UUID;

public interface OrderRepository extends R2dbcRepository<Order, Long> {

    Mono<Order> findByCode(String code);

    Flux<Order> findAllByCodeIn(Collection<String> codes);

    Mono<Order> findByUserIdAndRequestId(UUID userId, String requestId);
}
