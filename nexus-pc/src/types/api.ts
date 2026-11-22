/**
 * Kiểu request/response của backend (bản sao docs/ui/api-types.ts). Chỉ import dạng `import type * as Api` trong tầng service/mapper;
 * giao diện dùng các kiểu của FE ở types/product.ts, order.ts... (service đổi từ kiểu này sang kiểu FE).
 */
// =====================================================================================================
// 1. Hợp đồng chung
// =====================================================================================================

/** Envelope của MỌI response JSON. `error_status`: 1 = thành công, 0 = lỗi. */
export interface ResponseData<T> {
  error_status: 0 | 1;
  error_message: string | null;
  /** Tên ErrorCode khi lỗi (null khi thành công). Lỗi do Spring ResponseStatusException có thể là chuỗi số, vd "404". */
  error_code: ErrorCode | string | null;
  data: T;
}

/** Mã lỗi nghiệp vụ dùng chung, kèm HTTP status tương ứng. */
export type ErrorCode =
  | 'VALIDATION_ERROR' // 400 (lỗi @Valid của service Spring: "field: message, field2: message")
  | 'BAD_REQUEST' // 400
  | 'UNAUTHORIZED' // 401
  | 'FORBIDDEN' // 403
  | 'NOT_FOUND' // 404
  | 'CONFLICT' // 409 (trùng mã, optimistic lock)
  | 'OUT_OF_STOCK' // 409 (POST /orders: giỏ có món không mua được, data = warnings)
  | 'VOUCHER_INVALID' // 422 (POST /orders với mã không dùng được; /vouchers/validate vẫn trả 200 + valid=false)
  | 'EXTERNAL_SERVICE_ERROR' // 502
  | 'INTERNAL_ERROR'; // 500

