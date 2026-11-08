package com.pcshop.ordering.messaging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.pcshop.events.Topics;
import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.KafkaAdmin;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.support.ExponentialBackOffWithMaxRetries;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Tạo sẵn các topic của Saga đặt hàng (1 partition: đủ cho đồ án, giữ thứ tự tuyệt đối) và cách xử lý lỗi của consumer.
 */
@Configuration
@EnableScheduling
public class MessagingConfig {

    @Bean
    KafkaAdmin.NewTopics sagaTopics() {
        return new KafkaAdmin.NewTopics(
                topic(Topics.ORDER_CREATED), topic(Topics.ORDER_CANCELLED), topic(Topics.ORDER_SHIPPED),
                topic(Topics.ORDER_COMPLETED), topic(Topics.ORDER_RETURNED), topic(Topics.ORDER_STATUS_CHANGED),
                topic(Topics.STOCK_RESERVED), topic(Topics.STOCK_RESERVE_FAILED));
    }

    /**
     * Event xử lý lỗi (DB chập chờn...): thử lại giãn cách 2s, 4s, 8s... tối đa 1 phút/lần, 10 lần (~6 phút), giữ nguyên
     * partition để không xử lý lệch thứ tự. Vẫn lỗi → chuyển sang topic <tên>.DLT (không mất event, xem lại bằng tay).
     * JSON hỏng thì không thử lại. Mặc định của Spring là thử 10 lần liền rồi BỎ event.
     */
    @Bean
    DefaultErrorHandler kafkaErrorHandler(KafkaTemplate<String, String> template) {
        ExponentialBackOffWithMaxRetries backOff = new ExponentialBackOffWithMaxRetries(10);
        backOff.setInitialInterval(2_000);
        backOff.setMultiplier(2);
        backOff.setMaxInterval(60_000);
        DefaultErrorHandler handler = new DefaultErrorHandler(new DeadLetterPublishingRecoverer(template), backOff);
        handler.addNotRetryableExceptions(JsonProcessingException.class);
        return handler;
    }

    private static NewTopic topic(String name) {
        return TopicBuilder.name(name).partitions(1).replicas(1).build();
    }
}
