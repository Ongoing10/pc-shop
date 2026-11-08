package com.pcshop.inventory;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Sort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class StockReservationRepository implements PanacheRepository<StockReservation> {

    public boolean existsForOrder(String orderCode) {
        return count("orderCode", orderCode) > 0;
    }

    public List<StockReservation> findHeld(String orderCode) {
        return list("orderCode = ?1 and status = ?2", Sort.ascending("id"), orderCode, StockReservation.HOLD);
    }
}
