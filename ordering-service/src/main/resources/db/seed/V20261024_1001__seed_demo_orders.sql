-- Dữ liệu mẫu. user_id khớp ID cố định của tài khoản test trong infra/keycloak/realm-pcshop.json.

INSERT INTO vouchers (code, name, type, value, max_discount_amount, min_order_amount, usage_limit, is_active, created_at)
VALUES ('WELCOME10', 'Giảm 10% cho đơn đầu tiên', 1, 10, 500000, 1000000, 1000, 1, now()),
       ('FREESHIP', 'Miễn phí vận chuyển', 3, 0, NULL, 500000, NULL, 1, now());

INSERT INTO orders (code, user_id, status, payment_method, payment_status, subtotal_amount, total_amount,
                    receiver_name, receiver_phone, shipping_address, placed_at, created_by, created_at)
VALUES ('DH20261024000001', '11111111-1111-1111-1111-111111111111', 1, 1, 1, 25990000, 25990000,
        'Khách Một', '0900000001', '1 Lê Lợi, Phường Bến Thành, TP. Hồ Chí Minh', now(),
        '11111111-1111-1111-1111-111111111111', now()),
       ('DH20261024000002', '22222222-2222-2222-2222-222222222222', 3, 2, 2, 7990000, 7990000,
        'Khách Hai', '0900000002', '2 Tràng Tiền, Phường Hoàn Kiếm, Hà Nội', now(),
        '22222222-2222-2222-2222-222222222222', now());
