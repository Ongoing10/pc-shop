package com.pcshop.catalog;

import io.quarkus.mongodb.panache.common.MongoEntity;
import org.bson.codecs.pojo.annotations.BsonId;
import org.bson.codecs.pojo.annotations.BsonProperty;
import org.bson.types.ObjectId;

import java.time.Instant;

/**
 * Collection catalog.compatibility_rules: luật tương thích TẤT ĐỊNH cho rule engine (CompatibilityService).
 * rule_type: EQUALS, IN, LTE, SUM_TDP_LTE_WATTAGE, SUM_LTE, MAX_COUNT (xem CompatibilityService).
 * Không xóa: tắt luật = is_active 0.
 */
@MongoEntity(collection = "compatibility_rules")
public class CompatibilityRule {

    public static final int ERROR = 1;
    public static final int WARNING = 2;

    @BsonId
    public ObjectId id;
    public String code;
    public String name;
    /** Danh mục nguồn; "*" = mọi linh kiện (dùng cho tổng công suất) */
    @BsonProperty("source_category")
    public String sourceCategory;
    @BsonProperty("target_category")
    public String targetCategory;
    @BsonProperty("rule_type")
    public String ruleType;
    @BsonProperty("source_field")
    public String sourceField;
    @BsonProperty("target_field")
    public String targetField;
    /** Hệ số an toàn, vd 1.2 */
    public Double margin;
    /** Chỉ dùng cho MAX_COUNT: số linh kiện tối đa của source_category */
    @BsonProperty("max_count")
    public Integer maxCount;
    /** 1-ERROR (không lắp được), 2-WARNING */
    public Integer severity;
    @BsonProperty("message_template")
    public String messageTemplate;
    @BsonProperty("is_active")
    public Integer isActive;
    @BsonProperty("created_at")
    public Instant createdAt;
    @BsonProperty("updated_at")
    public Instant updatedAt;
}
