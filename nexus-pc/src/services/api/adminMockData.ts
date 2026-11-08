/**
 * Dữ liệu giả cho khu quản trị, bám theo seed thật của catalog/inventory/ordering.
 * Khi ghép API: thay các hằng số này bằng gọi API tương ứng (ghi ở comment từng khối).
 */
import dayjs from 'dayjs';
import {
  AdminBrand,
  AdminCategory,
  AdminOrder,
  AdminOrderItem,
  AdminOrderStatusHistory,
  AdminPayment,
  AdminProduct,
  AdminRefund,
  AdminReview,
  AdminSessionUser,
  AdminUser,
  AdminVoucher,
  CompatibilityRule,
  Inventory,
  OrderStatus,
  StatsOverview,
  StockMovement,
  TopProduct,
  Warehouse,
} from '../../types/admin';

const daysAgo = (n: number, hour = 9) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, (n * 17) % 60, 0, 0);
  return d.toISOString();
};

// ---------- phiên đăng nhập (sau này lấy từ token Keycloak) ----------

export const mockSessionUsers: AdminSessionUser[] = [
  {
    id: '99999999-9999-9999-9999-999999999999',
    username: 'admin1',
    fullName: 'Quản trị viên',
    realmRoles: ['ADMIN', 'STAFF'],
    permissions: ['product:write', 'order:update-status', 'inventory:write', 'knowledge:write'],
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    username: 'staff1',
    fullName: 'Nhân viên Một',
    realmRoles: ['STAFF'],
    permissions: ['order:update-status', 'inventory:write'],
  },
];

// ---------- catalog: GET /admin/categories, /admin/brands, /admin/compatibility-rules ----------

export const mockCategories: AdminCategory[] = [
  {
    id: 'c1', code: 'CPU', name: 'Bộ vi xử lý', slug: 'cpu', pcSlot: 'CPU', sortOrder: 1, isActive: 1, updatedAt: daysAgo(12),
    specSchema: [
      { key: 'socket', label: 'Socket', group: 'compat', type: 'string', required: true, unit: null, options: ['LGA1700', 'LGA1851', 'AM4', 'AM5'] },
      { key: 'memory_types', label: 'Chuẩn RAM hỗ trợ', group: 'compat', type: 'string_list', required: true, unit: null, options: ['DDR4', 'DDR5'] },
      { key: 'tdp_w', label: 'TDP', group: 'compat', type: 'integer', required: true, unit: 'W', options: null },
      { key: 'cores', label: 'Số nhân', group: 'specs', type: 'integer', required: false, unit: null, options: null },
      { key: 'threads', label: 'Số luồng', group: 'specs', type: 'integer', required: false, unit: null, options: null },
      { key: 'base_clock_ghz', label: 'Xung cơ bản', group: 'specs', type: 'decimal', required: false, unit: 'GHz', options: null },
      { key: 'boost_clock_ghz', label: 'Xung tối đa', group: 'specs', type: 'decimal', required: false, unit: 'GHz', options: null },
      { key: 'cache_mb', label: 'Bộ nhớ đệm', group: 'specs', type: 'integer', required: false, unit: 'MB', options: null },
    ],
  },
  {
    id: 'c2', code: 'MAINBOARD', name: 'Bo mạch chủ', slug: 'mainboard', pcSlot: 'MAINBOARD', sortOrder: 2, isActive: 1, updatedAt: daysAgo(12),
    specSchema: [
      { key: 'socket', label: 'Socket', group: 'compat', type: 'string', required: true, unit: null, options: ['LGA1700', 'LGA1851', 'AM4', 'AM5'] },
      { key: 'memory_type', label: 'Chuẩn RAM', group: 'compat', type: 'string', required: true, unit: null, options: ['DDR4', 'DDR5'] },
      { key: 'form_factor', label: 'Kích thước', group: 'compat', type: 'string', required: true, unit: null, options: ['E-ATX', 'ATX', 'mATX', 'ITX'] },
      { key: 'ram_slots', label: 'Số khe RAM', group: 'compat', type: 'integer', required: true, unit: null, options: null },
      { key: 'm2_slots', label: 'Số khe M.2', group: 'compat', type: 'integer', required: false, unit: null, options: null },
      { key: 'chipset', label: 'Chipset', group: 'specs', type: 'string', required: false, unit: null, options: null },
    ],
  },
  {
    id: 'c3', code: 'RAM', name: 'RAM', slug: 'ram', pcSlot: 'RAM', sortOrder: 3, isActive: 1, updatedAt: daysAgo(12),
    specSchema: [
      { key: 'memory_type', label: 'Chuẩn RAM', group: 'compat', type: 'string', required: true, unit: null, options: ['DDR4', 'DDR5'] },
      { key: 'modules', label: 'Số thanh', group: 'compat', type: 'integer', required: true, unit: null, options: null },
      { key: 'capacity_gb', label: 'Dung lượng', group: 'specs', type: 'integer', required: false, unit: 'GB', options: null },
      { key: 'speed_mhz', label: 'Bus', group: 'specs', type: 'integer', required: false, unit: 'MHz', options: null },
    ],
  },
  {
    id: 'c4', code: 'GPU', name: 'Card đồ họa', slug: 'vga', pcSlot: 'GPU', sortOrder: 4, isActive: 1, updatedAt: daysAgo(12),
    specSchema: [
      { key: 'length_mm', label: 'Chiều dài', group: 'compat', type: 'integer', required: true, unit: 'mm', options: null },
      { key: 'tdp_w', label: 'TDP', group: 'compat', type: 'integer', required: true, unit: 'W', options: null },
      { key: 'recommended_psu_w', label: 'Nguồn đề nghị', group: 'compat', type: 'integer', required: false, unit: 'W', options: null },
      { key: 'vram_gb', label: 'VRAM', group: 'specs', type: 'integer', required: false, unit: 'GB', options: null },
      { key: 'memory_type', label: 'Loại bộ nhớ', group: 'specs', type: 'string', required: false, unit: null, options: ['GDDR6', 'GDDR6X', 'GDDR7'] },
    ],
  },
  {
    id: 'c5', code: 'STORAGE', name: 'Ổ cứng', slug: 'o-cung', pcSlot: 'STORAGE', sortOrder: 5, isActive: 1, updatedAt: daysAgo(12),
    specSchema: [
      { key: 'interface', label: 'Chuẩn kết nối', group: 'compat', type: 'string', required: true, unit: null, options: ['SATA', 'NVMe'] },
      { key: 'form_factor', label: 'Kích thước', group: 'compat', type: 'string', required: false, unit: null, options: ['2.5 inch', 'M.2 2280'] },
      { key: 'capacity_gb', label: 'Dung lượng', group: 'specs', type: 'integer', required: false, unit: 'GB', options: null },
      { key: 'read_mbps', label: 'Tốc độ đọc', group: 'specs', type: 'integer', required: false, unit: 'MB/s', options: null },
    ],
  },
  {
    id: 'c6', code: 'PSU', name: 'Nguồn', slug: 'nguon', pcSlot: 'PSU', sortOrder: 6, isActive: 1, updatedAt: daysAgo(12),
    specSchema: [
      { key: 'wattage', label: 'Công suất', group: 'compat', type: 'integer', required: true, unit: 'W', options: null },
      { key: 'form_factor', label: 'Chuẩn nguồn', group: 'compat', type: 'string', required: true, unit: null, options: ['ATX', 'SFX'] },
      { key: 'efficiency', label: 'Chứng nhận hiệu suất', group: 'specs', type: 'string', required: false, unit: null, options: ['80 Plus', '80 Plus Bronze', '80 Plus Gold', '80 Plus Platinum', '80 Plus Titanium'] },
      { key: 'modular', label: 'Kiểu dây', group: 'specs', type: 'string', required: false, unit: null, options: ['none', 'semi', 'full'] },
    ],
  },
  {
    id: 'c7', code: 'CASE', name: 'Vỏ case', slug: 'case', pcSlot: 'CASE', sortOrder: 7, isActive: 1, updatedAt: daysAgo(12),
    specSchema: [
      { key: 'supported_form_factors', label: 'Mainboard hỗ trợ', group: 'compat', type: 'string_list', required: true, unit: null, options: ['E-ATX', 'ATX', 'mATX', 'ITX'] },
      { key: 'max_gpu_length_mm', label: 'VGA dài tối đa', group: 'compat', type: 'integer', required: true, unit: 'mm', options: null },
      { key: 'max_cooler_height_mm', label: 'Tản nhiệt cao tối đa', group: 'compat', type: 'integer', required: true, unit: 'mm', options: null },
      { key: 'type', label: 'Kiểu case', group: 'specs', type: 'string', required: false, unit: null, options: null },
      { key: 'color', label: 'Màu', group: 'specs', type: 'string', required: false, unit: null, options: null },
    ],
  },
  {
    id: 'c8', code: 'COOLER', name: 'Tản nhiệt', slug: 'tan-nhiet', pcSlot: 'COOLER', sortOrder: 8, isActive: 1, updatedAt: daysAgo(12),
    specSchema: [
      { key: 'supported_sockets', label: 'Socket hỗ trợ', group: 'compat', type: 'string_list', required: true, unit: null, options: ['LGA1700', 'LGA1851', 'AM4', 'AM5'] },
      { key: 'height_mm', label: 'Chiều cao', group: 'compat', type: 'integer', required: false, unit: 'mm', options: null },
      { key: 'tdp_w', label: 'TDP tản được', group: 'compat', type: 'integer', required: false, unit: 'W', options: null },
      { key: 'type', label: 'Loại tản', group: 'specs', type: 'string', required: false, unit: null, options: ['Air', 'AIO'] },
      { key: 'radiator_mm', label: 'Kích thước rad', group: 'specs', type: 'integer', required: false, unit: 'mm', options: null },
    ],
  },
  // danh mục tạo qua API: chưa có spec_schema
  { id: 'c9', code: 'MONITOR', name: 'Màn hình', slug: 'man-hinh', pcSlot: null, sortOrder: 9, isActive: 0, specSchema: null, updatedAt: daysAgo(3) },
];

