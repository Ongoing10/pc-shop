package com.pcshop.catalog;

import com.mongodb.client.model.Filters;
import io.quarkus.mongodb.panache.PanacheMongoRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import org.bson.BsonDocument;
import org.bson.BsonDocumentWriter;
import org.bson.BsonString;
import org.bson.BsonValue;
import org.bson.Document;
import org.bson.codecs.EncoderContext;
import org.bson.types.ObjectId;

import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Optional;

/** Repository Panache cho MongoDB (repository pattern, giống phía JPA). */
public final class CatalogRepositories {

    private CatalogRepositories() {
    }

    @ApplicationScoped
    public static class CategoryRepository implements PanacheMongoRepository<Category> {

        public List<Category> listActive() {
            return list("is_active", Sort.ascending("sort_order"), 1);
        }

        public List<Category> listAllSorted() {
            return listAll(Sort.ascending("sort_order"));
        }

        public Optional<Category> findByCode(String code) {
            return find("code", code).firstResultOptional();
        }

        public List<Category> findByCodes(Collection<String> codes) {
            return list(new Document("code", new Document("$in", List.copyOf(codes))));
        }

        public Optional<Category> findActiveByCode(String code) {
            return find("code = ?1 and is_active = ?2", code, 1).firstResultOptional();
        }

        public boolean existsBySlugExcept(String slug, String exceptCode) {
            return count("slug = ?1 and code != ?2", slug, exceptCode == null ? "" : exceptCode) > 0;
        }
    }

    @ApplicationScoped
    public static class BrandRepository implements PanacheMongoRepository<Brand> {

        public List<Brand> listActive() {
            return list("is_active", Sort.ascending("name"), 1);
        }

        public List<Brand> listAllSorted() {
            return listAll(Sort.ascending("name"));
        }

        public Optional<Brand> findByCode(String code) {
            return find("code", code).firstResultOptional();
        }

        public List<Brand> findByCodes(Collection<String> codes) {
            return list(new Document("code", new Document("$in", List.copyOf(codes))));
        }

        public Optional<Brand> findActiveByCode(String code) {
            return find("code = ?1 and is_active = ?2", code, 1).firstResultOptional();
        }

        public boolean existsBySlugExcept(String slug, String exceptCode) {
            return count("slug = ?1 and code != ?2", slug, exceptCode == null ? "" : exceptCode) > 0;
        }
    }

    @ApplicationScoped
    public static class ProductRepository implements PanacheMongoRepository<Product> {

        public Optional<Product> findActiveBySku(String sku) {
            return find("sku = ?1 and status = ?2", sku, Product.ACTIVE).firstResultOptional();
        }

        public Optional<Product> findBySku(String sku) {
            return find("sku", sku).firstResultOptional();
        }

        public List<Product> findBySkus(Collection<String> skus) {
            return list(new Document("sku", new Document("$in", List.copyOf(skus))));
        }

        public boolean existsBySlugExcept(String slug, String exceptSku) {
            return count("slug = ?1 and sku != ?2", slug, exceptSku == null ? "" : exceptSku) > 0;
        }

        /** Export Excel: sản phẩm của một danh mục (mọi trạng thái nếu status null), lấy tối đa {@code limit}. */
        public List<Product> findForExport(String categoryCode, Integer status, int limit) {
            Document query = new Document("category_code", categoryCode);
            if (status != null) {
                query.append("status", status);
            }
            return find(query, new Document("sku", 1)).range(0, limit - 1).list();
        }

        /**
         * Trường mà trang admin/import được sửa. rating_avg, rating_count (review), sold_count (ordering) và
         * created_* KHÔNG nằm ở đây, nên lưu sản phẩm không đè lên số liệu service khác vừa cập nhật.
         */
        static final List<String> EDITABLE_FIELDS = List.of("name", "slug", "category_code", "brand_code",
                "short_description", "description", "price", "original_price", "images", "specs", "compat", "tags",
                "warranty_months", "status", "updated_by", "updated_at");