/** Phân trang chung. `number` bắt đầu từ 0. */
export interface PageResponse<T> {
  content: T[];
  page: PageInfo;
}
export interface PageInfo {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

/** Một dòng lỗi của API hàng loạt ("tất cả hoặc không"): HTTP 400, `error_code` BAD_REQUEST, `data` = BulkErrorItem[]. */
export interface BulkErrorItem {
  /** SKU / mã / id (luôn là chuỗi, kể cả id số) */
  id: string;
  reason: string;
}
export type BulkErrorResponse = ResponseData<BulkErrorItem[]>;

/**
 * Lỗi kiểm tra dữ liệu (Bean Validation) ở MỌI service (Spring lẫn Quarkus): HTTP 400, error_code "VALIDATION_ERROR".
 * `field` là đường dẫn trong body: "receiverPhone", "lines[0].quantity"; lỗi ở tham số query thì là tên tham số.
 */
export interface FieldError {
  field: string;
  message: string;
}
export type ValidationErrorResponse = ResponseData<FieldError[]>;

/**
 * Định dạng ngày giờ trong JSON (đều là string):
 * - IsoInstant: có "Z", giờ UTC, độ chính xác tới ms hoặc ns. Ví dụ "2026-10-27T16:06:20.459Z". (catalog, review, notification)
 * - IsoLocalDateTime: KHÔNG có múi giờ, là giờ Việt Nam (máy chủ). Ví dụ "2026-10-24T20:25:34.732737". (ordering, customer, inventory, media)
 * - IsoDate: "2026-10-27".
 */
export type IsoInstant = string;
export type IsoLocalDateTime = string;
export type IsoDate = string;
/** UUID = `sub` của Keycloak */
export type UUID = string;
/** ObjectId MongoDB dạng hex 24 ký tự */
export type ObjectIdHex = string;
/** Tiền VND, số nguyên */
export type Money = number;

/** 4 cột audit của entity Postgres (customer, inventory, ordering, media). Thứ tự này đứng ĐẦU object trong JSON. */
export interface Audit {
  createdBy: UUID | null;
  createdAt: IsoLocalDateTime | null;
  updatedBy: UUID | null;
  updatedAt: IsoLocalDateTime | null;
}

// =====================================================================================================
// 2. Mã trạng thái (enum số)
// =====================================================================================================

export const ProductStatus = { DRAFT: 1, ACTIVE: 2, HIDDEN: 3, DISCONTINUED: 4 } as const;
/** 1 Nháp · 2 Đang bán · 3 Đã ẩn · 4 Ngừng bán */
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

export const OrderStatus = {
  PENDING: 1, AWAITING_PAYMENT: 2, PAID: 3, CONFIRMED: 4, SHIPPING: 5, COMPLETED: 6, CANCELLED: 7, RETURNED: 8,
} as const;
/** 1 Chờ xử lý · 2 Chờ thanh toán · 3 Đã thanh toán · 4 Đã xác nhận · 5 Đang giao · 6 Hoàn tất · 7 Đã hủy · 8 Trả hàng */
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentMethod = { COD: 1, VNPAY: 2, MOMO: 3 } as const;
/** 1 COD · 2 VNPay · 3 MoMo */
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = { UNPAID: 1, PAID: 2, REFUNDED: 3 } as const;
/** 1 Chưa thanh toán · 2 Đã thanh toán · 3 Đã hoàn tiền */
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const ReviewStatus = { PENDING: 1, APPROVED: 2, REJECTED: 3, DELETED_BY_USER: 4 } as const;
/** 1 Chờ duyệt · 2 Đã duyệt · 3 Từ chối · 4 Người viết đã gỡ */
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export const VoucherType = { PERCENT: 1, AMOUNT: 2, FREE_SHIPPING: 3 } as const;
/** 1 Giảm theo % · 2 Giảm số tiền · 3 Miễn phí vận chuyển */
export type VoucherType = (typeof VoucherType)[keyof typeof VoucherType];

export const StockMovementType = { IMPORT: 1, SALE: 2, RETURN: 3, ADJUST: 4 } as const;
/** 1 Nhập kho · 2 Xuất bán · 3 Hoàn trả · 4 Điều chỉnh */
export type StockMovementType = (typeof StockMovementType)[keyof typeof StockMovementType];

export const CompatSeverity = { ERROR: 1, WARNING: 2 } as const;
/** 1 Lỗi (không lắp được, làm compatible=false) · 2 Cảnh báo (vẫn compatible=true) */
export type CompatSeverity = (typeof CompatSeverity)[keyof typeof CompatSeverity];

/** 0 Khác · 1 Nam · 2 Nữ */
export type Gender = 0 | 1 | 2;
/** 0 = tắt/ẩn, 1 = đang hoạt động (danh mục, thương hiệu, luật tương thích, kho, voucher) */
export type ActiveFlag = 0 | 1;
/** media: 1 Supabase · 2 ổ đĩa local */
export type StorageType = 1 | 2;
/** notification: 1 Chờ gửi · 2 Đã gửi · 3 Gửi lỗi */
export type NotificationSendStatus = 1 | 2 | 3;
/** ai: 1 Sản phẩm (sinh tự động) · 2 Hướng dẫn · 3 Chính sách · 4 FAQ */
export type KnowledgeSourceType = 1 | 2 | 3 | 4;

export type RealmRole = 'CUSTOMER' | 'STAFF' | 'ADMIN';
export type Permission = 'product:write' | 'order:update-status' | 'inventory:write' | 'knowledge:write';
/** Slot PC Builder = `pcSlot` của danh mục (hiện trùng `code`) */
export type PcSlot = 'CPU' | 'MAINBOARD' | 'RAM' | 'GPU' | 'STORAGE' | 'PSU' | 'CASE' | 'COOLER';
/** Mục đích cấu hình (chuỗi tự do ở backend, đây là các giá trị đã dùng) */
export type PcBuildPurpose = 'GAMING' | 'DESIGN' | 'OFFICE' | 'AI_ML' | 'STREAMING' | string;
/**
 * products: perm product:write, ảnh ≤ 5 MB · avatars: user, ảnh ≤ 2 MB · reviews: user, ảnh ≤ 5 MB ·
 * knowledge-docs: ADMIN/knowledge:write, pdf/docx/txt/md ≤ 20 MB. Ảnh = jpg, jpeg, png, webp, gif.
 */
export type MediaBucket = 'products' | 'avatars' | 'reviews' | 'knowledge-docs';
export type ProductSort =
  | 'price,asc' | 'price,desc' | 'name,asc' | 'name,desc'
  | 'newest' | 'newest,desc' | 'sold' | 'sold,desc' | 'rating' | 'rating,desc';
export type NotificationType = 'ORDER_STATUS' | 'PAYMENT' | 'PROMOTION' | 'STOCK_BACK' | 'REVIEW_REPLY' | string;
export type ImportMode = 'CREATE_ONLY' | 'UPSERT';

// =====================================================================================================
// 3. customer-service (/me, /addresses, /locations, /admin/users)
// =====================================================================================================

/** Hồ sơ trong DB của shop (tự tạo ở lần gọi GET /me đầu tiên). */
export interface CustomerProfile extends Audit {
  id: UUID;
  displayName: string | null;
  email: string | null;
  /** dạng 0xxxxxxxxx */
  phoneNumber: string | null;
  /** id file ở media-service (chưa có API gán, luôn null hiện tại) */
  avatarFileId: number | null;
  gender: Gender | null;
  birthDate: IsoDate | null;
}

/** GET /me → MeResponse */
export interface MeResponse {
  id: UUID;
  username: string;
  email: string | null;
  roles: RealmRole[];
  permissions: Permission[];
  profile: CustomerProfile;
}

/** PUT /me (body) → CustomerProfile. Gửi đủ 3 trường: trường bỏ trống sẽ bị ghi null. */
export interface UpdateProfileRequest {
  /** regex ^0\d{9}$ */
  phoneNumber?: string | null;
  gender?: Gender | null;
  birthDate?: IsoDate | null;
}

/** Địa chỉ trong sổ địa chỉ (GET /addresses → UserAddress[], mặc định lên đầu rồi mới nhất trước). */
export interface UserAddress extends Audit {
  id: number;
  userId: UUID;
  receiverName: string;
  receiverPhone: string;
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
  addressDetail: string;
  isDefault: boolean;
}

/** POST /addresses, PUT /addresses/{id} (body) → UserAddress. Tối đa 10 địa chỉ. */
export interface AddressRequest {
  /** ≤ 255 ký tự */
  receiverName: string;
  /** regex ^0\d{9}$ */
  receiverPhone: string;
  provinceCode: string;
  /** phải thuộc provinceCode */
  wardCode: string;
  /** ≤ 255 ký tự */
  addressDetail: string;
  /** địa chỉ đầu tiên luôn thành mặc định; PUT chỉ BẬT được (gửi false không gỡ) */
  isDefault?: boolean | null;
}

/** GET /locations/provinces → ProvinceItem[] */
export interface ProvinceItem {
  code: string;
  name: string;
}
/** GET /locations/provinces/{code}/wards → Ward[] */
export interface Ward {
  code: string;
  name: string;
}

/** GET /admin/users?keyword=&page=&size= → PageResponse<AdminUserRow> */
export interface AdminUserRow {
  id: UUID;
  username: string;
  email: string | null;
  /** firstName + lastName */
  fullName: string;
  /** false = tài khoản bị khóa */
  active: boolean;
  phoneNumber: string | null;
}

/** GET /admin/users/{id} → AdminUserDetail */
export interface AdminUserDetail {
  id: UUID;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  active: boolean;
  emailVerified: boolean | null;
  /** epoch millis; tài khoản import từ file realm có thể null */
  createdTimestamp: number | null;
  /** null nếu user chưa từng gọi API của shop */
  profile: CustomerProfile | null;
  realmRoles: RealmRole[];
  permissions: Permission[];
}

/** POST /admin/users (body) → UserRoles. Tạo tài khoản NHÂN VIÊN (cần STAFF hoặc ADMIN trong realmRoles). */
export interface CreateStaffRequest {
  /** regex ^[a-z0-9._-]{3,50}$ */
  username: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  /** 6–100 ký tự */
  password: string;
  /** true = bắt đổi mật khẩu khi đăng nhập lần đầu */
  temporaryPassword?: boolean;
  /** mặc định ["STAFF"] */
  realmRoles?: RealmRole[];
  permissions?: Permission[];
}

/** PUT /admin/users/{id}/roles (body) → UserRoles. Gửi danh sách ĐẦY ĐỦ (thay thế, không cộng thêm). */
export interface RolesRequest {
  realmRoles: RealmRole[];
  permissions?: Permission[];
}
export interface UserRoles {
  userId: UUID;
  realmRoles: RealmRole[];
  permissions: Permission[];
}
// PUT /admin/users/{id}/lock, /unlock (không body) → string, vd "Đã khóa tài khoản <id>"

// =====================================================================================================
// 4. catalog-service (danh mục, thương hiệu, sản phẩm, tương thích, PC Builder)
// =====================================================================================================

/** Một thông số của danh mục: sinh ô nhập ở form admin, nhãn + đơn vị ở trang chi tiết, cột Excel. */
export interface SpecField {
  /** khóa trong products.specs hoặc products.compat, vd "socket", "tdp_w" */
  key: string;
  label: string;
  /** compat = rule engine dùng (lưu ở product.compat); specs = chỉ hiển thị (product.specs) */
  group: 'specs' | 'compat';
  /** string_list = mảng chuỗi (trong Excel là các giá trị cách nhau dấu phẩy) */
  type: 'string' | 'integer' | 'decimal' | 'boolean' | 'string_list';
  required: boolean;
  /** "W", "mm", "GB", "MHz", "GHz", "MB", "MB/s" hoặc null */
  unit: string | null;
  /** danh sách giá trị cho phép (dropdown); null = nhập tự do */
  options: string[] | null;
}

/** GET /categories → Category[] (chỉ đang hoạt động, theo sortOrder); GET /categories/{code}; admin cũng trả kiểu này. */
export interface Category {
  id: ObjectIdHex;
  /** A-Z, 0-9, _ ; vd "CPU" */
  code: string;
  name: string;
  slug: string;
  pcSlot: PcSlot | string | null;
  sortOrder: number | null;
  isActive: ActiveFlag;
  /** null với danh mục tạo qua API (chưa có API sửa spec_schema) */
  specSchema: SpecField[] | null;
  createdBy: UUID | null;
  createdAt: IsoInstant | null;
  updatedBy: UUID | null;
  updatedAt: IsoInstant | null;
}

/** GET /brands → Brand[]; GET /brands/{code} */
export interface Brand {
  id: ObjectIdHex;
  code: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  isActive: ActiveFlag;
  createdAt: IsoInstant | null;
  updatedAt: IsoInstant | null;
}

export interface ProductImage {
  /** id file ở media-service */
  fileId: number | null;
  url: string;
  isPrimary: boolean | null;
}

/** Giá trị thông số: số, chuỗi, boolean hoặc mảng chuỗi tùy SpecField.type */
export type SpecValue = string | number | boolean | string[] | null;
/**
 * Thông số tương thích CHUẨN HÓA (rule engine đọc). Các khóa thường gặp theo danh mục:
 * CPU: socket, memory_types[], tdp_w · MAINBOARD: socket, memory_type, form_factor, ram_slots, m2_slots ·
 * RAM: memory_type, modules · GPU: length_mm, tdp_w, recommended_psu_w · PSU: wattage, form_factor ·
 * CASE: supported_form_factors[], max_gpu_length_mm, max_cooler_height_mm · STORAGE: interface, form_factor ·
 * COOLER: supported_sockets[], height_mm, tdp_w
 */
export type ProductCompat = Record<string, SpecValue>;
/** Thông số hiển thị, khóa theo specSchema (group=specs) của danh mục; có thể có khóa ngoài schema. */
export type ProductSpecs = Record<string, SpecValue>;

/** Sản phẩm đầy đủ: GET /products, /products/search, /products/{sku}, mọi API admin sản phẩm. */
export interface Product {
  id: ObjectIdHex;
  /** A-Z, 0-9, - ; khóa nghiệp vụ, dùng trên URL */
  sku: string;
  name: string;
  slug: string;
  categoryCode: string;
  brandCode: string | null;
  shortDescription: string | null;
  description: string | null;
  price: Money;
  /** giá gốc (gạch ngang) khi đang giảm giá; null = không giảm */
  originalPrice: Money | null;
  images: ProductImage[] | null;
  specs: ProductSpecs | null;
  compat: ProductCompat | null;
  tags: string[] | null;
  warrantyMonths: number | null;
  status: ProductStatus;
  /** tự cập nhật khi review được duyệt/từ chối/gỡ (chỉ tính review đã duyệt); null = chưa từng có review */
  ratingAvg: number | null;
  ratingCount: number | null;
  /** tự cập nhật khi đơn hoàn tất / trả hàng (vài giây sau); sản phẩm cũ có thể null */
  soldCount: number | null;
  createdBy: UUID | null;
  createdAt: IsoInstant | null;
  updatedBy: UUID | null;
  updatedAt: IsoInstant | null;
}

/** Query của GET /products (public, chỉ ACTIVE). Mọi trường tùy chọn. */
export interface ProductListQuery {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  /** mặc định price,asc; sai → 400 */
  sort?: ProductSort;
  /** khớp compat.socket HOẶC compat.supported_sockets */
  socket?: string;
  /** khớp compat.memory_type HOẶC compat.memory_types */
  memoryType?: string;
  /** khớp compat.form_factor HOẶC compat.supported_form_factors */
  formFactor?: string;
  /** từ 0 */
  page?: number;
  /** 1–100, mặc định 20 */
  size?: number;
}

/** GET /products/facets?category= → ProductFacets (chỉ tính sản phẩm ACTIVE) */
export interface ProductFacets {
  /** mã thương hiệu, sắp xếp A-Z */
  brands: string[];
  priceRange: { min: Money | null; max: Money | null };
  /** chỉ có khóa nào có giá trị */
  compat: { socket?: string[]; memoryType?: string[]; formFactor?: string[] };
}

/** POST /products/batch, POST /inventory/batch, POST /compatibility/check dùng body có `skus` */
export interface SkuBatchRequest {
  /** 1–100 SKU (compatibility/check: tối đa 30, SKU lặp = nhiều chiếc) */
  skus: string[];
}

/** POST /products/batch → ProductSummary[] (bỏ qua DRAFT và SKU không tồn tại; KHÔNG giữ thứ tự gửi lên) */
export interface ProductSummary {
  productId: ObjectIdHex;
  sku: string;
  name: string;
  slug: string;
  categoryCode: string;
  brandCode: string | null;
  price: Money;
  originalPrice: Money | null;
  /** ảnh is_primary, không có thì ảnh đầu; null nếu không có ảnh */
  imageUrl: string | null;
  /** có thể là 3/4 (HIDDEN/DISCONTINUED): không cho mua */
  status: ProductStatus;
  warrantyMonths: number | null;
}

/** GET /products/{sku}/price-history → PriceHistory[] (mới nhất trước, tối đa 100) */
export interface PriceHistory {
  id: ObjectIdHex;
  productId: ObjectIdHex | null;
  sku: string;
  /** null ở bản ghi INITIAL */
  oldPrice: Money | null;
  newPrice: Money;
  /** INITIAL, MANUAL, PROMOTION, COST_CHANGE, CORRECTION, BULK, BULK_IMPORT, IMPORT... (chuỗi tự do) */
  reason: string;
  changedBy: UUID | null;
  changedAt: IsoInstant;
}

/** Một vấn đề tương thích do rule engine tất định trả về. */
export interface CompatibilityIssue {
  /** CPU_MB_SOCKET, RAM_MB_TYPE, PSU_WATTAGE, GPU_CASE_LENGTH, MB_CASE_FORM_FACTOR, ... */
  ruleCode: string;
  severity: CompatSeverity;
  /** câu tiếng Việt đã điền tên linh kiện, hiển thị nguyên văn */
  message: string;
}

/** POST /compatibility/check (body SkuBatchRequest) → CompatibilityCheckResult */
export interface CompatibilityCheckResult {
  /** false khi có ít nhất một issue severity=1 */
  compatible: boolean;
  issues: CompatibilityIssue[];
  /** tổng compat.tdp_w của mọi linh kiện (W), CHƯA nhân hệ số an toàn 1.2 */
  estimatedWattage: number;
  /** công suất nguồn tối thiểu (W) = estimatedWattage × hệ số của luật PSU_WATTAGE; dùng cho đồng hồ công suất */
  requiredWattage: number;
}

export interface PcBuildItem {
  slot: PcSlot | string;
  productId: ObjectIdHex;
  sku: string;
  name: string;
  quantity: number;
  /** giá lúc lưu cấu hình (không tự cập nhật) */
  priceAtTime: Money;
}
export interface PcBuildCompatibilityResult {
  isCompatible: boolean;
  checkedAt: IsoInstant;
  issues: CompatibilityIssue[];
}

/** Cấu hình PC đã lưu: GET /pc-builds/my → PcBuild[], GET/POST/PUT /pc-builds... → PcBuild */
export interface PcBuild {
  id: ObjectIdHex;
  /** "PC" + 8 ký tự, dùng trong link chia sẻ */
  code: string;
  userId: UUID;
  name: string | null;
  purpose: PcBuildPurpose | null;
  budget: Money | null;
  items: PcBuildItem[];
  totalPrice: Money;
  estimatedWattage: number;
  /** null với cấu hình lưu trước 2026-11-07 */
  requiredWattage: number | null;
  compatibilityResult: PcBuildCompatibilityResult;
  isAiGenerated: boolean;
  isPublic: boolean;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
}

/** POST /pc-builds, PUT /pc-builds/{code} (body) → PcBuild */
export interface PcBuildRequest {
  /** ≤ 255 ký tự */
  name?: string | null;
  purpose?: PcBuildPurpose | null;
  /** ≥ 0 */
  budget?: number | null;
  /** 1–20 dòng; mỗi SKU phải đang bán (ACTIVE) */
  items: { sku: string; /** 1–8 */ quantity: number }[];
  isPublic?: boolean | null;
}

/** POST /pc-builds/bulk-delete (body) → { deleted: number } */
export interface BulkDeleteCodesRequest {
  /** 1–100 mã */
  codes: string[];
}
export interface DeletedCount {
  deleted: number;
}

// ----- catalog admin -----

/** POST /admin/categories (body) → Category */
export interface CategoryRequest {
  /** ^[A-Z0-9_]+$ */
  code: string;
  name: string;
  /** trống = sinh từ name */
  slug?: string | null;
  pcSlot?: string | null;
  sortOrder?: number | null;
}
/** PUT /admin/categories/{code} (body) → Category */
export type UpdateCategoryRequest = Omit<CategoryRequest, 'code'>;

/** POST /admin/brands (body) → Brand */
export interface BrandRequest {
  /** ^[A-Z0-9_]+$ */
  code: string;
  name: string;
  slug?: string | null;
  logoUrl?: string | null;
}
/** PUT /admin/brands/{code} (body) → Brand */
export type UpdateBrandRequest = Omit<BrandRequest, 'code'>;

/** PATCH .../{code|id}/active (body) */
export interface ActiveRequest {
  active: boolean;
}
/** PATCH /admin/categories|brands|compatibility-rules/bulk/active (body) → Category[] | Brand[] | CompatibilityRule[] */
export interface BulkActiveCodesRequest {
  codes: string[];
  active: boolean;
}
/** PATCH /admin/vouchers|warehouses/bulk/active (body) → AdminVoucher[] | Warehouse[] */
export interface BulkActiveIdsRequest {
  ids: number[];
  active: boolean;
}

/** Query của GET /admin/products → PageResponse<Product> (thấy mọi trạng thái, mới sửa trước) */
export interface AdminProductListQuery {
  status?: ProductStatus;
  category?: string;
  /** tìm trong name hoặc sku, không phân biệt hoa thường */
  q?: string;
  page?: number;
  size?: number;
}

/** POST /admin/products (body) → Product */
export interface CreateProductRequest {
  /** ^[A-Z0-9-]+$ */
  sku: string;
  name: string;
  slug?: string | null;
  categoryCode: string;
  brandCode?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  /** > 0 */
  price: number;
  /** > 0 */
  originalPrice?: number | null;
  images?: ProductImage[] | null;
  specs?: ProductSpecs | null;
  compat?: ProductCompat | null;
  tags?: string[] | null;
  /** ≥ 0 */
  warrantyMonths?: number | null;
  /** chỉ 1 (Nháp, mặc định) hoặc 2 (Đang bán) */
  status?: 1 | 2 | null;
}

/** PUT /admin/products/{sku} (body) → Product. Không đổi giá/trạng thái ở đây (dùng API riêng). */
export type UpdateProductRequest = Omit<CreateProductRequest, 'sku' | 'price' | 'status'>;

/** PATCH /admin/products/{sku}/status (body) → Product. Đã công bố thì không quay về 1. */
export interface ProductStatusRequest {
  status: ProductStatus;
}

/** PATCH /admin/products/{sku}/price (body) → Product. Ghi thêm price_histories. Giá không đổi → 400. */
export interface ProductPriceRequest {
  /** > 0 */
  price: number;
  originalPrice?: number | null;
  /** mặc định "MANUAL" */
  reason?: string | null;
}

/** PATCH /admin/products/bulk/status (body) → Product[] */
export interface BulkProductStatusRequest {
  /** 1–100 */
  skus: string[];
  status: ProductStatus;
}
/** PATCH /admin/products/bulk/price (body) → Product[] */
export interface BulkPriceRequest {
  items: { sku: string; price: number; originalPrice?: number | null }[];
  /** mặc định "BULK" */
  reason?: string | null;
}
/** POST /admin/products/bulk (body) → BulkSaveResult. SKU chưa có thì tạo (cần price), đã có thì sửa (bỏ qua status). */
export interface BulkSaveRequest {
  items: (Omit<CreateProductRequest, 'price'> & { price?: number | null })[];
}
export interface BulkSaveResult {
  created: number;
  updated: number;
  products: Product[];
}

/** Luật tương thích (GET /admin/compatibility-rules → CompatibilityRule[]) */
export interface CompatibilityRule {
  id: ObjectIdHex;
  code: string;
  name: string;
  /** "*" = mọi linh kiện (dùng cho tổng công suất) */
  sourceCategory: string;
  /** null với MAX_COUNT */
  targetCategory: string | null;
  /**
   * SUM_LTE: tổng source_field của nhóm nguồn ≤ target_field của từng linh kiện đích (vd số thanh RAM ≤ ram_slots).
   * MAX_COUNT: số linh kiện thuộc sourceCategory ≤ maxCount.
   */
  ruleType: 'EQUALS' | 'IN' | 'LTE' | 'SUM_TDP_LTE_WATTAGE' | 'SUM_LTE' | 'MAX_COUNT';
  sourceField: string | null;
  targetField: string | null;
  /** hệ số an toàn, vd 1.2 (chỉ SUM_TDP_LTE_WATTAGE) */
  margin: number | null;
  /** chỉ MAX_COUNT */
  maxCount: number | null;
  severity: CompatSeverity;
  /** placeholder {source} {target} {sv} {tv} */
  messageTemplate: string;
  isActive: ActiveFlag;
  createdAt: IsoInstant | null;
  updatedAt: IsoInstant | null;
}
/** POST /admin/compatibility-rules (body) → CompatibilityRule */
export interface RuleRequest {
  /** ^[A-Z0-9_]+$ */
  code: string;
  name: string;
  sourceCategory: string;
  /** bắt buộc trừ MAX_COUNT */
  targetCategory?: string | null;
  ruleType: CompatibilityRule['ruleType'];
  /** bắt buộc trừ MAX_COUNT */
  sourceField?: string | null;
  /** bắt buộc trừ MAX_COUNT */
  targetField?: string | null;
  /** > 0 */
  margin?: number | null;
  /** > 0, bắt buộc với MAX_COUNT */
  maxCount?: number | null;
  severity: CompatSeverity;
  messageTemplate: string;
}
/** PUT /admin/compatibility-rules/{code} (body) → CompatibilityRule */
export type UpdateRuleRequest = Omit<RuleRequest, 'code'>;

// =====================================================================================================
// 5. Import / Export Excel (catalog + inventory). Tên trường snake_case.
// =====================================================================================================

/** Lỗi của một dòng; `row` là số dòng như Excel hiển thị (dòng tiêu đề là 1). */
export interface ImportRowError {
  row: number;
  messages: string[];
}

/** POST .../import/validate (multipart) → ImportValidateResult. Lỗi cả file → 400 ResponseData. */
export interface ImportValidateResult<P = Record<string, unknown>> {
  /** gửi lại ở bước import; giữ 1 giờ, chỉ người upload dùng được */
  import_id: UUID;
  /** sản phẩm: CREATE_ONLY | UPSERT; phiếu nhập kho: "IMPORT" */
  mode: ImportMode | 'IMPORT';
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  errors: ImportRowError[];
  /** tối đa 20 dòng HỢP LỆ để xem trước */
  preview: P[];
}

/**
 * Dòng xem trước của import sản phẩm. Khóa thông số động theo spec_schema: "compat.<key>", "specs.<key>".
 * Trường không có giá trị thì không xuất hiện.
 */
export interface ProductImportPreviewRow {
  row: number;
  action: 'CREATE' | 'UPDATE';
  sku: string;
  name: string;
  brand?: string;
  price?: number;
  original_price?: number;
  short_description?: string;
  warranty_months?: number;
  tags?: string[];
  /** nhãn tiếng Việt: "Nháp" | "Đang bán" (chỉ dùng khi tạo mới) */
  status?: string;
  [specKey: `compat.${string}` | `specs.${string}`]: SpecValue | undefined;
}

/** Dòng xem trước của import phiếu nhập kho (Excel) */
export interface StockImportPreviewRow {
  row: number;
  /** mã kho, vd "HCM-01" */
  warehouse: string;
  sku: string;
  quantity: number;
  note: string | null;
}

/** POST /admin/products/import, POST /admin/inventory/import/excel (body) → ImportResult */
export interface ImportCommitRequest {
  importId: UUID;
}
export interface ImportResult {
  total_rows: number;
  created: number;
  updated: number;
  failed: number;
  errors: ImportRowError[];
}

// =====================================================================================================
// 6. cart-service (/cart). Không token → bắt buộc header X-Guest-Key.
// =====================================================================================================

/** Một dòng giỏ, giá/tồn kho luôn lấy mới khi xem giỏ. */
export interface CartLine {
  sku: string;
  quantity: number;
  /** null nếu SKU không còn trên catalog hoặc catalog không phản hồi */
  productId: ObjectIdHex | null;
  name: string | null;
  slug: string | null;
  imageUrl: string | null;
  categoryCode: string | null;
  unitPrice: Money | null;
  lineTotal: Money | null;
  /** số có thể bán (tổng các kho); null nếu inventory không phản hồi */
  available: number | null;
  /** false: không tính vào subtotal, không đặt được */
  purchasable: boolean;
  /** lý do khi purchasable=false: "Hết hàng", "Chỉ còn N sản phẩm", "Sản phẩm đã ngừng bán", "Sản phẩm không còn tồn tại" */
  message: string | null;
  warrantyMonths: number | null;
}

/** Mọi API /cart (trừ DELETE /cart) → CartView */
export interface CartView {
  items: CartLine[];
  /** tổng số lượng mọi dòng (kể cả dòng không mua được) — dùng cho badge giỏ hàng */
  totalQuantity: number;
  /** tạm tính, CHỈ gồm dòng purchasable */
  subtotal: Money;
  warnings: string[];
}

/** POST /cart/items (body): cộng dồn, tối đa 99/sản phẩm */
export interface AddCartItemRequest {
  sku: string;
  /** 1–99 */
  quantity: number;
}
/** POST /cart/items/bulk (body): vd thêm cả cấu hình PC; một món lỗi thì không thêm gì */
export interface BulkAddCartRequest {
  /** 1–100, SKU không được lặp */
  items: AddCartItemRequest[];
}
/** PUT /cart/items/{sku} (body): số lượng tuyệt đối, 0 = xóa */
export interface SetCartQuantityRequest {
  /** 0–99 */
  quantity: number;
}

// =====================================================================================================
// 7. ordering-service (đơn hàng, voucher, checkout, thống kê)
// =====================================================================================================

/** Đơn hàng (không bao giờ xóa). GET /orders/my?status=&page=&size= → PageResponse<Order> (mới nhất trước, size mặc định 10). */
export interface Order extends Audit {
  id: number;
  /** vd "DH20261024000001" */
  code: string;
  userId: UUID;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  subtotalAmount: Money;
  discountAmount: Money;
  shippingFee: Money;
  totalAmount: Money;
  voucherCode: string | null;
  receiverName: string;
  receiverPhone: string;
  /** snapshot địa chỉ dạng một chuỗi: "chi tiết, phường, tỉnh" */
  shippingAddress: string;
  note: string | null;
  pcBuildId: string | null;
  cancelReason: string | null;
  placedAt: IsoLocalDateTime | null;
  completedAt: IsoLocalDateTime | null;
  /** optimistic lock: tăng mỗi lần đổi trạng thái */
  version: number;
}

/** Dòng sản phẩm của đơn: snapshot lúc đặt, không đổi theo catalog. */
export interface OrderItem {
  id: number;
  orderId: number;
  productId: string;
  sku: string;
  productName: string;
  productImageUrl: string | null;
  categoryCode: string | null;
  unitPrice: Money;
  quantity: number;
  discountAmount: Money;
  lineTotal: Money;
  warrantyMonths: number | null;
  createdAt: IsoLocalDateTime;
}

/** GET /orders/{code}, GET /admin/orders/{code} → OrderDetail */
export interface OrderDetail {
  order: Order;
  items: OrderItem[];
}

/** GET /orders/{code}/timeline → OrderStatusHistory[] (cũ nhất trước) */
export interface OrderStatusHistory {
  id: number;
  orderId: number;
  /** null ở dòng đầu (đặt hàng) */
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  reason: string | null;
  /** null = hệ thống (Saga giữ hàng, hủy đơn quá hạn thanh toán) */
  createdBy: UUID | null;
  createdAt: IsoLocalDateTime;
}

/**
 * POST /orders (body) → OrderDetail với order.status = 1 (đang giữ hàng). Tiền tính lại từ giỏ trên server như preview;
 * giỏ bị xóa sau khi đặt. Lỗi: 409 CONFLICT (expectedTotal lệch, data = CheckoutPreview mới), 409 OUT_OF_STOCK
 * (data = string[] cảnh báo), 422 VOUCHER_INVALID, 400 (giỏ trống, địa chỉ không phải của mình).
 * Header tùy chọn `Idempotency-Key` (1–64 ký tự): gửi lại cùng key → trả đúng đơn đã tạo (chống bấm đúp).
 */
export interface PlaceOrderRequest {
  /** bắt buộc, id trong sổ địa chỉ của chính user */
  addressId: number;
  voucherCode?: string | null;
  /** 1-COD, 2-VNPAY, 3-MOMO */
  paymentMethod: PaymentMethod;
  /** ≤ 500 ký tự */
  note?: string | null;
  /** totalAmount của preview đang hiển thị; khác số server tính → 409 */
  expectedTotal?: Money | null;
}

/** POST /payments/{orderCode} → PaymentInit. Chủ đơn, đơn status 2 (chờ thanh toán), không phải COD. */
export interface PaymentInit {
  /** <mã đơn>-<lần>, vd "DH20261108001008-01" */
  paymentCode: string;
  /** chuyển trình duyệt tới đây */
  paymentUrl: string;
  amount: Money;
  /** hết hạn thanh toán (placedAt + 15 phút); quá hạn đơn tự hủy */
  expiresAt: IsoLocalDateTime;
  /** MOCK = trang thanh toán giả lập của backend (MoMo, hoặc chưa cấu hình VNPay) */
  gateway: 'VNPAY' | 'MOCK';
}
export const PaymentRecordStatus = { PENDING: 1, SUCCESS: 2, FAILED: 3, EXPIRED: 4, REFUNDED: 5 } as const;
/** 1 Đang chờ · 2 Thành công · 3 Thất bại · 4 Hết hạn · 5 Đã hoàn tiền */
export type PaymentRecordStatus = (typeof PaymentRecordStatus)[keyof typeof PaymentRecordStatus];
/** GET /payments/{orderCode} → Payment[] (mới nhất trước). Đơn COD hoàn tất có một dòng paymentCode "COD-<mã đơn>". */
export interface Payment {
  id: number;
  orderId: number;
  paymentCode: string;
  method: PaymentMethod;
  amount: Money;
  status: PaymentRecordStatus;
  /** mã giao dịch phía cổng (vnp_TransactionNo) */
  providerTransactionId: string | null;
  bankCode: string | null;
  paidAt: IsoLocalDateTime | null;
  expiredAt: IsoLocalDateTime | null;
  createdAt: IsoLocalDateTime;
  updatedAt: IsoLocalDateTime;
}
/** Query result của trang kết quả thanh toán (/orders/payment-result?orderCode=&result=) */
export type PaymentResult = 'success' | 'failed' | 'refund' | 'invalid';

export const RefundStatus = { PENDING: 1, COMPLETED: 2 } as const;
/** 1 Chờ hoàn · 2 Đã hoàn */
export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus];
/** GET /admin/refunds?status= → RefundView[] (mới nhất trước, tối đa 500) */
export interface RefundView {
  id: number;
  orderCode: string;
  paymentCode: string;
  method: PaymentMethod;
  amount: Money;
  reason: string | null;
  status: RefundStatus;
  providerRefundId: string | null;
  createdAt: IsoLocalDateTime;
  updatedAt: IsoLocalDateTime;
}
/** PATCH /admin/refunds/{id}/complete (body, có thể bỏ trống) → Refund (đơn chuyển paymentStatus = 3) */
export interface CompleteRefundRequest {
  /** mã hoàn tiền phía cổng, ≤ 100 ký tự */
  providerRefundId?: string | null;
}
export interface Refund {
  id: number;
  paymentId: number;
  amount: Money;
  reason: string | null;
  status: RefundStatus;
  providerRefundId: string | null;
  createdBy: UUID | null;
  createdAt: IsoLocalDateTime;
  updatedAt: IsoLocalDateTime;
}

