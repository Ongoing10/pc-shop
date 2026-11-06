package com.pcshop.catalog;

import io.quarkus.mongodb.panache.common.MongoEntity;
import org.bson.codecs.pojo.annotations.BsonId;
import org.bson.codecs.pojo.annotations.BsonProperty;
import org.bson.types.ObjectId;

import java.time.Instant;
import java.util.List;

/** Collection catalog.categories. Không xóa: ẩn danh mục = is_active 0. */
@MongoEntity(collection = "categories")
public class Category {

    public static final String GROUP_SPECS = "specs";
    public static final String GROUP_COMPAT = "compat";

    /**
     * Một thông số của danh mục: sinh cột động trong file Excel sản phẩm, form nhập của admin.
     * {@code group = compat} là trường rule engine dùng (lưu ở products.compat), {@code specs} chỉ để hiển thị.
     */
    public static class SpecField {
        public String key;
        public String label;
        public String group;
        /** string | integer | decimal | boolean | string_list (nhiều giá trị, cách nhau dấu phẩy) */
        public String type;
        public Boolean required;
        /** Đơn vị hiển thị cạnh tên cột (mm, W, GB...), có thể rỗng */
        public String unit;
        /** Giá trị cho phép (dropdown); rỗng = nhập tự do */
        public List<String> options;
    }

    @BsonId
    public ObjectId id;
    public String code;
    public String name;
    public String slug;
    @BsonProperty("pc_slot")
    public String pcSlot;
    @BsonProperty("sort_order")
    public Integer sortOrder;
    @BsonProperty("is_active")
    public Integer isActive;
    @BsonProperty("spec_schema")
    public List<SpecField> specSchema;
    /** sub của Keycloak (UUID dạng chuỗi) */
    @BsonProperty("created_by")
    public String createdBy;
    @BsonProperty("created_at")
    public Instant createdAt;
    @BsonProperty("updated_by")
    public String updatedBy;
    @BsonProperty("updated_at")
    public Instant updatedAt;
}
