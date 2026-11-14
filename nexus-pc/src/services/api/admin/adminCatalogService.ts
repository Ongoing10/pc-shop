import type * as Api from '../../../types/api';
import { BaseService } from '../BaseService';

export interface DownloadedFile {
  blob: Blob;
  fileName: string | null;
}

/** catalog-service phía quản trị: danh mục, thương hiệu, sản phẩm, luật tương thích, import/export Excel (/admin/**) */
class AdminCatalogService extends BaseService {
  constructor() {
    super('/admin');
  }

  // ----- danh mục -----
  listCategories() {
    return this.get<Api.Category[]>('/categories');
  }
  createCategory(body: Api.CategoryRequest) {
    return this.post<Api.Category>('/categories', body);
  }
  updateCategory(code: string, body: Api.UpdateCategoryRequest) {
    return this.put<Api.Category>(`/categories/${code}`, body);
  }
  setCategoriesActive(codes: string[], active: boolean) {
    return this.patch<Api.Category[]>('/categories/bulk/active', { codes, active } satisfies Api.BulkActiveCodesRequest);
  }

  // ----- thương hiệu -----
  listBrands() {
    return this.get<Api.Brand[]>('/brands');
  }
  createBrand(body: Api.BrandRequest) {
    return this.post<Api.Brand>('/brands', body);
  }
  updateBrand(code: string, body: Api.UpdateBrandRequest) {
    return this.put<Api.Brand>(`/brands/${code}`, body);
  }
  setBrandsActive(codes: string[], active: boolean) {
    return this.patch<Api.Brand[]>('/brands/bulk/active', { codes, active } satisfies Api.BulkActiveCodesRequest);
  }

  // ----- luật tương thích -----
  listRules() {
    return this.get<Api.CompatibilityRule[]>('/compatibility-rules');
  }
  createRule(body: Api.RuleRequest) {
    return this.post<Api.CompatibilityRule>('/compatibility-rules', body);
  }
  updateRule(code: string, body: Api.UpdateRuleRequest) {
    return this.put<Api.CompatibilityRule>(`/compatibility-rules/${code}`, body);
  }
  setRulesActive(codes: string[], active: boolean) {
    return this.patch<Api.CompatibilityRule[]>('/compatibility-rules/bulk/active', { codes, active } satisfies Api.BulkActiveCodesRequest);
  }

  // ----- sản phẩm -----
  /** Mọi trạng thái (cả nháp / ẩn), mới sửa trước; lọc và phân trang tiếp phía FE */
  listProducts(query: Api.AdminProductListQuery = {}) {
    return this.getAllPages<Api.Product>('/products', { ...query });
  }
  getProduct(sku: string) {
    return this.get<Api.Product>(`/products/${encodeURIComponent(sku)}`);
  }
  createProduct(body: Api.CreateProductRequest) {
    return this.post<Api.Product>('/products', body);
  }
  updateProduct(sku: string, body: Api.UpdateProductRequest) {
    return this.put<Api.Product>(`/products/${encodeURIComponent(sku)}`, body);
  }
  setProductStatus(sku: string, status: Api.ProductStatus) {
    return this.patch<Api.Product>(`/products/${encodeURIComponent(sku)}/status`, { status } satisfies Api.ProductStatusRequest);
  }
  setProductsStatus(skus: string[], status: Api.ProductStatus) {
    return this.patch<Api.Product[]>('/products/bulk/status', { skus, status } satisfies Api.BulkProductStatusRequest);
  }
  setProductPrice(sku: string, body: Api.ProductPriceRequest) {
    return this.patch<Api.Product>(`/products/${encodeURIComponent(sku)}/price`, body);
  }
  setProductsPrice(body: Api.BulkPriceRequest) {
    return this.patch<Api.Product[]>('/products/bulk/price', body);
  }

  // ----- import / export Excel sản phẩm -----
  downloadProductTemplate(category: string): Promise<DownloadedFile> {
    return this.download('/products/import/template', { category });
  }
  validateProductImport(file: File, category: string, mode: Api.ImportMode) {
    const form = new FormData();
    form.append('file', file);
    form.append('category', category);
    form.append('mode', mode);
    return this.uploadForm<Api.ImportValidateResult<Api.ProductImportPreviewRow>>('/products/import/validate', form);
  }
  downloadProductImportResult(importId: string): Promise<DownloadedFile> {
    return this.download(`/products/import/${importId}/result-file`);
  }
  commitProductImport(importId: string) {
    return this.post<Api.ImportResult>('/products/import', { importId } satisfies Api.ImportCommitRequest);
  }
  exportProducts(params: { category?: string; status?: Api.ProductStatus }): Promise<DownloadedFile> {
    return this.download('/products/export', params);
  }
}

export const adminCatalogService = new AdminCatalogService();
