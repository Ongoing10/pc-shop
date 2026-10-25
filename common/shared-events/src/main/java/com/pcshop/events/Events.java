package com.pcshop.events;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Payload các sự kiện Kafka. Mỗi sự kiện có eventId để consumer chống xử lý trùng (bảng processed_events).
 */
public final class Events {

    private Events() {
    }

    /** catalog → ai: sản phẩm đổi nội dung, cần re-embed. */
    public record ProductUpdated(UUID eventId, String productId, String sku, Instant occurredAt) {
    }

    /** catalog → ai: sản phẩm chuyển HIDDEN/DISCONTINUED, phải xóa chunk khỏi pgvector. */
    public record ProductHidden(UUID eventId, String productId, String sku, Instant occurredAt) {
    }

    public record OrderItem(String sku, int quantity, BigDecimal unitPrice) {
    }

    /** ordering → inventory: bắt đầu Saga, yêu cầu giữ hàng. */
    public record OrderCreated(UUID eventId, String orderCode, UUID userId, List<OrderItem> items,
                               BigDecimal totalAmount, Instant occurredAt) {
    }

    /** ordering → inventory: bù trừ, nhả hàng đã giữ. */
    public record OrderCancelled(UUID eventId, String orderCode, String reason, Instant occurredAt) {
    }

    /** inventory → ordering */
    public record StockReserved(UUID eventId, String orderCode, Instant expiresAt, Instant occurredAt) {
    }

    /** inventory → ordering */
    public record StockReserveFailed(UUID eventId, String orderCode, String sku, String reason, Instant occurredAt) {
    }
}