export const mockBrands: AdminBrand[] = [
  { id: 'b1', code: 'INTEL', name: 'Intel', slug: 'intel', logoUrl: null, isActive: 1, updatedAt: daysAgo(20) },
  { id: 'b2', code: 'AMD', name: 'AMD', slug: 'amd', logoUrl: null, isActive: 1, updatedAt: daysAgo(20) },
  { id: 'b3', code: 'ASUS', name: 'ASUS', slug: 'asus', logoUrl: null, isActive: 1, updatedAt: daysAgo(20) },
  { id: 'b4', code: 'MSI', name: 'MSI', slug: 'msi', logoUrl: null, isActive: 1, updatedAt: daysAgo(20) },
  { id: 'b5', code: 'GIGABYTE', name: 'Gigabyte', slug: 'gigabyte', logoUrl: null, isActive: 1, updatedAt: daysAgo(20) },
  { id: 'b6', code: 'CORSAIR', name: 'Corsair', slug: 'corsair', logoUrl: null, isActive: 1, updatedAt: daysAgo(20) },
  { id: 'b7', code: 'KINGSTON', name: 'Kingston', slug: 'kingston', logoUrl: null, isActive: 1, updatedAt: daysAgo(20) },
  { id: 'b8', code: 'NZXT', name: 'NZXT', slug: 'nzxt', logoUrl: null, isActive: 0, updatedAt: daysAgo(4) },
];

