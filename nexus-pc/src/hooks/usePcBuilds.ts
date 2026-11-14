import { pcBuildService } from '../services/api/pcBuildService';
import { SavePcBuildPayload } from '../types/pcBuild';
import { createQueryKeys, useApiMutation, useApiQuery } from './BaseHook';

const keys = createQueryKeys('pc-builds');

export const pcBuildKeys = {
  all: keys.all,
  my: () => keys.of('my'),
  detail: (code: string) => keys.of('detail', code),
};

export function useMyBuilds(enabled = true) {
  return useApiQuery(pcBuildKeys.my(), () => pcBuildService.getMyBuilds(), { enabled });
}

export function usePcBuild(code: string | undefined) {
  return useApiQuery(pcBuildKeys.detail(code || ''), () => pcBuildService.getBuild(code!), { enabled: Boolean(code) });
}

export function useSavePcBuild() {
  return useApiMutation(
    ({ payload, ownerName, code }: { payload: SavePcBuildPayload; ownerName: string; code?: string }) =>
      pcBuildService.saveBuild(payload, ownerName, code),
    { invalidate: [pcBuildKeys.all] }
  );
}

export function useDeletePcBuilds() {
  return useApiMutation((codes: string[]) => pcBuildService.deleteBuilds(codes), { invalidate: [pcBuildKeys.all] });
}
