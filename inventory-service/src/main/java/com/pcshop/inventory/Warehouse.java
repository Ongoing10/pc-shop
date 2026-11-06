package com.pcshop.inventory;

import com.pcshop.common.quarkus.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Kho hàng. Không xóa vì tồn kho/phiếu kho tham chiếu: ngừng dùng = is_active 0. */
@Entity
@Table(name = "warehouses")
public class Warehouse extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    public String code;

    public String name;

    public String address;

    @Column(name = "is_active")
    public int isActive;
}
