package com.pcshop.inventory;

import com.pcshop.common.quarkus.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/** Tồn kho theo SKU và kho. Số lượng có thể bán = quantity - reservedQuantity. */
@Entity
@Table(name = "inventories")
public class Inventory extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "product_id")
    public String productId;

    public String sku;

    @Column(name = "warehouse_id")
    public Long warehouseId;

    public int quantity;

    @Column(name = "reserved_quantity")
    public int reservedQuantity;

    @Column(name = "min_quantity")
    public int minQuantity;

    /** Optimistic lock: chống bán vượt tồn kho khi nhiều người đặt cùng lúc. */
    @Version
    public long version;

    public int available() {
        return quantity - reservedQuantity;
    }
}
