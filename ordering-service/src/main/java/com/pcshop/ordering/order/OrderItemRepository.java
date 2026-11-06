package com.pcshop.ordering.order;

import org.springframework.data.r2dbc.repository.R2dbcRepository;
import reactor.core.publisher.Flux;

import java.util.Collection;

public interface OrderItemRepository extends R2dbcRepository<OrderItem, Long> {

    Flux<OrderItem> findAllByOrderIdOrderByIdAsc(Long orderId);

    Flux<OrderItem> findAllByOrderIdInOrderByOrderIdAscIdAsc(Collection<Long> orderIds);
}
