package com.pcshop.ordering.messaging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.data.r2dbc.core.R2dbcEntityTemplate;
import org.springframework.data.relational.core.query.Criteria;
import org.springframework.data.relational.core.query.Query;
import org.springframework.data.relational.core.query.Update;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Mỗi giây gửi các event NEW trong outbox lên Kafka theo thứ tự tạo, chờ broker xác nhận rồi mới đánh dấu SENT.
 * Gửi lỗi thì dừng lượt này (giữ thứ tự), lần sau gửi lại: consumer phải chịu được event trùng (processed_events).
 * Chạy trên thread của scheduler nên block() được. Giả định một instance ordering (đồ án chạy local).
 */
@Component
public class OutboxRelay {

    private static final Logger log = LoggerFactory.getLogger(OutboxRelay.class);
    private static final int BATCH = 100;

    private final R2dbcEntityTemplate template;
    private final KafkaTemplate<String, String> kafka;

    public OutboxRelay(R2dbcEntityTemplate template, KafkaTemplate<String, String> kafka) {
        this.template = template;
        this.kafka = kafka;
    }

    @Scheduled(fixedDelay = 1000, initialDelay = 5000)
    public void publish() {
        List<OutboxEvent> batch = template.select(OutboxEvent.class)
                .matching(Query.query(Criteria.where("status").is(OutboxEvent.NEW))
                        .sort(Sort.by("createdAt", "id")).limit(BATCH))
                .all()
                .collectList()
                .block();
        if (batch == null) {
            return;
        }
        for (OutboxEvent event : batch) {
            try {
                kafka.send(event.getEventType(), event.getAggregateId(), event.getPayload().asString())
                        .get(10, TimeUnit.SECONDS);
                mark(event, Update.update("status", OutboxEvent.SENT).set("sentAt", LocalDateTime.now()));
            } catch (Exception e) {
                if (e instanceof InterruptedException) {
                    Thread.currentThread().interrupt();
                }
                log.warn("Chưa gửi được event {} ({}) lên Kafka, thử lại sau: {}",
                        event.getId(), event.getEventType(), e.toString());
                mark(event, Update.update("retryCount", event.getRetryCount() + 1));
                return;
            }
        }
    }

    private void mark(OutboxEvent event, Update update) {
        template.update(OutboxEvent.class)
                .matching(Query.query(Criteria.where("id").is(event.getId())))
                .apply(update)
                .block();
    }
}
