import { Product } from '../../types/product';
import { CompatibilityIssue, CompatibilityResult } from '../../types/pcBuild';

/** Công suất cho mainboard, RAM, ổ cứng, quạt: cộng một lần khi cấu hình có linh kiện */
const BASE_SYSTEM_WATTAGE = 80;
/** Nguồn nên dư ít nhất 20% so với công suất ước tính */
const PSU_HEADROOM = 1.2;

export interface CompatibilityLine {
  product: Product;
  quantity: number;
}

/**
 * Bản mô phỏng rule engine của catalog-service (POST /compatibility/check): tất định, cùng đầu vào luôn cùng kết quả.
 * Khi ghép API chỉ cần thay thân hàm bằng lời gọi API, giữ nguyên kiểu trả về.
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
