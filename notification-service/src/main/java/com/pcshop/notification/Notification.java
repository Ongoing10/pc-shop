package com.pcshop.notification;

import io.quarkus.mongodb.panache.common.MongoEntity;
import org.bson.Document;
import org.bson.codecs.pojo.annotations.BsonId;
import org.bson.codecs.pojo.annotations.BsonProperty;
import org.bson.types.ObjectId;

import java.time.Instant;

/**
 * Collection notification.notifications. Tự xóa sau 90 ngày (TTL index trên created_at, xem MongoIndexes).
 * Sinh từ event Kafka (NotificationConsumer); source_event_id chống tạo trùng khi event được giao lại.
 */
@MongoEntity(collection = "notifications")
public class Notification {

    @BsonId
    public ObjectId id;
    /** sub của Keycloak (UUID dạng chuỗi) */
    @BsonProperty("user_id")
    public String userId;
    /** ORDER_STATUS, PAYMENT, PROMOTION, STOCK_BACK, REVIEW_REPLY */
    public String type;
    /** IN_APP, EMAIL */
    public String channel;
    public String title;
    public String content;
    /** Dữ liệu điều hướng, vd {"order_code": "DH..."} */
    public Document data;
    @BsonProperty("is_read")
    public boolean isRead;
    @BsonProperty("read_at")
    public Instant readAt;
    /** 1-PENDING, 2-SENT, 3-FAILED */
    @BsonProperty("send_status")
    public Integer sendStatus;
    @BsonProperty("source_event_id")
    public String sourceEventId;
    @BsonProperty("created_at")
    public Instant createdAt;
}
