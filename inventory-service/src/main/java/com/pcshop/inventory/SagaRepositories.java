package com.pcshop.inventory;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** Repository của outbox và processed_events (Saga đặt hàng). */
public final class SagaRepositories {

    private SagaRepositories() {
    }

    @ApplicationScoped
    public static class OutboxEventRepository implements PanacheRepositoryBase<OutboxEvent, UUID> {

        public List<OutboxEvent> findNew(int limit) {
            return find("status", Sort.ascending("createdAt", "id"), OutboxEvent.NEW).page(Page.ofSize(limit)).list();
        }

        public void markSent(UUID id) {
            update("status = ?1, sentAt = ?2 where id = ?3", OutboxEvent.SENT, LocalDateTime.now(), id);
        }

        public void incrementRetry(UUID id) {
            update("retryCount = retryCount + 1 where id = ?1", id);
        }
    }

    @ApplicationScoped
    public static class ProcessedEventRepository implements PanacheRepositoryBase<ProcessedEvent, UUID> {
    }
}
