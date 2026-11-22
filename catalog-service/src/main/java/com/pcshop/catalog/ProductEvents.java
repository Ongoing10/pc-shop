package com.pcshop.catalog;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcshop.events.Events;
import com.pcshop.events.Topics;
import io.smallrye.reactive.messaging.MutinyEmitter;
import io.smallrye.reactive.messaging.kafka.api.OutgoingKafkaRecordMetadata;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Message;
import org.jboss.logging.Logger;

import java.time.Instant;
import java.util.UUID;

/**
 * Báo cho ai-service khi nội dung sản phẩm đổi (product.updated) hoặc sản phẩm bị ẩn/ngừng bán (product.hidden).
 * Mongo standalone không có transaction nên không làm outbox: gửi thẳng, KHÔNG chờ broker và không làm hỏng thao
 * tác của admin nếu Kafka lỗi (chỉ ghi log). Event bị lỡ thì bù bằng POST /admin/knowledge/sync-products ở ai-service.
 * Key = SKU để các event của cùng sản phẩm vào cùng partition, giữ thứ tự.
 */
@ApplicationScoped
public class ProductEvents {

    private static final Logger LOG = Logger.getLogger(ProductEvents.class);

    @Inject
    @Channel("product-events")
    MutinyEmitter<String> emitter;

    @Inject
    ObjectMapper mapper;

    /** Chỉ gửi cho sản phẩm ACTIVE: sản phẩm khác không có trong kho tri thức. */
    public void updated(Product p) {
        if (p.status != null && p.status == Product.ACTIVE) {
            send(Topics.PRODUCT_UPDATED, p.sku,
                    new Events.ProductUpdated(UUID.randomUUID(), id(p), p.sku, Instant.now()));
        }
    }

    public void hidden(Product p) {
        send(Topics.PRODUCT_HIDDEN, p.sku, new Events.ProductHidden(UUID.randomUUID(), id(p), p.sku, Instant.now()));
    }

    private void send(String topic, String key, Object event) {
        String payload;
        try {
            payload = mapper.writeValueAsString(event);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
        emitter.sendMessage(Message.of(payload).addMetadata(OutgoingKafkaRecordMetadata.<String>builder()
                        .withTopic(topic)
                        .withKey(key)
                        .build()))
                .subscribe().with(
                        ignored -> LOG.debugf("Đã gửi %s cho %s", topic, key),
                        e -> LOG.warnf("Không gửi được %s cho %s (ai-service cần sync-products): %s", topic, key, e.toString()));
    }

    private static String id(Product p) {
        return p.id == null ? null : p.id.toHexString();
    }
}
