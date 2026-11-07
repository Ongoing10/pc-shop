import { BuilderSlotId } from '../../types/product';

export interface SlotConfig {
  id: BuilderSlotId;
  labelKey: string;
  defaultLabel: string;
  shortLabel: string;
}

export const BUILDER_SLOTS: SlotConfig[] = [
  { id: 'cpu', labelKey: 'cpu', defaultLabel: 'Bộ vi xử lý (CPU)', shortLabel: 'CPU' },
  { id: 'mainboard', labelKey: 'mainboard', defaultLabel: 'Bo mạch chủ (Mainboard)', shortLabel: 'Mainboard' },
  { id: 'ram', labelKey: 'ram', defaultLabel: 'Bộ nhớ RAM', shortLabel: 'RAM' },
  { id: 'gpu', labelKey: 'gpu', defaultLabel: 'Card đồ họa (VGA)', shortLabel: 'VGA' },
  { id: 'ssd', labelKey: 'ssd', defaultLabel: 'Ổ cứng SSD', shortLabel: 'SSD' },
  { id: 'psu', labelKey: 'psu', defaultLabel: 'Nguồn máy tính (PSU)', shortLabel: 'Nguồn' },
  { id: 'case', labelKey: 'case', defaultLabel: 'Vỏ case máy tính', shortLabel: 'Vỏ case' },
  { id: 'cooler', labelKey: 'cooler', defaultLabel: 'Tản nhiệt CPU', shortLabel: 'Tản nhiệt' },
];

/** Slot cho phép nhiều cái (2 kit RAM, nhiều ổ SSD); slot khác luôn 1 */
export const MULTI_QUANTITY_SLOTS: BuilderSlotId[] = ['ram', 'ssd'];
