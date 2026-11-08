package com.pcshop.catalog;

import io.quarkus.mongodb.panache.common.MongoEntity;
import org.bson.codecs.pojo.annotations.BsonId;
import org.bson.codecs.pojo.annotations.BsonProperty;
import org.bson.types.ObjectId;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Collection catalog.pc_builds: cấu hình PC đã lưu (PC Builder).
 * Xóa thật: đơn hàng đặt từ cấu hình đã có snapshot linh kiện.
 */
@MongoEntity(collection = "pc_builds")
public class PcBuild {

    public static class Item {
        public String slot;
        @BsonProperty("product_id")
        public String productId;
        public String sku;
        public String name;
        public Integer quantity;
        @BsonProperty("price_at_time")
        public BigDecimal priceAtTime;
    }

    public static class Issue {
        @BsonProperty("rule_code")
        public String ruleCode;
        public Integer severity;
        public String message;
    }

    public static class CompatibilityResult {
        @BsonProperty("is_compatible")
        public Boolean isCompatible;
        @BsonProperty("checked_at")
        public Instant checkedAt;
        public List<Issue> issues;
    }

    @BsonId
    public ObjectId id;
    /** Mã cấu hình, dùng trong link chia sẻ */
    public String code;
    /** sub của Keycloak (UUID dạng chuỗi) */
    @BsonProperty("user_id")
    public String userId;
    public String name;
    /** GAMING, DESIGN, OFFICE, AI_ML, STREAMING */
    public String purpose;
    public BigDecimal budget;
    public List<Item> items;
    @BsonProperty("total_price")
    public BigDecimal totalPrice;
    @BsonProperty("estimated_wattage")
    public Integer estimatedWattage;
    /** Công suất nguồn tối thiểu (đã nhân hệ số an toàn), xem CompatibilityService.CheckResult */
    @BsonProperty("required_wattage")
    public Integer requiredWattage;
    @BsonProperty("compatibility_result")
    public CompatibilityResult compatibilityResult;
    @BsonProperty("is_ai_generated")
    public Boolean isAiGenerated;
    @BsonProperty("is_public")
    public Boolean isPublic;
    @BsonProperty("created_at")
    public Instant createdAt;
    @BsonProperty("updated_at")
    public Instant updatedAt;
}