/** POST /orders/{code}/cancel (body) → Order. Chỉ chủ đơn, khi status 1, 2 hoặc 4 và paymentStatus ≠ 2. */
export interface CancelOrderRequest {
  /** bắt buộc, ≤ 255 ký tự */
  reason: string;
}

/** Query của GET /admin/orders → PageResponse<Order>; GET /admin/orders/export dùng cùng bộ lọc (trừ page/size). */
export interface AdminOrderListQuery {
  status?: OrderStatus;
  /** theo ngày tạo, gồm cả ngày `to` */
  from?: IsoDate;
  to?: IsoDate;
  /** tìm trong mã đơn, SĐT, tên người nhận */
  q?: string;
  page?: number;
  size?: number;
}

/** PATCH /admin/orders/{code}/status (body) → Order */
export interface OrderStatusRequest {
  status: OrderStatus;
  /** BẮT BUỘC khi status = 7 hoặc 8; ≤ 255 ký tự */
  reason?: string | null;
}
/** PATCH /admin/orders/bulk/status (body) → Order[] */
export interface BulkOrderStatusRequest extends OrderStatusRequest {
  /** 1–100 mã đơn */
  codes: string[];
}

/**
 * Voucher công khai: GET /vouchers → PublicVoucher[] (chỉ mã dùng được ngay: đang bật, trong hạn, còn lượt).
 * Số lượt của riêng user: dùng POST /vouchers/validate.
 */
