import type * as Api from '../../types/api';
import { PcBuild, PcBuildItem, SavePcBuildPayload } from '../../types/pcBuild';
import { BuilderSlotId, Product } from '../../types/product';
import { BaseService } from './BaseService';
import { isApiError } from './ApiError';
import { toCompatibilityIssue } from './compatibilityService';
import { toCategoryCode, toCategoryId } from './mappers/catalogMapper';
import { productService } from './productService';

/** Ghép sản phẩm vào từng dòng cấu hình, bỏ dòng có sản phẩm không còn bán */
export const resolveBuildItems = (items: PcBuildItem[]) =>
  items.flatMap((item) => (item.product ? [{ ...item, product: item.product }] : []));

/** Backend không lưu tên chủ cấu hình; link chia sẻ hiển thị tên chung */
const ANONYMOUS_OWNER = 'Khách hàng';

const toPcBuild = (b: Api.PcBuild, products: Map<string, Product>): PcBuild => ({
  code: b.code,
  name: b.name ?? '',
  purpose: b.purpose ?? undefined,
  isPublic: b.isPublic,
  items: b.items.map((i) => ({
    slot: toCategoryId(i.slot) as BuilderSlotId,
    productId: i.sku,
    quantity: i.quantity,
    product: products.get(i.sku),
  })),
  totalPrice: b.totalPrice,
  estimatedWattage: b.estimatedWattage,
  compatibility: {
    compatible: b.compatibilityResult.isCompatible,
    issues: b.compatibilityResult.issues.map(toCompatibilityIssue),
    estimatedWattage: b.estimatedWattage,
    requiredWattage: b.requiredWattage ?? undefined,
  },
  ownerName: ANONYMOUS_OWNER,
  createdAt: b.createdAt,
  updatedAt: b.updatedAt,
});

/** catalog-service: cấu hình PC đã lưu (/pc-builds) */
class PcBuildService extends BaseService {
  constructor() {
    super('/pc-builds');
  }

  private async withProducts(builds: Api.PcBuild[]): Promise<PcBuild[]> {
    const products = await productService.getProductsBySkus(builds.flatMap((b) => b.items.map((i) => i.sku)));
    const bySku = new Map(products.map((p) => [p.id, p]));
    return builds.map((b) => toPcBuild(b, bySku));
  }

  async getMyBuilds(): Promise<PcBuild[]> {
    const builds = await this.withProducts(await this.get<Api.PcBuild[]>('/my'));
    return builds.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  /** Chủ cấu hình hoặc cấu hình công khai; không thấy → null */
  async getBuild(code: string): Promise<PcBuild | null> {
    try {
      const build = await this.get<Api.PcBuild>(`/${encodeURIComponent(code.toUpperCase())}`);
      return (await this.withProducts([build]))[0];
    } catch (e) {
      if (isApiError(e) && (e.status === 404 || e.status === 403)) return null;
      throw e;
    }
  }

  /** Tạo mới, hoặc sửa khi có `code`. Backend tự kiểm tra tương thích và lưu kết quả kèm cấu hình */
  async saveBuild(payload: SavePcBuildPayload, _ownerName: string, code?: string): Promise<PcBuild> {
    const body: Api.PcBuildRequest = {
      name: payload.name,
      purpose: payload.purpose ?? null,
      isPublic: payload.isPublic,
      items: payload.items.map((i) => ({ sku: i.productId, quantity: i.quantity })),
    };
    const saved = code ? await this.put<Api.PcBuild>(`/${code}`, body) : await this.post<Api.PcBuild>('', body);
    return (await this.withProducts([saved]))[0];
  }

  async deleteBuilds(codes: string[]): Promise<void> {
    if (codes.length === 1) await this.remove(`/${codes[0]}`);
    else await this.post<Api.DeletedCount>('/bulk-delete', { codes } satisfies Api.BulkDeleteCodesRequest);
  }
}

export const pcBuildService = new PcBuildService();

/** Slot FE → mã slot backend (PcBuildItem.slot) */
export const toSlotCode = (slot: BuilderSlotId): string => toCategoryCode(slot);
