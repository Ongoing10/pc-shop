import type * as Api from '../../types/api';
import { adminCatalogService as catalog } from '../../services/api/admin/adminCatalogService';
import { adminInventoryService as inventory } from '../../services/api/admin/adminInventoryService';
import { adminOrderService as ordering } from '../../services/api/admin/adminOrderService';
import { adminPeopleService as people } from '../../services/api/admin/adminPeopleService';
import { createQueryKeys, useApiMutation, useApiQuery } from '../BaseHook';

/**
 * Hook dữ liệu khu quản trị. Mỗi nhóm có một khóa gốc (`adminKeys.*`); thao tác ghi làm mới nhóm của nó
 * và các nhóm bị ảnh hưởng (vd đổi trạng thái đơn → hoàn tiền, thống kê).
 */
const k = {
  categories: createQueryKeys('admin-categories'),
  brands: createQueryKeys('admin-brands'),
  rules: createQueryKeys('admin-rules'),
  products: createQueryKeys('admin-products'),
  orders: createQueryKeys('admin-orders'),
  refunds: createQueryKeys('admin-refunds'),
  vouchers: createQueryKeys('admin-vouchers'),
  stats: createQueryKeys('admin-stats'),
  warehouses: createQueryKeys('admin-warehouses'),
  inventory: createQueryKeys('admin-inventory'),
  movements: createQueryKeys('admin-movements'),
  users: createQueryKeys('admin-users'),
  reviews: createQueryKeys('admin-reviews'),
};

export const adminKeys = {
  categories: k.categories.all,
  brands: k.brands.all,
  rules: k.rules.all,
  products: k.products.all,
  orders: k.orders.all,
  refunds: k.refunds.all,
  vouchers: k.vouchers.all,
  stats: k.stats.all,
  warehouses: k.warehouses.all,
  inventory: k.inventory.all,
  movements: k.movements.all,
  users: k.users.all,
  reviews: k.reviews.all,
};

// ======================= catalog =======================

export const useAdminCategories = () => useApiQuery(k.categories.all, () => catalog.listCategories());
export const useAdminBrands = () => useApiQuery(k.brands.all, () => catalog.listBrands());
export const useAdminRules = () => useApiQuery(k.rules.all, () => catalog.listRules());
export const useAdminProducts = () => useApiQuery(k.products.all, () => catalog.listProducts());
export const useAdminProduct = (sku: string | undefined) =>
  useApiQuery(k.products.of('detail', sku), () => catalog.getProduct(sku!), { enabled: Boolean(sku) });

export const useCreateCategory = () =>
  useApiMutation((body: Api.CategoryRequest) => catalog.createCategory(body), { invalidate: [k.categories.all] });
export const useUpdateCategory = () =>
  useApiMutation(({ code, body }: { code: string; body: Api.UpdateCategoryRequest }) => catalog.updateCategory(code, body), {
    invalidate: [k.categories.all],
  });
export const useSetCategoriesActive = () =>
  useApiMutation(({ codes, active }: { codes: string[]; active: boolean }) => catalog.setCategoriesActive(codes, active), {
    invalidate: [k.categories.all],
  });

export const useCreateBrand = () =>
  useApiMutation((body: Api.BrandRequest) => catalog.createBrand(body), { invalidate: [k.brands.all] });
export const useUpdateBrand = () =>
  useApiMutation(({ code, body }: { code: string; body: Api.UpdateBrandRequest }) => catalog.updateBrand(code, body), {
    invalidate: [k.brands.all],
  });
export const useSetBrandsActive = () =>
  useApiMutation(({ codes, active }: { codes: string[]; active: boolean }) => catalog.setBrandsActive(codes, active), {
    invalidate: [k.brands.all],
  });

export const useCreateRule = () =>
  useApiMutation((body: Api.RuleRequest) => catalog.createRule(body), { invalidate: [k.rules.all] });
export const useUpdateRule = () =>
  useApiMutation(({ code, body }: { code: string; body: Api.UpdateRuleRequest }) => catalog.updateRule(code, body), {
    invalidate: [k.rules.all],
  });
export const useSetRulesActive = () =>
  useApiMutation(({ codes, active }: { codes: string[]; active: boolean }) => catalog.setRulesActive(codes, active), {
    invalidate: [k.rules.all],
  });

export const useCreateProduct = () =>
  useApiMutation((body: Api.CreateProductRequest) => catalog.createProduct(body), { invalidate: [k.products.all] });
export const useUpdateProduct = () =>
  useApiMutation(({ sku, body }: { sku: string; body: Api.UpdateProductRequest }) => catalog.updateProduct(sku, body), {
    invalidate: [k.products.all],
  });
export const useSetProductStatus = () =>
  useApiMutation(({ sku, status }: { sku: string; status: Api.ProductStatus }) => catalog.setProductStatus(sku, status), {
    invalidate: [k.products.all],
  });
export const useSetProductsStatus = () =>
  useApiMutation(({ skus, status }: { skus: string[]; status: Api.ProductStatus }) => catalog.setProductsStatus(skus, status), {
    invalidate: [k.products.all],
  });
export const useSetProductPrice = () =>
  useApiMutation(({ sku, body }: { sku: string; body: Api.ProductPriceRequest }) => catalog.setProductPrice(sku, body), {
    invalidate: [k.products.all],
  });
export const useSetProductsPrice = () =>
  useApiMutation((body: Api.BulkPriceRequest) => catalog.setProductsPrice(body), { invalidate: [k.products.all] });

export const useValidateProductImport = () =>
  useApiMutation(({ file, category, mode }: { file: File; category: string; mode: Api.ImportMode }) =>
    catalog.validateProductImport(file, category, mode)
  );
