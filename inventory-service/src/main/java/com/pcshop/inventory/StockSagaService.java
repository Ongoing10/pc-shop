package com.pcshop.inventory;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcshop.events.Events;
import com.pcshop.events.Topics;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.OptimisticLockException;
import org.hibernate.StaleStateException;
import org.jboss.logging.Logger;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Bước của inventory trong Saga đặt hàng:
 * <ul>
 *   <li>order.created → giữ hàng (reserved_quantity + stock_reservations HOLD), lấy từ kho còn nhiều hàng trước,
 *       một dòng có thể chia nhiều kho. Đủ hàng → stock.reserved; thiếu → không giữ gì, stock.reserve-failed.</li>
 *   <li>order.cancelled → nhả hàng đang giữ (RELEASED).</li>
 *   <li>order.shipped → trừ hẳn khỏi kho (quantity và reserved_quantity), phiếu xuất bán (stock_movements SALE).</li>
 * </ul>
 * Mỗi event một transaction, ghi kèm processed_events (chống xử lý trùng) và outbox (event trả lời).
 * Ba topic chạy song song nên có thể đụng cùng dòng tồn kho: xung đột version thì làm lại cả event.
 */
@ApplicationScoped
public class StockSagaService {

    private static final Logger LOG = Logger.getLogger(StockSagaService.class);
    private static final String CONSUMER = "inventory-service";
    private static final int MAX_ATTEMPTS = 5;

    /** Thiếu hàng: ném ra để rollback phần đã giữ trong transaction. */
    static final class OutOfStockException extends RuntimeException {
        final String sku;

        OutOfStockException(String sku, String message) {
            super(message);
            this.sku = sku;
        }
    }

    @Inject
    InventoryRepository inventories;

    @Inject
    WarehouseRepository warehouses;

    @Inject
    StockReservationRepository reservations;

    @Inject
    StockMovementRepository movements;

    @Inject
    SagaRepositories.OutboxEventRepository outbox;

    @Inject
    SagaRepositories.ProcessedEventRepository processed;

    @Inject
    ObjectMapper mapper;

    public void reserve(Events.OrderCreated event) {
        try {
            withRetry(() -> {
                if (alreadyProcessed(event.eventId())) {
                    return;
                }
                // Event cùng đơn được phát lại với eventId khác: hàng đã giữ rồi thì chỉ trả lời lại
                if (!reservations.existsForOrder(event.orderCode())) {
                    hold(event);
                }
                markProcessed(event.eventId());
                addOutbox(Topics.STOCK_RESERVED, event.orderCode(),
                        new Events.StockReserved(UUID.randomUUID(), event.orderCode(), null, Instant.now()));
            });
        } catch (RuntimeException e) {
            OutOfStockException outOfStock = find(e, OutOfStockException.class);
            if (outOfStock == null) {
                throw e;
            }
            LOG.infof("Đơn %s không đủ hàng: %s", event.orderCode(), outOfStock.getMessage());
            QuarkusTransaction.requiringNew().run(() -> {
                if (alreadyProcessed(event.eventId())) {
                    return;
                }
                markProcessed(event.eventId());
                addOutbox(Topics.STOCK_RESERVE_FAILED, event.orderCode(), new Events.StockReserveFailed(
                        UUID.randomUUID(), event.orderCode(), outOfStock.sku, outOfStock.getMessage(), Instant.now()));
            });
        }
    }

    public void release(Events.OrderCancelled event) {
        withRetry(() -> {
            if (alreadyProcessed(event.eventId())) {
                return;
            }
            for (StockReservation r : reservations.findHeld(event.orderCode())) {
                Inventory row = inventoryOf(r);
                row.reservedQuantity = Math.max(0, row.reservedQuantity - r.quantity);
                close(r, StockReservation.RELEASED);
            }
            markProcessed(event.eventId());
        });
    }

