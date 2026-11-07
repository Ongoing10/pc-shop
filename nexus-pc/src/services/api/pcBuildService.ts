import { PcBuild, PcBuildItem, SavePcBuildPayload } from '../../types/pcBuild';
import { Product } from '../../types/product';
import { storageService } from '../storage/storageService';
import { checkCompatibility } from './compatibilityService';
import { initialProducts } from './mockData';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const BUILDS_KEY = 'nexus_pc_builds';

const productOf = (id: string): Product | undefined => initialProducts.find((p) => p.id === id);

/** Ghép sản phẩm vào từng dòng cấu hình, bỏ dòng có sản phẩm không còn tồn tại */
export const resolveBuildItems = (items: PcBuildItem[]) =>
  items.flatMap((item) => {
    const product = productOf(item.productId);
    return product ? [{ ...item, product }] : [];
  });

const summarize = (items: PcBuildItem[]) => {
  const lines = resolveBuildItems(items);
  const compatibility = checkCompatibility(lines);
  return {
    totalPrice: lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0),
    estimatedWattage: compatibility.estimatedWattage,
    compatibility,
  };
};

const randomCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const demoItems: PcBuildItem[] = [
  { slot: 'cpu', productId: 'cpu7800', quantity: 1 },
  { slot: 'mainboard', productId: 'mb650', quantity: 1 },
  { slot: 'ram', productId: 'ramking', quantity: 1 },
  { slot: 'gpu', productId: 'gpu5070', quantity: 1 },
  { slot: 'ssd', productId: 'ssd990', quantity: 1 },
  { slot: 'psu', productId: 'psu850', quantity: 1 },
  { slot: 'case', productId: 'caseh9', quantity: 1 },
  { slot: 'cooler', productId: 'cooler360', quantity: 1 },
];

const DEMO_BUILDS: PcBuild[] = [
  {
    code: 'GAMING2K',
    name: 'Gaming 2K tầm trung',
    purpose: 'Chơi game 1440p, stream nhẹ',
    isPublic: true,
    items: demoItems,
    ...summarize(demoItems),
    ownerName: 'Khách hàng NEXUS',
    createdAt: '2026-10-20T08:00:00.000Z',
    updatedAt: '2026-10-28T10:30:00.000Z',
  },
];

const readBuilds = (): PcBuild[] => storageService.get<PcBuild[] | null>(BUILDS_KEY, null) ?? DEMO_BUILDS;
const writeBuilds = (builds: PcBuild[]) => storageService.set(BUILDS_KEY, builds);

// Mock trên localStorage. Bản thật: /pc-builds của catalog-service (my, {code}, POST, PUT, DELETE, bulk-delete).
export const pcBuildService = {
  async getMyBuilds(): Promise<PcBuild[]> {
    await delay(150);
    return [...readBuilds()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  /** Backend chỉ trả cấu hình của chính mình hoặc cấu hình công khai */
  async getBuild(code: string): Promise<PcBuild | null> {
    await delay(150);
    return readBuilds().find((b) => b.code === code.toUpperCase()) ?? null;
  },

  async saveBuild(payload: SavePcBuildPayload, ownerName: string, code?: string): Promise<PcBuild> {
    await delay(250);
    const builds = readBuilds();
    const now = new Date().toISOString();
    const existing = code ? builds.find((b) => b.code === code) : undefined;

    const saved: PcBuild = {
      code: existing?.code ?? randomCode(),
      ...payload,
      ...summarize(payload.items),
      ownerName,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    writeBuilds(existing ? builds.map((b) => (b.code === saved.code ? saved : b)) : [saved, ...builds]);
    return saved;
  },

  async deleteBuilds(codes: string[]): Promise<void> {
    await delay(150);
    writeBuilds(readBuilds().filter((b) => !codes.includes(b.code)));
  },
};