export const mockRules: CompatibilityRule[] = [
  {
    id: 'r1', code: 'CPU_MB_SOCKET', name: 'Socket CPU khớp mainboard', sourceCategory: 'CPU', targetCategory: 'MAINBOARD',
    ruleType: 'EQUALS', sourceField: 'socket', targetField: 'socket', margin: null, severity: 1, isActive: 1,
    messageTemplate: 'CPU {source} dùng socket {sv} không khớp mainboard {target} ({tv})',
  },
  {
    id: 'r2', code: 'RAM_MB_TYPE', name: 'Chuẩn RAM khớp mainboard', sourceCategory: 'RAM', targetCategory: 'MAINBOARD',
    ruleType: 'EQUALS', sourceField: 'memory_type', targetField: 'memory_type', margin: null, severity: 1, isActive: 1,
    messageTemplate: 'RAM {source} là {sv} nhưng mainboard {target} hỗ trợ {tv}',
  },
  {
    id: 'r3', code: 'PSU_WATTAGE', name: 'Công suất nguồn đủ cho cấu hình', sourceCategory: '*', targetCategory: 'PSU',
    ruleType: 'SUM_TDP_LTE_WATTAGE', sourceField: 'tdp_w', targetField: 'wattage', margin: 1.2, severity: 1, isActive: 1,
    messageTemplate: 'Tổng công suất ước tính {sv}W vượt khả năng nguồn {target} ({tv}W, đã tính hệ số an toàn)',
  },
  {
    id: 'r4', code: 'GPU_CASE_LENGTH', name: 'Chiều dài VGA vừa case', sourceCategory: 'GPU', targetCategory: 'CASE',
    ruleType: 'LTE', sourceField: 'length_mm', targetField: 'max_gpu_length_mm', margin: null, severity: 1, isActive: 1,
    messageTemplate: 'VGA {source} dài {sv}mm, case {target} chỉ chứa tối đa {tv}mm',
  },
  {
    id: 'r5', code: 'MB_CASE_FORM_FACTOR', name: 'Kích thước mainboard vừa case', sourceCategory: 'MAINBOARD', targetCategory: 'CASE',
    ruleType: 'IN', sourceField: 'form_factor', targetField: 'supported_form_factors', margin: null, severity: 1, isActive: 1,
    messageTemplate: 'Mainboard {source} chuẩn {sv}, case {target} chỉ hỗ trợ {tv}',
  },
  {
    id: 'r6', code: 'COOLER_CASE_HEIGHT', name: 'Chiều cao tản vừa case', sourceCategory: 'COOLER', targetCategory: 'CASE',
    ruleType: 'LTE', sourceField: 'height_mm', targetField: 'max_cooler_height_mm', margin: null, severity: 2, isActive: 0,
    messageTemplate: 'Tản {source} cao {sv}mm, case {target} chỉ chứa {tv}mm',
  },
];

// ---------- sản phẩm: GET /admin/products ----------

const img = (id: string) => [{ fileId: null, url: `https://images.unsplash.com/${id}?w=300&q=70`, isPrimary: true }];

const p = (
  sku: string, name: string, categoryCode: string, brandCode: string, price: number, originalPrice: number | null,
  status: AdminProduct['status'], compat: AdminProduct['compat'], specs: AdminProduct['specs'], soldCount: number, updated: number,
  image: string,
): AdminProduct => ({
  id: sku.toLowerCase(),
  sku,
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
  categoryCode,
  brandCode,
  shortDescription: null,
  description: null,
  price,
  originalPrice,
  images: img(image),
  specs,
  compat,
  tags: null,
  warrantyMonths: 36,
  status,
  soldCount,
  updatedAt: daysAgo(updated),
});

