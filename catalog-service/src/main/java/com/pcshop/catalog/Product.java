package com.pcshop.catalog;

import io.quarkus.mongodb.panache.common.MongoEntity;
import org.bson.Document;
import org.bson.codecs.pojo.annotations.BsonId;
import org.bson.codecs.pojo.annotations.BsonProperty;
import org.bson.types.ObjectId;

import java.math.BigDecimal;
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

    public static final int ACTIVE = 2;

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
    public Document specs;
    public Document compat;
    public List<String> tags;
    @BsonProperty("warranty_months")
    public Integer warrantyMonths;
    public Integer status;
}