export interface PublicVoucher {
  code: string;
  name: string;
  type: VoucherType;
  /** % (type 1), số tiền (type 2), 0 (type 3) */
  value: number;
  maxDiscountAmount: Money | null;
  minOrderAmount: Money | null;
  /** rỗng = mọi danh mục */
  applicableCategories: string[];
  perUserLimit: number | null;
  startAt: IsoLocalDateTime | null;
  endAt: IsoLocalDateTime | null;
}

/** Voucher cho màn admin: GET /admin/vouchers → AdminVoucher[] (kể cả đã tắt), các API admin voucher → AdminVoucher */
export interface AdminVoucher {
  id: number;
  code: string;
  name: string;
  type: VoucherType;
  value: number;
  maxDiscountAmount: Money | null;
  minOrderAmount: Money | null;
  /** rỗng = mọi danh mục */
  applicableCategories: string[];
  usageLimit: number | null;
  usedCount: number | null;
  perUserLimit: number | null;
  startAt: IsoLocalDateTime | null;
  endAt: IsoLocalDateTime | null;
  isActive: ActiveFlag;
  /** optimistic lock: gửi lại khi PUT, lệch → 409 */
  version: number;
  createdAt: IsoLocalDateTime | null;
  updatedAt: IsoLocalDateTime | null;
}

