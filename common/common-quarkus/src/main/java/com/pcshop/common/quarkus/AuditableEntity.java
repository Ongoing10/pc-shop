package com.pcshop.common.quarkus;

import com.pcshop.contracts.AuthUser;
import io.quarkus.arc.Arc;
import io.quarkus.arc.InstanceHandle;
import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 4 cột audit dùng chung cho entity JPA (Hibernate Panache). created_by/updated_by = sub của Keycloak.
 * Không có user (consumer Kafka, job định kỳ) thì để null.
 * Không có is_delete: bảng nào cần vòng đời thì dùng status/is_active riêng (plan mục 4).
 */
@MappedSuperclass
public abstract class AuditableEntity {

    @Column(name = "created_by", updatable = false)
    public UUID createdBy;

    @Column(name = "created_at", updatable = false)
    public LocalDateTime createdAt;

    @Column(name = "updated_by")
    public UUID updatedBy;

    @Column(name = "updated_at")
    public LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        UUID user = currentUserId();
        createdAt = now;
        createdBy = user;
        updatedAt = now;
        updatedBy = user;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
        updatedBy = currentUserId();
    }

    private static UUID currentUserId() {
        if (!Arc.container().requestContext().isActive()) {
            return null;
        }
        try (InstanceHandle<CurrentUser> handle = Arc.container().instance(CurrentUser.class)) {
            return handle.isAvailable() ? handle.get().get().map(AuthUser::id).orElse(null) : null;
        }
    }
}
