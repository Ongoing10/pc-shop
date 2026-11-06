-- Bổ sung dữ liệu mẫu:
-- 1) tồn kho cho các SKU mới thêm ở catalog (changeSet 20261025-1001-seed-more-products), có cả ở kho Hà Nội;
-- 2) phiếu nhập ban đầu (stock_movements type 1) khớp với toàn bộ số tồn đang có, để màn lịch sử kho không trống.

INSERT INTO inventories (product_id, sku, warehouse_id, quantity, reserved_quantity, min_quantity, created_at)
SELECT '', s.sku, w.id, s.qty, 0, 2, now()
FROM (VALUES ('HCM-01', 'CPU-R5-7600X', 10),
             ('HCM-01', 'MB-GIGABYTE-B650M-D5', 6),
             ('HCM-01', 'MB-MSI-B760-D4', 5),
             ('HCM-01', 'RAM-CORSAIR-16G-D4', 25),
             ('HCM-01', 'GPU-ASUS-4080S-16G', 2),
             ('HCM-01', 'CASE-CORSAIR-4000D', 7),
             ('HCM-01', 'CASE-MSI-M100R', 1),
             ('HCM-01', 'PSU-MSI-A500DN', 12),
             ('HCM-01', 'COOLER-CORSAIR-H100I', 4),
             ('HCM-01', 'STORAGE-KINGSTON-NV2-1T', 30),
             ('HN-01', 'CPU-I5-14600K', 6),
             ('HN-01', 'GPU-MSI-4070S-12G', 3),
             ('HN-01', 'PSU-CORSAIR-RM750E', 5),
             ('HN-01', 'STORAGE-KINGSTON-NV2-1T', 10)) AS s(warehouse_code, sku, qty)
JOIN warehouses w ON w.code = s.warehouse_code;

INSERT INTO stock_movements (sku, warehouse_id, type, quantity, quantity_after, reference_type, reference_code,
                             note, created_at)
SELECT i.sku, i.warehouse_id, 1, i.quantity, i.quantity, 'IMPORT', 'PN-SEED-0001', 'Nhập kho ban đầu (seed)',
       now() - INTERVAL '7 days'
FROM inventories i
WHERE i.quantity > 0;