/** POST /admin/vouchers (body) → AdminVoucher */
export interface CreateVoucherRequest {
  /** ^[A-Za-z0-9_-]{3,50}$, server đổi sang IN HOA */
  code: string;
  name: string;
  type: VoucherType;
  /** ≥ 0; type 1 ≤ 100; type 1/2 phải > 0 */
  value: number;
  maxDiscountAmount?: number | null;
  /** mặc định 0 */
  minOrderAmount?: number | null;
  applicableCategories?: string[] | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  /** "2026-11-01T00:00:00" (giờ VN, không múi giờ); endAt phải sau startAt */
  startAt?: IsoLocalDateTime | null;
  endAt?: IsoLocalDateTime | null;
}
/** PUT /admin/vouchers/{id} (body) → AdminVoucher. Gửi đủ mọi trường (trường bỏ trống bị ghi null). */
export interface UpdateVoucherRequest extends Omit<CreateVoucherRequest, 'code'> {
  version: number;
}

/** POST /vouchers/validate (body) → VoucherEvaluation (luôn HTTP 200, xem `valid`) */
export interface VoucherValidateRequest {
  code: string;
  /** ≥ 0 */
  subtotal: number;
  /** mã danh mục trong giỏ */
  categories?: string[] | null;
}
export interface VoucherEvaluation {
  valid: boolean;
  /** đã chuẩn hóa IN HOA */
  code: string;
  /** null khi không hợp lệ */
  name: string | null;
  type: VoucherType | null;
  /** số tiền giảm trên tiền hàng; voucher miễn phí ship = 0 */
  discountAmount: Money;
  freeShipping: boolean;
  /** lý do khi valid=false, hiển thị nguyên văn */
  reason: string | null;
}