export const mockProducts: AdminProduct[] = [
  p('CPU-I5-14600K', 'Intel Core i5-14600K', 'CPU', 'INTEL', 7990000, 8790000, 2, { socket: 'LGA1700', memory_types: ['DDR4', 'DDR5'], tdp_w: 125 }, { cores: 14, threads: 20, boost_clock_ghz: 5.3 }, 42, 1, 'photo-1555617981-dac3880eac6e'),
  p('CPU-R5-7600X', 'AMD Ryzen 5 7600X', 'CPU', 'AMD', 5490000, null, 2, { socket: 'AM5', memory_types: ['DDR5'], tdp_w: 105 }, { cores: 6, threads: 12 }, 31, 2, 'photo-1591799264318-7e6ef8ddb7ea'),
  p('MB-ASUS-B760M-D5', 'ASUS TUF B760M-PLUS WIFI DDR5', 'MAINBOARD', 'ASUS', 4290000, null, 2, { socket: 'LGA1700', memory_type: 'DDR5', form_factor: 'mATX', ram_slots: 4, m2_slots: 2 }, { chipset: 'B760' }, 25, 3, 'photo-1518770660439-4636190af475'),
  p('MB-GIGABYTE-B650M-D5', 'Gigabyte B650M GAMING X AX DDR5', 'MAINBOARD', 'GIGABYTE', 3990000, null, 2, { socket: 'AM5', memory_type: 'DDR5', form_factor: 'mATX', ram_slots: 4, m2_slots: 2 }, { chipset: 'B650' }, 18, 5, 'photo-1562976540-1502c2145186'),
  p('MB-MSI-B760-D4', 'MSI PRO B760-P DDR4', 'MAINBOARD', 'MSI', 3590000, null, 3, { socket: 'LGA1700', memory_type: 'DDR4', form_factor: 'ATX', ram_slots: 4, m2_slots: 2 }, { chipset: 'B760' }, 7, 6, 'photo-1518770660439-4636190af475'),
  p('RAM-KINGSTON-32G-D5', 'Kingston Fury Beast 32GB (2x16GB) DDR5 6000', 'RAM', 'KINGSTON', 2790000, 3190000, 2, { memory_type: 'DDR5', modules: 2 }, { capacity_gb: 32, speed_mhz: 6000 }, 64, 1, 'photo-1562976540-1502c2145186'),
  p('RAM-CORSAIR-16G-D4', 'Corsair Vengeance LPX 16GB (2x8GB) DDR4 3200', 'RAM', 'CORSAIR', 1190000, null, 4, { memory_type: 'DDR4', modules: 2 }, { capacity_gb: 16, speed_mhz: 3200 }, 12, 9, 'photo-1541029071515-84cc54f84dc5'),
  p('GPU-MSI-4070S-12G', 'MSI GeForce RTX 4070 SUPER 12GB Ventus 2X', 'GPU', 'MSI', 16990000, 17200000, 2, { length_mm: 242, tdp_w: 220, recommended_psu_w: 650 }, { vram_gb: 12, memory_type: 'GDDR6X' }, 22, 2, 'photo-1591488320449-011701bb6704'),
  p('GPU-ASUS-4080S-16G', 'ASUS TUF Gaming GeForce RTX 4080 SUPER 16GB', 'GPU', 'ASUS', 32990000, null, 2, { length_mm: 348, tdp_w: 320, recommended_psu_w: 850 }, { vram_gb: 16, memory_type: 'GDDR6X' }, 9, 4, 'photo-1587202372775-e229f172b9d7'),
  p('GPU-GIGABYTE-5070-12G', 'Gigabyte GeForce RTX 5070 WINDFORCE 12GB', 'GPU', 'GIGABYTE', 18990000, null, 1, { length_mm: 261, tdp_w: 250 }, { vram_gb: 12, memory_type: 'GDDR7' }, 0, 0, 'photo-1591488320449-011701bb6704'),
  p('STORAGE-KINGSTON-NV2-1T', 'Kingston NV2 1TB M.2 NVMe PCIe 4.0', 'STORAGE', 'KINGSTON', 1590000, null, 2, { interface: 'NVMe', form_factor: 'M.2 2280' }, { capacity_gb: 1000, read_mbps: 3500 }, 48, 7, 'photo-1597872200969-2b65d56bd16b'),
  p('PSU-CORSAIR-RM750E', 'Corsair RM750e 750W 80 Plus Gold', 'PSU', 'CORSAIR', 2690000, null, 2, { wattage: 750, form_factor: 'ATX' }, { efficiency: '80 Plus Gold', modular: 'full' }, 15, 8, 'photo-1587202372634-32705e3bf49c'),
  p('PSU-MSI-A500DN', 'MSI MAG A500DN 500W 80 Plus', 'PSU', 'MSI', 990000, null, 2, { wattage: 500, form_factor: 'ATX' }, { efficiency: '80 Plus', modular: 'none' }, 20, 10, 'photo-1587202372634-32705e3bf49c'),
  p('CASE-CORSAIR-4000D', 'Corsair 4000D Airflow', 'CASE', 'CORSAIR', 2290000, null, 2, { supported_form_factors: ['ATX', 'mATX', 'ITX'], max_gpu_length_mm: 360, max_cooler_height_mm: 170 }, { type: 'Mid Tower', color: 'Đen' }, 13, 11, 'photo-1587202372583-49330a15584d'),
  p('CASE-MSI-M100R', 'MSI MAG Forge M100R', 'CASE', 'MSI', 1090000, null, 2, { supported_form_factors: ['mATX', 'ITX'], max_gpu_length_mm: 330, max_cooler_height_mm: 160 }, { type: 'Mini Tower', color: 'Đen' }, 10, 11, 'photo-1587202372583-49330a15584d'),
  p('COOLER-CORSAIR-H100I', 'Corsair iCUE H100i RGB Elite 240mm', 'COOLER', 'CORSAIR', 3290000, null, 2, { supported_sockets: ['LGA1700', 'AM5', 'AM4'], height_mm: 52, tdp_w: 250 }, { type: 'AIO', radiator_mm: 240 }, 8, 13, 'photo-1600348759200-5b94753c5a4b'),
];

// ---------- kho: GET /warehouses, /admin/inventory, /admin/inventory/movements ----------

export const mockWarehouses: Warehouse[] = [
  { id: 1, code: 'HCM-01', name: 'Kho Hồ Chí Minh', address: 'TP. Hồ Chí Minh', isActive: 1 },
  { id: 2, code: 'HN-01', name: 'Kho Hà Nội', address: 'Hà Nội', isActive: 1 },
  { id: 3, code: 'DN-01', name: 'Kho Đà Nẵng', address: 'Đà Nẵng', isActive: 0 },
];

const stockPlan: Array<[string, number, number, number, number]> = [
  // sku, warehouseId, quantity, reserved, min
  ['CPU-I5-14600K', 1, 15, 2, 2],
  ['CPU-I5-14600K', 2, 6, 0, 2],
  ['CPU-R5-7600X', 1, 9, 1, 2],
  ['MB-ASUS-B760M-D5', 1, 8, 1, 2],
  ['MB-GIGABYTE-B650M-D5', 2, 3, 1, 2],
  ['MB-MSI-B760-D4', 1, 2, 0, 2],
  ['RAM-KINGSTON-32G-D5', 1, 20, 3, 4],
  ['RAM-KINGSTON-32G-D5', 2, 12, 0, 4],
  ['RAM-CORSAIR-16G-D4', 1, 1, 0, 2],
  ['GPU-MSI-4070S-12G', 1, 4, 1, 2],
  ['GPU-ASUS-4080S-16G', 1, 2, 2, 1],
  ['STORAGE-KINGSTON-NV2-1T', 1, 30, 2, 5],
  ['PSU-CORSAIR-RM750E', 1, 0, 0, 2],
  ['PSU-MSI-A500DN', 2, 11, 0, 3],
  ['CASE-CORSAIR-4000D', 1, 6, 0, 2],
  ['CASE-MSI-M100R', 2, 5, 1, 2],
  ['COOLER-CORSAIR-H100I', 1, 3, 0, 2],
];

export const mockInventories: Inventory[] = stockPlan.map(([sku, warehouseId, quantity, reservedQuantity, minQuantity], i) => ({
  id: i + 1,
  sku,
  warehouseId,
  quantity,
  reservedQuantity,
  minQuantity,
  version: 1,
}));

