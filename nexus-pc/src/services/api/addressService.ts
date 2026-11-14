import type * as Api from '../../types/api';
import { Province, UserAddress, UserAddressInput, Ward } from '../../types/user';
import { BaseService } from './BaseService';

export const formatAddress = (a: Pick<UserAddress, 'addressDetail' | 'wardName' | 'provinceName'>): string =>
  [a.addressDetail, a.wardName, a.provinceName].filter(Boolean).join(', ');

export const PHONE_PATTERN = /^0\d{9}$/;

/** id địa chỉ ở backend là số, FE dùng chuỗi cho thống nhất với các id khác */
export const toUserAddress = (a: Api.UserAddress | Api.CheckoutAddress): UserAddress => ({
  id: String(a.id),
  isDefault: a.isDefault,
  receiverName: a.receiverName,
  receiverPhone: a.receiverPhone,
  provinceCode: a.provinceCode,
  provinceName: a.provinceName,
  wardCode: a.wardCode,
  wardName: a.wardName,
  addressDetail: a.addressDetail,
});

const toRequest = (input: UserAddressInput): Api.AddressRequest => ({
  receiverName: input.receiverName,
  receiverPhone: input.receiverPhone,
  provinceCode: input.provinceCode,
  wardCode: input.wardCode,
  addressDetail: input.addressDetail,
  isDefault: input.isDefault,
});

/** customer-service: sổ địa chỉ (/addresses) và danh mục hành chính 2 cấp (/locations) */
class AddressService extends BaseService {
  constructor() {
    super('');
  }

  /** Mặc định lên đầu, rồi mới nhất trước (backend đã sắp) */
  async getAddresses(): Promise<UserAddress[]> {
    return (await this.get<Api.UserAddress[]>('/addresses')).map(toUserAddress);
  }

  async createAddress(input: UserAddressInput): Promise<UserAddress> {
    return toUserAddress(await this.post<Api.UserAddress>('/addresses', toRequest(input)));
  }

  async updateAddress(id: string, input: UserAddressInput): Promise<UserAddress> {
    return toUserAddress(await this.put<Api.UserAddress>(`/addresses/${id}`, toRequest(input)));
  }

  async deleteAddress(id: string): Promise<void> {
    await this.remove(`/addresses/${id}`);
  }

  async setDefault(id: string): Promise<void> {
    await this.patch(`/addresses/${id}/default`);
  }

  getProvinces(): Promise<Province[]> {
    return this.get<Api.ProvinceItem[]>('/locations/provinces');
  }

  getWards(provinceCode: string): Promise<Ward[]> {
    return this.get<Api.Ward[]>(`/locations/provinces/${encodeURIComponent(provinceCode)}/wards`);
  }
}

export const addressService = new AddressService();
