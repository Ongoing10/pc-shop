package com.pcshop.review;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcshop.events.Topics;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.KafkaAdmin;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Outbox của review-service (collection outbox_events): ghi event ngay sau khi lưu review, mỗi giây gửi lên Kafka.
 * Mongo local chạy standalone (không có transaction) nên lưu review và ghi outbox không nguyên tử; event thống kê
 * mang số tổng nên lần kiểm duyệt sau của sản phẩm sẽ sửa lại. Outbox giữ event khi Kafka tạm ngừng.
 * Bản ghi đã gửi tự xóa sau 7 ngày (TTL trên sent_at, xem MongoIndexes).
 */
@Component
public class ReviewOutbox {

    static final String COLLECTION = "outbox_events";
    private static final Logger log = LoggerFactory.getLogger(ReviewOutbox.class);

    private final ReactiveMongoTemplate mongo;
    private final KafkaTemplate<String, String> kafka;
    private final ObjectMapper mapper;

    public ReviewOutbox(ReactiveMongoTemplate mongo, KafkaTemplate<String, String> kafka, ObjectMapper mapper) {
        this.mongo = mongo;
        this.kafka = kafka;
        this.mapper = mapper;
    }

    /** Ghi event (key Kafka = {@code key}, vd productId để các bản thống kê của một sản phẩm đi đúng thứ tự). */
    public Mono<Void> add(String topic, String key, Object payload) {
        return Mono.fromCallable(() -> new Document("_id", UUID.randomUUID().toString())
                        .append("topic", topic)
                        .append("key", key)
                        .append("payload", mapper.writeValueAsString(payload))
                        .append("status", 0)
                        .append("retry_count", 0)
                        .append("created_at", new Date()))
                .onErrorMap(JsonProcessingException.class, IllegalStateException::new)
                .flatMap(doc -> mongo.insert(doc, COLLECTION))
                .then();
    }

    /** Chạy trên thread của scheduler nên block() được. Gửi lỗi thì dừng lượt này để giữ thứ tự. */
    @Scheduled(fixedDelay = 1000, initialDelay = 5000)
    public void publish() {
        List<Document> batch = mongo.find(Query.query(Criteria.where("status").is(0))
                        .with(Sort.by("created_at", "_id")).limit(100), Document.class, COLLECTION)
                .collectList()
                .block();
        if (batch == null) {
            return;
        }
        for (Document event : batch) {
            Query byId = Query.query(Criteria.where("_id").is(event.getString("_id")));
            try {
                kafka.send(event.getString("topic"), event.getString("key"), event.getString("payload"))
                        .get(10, TimeUnit.SECONDS);
                mongo.updateFirst(byId, Update.update("status", 1).set("sent_at", new Date()), COLLECTION).block();
            } catch (Exception e) {
                if (e instanceof InterruptedException) {
                    Thread.currentThread().interrupt();
                }
                log.warn("Chưa gửi được event {} ({}) lên Kafka, thử lại sau: {}",
                        event.getString("_id"), event.getString("topic"), e.toString());
                mongo.updateFirst(byId, new Update().inc("retry_count", 1), COLLECTION).block();
                return;
            }
        }
    }

    @Configuration
    @EnableScheduling
    static class TopicConfig {

        @Bean
        KafkaAdmin.NewTopics reviewTopics() {
            return new KafkaAdmin.NewTopics(
                    TopicBuilder.name(Topics.REVIEW_STATS_CHANGED).partitions(1).replicas(1).build(),
                    TopicBuilder.name(Topics.REVIEW_REPLIED).partitions(1).replicas(1).build());
        }
    }
}
