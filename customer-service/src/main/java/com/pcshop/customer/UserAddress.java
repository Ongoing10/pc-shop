package com.pcshop.customer;

import com.pcshop.common.quarkus.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/** Sổ địa chỉ của khách. Xóa thật: đơn hàng đã lưu snapshot địa chỉ. Mỗi user tối đa 1 địa chỉ mặc định. */
@Entity
@Table(name = "user_addresses")
public class UserAddress extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    /** sub của Keycloak */
    @Column(name = "user_id")
    public UUID userId;

    @Column(name = "receiver_name")
    public String receiverName;

    @Column(name = "receiver_phone")
    public String receiverPhone;

    @Column(name = "province_code")
    public String provinceCode;

    @Column(name = "province_name")
    public String provinceName;

    @Column(name = "ward_code")
    public String wardCode;

    @Column(name = "ward_name")
    public String wardName;

    @Column(name = "address_detail")
    public String addressDetail;

    @Column(name = "is_default")
    public boolean isDefault;
}
