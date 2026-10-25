package com.pcshop.catalog;

import io.quarkus.mongodb.panache.common.MongoEntity;
import org.bson.codecs.pojo.annotations.BsonId;
import org.bson.codecs.pojo.annotations.BsonProperty;
import org.bson.types.ObjectId;

/** Collection catalog.categories. Không xóa: ẩn danh mục = is_active 0. */
@MongoEntity(collection = "categories")
public class Category {

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
}
