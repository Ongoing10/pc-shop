package com.pcshop.catalog;

import io.quarkus.mongodb.panache.PanacheMongoRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;
import org.bson.Document;

import java.util.Collection;
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