export const mockMovements: StockMovement[] = [
  { id: 1, sku: 'CPU-I5-14600K', warehouseId: 1, type: 1, quantity: 20, quantityAfter: 20, referenceType: 'IMPORT', referenceCode: 'PN-20261020-01', note: 'Nhập lô tháng 10', createdBy: 'staff1', createdAt: daysAgo(18) },
  { id: 2, sku: 'CPU-I5-14600K', warehouseId: 1, type: 2, quantity: -3, quantityAfter: 17, referenceType: 'ORDER', referenceCode: 'DH20261024000002', note: null, createdBy: null, createdAt: daysAgo(14) },
  { id: 3, sku: 'CPU-I5-14600K', warehouseId: 1, type: 4, quantity: -2, quantityAfter: 15, referenceType: 'ADJUST', referenceCode: null, note: 'Kiểm kê lệch 2 hộp', createdBy: 'staff1', createdAt: daysAgo(6) },
  { id: 4, sku: 'RAM-KINGSTON-32G-D5', warehouseId: 1, type: 1, quantity: 25, quantityAfter: 25, referenceType: 'IMPORT', referenceCode: 'PN-20261020-01', note: null, createdBy: 'staff1', createdAt: daysAgo(18) },
  { id: 5, sku: 'RAM-KINGSTON-32G-D5', warehouseId: 1, type: 2, quantity: -5, quantityAfter: 20, referenceType: 'ORDER', referenceCode: 'DH20261101000011', note: null, createdBy: null, createdAt: daysAgo(5) },
  { id: 6, sku: 'GPU-MSI-4070S-12G', warehouseId: 1, type: 1, quantity: 6, quantityAfter: 6, referenceType: 'IMPORT', referenceCode: 'PN-20261025-02', note: null, createdBy: 'admin1', createdAt: daysAgo(13) },
  { id: 7, sku: 'GPU-MSI-4070S-12G', warehouseId: 1, type: 2, quantity: -3, quantityAfter: 3, referenceType: 'ORDER', referenceCode: 'DH20261103000015', note: null, createdBy: null, createdAt: daysAgo(4) },
  { id: 8, sku: 'GPU-MSI-4070S-12G', warehouseId: 1, type: 3, quantity: 1, quantityAfter: 4, referenceType: 'RETURN', referenceCode: 'DH20261103000015', note: 'Khách trả hàng', createdBy: 'staff1', createdAt: daysAgo(2) },
  { id: 9, sku: 'PSU-CORSAIR-RM750E', warehouseId: 1, type: 2, quantity: -4, quantityAfter: 0, referenceType: 'ORDER', referenceCode: 'DH20261104000018', note: null, createdBy: null, createdAt: daysAgo(3) },
];

// ---------- đơn hàng: GET /admin/orders, /admin/orders/{code}, /orders/{code}/timeline ----------

const customers = [
  { userId: '11111111-1111-1111-1111-111111111111', name: 'Khách Một', phone: '0900000001', address: '1 Lê Lợi, Phường Bến Thành, TP. Hồ Chí Minh' },
  { userId: '22222222-2222-2222-2222-222222222222', name: 'Khách Hai', phone: '0900000002', address: '2 Tràng Tiền, Phường Hoàn Kiếm, Hà Nội' },
  { userId: '44444444-4444-4444-4444-444444444444', name: 'Trần Minh Quân', phone: '0912345678', address: '45 Nguyễn Văn Linh, Phường Hải Châu, Đà Nẵng' },
  { userId: '55555555-5555-5555-5555-555555555555', name: 'Lê Thu Hà', phone: '0987654321', address: '12 Võ Văn Ngân, Phường Thủ Đức, TP. Hồ Chí Minh' },
];

/** Số ngẫu nhiên có seed: dữ liệu giả giống nhau mỗi lần tải trang */
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const rand = seeded(20261107);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

/**
 * Đường đi trạng thái theo tuổi đơn (luồng hợp lệ g.2): đơn mới còn đang xử lý, đơn cũ phần lớn đã xong.
 * 1 Đang giữ hàng chỉ kéo dài vài giây (Saga) nên không có đơn nào dừng ở 1.
 */
const DONE: OrderStatus[] = [1, 4, 5, 6];
const DONE_PAID: OrderStatus[] = [1, 2, 3, 4, 5, 6];
const RECENT_PATHS: OrderStatus[][] = [[1, 4], [1, 4], [1, 2], [1, 2], [1, 4], [1, 2, 3], [1, 2, 3], [1, 7]];
const MIDDLE_PATHS: OrderStatus[][] = [[1, 4], [1, 4, 5], [1, 4, 5], [1, 2, 3, 4, 5], DONE, DONE, DONE_PAID, [1, 2, 7], [1, 2, 3, 7]];
// khoảng 1/12 đơn cũ bị hủy, 1/24 trả hàng
const OLD_PATHS: OrderStatus[][] = [
  ...Array.from({ length: 13 }, () => DONE),
  ...Array.from({ length: 8 }, () => DONE_PAID),
  [1, 4, 7], [1, 2, 7], [1, 4, 5, 6, 8],
];

/** Bước do hệ thống làm (createdBy = null): Saga giữ hàng 1 → 2/4/7, cổng thanh toán 2 → 3, hủy quá hạn 2 → 7 */
const bySystem = (from: OrderStatus | null, to: OrderStatus) => from === 1 || (from === 2 && (to === 3 || to === 7));

/** Lý do giống backend ghi vào order_status_histories */
const reasonFor = (from: OrderStatus | null, to: OrderStatus, code: string, sku: string): string | null => {
  if (from === null) return 'Đặt hàng';
  if (from === 1 && to === 4) return 'Đã giữ hàng, chờ giao';
  if (from === 1 && to === 2) return 'Đã giữ hàng, chờ thanh toán';
  if (from === 1 && to === 7) return `Không đủ hàng: ${sku} (cần 1, còn 0)`;
  if (from === 2 && to === 3) return `Thanh toán thành công (${code}-01)`;
  if (from === 2 && to === 7) return 'Quá hạn thanh toán';
  if (to === 7) return 'Khách đổi ý, gọi điện xin hủy';
  if (to === 8) return 'Sản phẩm lỗi khi nhận, khách trả lại';
  return null;
};

