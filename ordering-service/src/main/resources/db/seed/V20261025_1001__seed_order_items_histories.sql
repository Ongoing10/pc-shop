-- Bổ sung dữ liệu mẫu cho timeline, màn admin và thống kê:
-- 1) order_items + order_status_histories cho 2 đơn có sẵn (đơn 1 mua lúc giá CPU/VGA còn cao, khớp price_histories bên catalog);
-- 2) thêm 5 đơn ở nhiều trạng thái, rải trong 20 ngày gần nhất (nằm trong khoảng mặc định 30 ngày của thống kê).
-- user_id khớp ID cố định của tài khoản test trong infra/keycloak/realm-pcshop.json.

-- ---------------------------------------------------------------- đơn có sẵn
INSERT INTO order_items (order_id, product_id, sku, product_name, category_code, unit_price, quantity, line_total,
                         warranty_months, created_at)
SELECT o.id, '', i.sku, i.name, i.category, i.price, i.qty, i.price * i.qty, i.warranty, o.created_at
FROM (VALUES ('DH20261024000001', 'CPU-I5-14600K', 'Intel Core i5-14600K', 'CPU', 8790000, 1, 36),
             ('DH20261024000001', 'GPU-MSI-4070S-12G', 'MSI GeForce RTX 4070 SUPER 12GB Ventus 2X', 'GPU', 17200000, 1, 36),
             ('DH20261024000002', 'CPU-I5-14600K', 'Intel Core i5-14600K', 'CPU', 7990000, 1, 36))
         AS i(code, sku, name, category, price, qty, warranty)
JOIN orders o ON o.code = i.code;

INSERT INTO order_status_histories (order_id, from_status, to_status, reason, created_by, created_at)
SELECT o.id, h.from_status, h.to_status, h.reason, h.created_by::uuid, o.created_at + h.after
FROM (VALUES ('DH20261024000001', NULL::int, 1, 'Đặt hàng', '11111111-1111-1111-1111-111111111111', INTERVAL '0'),
             ('DH20261024000002', NULL::int, 1, 'Đặt hàng', '22222222-2222-2222-2222-222222222222', INTERVAL '0'),
             ('DH20261024000002', 1, 2, 'Chờ thanh toán VNPay', NULL, INTERVAL '1 minute'),
             ('DH20261024000002', 2, 3, 'VNPay báo thanh toán thành công', NULL, INTERVAL '3 minutes'))
         AS h(code, from_status, to_status, reason, created_by, after)
JOIN orders o ON o.code = h.code;

-- ---------------------------------------------------------------- đơn mới
INSERT INTO orders (code, user_id, status, payment_method, payment_status, subtotal_amount, discount_amount,
                    shipping_fee, total_amount, voucher_code, receiver_name, receiver_phone, shipping_address,
                    cancel_reason, placed_at, completed_at, created_by, created_at, updated_at)
VALUES ('DH20261005000003', '11111111-1111-1111-1111-111111111111', 6, 1, 2, 5580000, 0, 0, 5580000, NULL,
        'Khách Một', '0900000001', '1 Lê Lợi, Phường Bến Thành, Thành phố Hồ Chí Minh', NULL,
        now() - INTERVAL '20 days', now() - INTERVAL '16 days',
        '11111111-1111-1111-1111-111111111111', now() - INTERVAL '20 days', now() - INTERVAL '16 days'),
       ('DH20261010000004', '22222222-2222-2222-2222-222222222222', 6, 2, 2, 19890000, 500000, 0, 19390000, 'WELCOME10',
        'Khách Hai', '0900000002', '2 Tràng Tiền, Phường Hoàn Kiếm, Thành phố Hà Nội', NULL,
        now() - INTERVAL '15 days', now() - INTERVAL '11 days',
        '22222222-2222-2222-2222-222222222222', now() - INTERVAL '15 days', now() - INTERVAL '11 days'),
       ('DH20261018000005', '11111111-1111-1111-1111-111111111111', 5, 1, 1, 7080000, 0, 0, 7080000, NULL,
        'Khách Một', '0900000001', '1 Lê Lợi, Phường Bến Thành, Thành phố Hồ Chí Minh', NULL,
        now() - INTERVAL '7 days', NULL,
        '11111111-1111-1111-1111-111111111111', now() - INTERVAL '7 days', now() - INTERVAL '6 days'),
       ('DH20261020000006', '22222222-2222-2222-2222-222222222222', 7, 1, 1, 8790000, 0, 40000, 8830000, NULL,
        'Khách Hai', '0900000002', '2 Tràng Tiền, Phường Hoàn Kiếm, Thành phố Hà Nội', 'Đổi ý, muốn mua bản khác',
        now() - INTERVAL '5 days', NULL,
        '22222222-2222-2222-2222-222222222222', now() - INTERVAL '5 days', now() - INTERVAL '5 days'),
       ('DH20261023000007', '11111111-1111-1111-1111-111111111111', 4, 1, 1, 3180000, 0, 20000, 3200000, NULL,
        'Khách Một', '0900000001', '1 Lê Lợi, Phường Bến Thành, Thành phố Hồ Chí Minh', NULL,
        now() - INTERVAL '2 days', NULL,
        '11111111-1111-1111-1111-111111111111', now() - INTERVAL '2 days', now() - INTERVAL '1 day');

