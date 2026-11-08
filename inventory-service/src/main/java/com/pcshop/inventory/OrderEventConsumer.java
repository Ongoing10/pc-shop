package com.pcshop.inventory;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcshop.events.Events;
import io.smallrye.common.annotation.Blocking;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Incoming;

/**
 * Nhận event đơn hàng từ ordering (cấu hình channel trong application.properties). Mỗi channel xử lý tuần tự
 * trên worker thread; ném lỗi thì message chuyển sang topic dead-letter (failure-strategy).
 */
@ApplicationScoped
public class OrderEventConsumer {

    @Inject
    StockSagaService saga;

    @Inject
    ObjectMapper mapper;

    @Incoming("order-created")
    @Blocking
    public void onCreated(String json) throws JsonProcessingException {
        saga.reserve(mapper.readValue(json, Events.OrderCreated.class));
    }

    @Incoming("order-cancelled")
    @Blocking
    public void onCancelled(String json) throws JsonProcessingException {
        saga.release(mapper.readValue(json, Events.OrderCancelled.class));
    }

    @Incoming("order-shipped")
    @Blocking
    public void onShipped(String json) throws JsonProcessingException {
        saga.commit(mapper.readValue(json, Events.OrderShipped.class));
    }
}
