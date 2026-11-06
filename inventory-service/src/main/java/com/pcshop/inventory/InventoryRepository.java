package com.pcshop.inventory;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Parameters;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@ApplicationScoped
public class InventoryRepository implements PanacheRepository<Inventory> {

    /** Sắp hết hàng: số có thể bán (quantity - reserved) không vượt mức tối thiểu. */
    static final String LOW_STOCK = "quantity - reservedQuantity <= minQuantity";

    public List<Inventory> findBySku(String sku) {
        return list("sku", sku);
    }

    public List<Inventory> findBySkus(Collection<String> skus) {
        return list("sku in ?1", skus);
    }

    public Optional<Inventory> findBySkuAndWarehouse(String sku, Long warehouseId) {
        return find("sku = ?1 and warehouseId = ?2", sku, warehouseId).firstResultOptional();
    }

    public PanacheQuery<Inventory> search(Long warehouseId, boolean lowStock) {
        StringBuilder where = new StringBuilder("1 = 1");
        Parameters params = new Parameters();
        if (warehouseId != null) {
            where.append(" and warehouseId = :warehouseId");
            params.and("warehouseId", warehouseId);
        }
        if (lowStock) {
            where.append(" and ").append(LOW_STOCK);
        }
        return find(where.toString(), Sort.ascending("sku", "warehouseId"), params);
    }

    public List<Inventory> lowStock() {
        return list(LOW_STOCK, Sort.ascending("sku", "warehouseId"));
    }
}
