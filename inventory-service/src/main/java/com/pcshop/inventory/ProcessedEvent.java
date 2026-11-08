package com.pcshop.inventory;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.UUID;

/** Bảng inventory.processed_events: event Kafka đã xử lý (idempotent consumer). */
@Entity
@Table(name = "processed_events")
public class ProcessedEvent {

    @Id
    @Column(name = "event_id")
    public UUID eventId;

    public String consumer;

    @Column(name = "processed_at")
    public LocalDateTime processedAt;
}
