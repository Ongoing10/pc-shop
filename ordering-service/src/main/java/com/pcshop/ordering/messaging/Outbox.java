package com.pcshop.ordering.messaging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.r2dbc.postgresql.codec.Json;
import org.springframework.data.r2dbc.core.R2dbcEntityTemplate;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Transactional outbox + idempotent consumer của ordering. Cả hai phải được gọi BÊN TRONG transaction của thay đổi
 * nghiệp vụ: event chỉ tồn tại khi đơn đã ghi, event nhận về chỉ được đánh dấu xử lý khi đơn đã cập nhật.
 */
@Component
public class Outbox {

    private final R2dbcEntityTemplate template;
    private final DatabaseClient db;
    private final ObjectMapper mapper;

    public Outbox(R2dbcEntityTemplate template, DatabaseClient db, ObjectMapper mapper) {
        this.template = template;
        this.db = db;
        this.mapper = mapper;
    }

    /** Ghi event của đơn {@code orderCode} vào outbox; OutboxRelay gửi lên topic {@code topic} sau khi commit. */
    public Mono<Void> add(String topic, String orderCode, Object payload) {
        return Mono.fromCallable(() -> {
            OutboxEvent event = new OutboxEvent();
            event.setId(UUID.randomUUID());
            event.setAggregateType("ORDER");
            event.setAggregateId(orderCode);
            event.setEventType(topic);
            event.setPayload(Json.of(mapper.writeValueAsString(payload)));
            event.setStatus(OutboxEvent.NEW);
            event.setRetryCount(0);
            event.setCreatedAt(LocalDateTime.now());
            return event;
        }).onErrorMap(JsonProcessingException.class, IllegalStateException::new)
                .flatMap(template::insert)
                .then();
    }

    /** Đánh dấu đã xử lý event; false nếu event này đã được xử lý trước đó (Kafka giao lại). */
    public Mono<Boolean> markProcessed(UUID eventId, String consumer) {
        return db.sql("INSERT INTO processed_events (event_id, consumer) VALUES (:id, :consumer) ON CONFLICT DO NOTHING")
                .bind("id", eventId)
                .bind("consumer", consumer)
                .fetch()
                .rowsUpdated()
                .map(rows -> rows > 0);
    }
}
