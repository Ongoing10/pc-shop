-- customer-service V1. Tài khoản (username, mật khẩu, role, khóa) do Keycloak quản lý.
-- id = sub của Keycloak (UUID).

CREATE TABLE customer_profiles (
    id             UUID PRIMARY KEY,
    display_name   VARCHAR(255),
    email          VARCHAR(255),
    phone_number   VARCHAR(15),
    avatar_file_id BIGINT,                 -- tham chiếu logic: media.files.id
    gender         INTEGER,                -- 0-Khác, 1-Nam, 2-Nữ
    birth_date     DATE,
    created_by     UUID,
    created_at     TIMESTAMP,
    updated_by     UUID,
    updated_at     TIMESTAMP
);
CREATE INDEX idx_customer_profiles_phone ON customer_profiles (phone_number);

-- Xóa thật: đơn hàng đã lưu snapshot địa chỉ
CREATE TABLE user_addresses (
    id             BIGSERIAL PRIMARY KEY,
    user_id        UUID         NOT NULL,
    receiver_name  VARCHAR(255),
    receiver_phone VARCHAR(15),
    province_code  VARCHAR(10),
    province_name  VARCHAR(100),
    ward_code      VARCHAR(10),            -- mô hình hành chính 2 cấp
    ward_name      VARCHAR(100),
    address_detail VARCHAR(255),
    is_default     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_by     UUID,
    created_at     TIMESTAMP,
    updated_by     UUID,
    updated_at     TIMESTAMP
);
CREATE INDEX idx_user_addresses_user_id ON user_addresses (user_id);