INSERT INTO order_items (order_id, product_id, sku, product_name, category_code, unit_price, quantity, line_total,
                         warranty_months, created_at)
SELECT o.id, '', i.sku, i.name, i.category, i.price, i.qty, i.price * i.qty, i.warranty, o.created_at
FROM (VALUES ('DH20261005000003', 'RAM-KINGSTON-32G-D5', 'Kingston Fury Beast 32GB (2x16GB) DDR5 6000', 'RAM', 2790000, 2, 36),
             ('DH20261010000004', 'GPU-MSI-4070S-12G', 'MSI GeForce RTX 4070 SUPER 12GB Ventus 2X', 'GPU', 17200000, 1, 36),
             ('DH20261010000004', 'PSU-CORSAIR-RM750E', 'Corsair RM750e 750W 80 Plus Gold', 'PSU', 2690000, 1, 84),
             ('DH20261018000005', 'MB-ASUS-B760M-D5', 'ASUS TUF B760M-PLUS WIFI DDR5', 'MAINBOARD', 4290000, 1, 36),
             ('DH20261018000005', 'RAM-KINGSTON-32G-D5', 'Kingston Fury Beast 32GB (2x16GB) DDR5 6000', 'RAM', 2790000, 1, 36),
             ('DH20261020000006', 'CPU-I5-14600K', 'Intel Core i5-14600K', 'CPU', 8790000, 1, 36),
             ('DH20261023000007', 'STORAGE-KINGSTON-NV2-1T', 'Kingston NV2 1TB M.2 NVMe PCIe 4.0', 'STORAGE', 1590000, 2, 36))
         AS i(code, sku, name, category, price, qty, warranty)
JOIN orders o ON o.code = i.code;

INSERT INTO order_status_histories (order_id, from_status, to_status, reason, created_by, created_at)
SELECT o.id, h.from_status, h.to_status, h.reason, h.created_by::uuid, o.created_at + h.after
FROM (VALUES ('DH20261005000003', NULL::int, 1, 'Đặt hàng', '11111111-1111-1111-1111-111111111111', INTERVAL '0'),
             ('DH20261005000003', 1, 4, NULL, '33333333-3333-3333-3333-333333333333', INTERVAL '2 hours'),
             ('DH20261005000003', 4, 5, NULL, '33333333-3333-3333-3333-333333333333', INTERVAL '1 day'),
             ('DH20261005000003', 5, 6, 'Giao thành công, đã thu COD', '33333333-3333-3333-3333-333333333333', INTERVAL '4 days'),
             ('DH20261010000004', NULL::int, 1, 'Đặt hàng', '22222222-2222-2222-2222-222222222222', INTERVAL '0'),
             ('DH20261010000004', 1, 2, 'Chờ thanh toán VNPay', NULL, INTERVAL '1 minute'),
             ('DH20261010000004', 2, 3, 'VNPay báo thanh toán thành công', NULL, INTERVAL '4 minutes'),
             ('DH20261010000004', 3, 4, NULL, '33333333-3333-3333-3333-333333333333', INTERVAL '3 hours'),
             ('DH20261010000004', 4, 5, NULL, '33333333-3333-3333-3333-333333333333', INTERVAL '1 day'),
             ('DH20261010000004', 5, 6, 'Giao thành công', '33333333-3333-3333-3333-333333333333', INTERVAL '4 days'),
             ('DH20261018000005', NULL::int, 1, 'Đặt hàng', '11111111-1111-1111-1111-111111111111', INTERVAL '0'),
             ('DH20261018000005', 1, 4, NULL, '33333333-3333-3333-3333-333333333333', INTERVAL '1 hour'),
             ('DH20261018000005', 4, 5, 'Đã bàn giao cho đơn vị vận chuyển', '33333333-3333-3333-3333-333333333333', INTERVAL '1 day'),
             ('DH20261020000006', NULL::int, 1, 'Đặt hàng', '22222222-2222-2222-2222-222222222222', INTERVAL '0'),
             ('DH20261020000006', 1, 7, 'Đổi ý, muốn mua bản khác', '22222222-2222-2222-2222-222222222222', INTERVAL '30 minutes'),
             ('DH20261023000007', NULL::int, 1, 'Đặt hàng', '11111111-1111-1111-1111-111111111111', INTERVAL '0'),
             ('DH20261023000007', 1, 4, NULL, '33333333-3333-3333-3333-333333333333', INTERVAL '1 day'))
         AS h(code, from_status, to_status, reason, created_by, after)
JOIN orders o ON o.code = h.code;

-- Đơn DH20261010000004 dùng WELCOME10 (giảm 10%, tối đa 500.000đ)
INSERT INTO voucher_usages (voucher_id, order_id, user_id, discount_amount, created_at)
SELECT v.id, o.id, o.user_id, o.discount_amount, o.created_at
FROM vouchers v
JOIN orders o ON o.code = 'DH20261010000004'
WHERE v.code = 'WELCOME10';

UPDATE vouchers SET used_count = used_count + 1 WHERE code = 'WELCOME10';
