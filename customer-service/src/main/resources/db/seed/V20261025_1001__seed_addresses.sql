-- Hồ sơ + sổ địa chỉ mẫu cho tài khoản test (ID cố định trong infra/keycloak/realm-pcshop.json).
-- Mã tỉnh/phường khớp file tạm resources/locations/vn-locations.json.
INSERT INTO customer_profiles (id, display_name, email, phone_number, gender, created_by, created_at)
VALUES ('11111111-1111-1111-1111-111111111111', 'Khách Một', 'customer1@pcshop.local', '0900000001', 1,
        '11111111-1111-1111-1111-111111111111', now()),
       ('22222222-2222-2222-2222-222222222222', 'Khách Hai', 'customer2@pcshop.local', '0900000002', 2,
        '22222222-2222-2222-2222-222222222222', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_addresses (user_id, receiver_name, receiver_phone, province_code, province_name, ward_code, ward_name,
                            address_detail, is_default, created_by, created_at)
VALUES ('11111111-1111-1111-1111-111111111111', 'Khách Một', '0900000001', '79', 'Thành phố Hồ Chí Minh',
        '79002', 'Phường Bến Thành', '1 Lê Lợi', TRUE, '11111111-1111-1111-1111-111111111111', now()),
       ('11111111-1111-1111-1111-111111111111', 'Khách Một (công ty)', '0900000011', '48', 'Thành phố Đà Nẵng',
        '48001', 'Phường Hải Châu', '10 Bạch Đằng', FALSE, '11111111-1111-1111-1111-111111111111', now()),
       ('22222222-2222-2222-2222-222222222222', 'Khách Hai', '0900000002', '01', 'Thành phố Hà Nội',
        '01001', 'Phường Hoàn Kiếm', '2 Tràng Tiền', TRUE, '22222222-2222-2222-2222-222222222222', now());
