package com.pcshop.review;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;
import java.util.UUID;

/** Collection review.reviews. Tên field trong Mongo theo snake_case như DBML. */
@Document("reviews")
public class Review {

    public static final int PENDING = 1;
    public static final int APPROVED = 2;
    public static final int REJECTED = 3;
    public static final int DELETED_BY_USER = 4;

    /** Phản hồi của cửa hàng dưới review. */
    public static class AdminReply {
        private String content;
        @Field("replied_by")
        private UUID repliedBy;
        @Field("replied_at")
        private Instant repliedAt;

        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public UUID getRepliedBy() { return repliedBy; }
        public void setRepliedBy(UUID repliedBy) { this.repliedBy = repliedBy; }
        public Instant getRepliedAt() { return repliedAt; }
        public void setRepliedAt(Instant repliedAt) { this.repliedAt = repliedAt; }
    }

    @Id
    private String id;
    @Field("product_id")
    private String productId;
    private String sku;
    @Field("user_id")
    private UUID userId;
    @Field("user_display_name")
    private String userDisplayName;
    @Field("order_code")
    private String orderCode;
    private int rating;
    private String title;
    private String content;
    @Field("is_verified_purchase")
    private boolean verifiedPurchase;
    /** 1-PENDING, 2-APPROVED, 3-REJECTED, 4-DELETED_BY_USER */
    private int status;
    @Field("helpful_count")
    private int helpfulCount;
    @Field("admin_reply")
    private AdminReply adminReply;
    @Field("created_at")
    private Instant createdAt;
    @Field("updated_at")
    private Instant updatedAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }
    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getUserDisplayName() { return userDisplayName; }
    public void setUserDisplayName(String userDisplayName) { this.userDisplayName = userDisplayName; }
    public String getOrderCode() { return orderCode; }
    public void setOrderCode(String orderCode) { this.orderCode = orderCode; }
    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public boolean isVerifiedPurchase() { return verifiedPurchase; }
    public void setVerifiedPurchase(boolean verifiedPurchase) { this.verifiedPurchase = verifiedPurchase; }
    public int getStatus() { return status; }
    public void setStatus(int status) { this.status = status; }
    public int getHelpfulCount() { return helpfulCount; }
    public void setHelpfulCount(int helpfulCount) { this.helpfulCount = helpfulCount; }
    public AdminReply getAdminReply() { return adminReply; }
    public void setAdminReply(AdminReply adminReply) { this.adminReply = adminReply; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
