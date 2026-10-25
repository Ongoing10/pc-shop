package com.pcshop.ordering.voucher;

import org.springframework.data.r2dbc.repository.R2dbcRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface VoucherRepository extends R2dbcRepository<Voucher, Long> {

    Flux<Voucher> findAllByIsActiveOrderByIdDesc(Integer isActive);

    Mono<Boolean> existsByCode(String code);
}
