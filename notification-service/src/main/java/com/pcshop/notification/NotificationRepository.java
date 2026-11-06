package com.pcshop.notification;

import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Updates;
import io.quarkus.mongodb.panache.PanacheMongoRepository;
import io.quarkus.mongodb.panache.PanacheQuery;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import org.bson.types.ObjectId;

import java.time.Instant;
import java.util.Optional;

@ApplicationScoped
public class NotificationRepository implements PanacheMongoRepository<Notification> {

    public PanacheQuery<Notification> byUser(String userId) {
        return find("user_id", Sort.descending("created_at"), userId);
    }

    public long countUnread(String userId) {
        return count("user_id = ?1 and is_read = ?2", userId, false);
    }

    public Optional<Notification> findOwned(ObjectId id, String userId) {
        return find("_id = ?1 and user_id = ?2", id, userId).firstResultOptional();
    }

    /** Đánh dấu đã đọc mọi thông báo chưa đọc của user; trả về số bản ghi đã đổi. */
    public long markAllRead(String userId) {
        return mongoCollection().updateMany(
                        Filters.and(Filters.eq("user_id", userId), Filters.eq("is_read", false)),
                        Updates.combine(Updates.set("is_read", true), Updates.set("read_at", Instant.now())))
                .getModifiedCount();
    }
}