/** Phí ship như ordering-service: miễn phí từ 5 triệu, tỉnh có kho (HCM, Hà Nội) 20.000, còn lại 40.000 */
const shippingFor = (amount: number, address: string) =>
  amount >= 5000000 ? 0 : /Hồ Chí Minh|Hà Nội/.test(address) ? 20000 : 40000;

/** Sản phẩm từng được bán (bỏ bản nháp) */
const sellable = mockProducts.filter((p) => p.status !== 1);

export const mockOrderItems: AdminOrderItem[] = [];
export const mockOrderHistories: AdminOrderStatusHistory[] = [];
/** GET /payments/{orderCode} của mọi đơn */
export const mockPayments: AdminPayment[] = [];
/** GET /admin/refunds */
export const mockRefunds: AdminRefund[] = [];

/** ~150 đơn trong 90 ngày, cuối tuần đông hơn; id tăng dần theo thời gian */
const orderDays = Array.from({ length: 90 }, (_, d) => d)
  .flatMap((d) => {
    const weekday = new Date(daysAgo(d)).getDay();
    const base = weekday === 0 || weekday === 6 ? 2.6 : 1.4;
    const count = Math.floor(base + rand() * 1.8);
    return Array.from({ length: count }, () => d);
  })
  .sort((a, b) => b - a);

export const mockOrders: AdminOrder[] = orderDays.map((created, i) => {
  const id = i + 1;
  const c = pick(customers);
  const path = pick(created <= 3 ? RECENT_PATHS : created <= 8 ? MIDDLE_PATHS : OLD_PATHS);
  const hour = 8 + Math.floor(rand() * 13);

  const lineCount = 1 + Math.floor(rand() * 3);
  const chosen = new Set<AdminProduct>();
  while (chosen.size < lineCount) chosen.add(pick(sellable));
  const items = [...chosen].map((prod, j) => {
    const quantity = prod.categoryCode === 'RAM' || prod.categoryCode === 'STORAGE' ? 1 + Math.floor(rand() * 2) : 1;
    return {
      id: id * 10 + j,
      orderId: id,
      sku: prod.sku,
      productName: prod.name,
      productImageUrl: prod.images?.[0]?.url ?? null,
      categoryCode: prod.categoryCode,
      unitPrice: prod.price,
      quantity,
      discountAmount: 0,
      lineTotal: prod.price * quantity,
      warrantyMonths: prod.warrantyMonths,
    };
  });
  mockOrderItems.push(...items);

  const placedAt = daysAgo(created, hour);
  // DH + ngày đặt (yyyyMMdd) + số thứ tự, giống ordering-service
  const code = `DH${dayjs(placedAt).format('YYYYMMDD')}${String(id).padStart(6, '0')}`;
  // Saga giữ hàng (1 → x) xong sau vài giây, thanh toán / hủy quá hạn (2 → 3/7) trong 15 phút; các bước sau tính theo ngày
  const stepAt = (j: number) => {
    const from = j === 0 ? null : path[j - 1];
    if (from === 1) return dayjs(placedAt).add(2, 'second').toISOString();
    if (from === 2) return dayjs(placedAt).add(path[j] === 7 ? 15 : 4, 'minute').toISOString();
    return j === 0 ? placedAt : daysAgo(Math.max(created - j, 0), Math.min(hour + j * 2, 22));
  };

  path.forEach((status, j) => {
    const from = j === 0 ? null : path[j - 1];
    mockOrderHistories.push({
      id: id * 10 + j,
      orderId: id,
      fromStatus: from,
      toStatus: status,
      reason: reasonFor(from, status, code, items[0].sku),
      createdBy: j === 0 ? c.userId : bySystem(from, status) ? null : mockSessionUsers[1].id,
      createdAt: stepAt(j),
    });
  });

  const subtotal = items.reduce((s, it) => s + it.lineTotal, 0);
  const discount = rand() < 0.2 ? Math.min(Math.round(subtotal * 0.1), 500000) : 0;
  const shipping = shippingFor(subtotal - discount, c.address);
  const status = path[path.length - 1];
  const paymentMethod = (path.includes(2) ? (rand() < 0.3 ? 3 : 2) : 1) as AdminOrder['paymentMethod'];
  const total = subtotal - discount + shipping;

  // Lần thanh toán: online đã trả → "<mã>-01" SUCCESS; quá hạn → "-01" EXPIRED; COD hoàn tất → "COD-<mã>"
  const paidIdx = path.indexOf(3);
  const doneIdx = path.indexOf(6);
  const payment = (paymentCode: string, st: AdminPayment['status'], at: string): AdminPayment => ({
    id: mockPayments.length + 1,
    orderId: id,
    paymentCode,
    method: paymentMethod,
    amount: total,
    status: st,
    providerTransactionId: st === 2 && paymentMethod !== 1 ? String(14000000 + id) : null,
    bankCode: st === 2 && paymentMethod === 2 ? 'NCB' : null,
    paidAt: st === 2 ? at : null,
    expiredAt: paymentMethod !== 1 ? dayjs(placedAt).add(15, 'minute').toISOString() : null,
    createdAt: at,
  });
  if (paidIdx >= 0) mockPayments.push(payment(`${code}-01`, 2, stepAt(paidIdx)));
  else if (path.join() === '1,2,7') mockPayments.push(payment(`${code}-01`, 4, stepAt(1)));
  else if (paymentMethod === 1 && doneIdx >= 0) mockPayments.push(payment(`COD-${code}`, 2, stepAt(doneIdx)));
  const paid = mockPayments.some((p) => p.orderId === id && p.status === 2);

  // Hủy / trả đơn đã thu tiền → yêu cầu hoàn tiền; đơn cũ đã hoàn xong, đơn mới còn chờ
  let refunded = false;
  if (paid && (status === 7 || status === 8)) {
    const p = mockPayments.filter((x) => x.orderId === id && x.status === 2).pop()!;
    refunded = created > 8;
    if (refunded) p.status = 5;
    mockRefunds.push({
      id: mockRefunds.length + 1,
      orderCode: code,
      paymentCode: p.paymentCode,
      method: p.method,
      amount: p.amount,
      reason: `${status === 7 ? 'Hủy đơn' : 'Trả hàng'}: ${reasonFor(path[path.length - 2], status, code, items[0].sku)}`,
      status: refunded ? 2 : 1,
      providerRefundId: refunded ? `RF${id}` : null,
      createdAt: stepAt(path.length - 1),
      updatedAt: refunded ? stepAt(path.length) : stepAt(path.length - 1),
    });
  }

  return {
    id,
    code,
    userId: c.userId,
    status,
    paymentMethod,
    paymentStatus: refunded ? 3 : paid ? 2 : 1,
    subtotalAmount: subtotal,
    discountAmount: discount,
    shippingFee: shipping,
    totalAmount: total,
    voucherCode: discount ? 'WELCOME10' : null,
    receiverName: c.name,
    receiverPhone: c.phone,
    shippingAddress: c.address,
    note: rand() < 0.2 ? 'Giao giờ hành chính' : null,
    cancelReason: status === 7 ? reasonFor(path[path.length - 2], 7, code, items[0].sku) : null,
    placedAt,
    completedAt: status === 6 ? daysAgo(Math.max(created - path.length + 1, 0), hour) : null,
    createdAt: placedAt,
  };
});

