import {
  QueryKey,
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { ApiError } from '../services/api/ApiError';

/**
 * Tạo bộ query key cho một nhóm dữ liệu: `keys.all` để invalidate cả nhóm, `keys.of('list', params)` cho từng truy vấn.
 * Mọi key bắt đầu bằng tên nhóm nên `invalidateQueries({ queryKey: keys.all })` làm mới đúng nhóm đó.
 */
export const createQueryKeys = <Name extends string>(name: Name) => ({
  all: [name] as const,
  of: (...parts: unknown[]) => [name, ...parts] as const,
});

export const MINUTE = 60 * 1000;

type QueryOptions<TData> = Omit<UseQueryOptions<TData, ApiError, TData, QueryKey>, 'queryKey' | 'queryFn'>;

/** useQuery với kiểu lỗi ApiError; `queryFn` là hàm gọi service */
export function useApiQuery<TData>(queryKey: QueryKey, queryFn: () => Promise<TData>, options?: QueryOptions<TData>) {
  return useQuery<TData, ApiError, TData, QueryKey>({ queryKey, queryFn, ...options });
}

interface ApiMutationOptions<TData, TVars> extends Omit<UseMutationOptions<TData, ApiError, TVars>, 'mutationFn'> {
  /** Các nhóm query cần làm mới sau khi thành công; có thể tính theo kết quả/biến của mutation */
  invalidate?: QueryKey[] | ((data: TData, vars: TVars) => QueryKey[]);
}

/** useMutation tự invalidate các nhóm query liên quan sau khi thành công (rồi mới gọi `onSuccess` của trang nếu có) */
export function useApiMutation<TData, TVars = void>(
  mutationFn: (vars: TVars) => Promise<TData>,
  { invalidate, onSuccess, ...options }: ApiMutationOptions<TData, TVars> = {}
) {
  const queryClient = useQueryClient();

  return useMutation<TData, ApiError, TVars>({
    ...options,
    mutationFn,
    onSuccess: async (data, vars, context, mutation) => {
      const keys = typeof invalidate === 'function' ? invalidate(data, vars) : invalidate;
      await Promise.all((keys ?? []).map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      return onSuccess?.(data, vars, context, mutation);
    },
  });
}
