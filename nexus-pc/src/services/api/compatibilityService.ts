import type * as Api from '../../types/api';
import { Product } from '../../types/product';
import { CompatibilityIssue, CompatibilityResult } from '../../types/pcBuild';
import { BaseService } from './BaseService';

/** Công suất cho mainboard, RAM, ổ cứng, quạt: cộng một lần khi cấu hình có linh kiện */
const BASE_SYSTEM_WATTAGE = 80;
/** Nguồn nên dư ít nhất 20% so với công suất ước tính */
const PSU_HEADROOM = 1.2;

export interface CompatibilityLine {
  product: Product;
  quantity: number;
}

/**
 * Bản rút gọn của rule engine (cùng quy tắc với catalog-service) chỉ để GỢI Ý nhanh trong ngăn chọn linh kiện của
 * PC Builder: kiểm tra từng ứng viên mà gọi API cho mỗi cái thì quá nhiều request. Kết quả chính thức của cả cấu hình
 * (cảnh báo hiển thị, lưu cấu hình) luôn lấy từ POST /compatibility/check qua compatibilityService.check.
 */
export function checkCompatibility(lines: CompatibilityLine[]): CompatibilityResult {
  const bySlot = (category: Product['category']) => lines.find((l) => l.product.category === category)?.product;
  const cpu = bySlot('cpu');
  const mainboard = bySlot('mainboard');
  const ram = bySlot('ram');
  const cooler = bySlot('cooler');
  const pcCase = bySlot('case');
  const psu = bySlot('psu');

  const issues: CompatibilityIssue[] = [];

  if (cpu?.compat?.socket && mainboard?.compat?.socket && cpu.compat.socket !== mainboard.compat.socket) {
    issues.push({
      ruleCode: 'CPU_MAINBOARD_SOCKET',
      severity: 'ERROR',
      message: `CPU dùng socket ${cpu.compat.socket} nhưng mainboard dùng socket ${mainboard.compat.socket}.`,
    });
  }

  if (ram?.compat?.memoryType && mainboard?.compat?.memoryType && ram.compat.memoryType !== mainboard.compat.memoryType) {
    issues.push({
      ruleCode: 'RAM_MAINBOARD_TYPE',
      severity: 'ERROR',
      message: `RAM chuẩn ${ram.compat.memoryType} không lắp được mainboard hỗ trợ ${mainboard.compat.memoryType}.`,
    });
  }

  const socket = cpu?.compat?.socket ?? mainboard?.compat?.socket;
  if (cooler?.compat?.supportedSockets && socket && !cooler.compat.supportedSockets.includes(socket)) {
    issues.push({
      ruleCode: 'COOLER_SOCKET',
      severity: 'ERROR',
      message: `Tản nhiệt không hỗ trợ socket ${socket}.`,
    });
  }

  const formFactor = mainboard?.compat?.formFactor;
  if (pcCase?.compat?.supportedFormFactors && formFactor && !pcCase.compat.supportedFormFactors.includes(formFactor)) {
    issues.push({
      ruleCode: 'CASE_MAINBOARD_FORM_FACTOR',
      severity: 'ERROR',
      message: `Vỏ case không vừa mainboard chuẩn ${formFactor}.`,
    });
  }

  const partsWattage = lines.reduce((sum, l) => sum + (l.product.compat?.tdp ?? 0) * l.quantity, 0);
  const estimatedWattage = lines.length > 0 ? partsWattage + BASE_SYSTEM_WATTAGE : 0;

  const psuWattage = psu?.compat?.wattage;
  if (psuWattage) {
    if (psuWattage < estimatedWattage) {
      issues.push({
        ruleCode: 'PSU_WATTAGE',
        severity: 'ERROR',
        message: `Nguồn ${psuWattage}W thấp hơn công suất ước tính ${estimatedWattage}W.`,
      });
    } else if (psuWattage < estimatedWattage * PSU_HEADROOM) {
      issues.push({
        ruleCode: 'PSU_HEADROOM',
        severity: 'WARNING',
        message: `Nguồn ${psuWattage}W sát công suất ước tính ${estimatedWattage}W, nên dư ít nhất 20%.`,
      });
    }
  }

  return {
    compatible: !issues.some((i) => i.severity === 'ERROR'),
    issues,
    estimatedWattage,
  };
}

export const EMPTY_COMPATIBILITY: CompatibilityResult = { compatible: true, issues: [], estimatedWattage: 0 };

const SEVERITY: Record<Api.CompatSeverity, CompatibilityIssue['severity']> = { 1: 'ERROR', 2: 'WARNING' };

export const toCompatibilityIssue = (i: Api.CompatibilityIssue): CompatibilityIssue => ({
  ruleCode: i.ruleCode,
  severity: SEVERITY[i.severity],
  message: i.message,
});

/** catalog-service: rule engine tương thích tất định (đọc compatibility_rules + products.compat) */
class CompatibilityService extends BaseService {
  constructor() {
    super('/compatibility');
  }

  /** POST /compatibility/check: tối đa 30 SKU, SKU lặp tính là nhiều chiếc */
  async check(lines: Array<{ sku: string; quantity: number }>): Promise<CompatibilityResult> {
    const skus = lines.flatMap((l) => Array<string>(l.quantity).fill(l.sku)).slice(0, 30);
    if (skus.length === 0) return EMPTY_COMPATIBILITY;
    const r = await this.post<Api.CompatibilityCheckResult>('/check', { skus } satisfies Api.SkuBatchRequest);
    return {
      compatible: r.compatible,
      issues: r.issues.map(toCompatibilityIssue),
      estimatedWattage: r.estimatedWattage,
      requiredWattage: r.requiredWattage,
    };
  }
}

export const compatibilityService = new CompatibilityService();
