import { Province, UserAddress, UserAddressInput, Ward } from '../../types/user';
import { storageService } from '../storage/storageService';
import { mockProvinces, mockWards } from './locationData';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ADDRESSES_KEY = 'nexus_addresses';

const DEFAULT_ADDRESSES: UserAddress[] = [
  {
    id: 'addr_01',
    isDefault: true,
    receiverName: 'Khách hàng NEXUS',
    receiverPhone: '0988888888',
    provinceCode: '01',
    provinceName: 'Thành phố Hà Nội',
    wardCode: '00160',
    wardName: 'Phường Cầu Giấy',
    addressDetail: 'Số 18 Trần Thái Tông',
  },
  {
    id: 'addr_02',
    isDefault: false,
    receiverName: 'Nguyễn Văn A',
    receiverPhone: '0912345678',
    provinceCode: '79',
    provinceName: 'Thành phố Hồ Chí Minh',
    wardCode: '26740',
    wardName: 'Phường Bến Thành',
    addressDetail: '120 Lê Lợi, tầng 3',
  },
];

const read = (): UserAddress[] => storageService.get<UserAddress[] | null>(ADDRESSES_KEY, null) ?? DEFAULT_ADDRESSES;
const write = (list: UserAddress[]) => storageService.set(ADDRESSES_KEY, list);

/** Chỉ một địa chỉ mặc định; danh sách còn địa chỉ thì luôn có một cái mặc định */
const normalizeDefault = (list: UserAddress[], defaultId?: string): UserAddress[] => {
  const targetId = defaultId ?? list.find((a) => a.isDefault)?.id ?? list[0]?.id;
  return list.map((a) => ({ ...a, isDefault: a.id === targetId }));
};

export const formatAddress = (a: Pick<UserAddress, 'addressDetail' | 'wardName' | 'provinceName'>): string =>
  [a.addressDetail, a.wardName, a.provinceName].filter(Boolean).join(', ');

export const PHONE_PATTERN = /^0\d{9}$/;

// Mock trên localStorage. Bản thật: /addresses và /locations của customer-service.
export const addressService = {
  async getAddresses(): Promise<UserAddress[]> {
    await delay(120);
    // Mặc định lên đầu như sổ địa chỉ của backend
    return [...read()].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  },

  async createAddress(input: UserAddressInput): Promise<UserAddress> {
    await delay(150);
    const created: UserAddress = { ...input, id: `addr_${Date.now()}` };
    const list = [...read(), created];
    write(normalizeDefault(list, input.isDefault || list.length === 1 ? created.id : undefined));
    return created;
  },

  async updateAddress(id: string, input: UserAddressInput): Promise<UserAddress> {
    await delay(150);
    const list = read().map((a) => (a.id === id ? { ...input, id } : a));
    write(normalizeDefault(list, input.isDefault ? id : undefined));
    return { ...input, id };
  },

  async deleteAddress(id: string): Promise<void> {
    await delay(120);
    write(normalizeDefault(read().filter((a) => a.id !== id)));
  },

  async setDefault(id: string): Promise<void> {
    await delay(100);
    write(normalizeDefault(read(), id));
  },

  async getProvinces(): Promise<Province[]> {
    await delay(60);
    return mockProvinces;
  },

  async getWards(provinceCode: string): Promise<Ward[]> {
    await delay(60);
    return mockWards[provinceCode] ?? [];
  },
};