export const useCommitProductImport = () =>
  useApiMutation((importId: string) => catalog.commitProductImport(importId), { invalidate: [k.products.all] });

// ======================= ordering =======================

export const useAdminOrders = () => useApiQuery(k.orders.all, () => ordering.listOrders());

/** Đơn + sản phẩm + lịch sử trạng thái + thanh toán của một đơn */
export const useAdminOrderDetail = (code: string | undefined) =>
  useApiQuery(
    k.orders.of('detail', code),
    async () => {
      const [detail, timeline, payments] = await Promise.all([
        ordering.getOrder(code!),
        ordering.getTimeline(code!),
        ordering.getPayments(code!),
      ]);
      return { ...detail, timeline, payments };
    },
    { enabled: Boolean(code) }
  );

export const useChangeOrderStatus = () =>
  useApiMutation(
    ({ codes, status, reason }: { codes: string[]; status: Api.OrderStatus; reason?: string | null }) =>
      codes.length === 1
        ? ordering.changeStatus(codes[0], { status, reason: reason ?? null }).then((order) => [order])
        : ordering.changeStatusBulk(codes, status, reason),
    { invalidate: [k.orders.all, k.refunds.all, k.stats.all] }
  );

export const useAdminRefunds = () => useApiQuery(k.refunds.all, () => ordering.listRefunds());
export const useCompleteRefund = () =>
  useApiMutation(({ id, providerRefundId }: { id: number; providerRefundId: string | null }) => ordering.completeRefund(id, providerRefundId), {
    invalidate: [k.refunds.all, k.orders.all],
  });

export const useAdminVouchers = () => useApiQuery(k.vouchers.all, () => ordering.listVouchers());
export const useCreateVoucher = () =>
  useApiMutation((body: Api.CreateVoucherRequest) => ordering.createVoucher(body), { invalidate: [k.vouchers.all] });
export const useUpdateVoucher = () =>
  useApiMutation(({ id, body }: { id: number; body: Api.UpdateVoucherRequest }) => ordering.updateVoucher(id, body), {
    invalidate: [k.vouchers.all],
  });
export const useSetVouchersActive = () =>
  useApiMutation(({ ids, active }: { ids: number[]; active: boolean }) => ordering.setVouchersActive(ids, active), {
    invalidate: [k.vouchers.all],
  });

export const useStatsOverview = (from?: string, to?: string) =>
  useApiQuery(k.stats.of('overview', from, to), () => ordering.getOverview(from, to));
export const useTopProducts = (from?: string, to?: string, limit = 10) =>
  useApiQuery(k.stats.of('top', from, to, limit), () => ordering.getTopProducts(from, to, limit));

// ======================= inventory =======================

export const useAdminWarehouses = () => useApiQuery(k.warehouses.all, () => inventory.listWarehouses());
export const useCreateWarehouse = () =>
  useApiMutation((body: Api.WarehouseRequest) => inventory.createWarehouse(body), { invalidate: [k.warehouses.all] });
export const useUpdateWarehouse = () =>
  useApiMutation(({ id, body }: { id: number; body: Api.UpdateWarehouseRequest }) => inventory.updateWarehouse(id, body), {
    invalidate: [k.warehouses.all],
  });
export const useSetWarehousesActive = () =>
  useApiMutation(({ ids, active }: { ids: number[]; active: boolean }) => inventory.setWarehousesActive(ids, active), {
    invalidate: [k.warehouses.all],
  });

export const useAdminInventory = () => useApiQuery(k.inventory.all, () => inventory.listInventory());
export const useAdminMovements = () => useApiQuery(k.movements.all, () => inventory.listMovements());
export const useImportStock = () =>
  useApiMutation((body: Api.InventoryImportRequest) => inventory.importStock(body), {
    invalidate: [k.inventory.all, k.movements.all],
  });
export const useAdjustStock = () =>
  useApiMutation(
    ({ sku, warehouseId, delta, note }: { sku: string; warehouseId: number; delta: number; note?: string }) =>
      inventory.adjustStock(sku, warehouseId, delta, note),
    { invalidate: [k.inventory.all, k.movements.all] }
  );
export const useValidateStockImport = () =>
  useApiMutation(({ file, referenceCode }: { file: File; referenceCode?: string }) => inventory.validateStockImport(file, referenceCode));
export const useCommitStockImport = () =>
  useApiMutation((importId: string) => inventory.commitStockImport(importId), {
    invalidate: [k.inventory.all, k.movements.all],
  });

// ======================= tài khoản & đánh giá =======================

export const useAdminUsers = (keyword?: string) => useApiQuery(k.users.of(keyword ?? ''), () => people.listUsers(keyword));
export const useCreateStaff = () =>
  useApiMutation((body: Api.CreateStaffRequest) => people.createStaff(body), { invalidate: [k.users.all] });
export const useSetUserRoles = () =>
  useApiMutation(({ id, body }: { id: string; body: Api.RolesRequest }) => people.setRoles(id, body), {
    invalidate: [k.users.all],
  });
export const useSetUserLocked = () =>
  useApiMutation(({ id, locked }: { id: string; locked: boolean }) => (locked ? people.lockUser(id) : people.unlockUser(id)), {
    invalidate: [k.users.all],
  });

export const useAdminReviews = () => useApiQuery(k.reviews.all, () => people.listReviews());
export const useModerateReviews = () =>
  useApiMutation(({ ids, approve }: { ids: string[]; approve: boolean }) => (approve ? people.approveReviews(ids) : people.rejectReviews(ids)), {
    invalidate: [k.reviews.all],
  });
export const useReplyReview = () =>
  useApiMutation(({ id, content }: { id: string; content: string }) => people.replyReview(id, content), {
    invalidate: [k.reviews.all],
  });