    public void commit(Events.OrderShipped event) {
        withRetry(() -> {
            if (alreadyProcessed(event.eventId())) {
                return;
            }
            List<StockReservation> held = reservations.findHeld(event.orderCode());
            if (held.isEmpty()) {
                // Đơn tạo trước khi có Saga (seed) hoặc đã xử lý: không có gì để trừ
                LOG.infof("Đơn %s bắt đầu giao nhưng không có hàng đang giữ", event.orderCode());
            }
            for (StockReservation r : held) {
                Inventory row = inventoryOf(r);
                row.quantity -= r.quantity;
                row.reservedQuantity = Math.max(0, row.reservedQuantity - r.quantity);
                close(r, StockReservation.CONFIRMED);
                StockMovement m = new StockMovement();
                m.sku = r.sku;
                m.warehouseId = r.warehouseId;
                m.type = StockMovement.SALE;
                m.quantity = -r.quantity;
                m.quantityAfter = row.quantity;
                m.referenceType = "ORDER";
                m.referenceCode = event.orderCode();
                m.note = "Xuất bán";
                m.createdAt = LocalDateTime.now();
                movements.persist(m);
            }
            markProcessed(event.eventId());
        });
    }

    // ------------------------------------------------------------------

    private void hold(Events.OrderCreated event) {
        Map<String, Integer> needBySku = new LinkedHashMap<>();
        event.items().forEach(i -> needBySku.merge(i.sku(), i.quantity(), Integer::sum));
        Set<Long> activeWarehouses = warehouses.listActive().stream().map(w -> w.id).collect(Collectors.toSet());
        LocalDateTime now = LocalDateTime.now();

        needBySku.forEach((sku, need) -> {
            List<Inventory> rows = inventories.findBySku(sku).stream()
                    .filter(row -> activeWarehouses.contains(row.warehouseId) && row.available() > 0)
                    .sorted(Comparator.comparingInt(Inventory::available).reversed())
                    .toList();
            int remaining = need;
            for (Inventory row : rows) {
                int take = Math.min(row.available(), remaining);
                row.reservedQuantity += take;
                StockReservation r = new StockReservation();
                r.orderCode = event.orderCode();
                r.sku = sku;
                r.warehouseId = row.warehouseId;
                r.quantity = take;
                r.status = StockReservation.HOLD;
                r.createdAt = now;
                r.updatedAt = now;
                reservations.persist(r);
                remaining -= take;
                if (remaining == 0) {
                    break;
                }
            }
            if (remaining > 0) {
                throw new OutOfStockException(sku, "cần " + need + ", còn " + (need - remaining));
            }
        });
    }

    private Inventory inventoryOf(StockReservation r) {
        return inventories.findBySkuAndWarehouse(r.sku, r.warehouseId)
                .orElseThrow(() -> new IllegalStateException("Mất dòng tồn kho " + r.sku + " @ kho " + r.warehouseId));
    }

    private static void close(StockReservation r, int status) {
        r.status = status;
        r.updatedAt = LocalDateTime.now();
    }

    private boolean alreadyProcessed(UUID eventId) {
        return processed.findByIdOptional(eventId).isPresent();
    }

    private void markProcessed(UUID eventId) {
        ProcessedEvent p = new ProcessedEvent();
        p.eventId = eventId;
        p.consumer = CONSUMER;
        p.processedAt = LocalDateTime.now();
        processed.persist(p);
    }

    private void addOutbox(String topic, String orderCode, Object payload) {
        OutboxEvent e = new OutboxEvent();
        e.id = UUID.randomUUID();
        e.aggregateType = "ORDER";
        e.aggregateId = orderCode;
        e.eventType = topic;
        try {
            e.payload = mapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException(ex);
        }
        e.status = OutboxEvent.NEW;
        e.createdAt = LocalDateTime.now();
        outbox.persist(e);
    }

    /** Chạy {@code work} trong transaction mới; xung đột optimistic lock (version) thì làm lại từ đầu. */
    private static void withRetry(Runnable work) {
        for (int attempt = 1; ; attempt++) {
            try {
                QuarkusTransaction.requiringNew().run(work);
                return;
            } catch (RuntimeException e) {
                boolean conflict = find(e, OptimisticLockException.class) != null || find(e, StaleStateException.class) != null;
                if (!conflict || attempt >= MAX_ATTEMPTS) {
                    throw e;
                }
                LOG.debugf("Xung đột tồn kho, thử lại lần %d", attempt + 1);
            }
        }
    }

    private static <T extends Throwable> T find(Throwable e, Class<T> type) {
        for (Throwable t = e; t != null; t = t.getCause()) {
            if (type.isInstance(t)) {
                return type.cast(t);
            }
        }
        return null;
    }
}