/** POST /checkout/preview (body, có thể bỏ trống) → CheckoutPreview. Không tạo đơn. */
export interface CheckoutPreviewRequest {
  voucherCode?: string | null;
  /** id trong sổ địa chỉ của chính user */
  addressId?: number | null;
}
/** Dòng giỏ trong checkout: như CartLine nhưng KHÔNG có `slug`. */
export type CheckoutLine = Omit<CartLine, 'slug'>;
export interface CheckoutAddress {
  id: number;
  receiverName: string;
  receiverPhone: string;
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
  addressDetail: string;
  isDefault: boolean;
}
export interface CheckoutPreview {
  items: CheckoutLine[];
  subtotal: Money;
  discountAmount: Money;
  shippingFee: Money;
  totalAmount: Money;
  /** null khi không gửi voucherCode */
  voucher: VoucherEvaluation | null;
  /** null khi không gửi addressId */
  address: CheckoutAddress | null;
  warnings: string[];
  /** false khi: chưa có địa chỉ, giỏ có món không mua được, hoặc không có món nào */
  canPlaceOrder: boolean;
}

/** GET /admin/stats/overview?from=&to= → StatsOverview (mặc định 30 ngày gần nhất, tối đa 1 năm) */
export interface StatsOverview {
  from: IsoDate;
  to: IsoDate;
  totalOrders: number;
  /** tổng tiền đơn COMPLETED (6) */
  revenue: Money;
  /** tổng tiền mọi đơn trừ 7, 8 */
  grossRevenue: Money;
  /** khóa là mã trạng thái DẠNG CHUỖI ("1".."8"), luôn đủ 8 khóa (0 nếu không có đơn) */
  ordersByStatus: Record<`${OrderStatus}`, number>;
}
/** GET /admin/stats/top-products?from=&to=&limit= → TopProduct[] (limit 1–100, mặc định 10) */
export interface TopProduct {
  sku: string;
  productName: string;
  quantity: number;
  revenue: Money;
}

