import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pcBuildService } from '../services/api/pcBuildService';
import { SavePcBuildPayload } from '../types/pcBuild';

export const pcBuildKeys = {
  all: ['pc-builds'] as const,
  my: () => [...pcBuildKeys.all, 'my'] as const,
  detail: (code: string) => [...pcBuildKeys.all, 'detail', code] as const,
};

export function useMyBuilds(enabled = true) {
  return useQuery({
    queryKey: pcBuildKeys.my(),
    queryFn: () => pcBuildService.getMyBuilds(),
    enabled,
  });
}

export function usePcBuild(code: string | undefined) {
  return useQuery({
    queryKey: pcBuildKeys.detail(code || ''),
    queryFn: () => pcBuildService.getBuild(code || ''),
    enabled: Boolean(code),
  });
}

export function useSavePcBuild() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload, ownerName, code }: { payload: SavePcBuildPayload; ownerName: string; code?: string }) =>
      pcBuildService.saveBuild(payload, ownerName, code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pcBuildKeys.all }),
  });
}

export function useDeletePcBuilds() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (codes: string[]) => pcBuildService.deleteBuilds(codes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pcBuildKeys.all }),
  });
}
