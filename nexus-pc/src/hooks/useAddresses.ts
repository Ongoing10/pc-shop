import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addressService } from '../services/api/addressService';
import { UserAddressInput } from '../types/user';

export const addressKeys = {
  all: ['addresses'] as const,
  provinces: ['locations', 'provinces'] as const,
  wards: (provinceCode: string) => ['locations', 'wards', provinceCode] as const,
};

export function useAddresses(enabled = true) {
  return useQuery({
    queryKey: addressKeys.all,
    queryFn: () => addressService.getAddresses(),
    enabled,
  });
}

/** Thêm mới khi không có id, sửa khi có id */
export function useSaveAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: UserAddressInput }) =>
      id ? addressService.updateAddress(id, input) : addressService.createAddress(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: addressKeys.all }),
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => addressService.deleteAddress(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: addressKeys.all }),
  });
}

export function useSetDefaultAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => addressService.setDefault(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: addressKeys.all }),
  });
}

export function useProvinces() {
  return useQuery({
    queryKey: addressKeys.provinces,
    queryFn: () => addressService.getProvinces(),
    staleTime: Infinity,
  });
}

export function useWards(provinceCode: string | undefined) {
  return useQuery({
    queryKey: addressKeys.wards(provinceCode || ''),
    queryFn: () => addressService.getWards(provinceCode || ''),
    enabled: Boolean(provinceCode),
    staleTime: Infinity,
  });
}