// =====================================================================================================
// 8. inventory-service (tồn kho, kho, nhập kho)
// =====================================================================================================

/** GET /inventory/{sku} → StockResponse (404 nếu SKU chưa có dòng tồn kho); POST /inventory/batch → StockResponse[] */
export interface StockResponse {
  sku: string;
  /** tổng (quantity - reservedQuantity) mọi kho; batch: SKU chưa có tồn kho → 0 */
  available: number;
  inStock: boolean;
}

/** Một dòng tồn kho (SKU × kho). KHÔNG có tên sản phẩm: ghép bằng POST /products/batch. */
export interface Inventory extends Audit {
  id: number;
  /** thường là "" ở dữ liệu seed */
  productId: string;
  sku: string;
  warehouseId: number;
  quantity: number;
  reservedQuantity: number;
  /** ngưỡng cảnh báo sắp hết */
  minQuantity: number;
  version: number;
}

/** Kho: GET /warehouses → Warehouse[] (STAFF/ADMIN, kể cả kho đã tắt) */
export interface Warehouse extends Audit {
  id: number;
  code: string;
  name: string;
  address: string | null;
  isActive: ActiveFlag;
}
/** POST /admin/warehouses (body) → Warehouse */
export interface WarehouseRequest {
  /** ≤ 20 ký tự */
  code: string;
  name: string;
  address?: string | null;
}
/** PUT /admin/warehouses/{id} (body) → Warehouse */
export type UpdateWarehouseRequest = Omit<WarehouseRequest, 'code'>;

/** Biến động kho (chỉ thêm, không sửa): GET /admin/inventory/movements → PageResponse<StockMovement> */
export interface StockMovement {
  id: number;
  sku: string;
  warehouseId: number;
  type: StockMovementType;
  /** có dấu: + nhập/hoàn, - xuất/giảm */
  quantity: number;
  quantityAfter: number | null;
  /** "IMPORT" | "ADJUST" | ... */
  referenceType: string | null;
  /** số phiếu nhập */
  referenceCode: string | null;
  note: string | null;
  createdBy: UUID | null;
  createdAt: IsoLocalDateTime;
}

/** Query: GET /admin/inventory → PageResponse<Inventory>; GET /admin/inventory/export (file) */
export interface AdminInventoryQuery {
  warehouseId?: number;
  /** true: chỉ dòng có (quantity - reserved) ≤ minQuantity */
  lowStock?: boolean;
  page?: number;
  size?: number;
}
/** Query: GET /admin/inventory/movements (size mặc định 50) */
export interface StockMovementQuery {
  sku?: string;
  from?: IsoDate;
  to?: IsoDate;
  page?: number;
  size?: number;
}

/** POST /admin/inventory/import (body JSON, phiếu nhập nhiều dòng) → Inventory[] (các dòng tồn sau khi nhập) */
export interface InventoryImportRequest {
  warehouseId: number;
  referenceCode?: string | null;
  note?: string | null;
  /** 1–200 dòng */
  lines: { sku: string; productId?: string | null; /** ≥ 1 */ quantity: number }[];
}
// PUT /inventory/{sku}/adjust?warehouseId=&delta=&note= (không body) → StockResponse

// =====================================================================================================
// 9. review-service
// =====================================================================================================

export interface AdminReply {
  content: string;
  repliedBy: UUID;
  repliedAt: IsoInstant;
}

/** Đánh giá: GET /reviews?sku=|productId=&page=&size= → PageResponse<Review> (chỉ APPROVED, mới nhất trước, size mặc định 10) */
export interface Review {
  /** ObjectId hex */
  id: string;
  /** = Product.id (ObjectId hex), KHÔNG phải SKU */
  productId: ObjectIdHex;
  sku: string;
  userId: UUID;
  /** họ tên người viết (claim `name`), "Khách hàng" nếu chưa khai tên; review cũ (trước 2026-11-07) là username */
  userDisplayName: string;
  orderCode: string | null;
  /** 1–5 */
  rating: number;
  title: string | null;
  content: string | null;
  /** người viết có đơn HOÀN TẤT chứa SKU lúc viết (orderCode = đơn đó) → nhãn "Đã mua hàng" */
  verifiedPurchase: boolean;
  status: ReviewStatus;
  helpfulCount: number;
  adminReply: AdminReply | null;
  createdAt: IsoInstant;
  updatedAt: IsoInstant | null;
}

/** POST /reviews (body) → Review (status 1). Mỗi user một review cho một sản phẩm → 409 nếu đã có. */
export interface CreateReviewRequest {
  /** không bắt buộc: server tra theo sku; gửi thì phải khớp */
  productId?: ObjectIdHex;
  /** sản phẩm phải tồn tại và đã công bố, không thì 400 */
  sku: string;
  /** 1–5 */
  rating: number;
  /** ≤ 200 */
  title?: string | null;
  /** ≤ 5000 */
  content?: string | null;
}
/** PUT /reviews/{id} (body) → Review. Chỉ khi status 1. */
export type UpdateReviewRequest = Omit<CreateReviewRequest, 'productId' | 'sku'>;

/** GET /reviews/stats?sku=|productId= → ReviewStats (chỉ APPROVED) */
export interface ReviewStats {
  /** giá trị tham số đã gửi; tham số không gửi thì null */
  productId: ObjectIdHex | null;
  sku: string | null;
  /** làm tròn 2 chữ số; 0 khi chưa có review */
  average: number;
  count: number;
  /** khóa "1".."5" luôn đủ 5 khóa */
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
}

/** POST /admin/reviews/{id}/reply (body) → Review */
export interface ReplyRequest {
  /** ≤ 2000 */
  content: string;
}
/** PATCH /admin/reviews/bulk/approve|reject (body) → Review[] */
export interface BulkIdsRequest {
  /** 1–100 */
  ids: string[];
}

// =====================================================================================================
// 10. media-service
// =====================================================================================================

/** POST /media/upload (multipart: file, bucket) → MediaFile; GET /media/files/{id}/info → MediaFile */
export interface MediaFile extends Audit {
  id: number;
  fileName: string;
  storageType: StorageType;
  objectKey: string;
  bucket: MediaBucket;
  /** URL dùng trực tiếp cho <img> (qua gateway), vd "http://localhost:8000/api/v1/media/files/11" */
  url: string;
  mimeType: string | null;
  fileSize: number;
  checksum: string | null;
}
/** POST /media/files/bulk-delete (body) → { deleted: number } */
export interface BulkDeleteIdsRequest {
  ids: number[];
}

// =====================================================================================================
// 11. notification-service
// =====================================================================================================

/** POST /notifications/stream-ticket → StreamTicket (dùng cho EventSource, 1 lần) */
export interface StreamTicket {
  ticket: string;
  /** giây */
  expiresIn: number;
}
/**
 * Event của GET /notifications/stream (SSE). `data` là JSON:
 * - "unread-count": {count} — gửi ngay khi mở kết nối
 * - "notification": Notification — thông báo mới
 */
export type NotificationStreamEvent =
  | { event: 'unread-count'; data: { count: number } }
  | { event: 'notification'; data: Notification };

/** GET /orders/purchased?sku= → PurchaseCheck (người đang đăng nhập đã mua SKU chưa: có đơn hoàn tất chứa SKU) */
export interface PurchaseCheck {
  sku: string;
  purchased: boolean;
  /** đơn hoàn tất gần nhất chứa SKU */
  orderCode: string | null;
}

