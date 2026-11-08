package com.pcshop.catalog;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.ErrorCategory;
import com.mongodb.MongoWriteException;
import com.pcshop.events.Events;
import io.smallrye.common.annotation.Blocking;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.bson.Document;
import org.eclipse.microprofile.reactive.messaging.Incoming;

import java.util.Date;
import java.util.List;
import java.util.UUID;

/**
 * Cập nhật sold_count từ event đơn hàng: order.completed cộng, order.returned (trả sau khi hoàn tất) trừ.
 * Chống xử lý trùng bằng collection processed_events (_id = eventId). Mongo local chạy standalone (không có transaction)
 * nên đánh dấu TRƯỚC rồi mới cộng: nếu dừng giữa chừng thì thiếu một lần cộng, không bao giờ cộng hai lần.
 */
@ApplicationScoped
public class SoldCountConsumer {

    @Inject
    CatalogRepositories.ProductRepository products;

    @Inject
    ObjectMapper mapper;

    @Incoming("order-completed")
    @Blocking
    public void onCompleted(String json) throws JsonProcessingException {
        Events.OrderCompleted event = mapper.readValue(json, Events.OrderCompleted.class);
        apply(event.eventId(), event.items(), 1);
    }

    @Incoming("order-returned")
    @Blocking
    public void onReturned(String json) throws JsonProcessingException {
        Events.OrderReturned event = mapper.readValue(json, Events.OrderReturned.class);
        apply(event.eventId(), event.items(), -1);
    }

    private void apply(UUID eventId, List<Events.OrderItem> items, int sign) {
        if (!markProcessed(eventId)) {
            return;
        }
        items.forEach(item -> products.incrementSoldCount(item.sku(), sign * item.quantity()));
    }

    private boolean markProcessed(UUID eventId) {
        try {
            products.mongoDatabase().getCollection("processed_events")
                    .insertOne(new Document("_id", eventId.toString())
                            .append("consumer", "catalog-service")
                            .append("processed_at", new Date()));
            return true;
        } catch (MongoWriteException e) {
            if (e.getError().getCategory() == ErrorCategory.DUPLICATE_KEY) {
                return false;
            }
            throw e;
        }
    }
}
