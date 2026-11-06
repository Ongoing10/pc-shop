package com.pcshop.catalog;

import io.quarkus.mongodb.panache.common.MongoEntity;
import org.bson.codecs.pojo.annotations.BsonId;
import org.bson.codecs.pojo.annotations.BsonProperty;
import org.bson.types.ObjectId;

import java.time.Instant;

/** Collection catalog.brands. Không xóa vì sản phẩm tham chiếu: ngừng dùng = is_active 0. */
@MongoEntity(collection = "brands")
public class Brand {

    @BsonId
    public ObjectId id;
    public String code;
    public String name;
    public String slug;
    @BsonProperty("logo_url")
    public String logoUrl;
    @BsonProperty("is_active")
    public Integer isActive;
    @BsonProperty("created_at")
    public Instant createdAt;
    @BsonProperty("updated_at")
    public Instant updatedAt;
}
