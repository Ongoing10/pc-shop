package com.pcshop.ordering.messaging;

import io.r2dbc.postgresql.codec.Json;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Bảng ordering.outbox_events: event ghi cùng transaction với thay đổi nghiệp vụ, OutboxRelay gửi lên Kafka sau.
 * event_type = tên topic, aggregate_id = mã đơn (làm key Kafka để các event của một đơn đi đúng thứ tự).
 * id gán sẵn nên phải ghi bằng template.insert (save() sẽ hiểu là update).
 */
@Table("outbox_events")
public class OutboxEvent {

    public static final int NEW = 0;
    public static final int SENT = 1;

    @Id
    private UUID id;
    private String aggregateType;
    private String aggregateId;
    private String eventType;
    private Json payload;
    private Integer status;
    private Integer retryCount;
    private LocalDateTime createdAt;
    private LocalDateTime sentAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getAggregateType() { return aggregateType; }
    public void setAggregateType(String aggregateType) { this.aggregateType = aggregateType; }
    public String getAggregateId() { return aggregateId; }
    public void setAggregateId(String aggregateId) { this.aggregateId = aggregateId; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public Json getPayload() { return payload; }
    public void setPayload(Json payload) { this.payload = payload; }
    public Integer getStatus() { return status; }
    public void setStatus(Integer status) { this.status = status; }
    public Integer getRetryCount() { return retryCount; }
    public void setRetryCount(Integer retryCount) { this.retryCount = retryCount; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getSentAt() { return sentAt; }
    public void setSentAt(LocalDateTime sentAt) { this.sentAt = sentAt; }
}
