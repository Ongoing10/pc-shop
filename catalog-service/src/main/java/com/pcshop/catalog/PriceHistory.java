package com.pcshop.catalog;

import io.quarkus.mongodb.panache.common.MongoEntity;
import org.bson.codecs.pojo.annotations.BsonId;
import org.bson.codecs.pojo.annotations.BsonProperty;
import org.bson.types.ObjectId;

import java.math.BigDecimal;
import java.time.Instant;

/** Collection catalog.price_histories: lịch sử giá, chỉ thêm, không sửa. Ghi cùng lúc với đổi products.price. */
@MongoEntity(collection = "price_histories")
public class PriceHistory {

    @BsonId
    public ObjectId id;
    @BsonProperty("product_id")
    public ObjectId productId;
    public String sku;
    @BsonProperty("old_price")
    public BigDecimal oldPrice;
    @BsonProperty("new_price")
    public BigDecimal newPrice;
    /** PROMOTION, COST_CHANGE, CORRECTION, INITIAL... */
    public String reason;
    @BsonProperty("changed_by")
    public String changedBy;
    @BsonProperty("changed_at")
    public Instant changedAt;
}
