import { BuilderSlotId, Product } from './product';

export type CompatibilitySeverity = 'ERROR' | 'WARNING';

export interface CompatibilityIssue {
  ruleCode: string;
  severity: CompatibilitySeverity;
  message: string;
}

/** Giống response của POST /compatibility/check */
export interface CompatibilityResult {
  compatible: boolean;
  issues: CompatibilityIssue[];
  estimatedWattage: number;
  /** Công suất nguồn tối thiểu (W) đã nhân hệ số an toàn, dùng cho đồng hồ công suất */
  requiredWattage?: number;
}

export interface PcBuildItem {
  slot: BuilderSlotId;
  /** SKU */
  productId: string;
  quantity: number;
  /** Sản phẩm đầy đủ (giá, tồn kho hiện tại); thiếu khi sản phẩm đã ngừng bán / bị ẩn */
  product?: Product;
}

export interface PcBuild {
  code: string;
  name: string;
  purpose?: string;
  isPublic: boolean;
  items: PcBuildItem[];
  totalPrice: number;
  estimatedWattage: number;
  compatibility: CompatibilityResult;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavePcBuildPayload {
  name: string;
  purpose?: string;
  isPublic: boolean;
  items: PcBuildItem[];
}
