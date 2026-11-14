import type * as Api from '../../../types/api';
import { BaseService } from '../BaseService';
import type { DownloadedFile } from './adminCatalogService';

/** inventory-service phía quản trị: kho, tồn kho, biến động kho, nhập kho (/warehouses, /admin/**) */
class AdminInventoryService extends BaseService {
  constructor() {
    super('');
  }

  // ----- kho -----
  /** STAFF/ADMIN, kể cả kho đã tắt */
  listWarehouses() {
    return this.get<Api.Warehouse[]>('/warehouses');
  }
  createWarehouse(body: Api.WarehouseRequest) {
    return this.post<Api.Warehouse>('/admin/warehouses', body);
  }
  updateWarehouse(id: number, body: Api.UpdateWarehouseRequest) {
    return this.put<Api.Warehouse>(`/admin/warehouses/${id}`, body);
  }
  setWarehousesActive(ids: number[], active: boolean) {
    return this.patch<Api.Warehouse[]>('/admin/warehouses/bulk/active', { ids, active } satisfies Api.BulkActiveIdsRequest);
  }

  // ----- tồn kho -----
  listInventory(query: Api.AdminInventoryQuery = {}) {
    return this.getAllPages<Api.Inventory>('/admin/inventory', { ...query });
  }
  /** Phiếu nhập kho nhiều dòng; trả các dòng tồn sau khi nhập */
  importStock(body: Api.InventoryImportRequest) {
    return this.post<Api.Inventory[]>('/admin/inventory/import', body);
  }
  /** Điều chỉnh tồn một SKU tại một kho (delta có dấu) */
  adjustStock(sku: string, warehouseId: number, delta: number, note?: string) {
    return this.put<Api.StockResponse>(`/inventory/${encodeURIComponent(sku)}/adjust`, undefined, {
      params: { warehouseId, delta, note: note || undefined },
    });
  }
  exportInventory(query: Pick<Api.AdminInventoryQuery, 'warehouseId' | 'lowStock'>): Promise<DownloadedFile> {
    return this.download('/admin/inventory/export', { ...query });
  }

  // ----- biến động kho -----
  listMovements(query: Api.StockMovementQuery = {}) {
    return this.getAllPages<Api.StockMovement>('/admin/inventory/movements', { ...query }, { size: 100, maxPages: 5 });
  }

  // ----- nhập kho bằng Excel -----
  downloadStockTemplate(): Promise<DownloadedFile> {
    return this.download('/admin/inventory/import/excel/template');
  }
  validateStockImport(file: File, referenceCode?: string) {
    const form = new FormData();
    form.append('file', file);
    if (referenceCode) form.append('referenceCode', referenceCode);
    return this.uploadForm<Api.ImportValidateResult<Api.StockImportPreviewRow>>('/admin/inventory/import/excel/validate', form);
  }
  downloadStockImportResult(importId: string): Promise<DownloadedFile> {
    return this.download(`/admin/inventory/import/excel/${importId}/result-file`);
  }
  commitStockImport(importId: string) {
    return this.post<Api.ImportResult>('/admin/inventory/import/excel', { importId } satisfies Api.ImportCommitRequest);
  }
}

export const adminInventoryService = new AdminInventoryService();
