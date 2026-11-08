package com.pcshop.ordering.messaging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Dọn bảng kỹ thuật (plan mục 4, vòng đời dữ liệu): outbox_events đã gửi sau 7 ngày, processed_events sau 30 ngày
 * (lâu hơn hẳn thời gian Kafka có thể giao lại một event). Chạy 3:30 sáng mỗi ngày.
 */
@Component
public class MessagingCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(MessagingCleanupJob.class);

    private final DatabaseClient db;

    public MessagingCleanupJob(DatabaseClient db) {
        this.db = db;
    }

    @Scheduled(cron = "0 30 3 * * *")
    public void cleanup() {
        Long outbox = db.sql("DELETE FROM outbox_events WHERE status = 1 AND sent_at < now() - interval '7 days'")
                .fetch().rowsUpdated().block();
        Long processed = db.sql("DELETE FROM processed_events WHERE processed_at < now() - interval '30 days'")
                .fetch().rowsUpdated().block();
        log.info("Dọn outbox_events: {} dòng, processed_events: {} dòng", outbox, processed);
    }
}
