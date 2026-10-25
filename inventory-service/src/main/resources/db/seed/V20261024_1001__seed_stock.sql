-- Tồn kho mẫu cho các SKU seed của catalog-service. product_id để trống vì ObjectId do Mongo sinh.
INSERT INTO warehouses (code, name, address, is_active, created_at)
VALUES ('HCM-01', 'Kho Hồ Chí Minh', 'TP. Hồ Chí Minh', 1, now()),
       ('HN-01', 'Kho Hà Nội', 'Hà Nội', 1, now());

INSERT INTO inventories (product_id, sku, warehouse_id, quantity, reserved_quantity, min_quantity, created_at)
SELECT '', s.sku, w.id, s.qty, 0, 2, now()
FROM (VALUES ('CPU-I5-14600K', 15), ('MB-ASUS-B760M-D5', 8), ('RAM-KINGSTON-32G-D5', 20),
             ('GPU-MSI-4070S-12G', 4), ('PSU-CORSAIR-RM750E', 0)) AS s(sku, qty)
CROSS JOIN warehouses w
WHERE w.code = 'HCM-01';
