package com.pcshop.ordering.order;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalDateTime;
import java.util.UUID;

/** Bảng ordering.order_status_histories: mỗi lần đổi trạng thái đơn ghi một dòng, cùng transaction với orders. */
@Table("order_status_histories")
public class OrderStatusHistory {

    @Id
    private Long id;
    private Long orderId;
    private Integer fromStatus;
    private Integer toStatus;
    private String reason;
    private UUID createdBy;
    private LocalDateTime createdAt;

    public static OrderStatusHistory of(Order order, Integer from, int to, String reason, UUID by) {
        OrderStatusHistory h = new OrderStatusHistory();
        h.orderId = order.getId();
        h.fromStatus = from;
        h.toStatus = to;
        h.reason = reason;
        h.createdBy = by;
        h.createdAt = LocalDateTime.now();
        return h;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }
    public Integer getFromStatus() { return fromStatus; }
    public void setFromStatus(Integer fromStatus) { this.fromStatus = fromStatus; }
    public Integer getToStatus() { return toStatus; }
    public void setToStatus(Integer toStatus) { this.toStatus = toStatus; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
