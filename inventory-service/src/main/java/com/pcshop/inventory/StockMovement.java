package com.pcshop.inventory;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Phiếu biến động kho: chỉ thêm, không sửa, nên chỉ có created_by/created_at (không kế thừa AuditableEntity).
 * quantity mang dấu: + nhập/hoàn, - xuất/giảm.
 */
@Entity
@Table(name = "stock_movements")
public class StockMovement {

    public static final int IMPORT = 1;
    public static final int SALE = 2;
    public static final int RETURN = 3;
    public static final int ADJUST = 4;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    public String sku;

    @Column(name = "warehouse_id")
    public Long warehouseId;

    /** 1-Nhập, 2-Xuất bán, 3-Hoàn trả, 4-Điều chỉnh */
    public int type;

    public int quantity;

    @Column(name = "quantity_after")
    public Integer quantityAfter;

    @Column(name = "reference_type")
    public String referenceType;

    @Column(name = "reference_code")
    public String referenceCode;

    public String note;

    @Column(name = "created_by")
    public UUID createdBy;

    @Column(name = "created_at")
    public LocalDateTime createdAt;
}
