package com.pcshop.customer;

import com.pcshop.common.quarkus.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Hồ sơ nghiệp vụ của khách. TÀI KHOẢN (username, mật khẩu, khóa, role) nằm ở Keycloak;
 * bảng này chỉ giữ thông tin shop cần, khóa chính = sub của Keycloak.
 * Truy cập qua CustomerProfileRepository (Panache repository pattern).
 */
@Entity
@Table(name = "customer_profiles")
public class CustomerProfile extends AuditableEntity {

    @Id
    public UUID id;

    @Column(name = "display_name")
    public String displayName;

    public String email;

    @Column(name = "phone_number")
    public String phoneNumber;

    @Column(name = "avatar_file_id")
    public Long avatarFileId;

    /** 0-Khác, 1-Nam, 2-Nữ */
    public Integer gender;

    @Column(name = "birth_date")
    public LocalDate birthDate;
}