// ---------- thống kê: GET /admin/stats/overview, /admin/stats/top-products ----------
// Nhận danh sách đơn từ AdminDataContext để thao tác ở trang đơn hàng phản ánh ngay lên tổng quan.

/** Ngày đặt theo giờ máy (yyyy-MM-dd), so sánh được với from/to */
const orderDate = (o: AdminOrder) => dayjs(o.createdAt).format('YYYY-MM-DD');
const inRange = (o: AdminOrder, from: string, to: string) => {
  const d = orderDate(o);
  return d >= from && d <= to;
};
/** Đơn tính doanh thu gộp: trừ hủy (7) và trả hàng (8) */
const counted = (o: AdminOrder) => o.status !== 7 && o.status !== 8;

export const buildStatsOverview = (orders: AdminOrder[], from: string, to: string): StatsOverview => {
  const rows = orders.filter((o) => inRange(o, from, to));
  const ordersByStatus: StatsOverview['ordersByStatus'] = {};
  rows.forEach((o) => {
    const k = String(o.status) as `${OrderStatus}`;
    ordersByStatus[k] = (ordersByStatus[k] ?? 0) + 1;
  });
  return {
    from,
    to,
    totalOrders: rows.length,
    revenue: rows.filter((o) => o.status === 6).reduce((s, o) => s + o.totalAmount, 0),
    grossRevenue: rows.filter(counted).reduce((s, o) => s + o.totalAmount, 0),
    ordersByStatus,
  };
};

export const buildTopProducts = (orders: AdminOrder[], from: string, to: string, limit = 10): TopProduct[] => {
  const orderIds = new Set(orders.filter((o) => counted(o) && inRange(o, from, to)).map((o) => o.id));
  const bySku = new Map<string, TopProduct>();
  mockOrderItems
    .filter((it) => orderIds.has(it.orderId))
    .forEach((it) => {
      const row = bySku.get(it.sku) ?? { sku: it.sku, productName: it.productName, quantity: 0, revenue: 0 };
      row.quantity += it.quantity;
      row.revenue += it.lineTotal;
      bySku.set(it.sku, row);
    });
  return [...bySku.values()].sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue).slice(0, limit);
};

/** Một điểm của biểu đồ theo ngày. Backend CHƯA có API này (cần thêm, vd GET /admin/stats/daily?from=&to=). */
export interface DailyStat {
  date: string;
  orders: number;
  /** doanh thu gộp (trừ hủy, trả) */
  revenue: number;
}

export const buildDailyStats = (orders: AdminOrder[], from: string, to: string): DailyStat[] => {
  const byDate = new Map<string, DailyStat>();
  // đủ mọi ngày trong khoảng, ngày không có đơn vẫn có điểm 0
  for (let d = dayjs(from); !d.isAfter(dayjs(to), 'day'); d = d.add(1, 'day')) {
    const key = d.format('YYYY-MM-DD');
    byDate.set(key, { date: key, orders: 0, revenue: 0 });
  }
  orders.forEach((o) => {
    const row = byDate.get(orderDate(o));
    if (!row) return;
    row.orders += 1;
    if (counted(o)) row.revenue += o.totalAmount;
  });
  return [...byDate.values()];
};

