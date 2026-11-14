import { addressService } from '../services/api/addressService';
import { UserAddressInput } from '../types/user';
import { createQueryKeys, useApiMutation, useApiQuery } from './BaseHook';

const keys = createQueryKeys('addresses');

export const addressKeys = {
  all: keys.all,
  provinces: ['locations', 'provinces'] as const,
  wards: (provinceCode: string) => ['locations', 'wards', provinceCode] as const,
};

export function useAddresses(enabled = true) {
  return useApiQuery(addressKeys.all, () => addressService.getAddresses(), { enabled });
}

/** Thêm mới khi không có id, sửa khi có id */
export function useSaveAddress() {
  return useApiMutation(
    ({ id, input }: { id?: string; input: UserAddressInput }) =>
      id ? addressService.updateAddress(id, input) : addressService.createAddress(input),
    { invalidate: [addressKeys.all] }
  );
}

export function useDeleteAddress() {
  return useApiMutation((id: string) => addressService.deleteAddress(id), { invalidate: [addressKeys.all] });
}

export function useSetDefaultAddress() {
  return useApiMutation((id: string) => addressService.setDefault(id), { invalidate: [addressKeys.all] });
}

export function useProvinces() {
  return useApiQuery(addressKeys.provinces, () => addressService.getProvinces(), { staleTime: Infinity });
}

export function useWards(provinceCode: string | undefined) {
  return useApiQuery(addressKeys.wards(provinceCode || ''), () => addressService.getWards(provinceCode!), {
    enabled: Boolean(provinceCode),
    staleTime: Infinity,
  });
}
