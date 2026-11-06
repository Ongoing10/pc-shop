package com.pcshop.inventory;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Parameters;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.LocalDate;

@ApplicationScoped
public class StockMovementRepository implements PanacheRepository<StockMovement> {

    /** Lọc theo SKU và khoảng ngày [from, to] (tham số nào null thì bỏ qua), mới nhất trước. */
    public PanacheQuery<StockMovement> search(String sku, LocalDate from, LocalDate to) {
        StringBuilder where = new StringBuilder("1 = 1");
        Parameters params = new Parameters();
        if (sku != null && !sku.isBlank()) {
            where.append(" and sku = :sku");
            params.and("sku", sku);
        }
        if (from != null) {
            where.append(" and createdAt >= :from");
            params.and("from", from.atStartOfDay());
        }
        if (to != null) {
            where.append(" and createdAt < :to");
            params.and("to", to.plusDays(1).atStartOfDay());
        }
        return find(where.toString(), Sort.descending("createdAt", "id"), params);
    }
}
