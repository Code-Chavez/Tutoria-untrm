import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { parameterService } from '../services/parameterService';

const KEY = ['systemParameters'] as const;

/** Parámetros editables del sistema con su valor vigente (HU-49). */
export function useParameters() {
  const query = useQuery({ queryKey: KEY, queryFn: () => parameterService.list() });
  return { parameters: query.data ?? [], loading: query.isLoading, error: query.isError, refresh: query.refetch };
}

export function useUpdateParameter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: number }) => parameterService.update(key, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
