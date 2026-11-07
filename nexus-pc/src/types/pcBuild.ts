import { BuilderSlotId } from './product';

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
}

export interface PcBuildItem {
  slot: BuilderSlotId;
  productId: string;
  quantity: number;
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
