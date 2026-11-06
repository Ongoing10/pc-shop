package com.pcshop.catalog;

import io.quarkus.mongodb.panache.common.MongoEntity;
import org.bson.Document;
import org.bson.codecs.pojo.annotations.BsonId;
import org.bson.codecs.pojo.annotations.BsonProperty;
import org.bson.types.ObjectId;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Collection catalog.products. Schema linh hoạt theo loại linh kiện:
 * <ul>
 *   <li>specs: thông số để hiển thị, mỗi loại một kiểu</li>
 *   <li>compat: thông số CHUẨN HÓA cho rule engine tương thích (socket, memory_type, tdp_w, length_mm...)</li>
 * </ul>
 * Vòng đời bằng status (thay cho xóa mềm): 1-DRAFT, 2-ACTIVE, 3-HIDDEN, 4-DISCONTINUED.
 */
@MongoEntity(collection = "products")
public class Product {

    public static final int DRAFT = 1;
    public static final int ACTIVE = 2;
    public static final int HIDDEN = 3;
    public static final int DISCONTINUED = 4;

    /** Ảnh sản phẩm: file nằm ở media-service, ở đây chỉ giữ id và URL. */
    public static class Image {
        @BsonProperty("file_id")
        public Long fileId;
        public String url;
        @BsonProperty("is_primary")
        public Boolean isPrimary;
    }

    @BsonId
    public ObjectId id;
    public String sku;
    public String name;
    public String slug;
    @BsonProperty("category_code")
    public String categoryCode;
    @BsonProperty("brand_code")
    public String brandCode;
    @BsonProperty("short_description")
    public String shortDescription;
    public String description;
    public BigDecimal price;
    @BsonProperty("original_price")
    public BigDecimal originalPrice;
    public List<Image> images;
    public Document specs;
    public Document compat;
    public List<String> tags;
    @BsonProperty("warranty_months")
    public Integer warrantyMonths;
    public Integer status;
    @BsonProperty("rating_avg")
    public Double ratingAvg;
    @BsonProperty("rating_count")
    public Integer ratingCount;
    @BsonProperty("sold_count")
    public Integer soldCount;
    @BsonProperty("created_by")
    public String createdBy;
    @BsonProperty("created_at")
    public Instant createdAt;
    @BsonProperty("updated_by")
    public String updatedBy;
    @BsonProperty("updated_at")
    public Instant updatedAt;

    /** URL ảnh chính (ảnh is_primary, không có thì ảnh đầu tiên). */
    public String primaryImageUrl() {
        if (images == null || images.isEmpty()) {
            return null;
        }
        return images.stream().filter(i -> Boolean.TRUE.equals(i.isPrimary)).findFirst()
                .orElse(images.get(0)).url;
    }
}
