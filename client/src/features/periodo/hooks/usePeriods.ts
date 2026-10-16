import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { catalogService } from '@features/catalogos/services/catalogService';
import { periodService } from '../services/periodService';

export const PERIOD_STATUS_KEY = ['periods', 'current'] as const;

/** Estado de la tutoría: abierta (hay periodo vigente) o en solo lectura. */
export function usePeriodStatus() {
  return useQuery({ queryKey: PERIOD_STATUS_KEY, queryFn: () => periodService.current(), staleTime: 30_000 });
}

export function usePeriodList() {
  return useQuery({ queryKey: ['periods', 'list'], queryFn: () => catalogService.list('periods') });
}

export function usePeriodClosure(id: string | undefined) {
  return useQuery({ queryKey: ['periods', 'closure', id], queryFn: () => periodService.closure(id as string), enabled: !!id });
}

/** Cerrar o reabrir cambia lo que pueden hacer todas las pantallas: se refresca todo lo del periodo. */
function useRefreshPeriods() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['periods'] });
}

export function useClosePeriod() {
  const refresh = useRefreshPeriods();
  return useMutation({ mutationFn: ({ id, confirmName }: { id: string; confirmName: string }) => periodService.close(id, confirmName), onSuccess: refresh });
}

export function useReopenPeriod() {
  const refresh = useRefreshPeriods();
  return useMutation({ mutationFn: (id: string) => periodService.reopen(id), onSuccess: refresh });
}