        /**
         * Ghi các trường sửa được bằng $set/$unset (thay cho update() của Panache, vốn thay nguyên document).
         * Trường null thì $unset, giống hành vi replace trước đây với trường đó.
         */
        public void updateEditable(Product p) {
            BsonDocument full = new BsonDocument();
            mongoCollection().getCodecRegistry().get(Product.class)
                    .encode(new BsonDocumentWriter(full), p, EncoderContext.builder().build());
            BsonDocument set = new BsonDocument();
            BsonDocument unset = new BsonDocument();
            for (String field : EDITABLE_FIELDS) {
                BsonValue value = full.get(field);
                if (value == null || value.isNull()) {
                    unset.put(field, new BsonString(""));
                } else {
                    set.put(field, value);
                }
            }
            BsonDocument update = new BsonDocument("$set", set);
            if (!unset.isEmpty()) {
                update.put("$unset", unset);
            }
            mongoCollection().updateOne(Filters.eq("_id", p.id), update);
        }

        public void updateEditable(Collection<Product> list) {
            list.forEach(this::updateEditable);
        }

        /**
         * Ghi điểm sao từ review-service, chỉ khi bản này mới hơn bản đang lưu (rating_updated_at): event đến trễ
         * hoặc lệch thứ tự không đè số mới. Trả false nếu bỏ qua (không có sản phẩm hoặc bản cũ hơn).
         */
        public boolean updateRating(String productId, double average, long count, Date computedAt) {
            if (!ObjectId.isValid(productId)) {
                return false;
            }
            return mongoCollection().updateOne(
                    Filters.and(Filters.eq("_id", new ObjectId(productId)), Filters.or(
                            Filters.exists("rating_updated_at", false), Filters.lt("rating_updated_at", computedAt))),
                    new Document("$set", new Document("rating_avg", average)
                            .append("rating_count", (int) count)
                            .append("rating_updated_at", computedAt))).getModifiedCount() > 0;
        }

        /** Cộng (âm = trừ) sold_count của một SKU; không cho xuống dưới 0. */
        public void incrementSoldCount(String sku, int delta) {
            mongoCollection().updateOne(Filters.eq("sku", sku), List.of(new Document("$set", new Document("sold_count",
                    new Document("$max", List.of(0, new Document("$add",
                            List.of(new Document("$ifNull", List.of("$sold_count", 0)), delta))))))));
        }
    }

    @ApplicationScoped
    public static class CompatibilityRuleRepository implements PanacheMongoRepository<CompatibilityRule> {

        public List<CompatibilityRule> listActive() {
            return list("is_active", Sort.ascending("code"), 1);
        }

        public List<CompatibilityRule> listAllSorted() {
            return listAll(Sort.ascending("code"));
        }

        public Optional<CompatibilityRule> findByCode(String code) {
            return find("code", code).firstResultOptional();
        }

        public List<CompatibilityRule> findByCodes(Collection<String> codes) {
            return list(new Document("code", new Document("$in", List.copyOf(codes))));
        }
    }

    @ApplicationScoped
    public static class PcBuildRepository implements PanacheMongoRepository<PcBuild> {

        public Optional<PcBuild> findByCode(String code) {
            return find("code", code).firstResultOptional();
        }

        public List<PcBuild> findByCodes(Collection<String> codes) {
            return list(new Document("code", new Document("$in", List.copyOf(codes))));
        }

        public List<PcBuild> listByUser(String userId) {
            return list("user_id", Sort.descending("created_at"), userId);
        }
    }

    @ApplicationScoped
    public static class PriceHistoryRepository implements PanacheMongoRepository<PriceHistory> {

        public List<PriceHistory> listBySku(String sku, int limit) {
            return find("sku", Sort.descending("changed_at"), sku).range(0, limit - 1).list();
        }
    }
}
