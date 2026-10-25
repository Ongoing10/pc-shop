package com.pcshop.review;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;
import java.util.UUID;

/** Collection review.reviews. Tên field trong Mongo theo snake_case như DBML. */
@Document("reviews")
public class Review {

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
    @Field("created_at")
    private Instant createdAt;

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
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
