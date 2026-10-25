package com.pcshop.catalog;

import io.quarkus.mongodb.panache.PanacheMongoRepository;
import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

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
    }

    @ApplicationScoped
    public static class ProductRepository implements PanacheMongoRepository<Product> {

        public Optional<Product> findActiveBySku(String sku) {
            return find("sku = ?1 and status = ?2", sku, Product.ACTIVE).firstResultOptional();
        }

        public List<Product> pageActive(String categoryCode, int page, int size) {
            var query = categoryCode == null
                    ? find("status", Sort.ascending("price"), Product.ACTIVE)
                    : find("category_code = ?1 and status = ?2", Sort.ascending("price"), categoryCode, Product.ACTIVE);
            return query.page(Page.of(page, size)).list();
        }

        public long countActive(String categoryCode) {
            return categoryCode == null
                    ? count("status", Product.ACTIVE)
                    : count("category_code = ?1 and status = ?2", categoryCode, Product.ACTIVE);
        }
    }
}
