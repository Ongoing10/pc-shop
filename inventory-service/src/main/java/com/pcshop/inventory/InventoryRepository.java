package com.pcshop.inventory;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class InventoryRepository implements PanacheRepository<Inventory> {

    public List<Inventory> findBySku(String sku) {
        return list("sku", sku);
    }
}
