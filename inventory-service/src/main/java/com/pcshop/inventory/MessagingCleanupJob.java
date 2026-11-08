package com.pcshop.inventory;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;

import java.time.LocalDateTime;

/**
 * Dọn bảng kỹ thuật (plan mục 4, vòng đời dữ liệu): outbox_events đã gửi sau 7 ngày, processed_events sau 30 ngày.
 * Chạy 3:30 sáng mỗi ngày (giống ordering).
 */
@ApplicationScoped
public class MessagingCleanupJob {

    private static final Logger LOG = Logger.getLogger(MessagingCleanupJob.class);

    @Inject
    SagaRepositories.OutboxEventRepository outbox;

    @Inject
    SagaRepositories.ProcessedEventRepository processed;

    @Scheduled(cron = "0 30 3 * * ?")
    void cleanup() {
        LocalDateTime now = LocalDateTime.now();
        long sent = QuarkusTransaction.requiringNew().call(() ->
                outbox.delete("status = ?1 and sentAt < ?2", OutboxEvent.SENT, now.minusDays(7)));
        long done = QuarkusTransaction.requiringNew().call(() ->
                processed.delete("processedAt < ?1", now.minusDays(30)));
        LOG.infof("Dọn outbox_events: %d dòng, processed_events: %d dòng", sent, done);
    }
}
