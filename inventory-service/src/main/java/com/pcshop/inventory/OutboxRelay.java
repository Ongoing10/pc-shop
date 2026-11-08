package com.pcshop.inventory;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.scheduler.Scheduled;
import io.smallrye.reactive.messaging.MutinyEmitter;
import io.smallrye.reactive.messaging.kafka.api.OutgoingKafkaRecordMetadata;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Message;
import org.jboss.logging.Logger;

import java.util.List;

/**
 * Mỗi giây gửi các event NEW trong outbox lên Kafka theo thứ tự tạo, chờ broker xác nhận rồi mới đánh dấu SENT.
 * Gửi lỗi thì dừng lượt này (giữ thứ tự), lần sau gửi lại; ordering chống trùng bằng processed_events.
 */
@ApplicationScoped
public class OutboxRelay {

    private static final Logger LOG = Logger.getLogger(OutboxRelay.class);
    private static final int BATCH = 100;

    @Inject
    @Channel("stock-events")
    MutinyEmitter<String> emitter;

    @Inject
    SagaRepositories.OutboxEventRepository outbox;

    @Scheduled(every = "1s", delayed = "5s", concurrentExecution = Scheduled.ConcurrentExecution.SKIP)
    void publish() {
        List<OutboxEvent> batch = QuarkusTransaction.requiringNew().call(() -> outbox.findNew(BATCH));
        for (OutboxEvent event : batch) {
            try {
                emitter.sendMessageAndAwait(Message.of(event.payload).addMetadata(
                        OutgoingKafkaRecordMetadata.<String>builder()
                                .withTopic(event.eventType)
                                .withKey(event.aggregateId)
                                .build()));
                QuarkusTransaction.requiringNew().run(() -> outbox.markSent(event.id));
            } catch (RuntimeException e) {
                LOG.warnf("Chưa gửi được event %s (%s) lên Kafka, thử lại sau: %s", event.id, event.eventType, e.toString());
                QuarkusTransaction.requiringNew().run(() -> outbox.incrementRetry(event.id));
                return;
            }
        }
    }
}