/**
 * GET /notifications?page=&size= → PageResponse<Notification> (mới nhất trước).
 * Tự sinh từ event: ORDER_STATUS / PAYMENT (data: {order_code, status}), REVIEW_REPLY (data: {review_id, sku, product_id}).
 */
export interface Notification {
  id: ObjectIdHex;
  userId: UUID;
  type: NotificationType;
  channel: 'IN_APP' | 'EMAIL';
  title: string;
  content: string;
  /** dữ liệu điều hướng, vd {"order_code": "DH20261023000007"} (snake_case) */
  data: Record<string, unknown> | null;
  isRead: boolean;
  readAt: IsoInstant | null;
  sendStatus: NotificationSendStatus | null;
  sourceEventId: string | null;
  createdAt: IsoInstant;
}
/** GET /notifications/unread-count → { count } */
export interface UnreadCount {
  count: number;
}
/** PATCH /notifications/read-all → { updated } */
export interface UpdatedCount {
  updated: number;
}

// =====================================================================================================
// 12. ai-service (chat công khai /ai/**, quản trị kho tri thức /admin/knowledge/**)
// =====================================================================================================

/** POST /ai/chat và POST /ai/chat/stream (body, public; có token thì phiên gắn với user) */
export interface ChatRequest {
  /** bỏ trống ở câu đầu → server tạo phiên mới; gửi lại để giữ ngữ cảnh. 8–64 ký tự [A-Za-z0-9-] */
  sessionId?: string | null;
  /** 1–1000 ký tự */
  message: string;
}
/** POST /ai/chat → ChatResponse (chờ hết câu trả lời; model chạy local có thể mất vài chục giây đến vài phút) */
export interface ChatResponse {
  sessionId: string;
  /** văn bản thuần (có thể có markdown nhẹ), luôn kèm mã SKU khi gợi ý sản phẩm */
  answer: string;
  /** id nhật ký để gửi phản hồi; null nếu server không ghi được nhật ký */
  requestId: number | null;
}
/**
 * POST /ai/chat/stream (Accept: text/event-stream) → mỗi sự kiện SSE `data:` là một ChatStreamEvent (JSON), theo thứ tự:
 * session → status* → token+ → done; lỗi giữa chừng: error thay cho token/done. Nối các token lại thành câu trả lời
 * (hiện server gửi cả câu trong một token). Lỗi trước khi bắt đầu (sessionId sai, phiên của người khác, phiên đang
 * trả lời câu khác → 409) trả envelope ResponseData như API thường, không phải SSE.
 */
export type ChatStreamEvent =
  | { type: 'session'; sessionId: string; text: null; requestId: null }
  /** việc trợ lý đang làm, vd "Đang tra giá GPU-MSI-4070S-12G" */
  | { type: 'status'; text: string; sessionId: null; requestId: null }
  | { type: 'token'; text: string; sessionId: null; requestId: null }
  | { type: 'done'; sessionId: string; requestId: number | null; text: null }
  /** text: thông báo cho khách */
  | { type: 'error'; text: string; sessionId: null; requestId: null };

/** GET /ai/chat/sessions?limit= (token, tối đa 50) → ChatSessionSummary[] mới nhất trước. Phiên vãng lai không có ở đây */
export interface ChatSessionSummary {
  sessionId: string;
  /** câu hỏi đầu tiên, cắt 60 ký tự */
  title: string;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
}
/**
 * GET /ai/chat/sessions/{sessionId} → ChatSessionDetail · DELETE cùng đường dẫn → null (xóa thật).
 * Phiên vãng lai: ai có sessionId cũng xem được; phiên đã gắn user: chỉ chủ phiên (khác → 403).
 * Phiên không dùng 30 ngày tự xóa.
 */
export interface ChatSessionDetail extends ChatSessionSummary {
  turns: ChatTurn[];
}
export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
  /** chỉ có ở lượt assistant */
  requestId: number | null;
  at: IsoInstant;
}
/** POST /ai/chat/feedback (body) → null. value 1 hữu ích, -1 không hữu ích; gửi lại thì ghi đè */
export interface ChatFeedbackRequest {
  sessionId: string;
  requestId: number;
  value: 1 | -1;
}

/** 1 Chờ index · 2 Đang index · 3 Đã index · 4 Lỗi · 5 Đã gỡ */
export type KnowledgeStatus = 1 | 2 | 3 | 4 | 5;

/** GET /admin/knowledge?sourceType=&status=&q=&page=&size= (perm knowledge:write) → PageResponse<KnowledgeDocument> */
export interface KnowledgeDocumentQuery {
  sourceType?: KnowledgeSourceType;
  /** bỏ trống = mọi trạng thái trừ 5 (đã gỡ) */
  status?: KnowledgeStatus;
  /** tìm theo tiêu đề hoặc sourceRef */
  q?: string;
}
export interface KnowledgeDocument {
  id: number;
  title: string;
  sourceType: KnowledgeSourceType;
  /** SKU (sản phẩm) hoặc mã/URL tài liệu */
  sourceRef: string | null;
  status: KnowledgeStatus;
  chunkCount: number;
  embeddingModel: string | null;
  errorMessage: string | null;
  indexedAt: IsoInstant | null;
  createdBy: UUID | null;
  createdAt: IsoInstant | null;
  updatedAt: IsoInstant | null;
}
/** GET /admin/knowledge/{id} → KnowledgeDocumentDetail */
export interface KnowledgeDocumentDetail {
  document: KnowledgeDocument;
  chunks: KnowledgeChunk[];
}
export interface KnowledgeChunk {
  id: number;
  chunkIndex: number;
  content: string;
  tokenCount: number | null;
  metadata: Record<string, unknown> | null;
}

/** POST /admin/knowledge (body) → IngestResult. Cùng sourceType + sourceRef với tài liệu đã có → index lại tài liệu đó */
export interface KnowledgeRequest {
  /** ≤ 255 ký tự */
  title: string;
  /** 2 Hướng dẫn · 3 Chính sách · 4 FAQ */
  sourceType: 2 | 3 | 4;
  /** ≤ 50 ký tự */
  sourceRef?: string | null;
  /** ≤ 200 000 ký tự; chia chunk ~2000 ký tự, chồng 200 */
  content: string;
  metadata?: Record<string, unknown> | null;
}
export interface IngestResult {
  /** -1 khi skipped */
  documentId: number;
  chunkCount: number;
  /** true: nội dung không đổi (content_hash), bỏ qua embed lại */
  skipped: boolean;
}
/** DELETE /admin/knowledge/{id} → null: xóa thật chunk, tài liệu chuyển status 5 */

/**
 * POST /admin/knowledge/sync-products → SyncResult: index mọi sản phẩm ACTIVE (bỏ qua cái không đổi) và gỡ sản phẩm
 * không còn bán. Bình thường không cần: catalog tự báo qua Kafka product.updated / product.hidden.
 */
export interface SyncResult {
  total: number;
  indexed: number;
  skipped: number;
  removed: number;
}

/** GET /admin/knowledge/search?q=&category=&k= (k 1–20) → ScoredChunk[]: xem retriever lấy ra gì */
export interface ScoredChunk {
  chunkId: number;
  documentId: number;
  title: string;
  content: string;
  /** vd {"sku":"...","category":"GPU","brand":"MSI"} */
  metadata: Record<string, unknown> | null;
  vectorScore: number;
  textScore: number;
  /** 0.7 × vectorScore + 0.3 × textScore (thứ tự xếp hạng) */
  score: number;
}
