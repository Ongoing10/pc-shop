package com.pcshop.ordering.order;

import com.pcshop.events.Events;
import com.pcshop.ordering.messaging.Outbox;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Mono;

/**
 * Bước của ordering trong Saga đặt hàng (choreography):
 * <pre>
 * POST /orders → PENDING + order.created ─► inventory giữ hàng
 *   stock.reserved      → COD: CONFIRMED · online: AWAITING_PAYMENT (quá hạn thanh toán: OrderTimeoutJob hủy)
 *   stock.reserve-failed → CANCELLED (không cần bù trừ: inventory chưa giữ gì)
 *   đơn đã bị hủy trước khi hàng được giữ → phát lại order.cancelled để inventory nhả hàng
 * </pre>
 * Mỗi event xử lý trong một transaction cùng dòng processed_events, nên Kafka giao lại cũng không xử lý hai lần.
 */
@Service
public class OrderSagaHandler {

    private static final Logger log = LoggerFactory.getLogger(OrderSagaHandler.class);
    private static final String CONSUMER = "ordering-service";

    private final OrderRepository orders;
    private final OrderService service;
    private final Outbox outbox;

    public OrderSagaHandler(OrderRepository orders, OrderService service, Outbox outbox) {
        this.orders = orders;
        this.service = service;
        this.outbox = outbox;
    }

    @Transactional
    public Mono<Void> onStockReserved(Events.StockReserved event) {
        return outbox.markProcessed(event.eventId(), CONSUMER)
                .filter(Boolean::booleanValue)
                .flatMap(isNew -> findOrder(event.orderCode()))
                .flatMap(order -> {
                    if (Integer.valueOf(Order.PENDING).equals(order.getStatus())) {
                        boolean cod = Integer.valueOf(Order.PAYMENT_COD).equals(order.getPaymentMethod());
                        return service.transition(order, cod ? Order.CONFIRMED : Order.AWAITING_PAYMENT,
                                cod ? "Đã giữ hàng, chờ giao" : "Đã giữ hàng, chờ thanh toán", null).then();
                    }
                    if (Integer.valueOf(Order.CANCELLED).equals(order.getStatus())) {
                        return service.publishCancelled(order, order.getCancelReason());
                    }
                    log.warn("Bỏ qua stock.reserved của đơn {} ở trạng thái {}", order.getCode(), order.getStatus());
                    return Mono.empty();
                });
    }

    @Transactional
    public Mono<Void> onStockReserveFailed(Events.StockReserveFailed event) {
        return outbox.markProcessed(event.eventId(), CONSUMER)
                .filter(Boolean::booleanValue)
                .flatMap(isNew -> findOrder(event.orderCode()))
                .filter(order -> Integer.valueOf(Order.PENDING).equals(order.getStatus()))
                .flatMap(order -> service.transition(order, Order.CANCELLED, reason(event), null))
                .then();
    }

    private Mono<Order> findOrder(String code) {
        return orders.findByCode(code)
                .switchIfEmpty(Mono.fromRunnable(() -> log.warn("Event Saga của đơn không tồn tại: {}", code)));
    }

    private static String reason(Events.StockReserveFailed event) {
        String reason = "Không đủ hàng: " + event.sku() + (event.reason() == null ? "" : " (" + event.reason() + ")");
        return reason.length() > 255 ? reason.substring(0, 255) : reason;
    }
}
