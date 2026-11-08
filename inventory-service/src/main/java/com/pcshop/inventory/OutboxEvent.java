package com.pcshop.inventory;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.ColumnTransformer;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Bảng inventory.outbox_events: event stock.* ghi cùng transaction với việc giữ hàng, OutboxRelay gửi lên Kafka sau.
 * event_type = tên topic, aggregate_id = mã đơn (key Kafka).
 */
@Entity
@Table(name = "outbox_events")
public class OutboxEvent {

    public static final int NEW = 0;
    public static final int SENT = 1;

    @Id
    public UUID id;

    @Column(name = "aggregate_type")
    public String aggregateType;

    @Column(name = "aggregate_id")
    public String aggregateId;

    @Column(name = "event_type")
    public String eventType;

    /** Chuỗi JSON; cột jsonb nên ép kiểu khi ghi. */
    @ColumnTransformer(write = "?::jsonb")
    public String payload;

    public int status;

    @Column(name = "retry_count")
    public int retryCount;

    @Column(name = "created_at")
    public LocalDateTime createdAt;

    @Column(name = "sent_at")
    public LocalDateTime sentAt;
}
