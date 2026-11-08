package com.pcshop.ordering.messaging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcshop.events.Events;
import com.pcshop.events.Topics;
import com.pcshop.ordering.order.OrderSagaHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Nhận kết quả giữ hàng từ inventory. Listener chạy trên thread riêng của Kafka nên block() được;
 * lỗi thì Spring Kafka thử lại (DefaultErrorHandler) rồi bỏ qua và ghi log.
 */
@Component
public class StockEventListener {

    private final OrderSagaHandler saga;
    private final ObjectMapper mapper;

    public StockEventListener(OrderSagaHandler saga, ObjectMapper mapper) {
        this.saga = saga;
        this.mapper = mapper;
    }

    @KafkaListener(topics = Topics.STOCK_RESERVED)
    public void onReserved(String json) throws JsonProcessingException {
        saga.onStockReserved(mapper.readValue(json, Events.StockReserved.class)).block();
    }

    @KafkaListener(topics = Topics.STOCK_RESERVE_FAILED)
    public void onReserveFailed(String json) throws JsonProcessingException {
        saga.onStockReserveFailed(mapper.readValue(json, Events.StockReserveFailed.class)).block();
    }
}
