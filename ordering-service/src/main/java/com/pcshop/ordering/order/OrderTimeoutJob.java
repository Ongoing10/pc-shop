package com.pcshop.ordering.order;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Mỗi phút hủy các đơn online chờ thanh toán quá {@code pcshop.order.payment-timeout} (mặc định 15 phút).
 * Hủy đi qua OrderService.transition nên cũng trả lượt voucher và phát order.cancelled (inventory nhả hàng).
 * Ordering là bên DUY NHẤT quyết định hết hạn; inventory không tự nhả hàng của đơn còn sống.
 */
@Component
public class OrderTimeoutJob {

    private static final Logger log = LoggerFactory.getLogger(OrderTimeoutJob.class);

    private final OrderService service;
    private final Duration timeout;

    public OrderTimeoutJob(OrderService service, @Value("${pcshop.order.payment-timeout:PT15M}") Duration timeout) {
        this.service = service;
        this.timeout = timeout;
    }

    @Scheduled(fixedDelay = 60_000, initialDelay = 30_000)
    public void cancelUnpaid() {
        service.findUnpaidPlacedBefore(LocalDateTime.now().minus(timeout))
                .concatMap(order -> service.expireUnpaid(order.getCode())
                        .doOnNext(o -> log.info("Hủy đơn {} vì quá hạn thanh toán", o.getCode()))
                        .onErrorResume(e -> {
                            log.warn("Không hủy được đơn quá hạn {}: {}", order.getCode(), e.toString());
                            return Mono.empty();
                        }))
                .then()
                .block();
    }
}
