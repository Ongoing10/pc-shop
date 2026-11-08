package com.pcshop.notification;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.IndexOptions;
import com.mongodb.client.model.Indexes;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.bson.Document;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Tạo index lúc khởi động (createIndex idempotent: index đã có thì bỏ qua), giống review-service.
 * Profile local: seed vài thông báo mẫu cho customer1 nếu collection rỗng.
 */
@ApplicationScoped
public class MongoIndexes {

    private static final Logger log = Logger.getLogger(MongoIndexes.class);
    private static final String CUSTOMER1 = "11111111-1111-1111-1111-111111111111";

    @Inject
    NotificationRepository notifications;

    @ConfigProperty(name = "pcshop.seed-demo", defaultValue = "false")
    boolean seedDemo;

    void onStart(@Observes StartupEvent event) {
        MongoCollection<Notification> col = notifications.mongoCollection();
        col.createIndex(Indexes.compoundIndex(Indexes.ascending("user_id", "is_read"), Indexes.descending("created_at")),
                new IndexOptions().name("idx_notifications_user_read_created"));
        // Chỉ áp unique cho bản ghi có source_event_id (thông báo tạo tay không có field này)
        col.createIndex(Indexes.ascending("source_event_id"), new IndexOptions().name("uk_notifications_source_event")
                .unique(true).partialFilterExpression(new Document("source_event_id", new Document("$type", "string"))));
        col.createIndex(Indexes.ascending("created_at"), new IndexOptions().name("ttl_notifications_created")
                .expireAfter(90L, TimeUnit.DAYS));

        if (seedDemo && notifications.count() == 0) {
            notifications.persist(List.of(
                    demo("ORDER_STATUS", "Đơn hàng đang được giao", "Đơn DH20261018000005 đã bàn giao cho đơn vị vận chuyển.",
                            new Document("order_code", "DH20261018000005"), false, 6),
                    demo("ORDER_STATUS", "Đơn hàng đã được xác nhận", "Đơn DH20261023000007 đã được cửa hàng xác nhận.",
                            new Document("order_code", "DH20261023000007"), false, 1),
                    demo("PROMOTION", "Miễn phí vận chuyển", "Nhập mã FREESHIP cho đơn từ 500.000đ.",
                            null, true, 10)));
            log.info("Đã seed 3 thông báo mẫu cho customer1");
        }
    }

    private static Notification demo(String type, String title, String content, Document data, boolean read,
                                     int daysAgo) {
        Notification n = new Notification();
        n.userId = CUSTOMER1;
        n.type = type;
        n.channel = "IN_APP";
        n.title = title;
        n.content = content;
        n.data = data;
        n.isRead = read;
        n.sendStatus = 2;
        n.createdAt = Instant.now().minus(daysAgo, ChronoUnit.DAYS);
        n.readAt = read ? n.createdAt.plus(1, ChronoUnit.HOURS) : null;
        return n;
    }
}