/** Doanh thu theo danh mục (từ order_items). Backend CHƯA có API này. */
export const buildCategoryRevenue = (orders: AdminOrder[], from: string, to: string) => {
  const orderIds = new Set(orders.filter((o) => counted(o) && inRange(o, from, to)).map((o) => o.id));
  const byCat = new Map<string, number>();
  mockOrderItems
    .filter((it) => orderIds.has(it.orderId) && it.categoryCode)
    .forEach((it) => byCat.set(it.categoryCode!, (byCat.get(it.categoryCode!) ?? 0) + it.lineTotal));
  return [...byCat.entries()]
    .map(([categoryCode, revenue]) => ({ categoryCode, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
};

// ---------- voucher: GET /admin/vouchers ----------

export const mockVouchers: AdminVoucher[] = [
  { id: 1, code: 'WELCOME10', name: 'Giảm 10% cho đơn đầu tiên', type: 1, value: 10, maxDiscountAmount: 500000, minOrderAmount: 1000000, applicableCategories: [], usageLimit: 1000, usedCount: 214, perUserLimit: 1, startAt: daysAgo(60), endAt: daysAgo(-60), isActive: 1, version: 3 },
  { id: 2, code: 'FREESHIP', name: 'Miễn phí vận chuyển', type: 3, value: 0, maxDiscountAmount: null, minOrderAmount: 500000, applicableCategories: [], usageLimit: null, usedCount: 538, perUserLimit: null, startAt: null, endAt: null, isActive: 1, version: 1 },
  { id: 3, code: 'GPU500K', name: 'Giảm 500K khi mua card đồ họa', type: 2, value: 500000, maxDiscountAmount: null, minOrderAmount: 10000000, applicableCategories: ['GPU'], usageLimit: 200, usedCount: 187, perUserLimit: 1, startAt: daysAgo(20), endAt: daysAgo(-10), isActive: 1, version: 2 },
  { id: 4, code: 'BLACKFRIDAY', name: 'Black Friday giảm 15%', type: 1, value: 15, maxDiscountAmount: 2000000, minOrderAmount: 3000000, applicableCategories: [], usageLimit: 500, usedCount: 0, perUserLimit: 1, startAt: daysAgo(-20), endAt: daysAgo(-23), isActive: 1, version: 1 },
  { id: 5, code: 'BUILDPC', name: 'Giảm 1 triệu cho cấu hình trên 30 triệu', type: 2, value: 1000000, maxDiscountAmount: null, minOrderAmount: 30000000, applicableCategories: ['CPU', 'MAINBOARD', 'GPU'], usageLimit: 100, usedCount: 100, perUserLimit: 1, startAt: daysAgo(90), endAt: daysAgo(15), isActive: 0, version: 4 },
];

// ---------- đánh giá: GET /admin/reviews ----------

const reviewProducts = ['GPU-MSI-4070S-12G', 'CPU-I5-14600K', 'RAM-KINGSTON-32G-D5', 'MB-ASUS-B760M-D5', 'STORAGE-KINGSTON-NV2-1T', 'PSU-CORSAIR-RM750E'];
const reviewTexts: Array<[number, string, string]> = [
  [5, 'Chơi 2K mượt', 'Card chạy mát, chơi Cyberpunk 2K max setting tầm 90 fps. Đóng gói cẩn thận.'],
  [4, 'Ổn trong tầm giá', 'Hiệu năng tốt, hơi nóng khi render lâu, nên đi kèm tản tốt.'],
  [5, 'Lắp vừa main B760', 'Nhân viên tư vấn đúng, PC Builder báo tương thích chuẩn.'],
  [2, 'Giao hàng chậm', 'Hàng ổn nhưng giao trễ 3 ngày so với dự kiến, không ai báo trước.'],
  [1, 'Link mua giá rẻ hơn', 'Vào trang xyz-shop.vn mua rẻ hơn 30%!!!'],
  [5, 'Tốc độ đúng quảng cáo', 'Test CrystalDiskMark đọc 3.4GB/s, đúng thông số.'],
  [3, 'Quạt hơi ồn', 'Nguồn chạy ổn định nhưng tải nặng quạt kêu khá to.'],
  [4, 'Đáng tiền', 'Bus 6000 chạy EXPO ngay, không lỗi.'],
];

export const mockReviews: AdminReview[] = reviewTexts.map(([rating, title, content], i) => ({
  id: `66f0${String(i + 1).padStart(20, '0')}`,
  productId: reviewProducts[i % reviewProducts.length].toLowerCase(),
  sku: reviewProducts[i % reviewProducts.length],
  userId: customers[i % customers.length].userId,
  userDisplayName: ['customer1', 'customer2', 'quantm', 'thuha'][i % 4],
  orderCode: i % 3 === 0 ? mockOrders[i].code : null,
  rating,
  title,
  content,
  verifiedPurchase: false,
  status: ([1, 1, 1, 1, 1, 2, 3, 2] as const)[i],
  helpfulCount: (i * 3) % 7,
  adminReply:
    i === 5
      ? { content: 'Cảm ơn bạn đã tin tưởng NEXUS PC!', repliedBy: mockSessionUsers[1].id, repliedAt: daysAgo(1) }
      : null,
  createdAt: daysAgo(8 - i, 14),
}));

// ---------- người dùng: GET /admin/users ----------

export const mockUsers: AdminUser[] = [
  { id: '99999999-9999-9999-9999-999999999999', username: 'admin1', email: 'admin1@pcshop.local', fullName: 'Quản trị viên', active: true, phoneNumber: null, createdTimestamp: null, realmRoles: ['ADMIN', 'STAFF'], permissions: ['product:write', 'order:update-status', 'inventory:write', 'knowledge:write'] },
  { id: '33333333-3333-3333-3333-333333333333', username: 'staff1', email: 'staff1@pcshop.local', fullName: 'Nhân viên Một', active: true, phoneNumber: '0900000003', createdTimestamp: null, realmRoles: ['STAFF'], permissions: ['order:update-status', 'inventory:write'] },
  { id: '11111111-1111-1111-1111-111111111111', username: 'customer1', email: 'customer1@pcshop.local', fullName: 'Khách Một', active: true, phoneNumber: '0900000001', createdTimestamp: null, realmRoles: ['CUSTOMER'], permissions: [] },
  { id: '22222222-2222-2222-2222-222222222222', username: 'customer2', email: 'customer2@pcshop.local', fullName: 'Khách Hai', active: true, phoneNumber: '0900000002', createdTimestamp: null, realmRoles: ['CUSTOMER'], permissions: [] },
  { id: '44444444-4444-4444-4444-444444444444', username: 'quantm', email: 'quan.tm@gmail.com', fullName: 'Trần Minh Quân', active: true, phoneNumber: '0912345678', createdTimestamp: new Date(daysAgo(40)).getTime(), realmRoles: [], permissions: [] },
  { id: '55555555-5555-5555-5555-555555555555', username: 'thuha', email: 'thuha.le@gmail.com', fullName: 'Lê Thu Hà', active: false, phoneNumber: '0987654321', createdTimestamp: new Date(daysAgo(22)).getTime(), realmRoles: [], permissions: [] },
];
