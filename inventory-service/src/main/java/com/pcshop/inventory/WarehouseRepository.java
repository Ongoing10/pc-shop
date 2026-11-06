package com.pcshop.inventory;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class WarehouseRepository implements PanacheRepository<Warehouse> {

    public List<Warehouse> listAllByCode() {
        return listAll(Sort.ascending("code"));
    }

    public boolean existsByCode(String code) {
        return count("code", code) > 0;
    }

    public List<Warehouse> listActive() {
        return list("isActive", Sort.ascending("code"), 1);
    }
}
