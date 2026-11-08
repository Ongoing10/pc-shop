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

    /** ordering → inventory: đơn bắt đầu giao, trừ hẳn số hàng đang giữ khỏi kho (phiếu xuất bán). */
    public record OrderShipped(UUID eventId, String orderCode, Instant occurredAt) {
    }

    /** ordering → catalog: đơn hoàn tất, cộng sold_count theo từng SKU. */
    public record OrderCompleted(UUID eventId, String orderCode, List<OrderItem> items, Instant occurredAt) {
    }

    /** ordering → catalog: đơn đã hoàn tất bị trả hàng, trừ lại sold_count. */
    public record OrderReturned(UUID eventId, String orderCode, List<OrderItem> items, Instant occurredAt) {
    }

    /**
     * ordering → notification: đơn đổi trạng thái (kể cả lúc tạo: fromStatus null).
     * customerEmail null (đơn cũ, token không có email) thì chỉ có thông báo trong ứng dụng, không gửi email.
     */
    public record OrderStatusChanged(UUID eventId, String orderCode, UUID userId, String customerEmail,
                                     String customerName, Integer fromStatus, int toStatus, String reason,
                                     BigDecimal totalAmount, Instant occurredAt) {
    }

    /**
     * review → catalog: thống kê sao mới của sản phẩm (chỉ review đã duyệt). Gửi số tổng chứ không gửi chênh lệch,
     * nên nhận trùng không sai; catalog bỏ qua bản có computedAt cũ hơn bản đang lưu.
     */
    public record ReviewStatsChanged(UUID eventId, String productId, String sku, double average, long count,
                                     Instant computedAt) {
    }

    /** review → notification: cửa hàng trả lời review của khách. */
    public record ReviewReplied(UUID eventId, String reviewId, UUID userId, String productId, String sku,
                                String reply, Instant occurredAt) {
    }

    /** inventory → ordering. expiresAt null: giữ đến khi đơn hủy hoặc giao (hạn thanh toán do ordering quản lý). */
    public record StockReserved(UUID eventId, String orderCode, Instant expiresAt, Instant occurredAt) {
    }

    /** inventory → ordering */
    public record StockReserveFailed(UUID eventId, String orderCode, String sku, String reason, Instant occurredAt) {
    }
}
