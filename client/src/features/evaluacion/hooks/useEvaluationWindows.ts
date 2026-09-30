import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  evaluationService,
  EvaluationWindowsOverview,
} from '../services/evaluationService';

export const EVALUATION_WINDOWS_QUERY_KEY = ['evaluationWindows'] as const;

/** Configuración de apertura/cierre de la evaluación por escuela (HU-38). */
export function useEvaluationWindows() {
  const query = useQuery({
    queryKey: EVALUATION_WINDOWS_QUERY_KEY,
    queryFn: () => evaluationService.getWindows(),
  });

  return {
    overview: query.data,
    loading: query.isLoading,
    error: query.isError,
    refresh: query.refetch,
  };
}

/** Cambia el estado de una escuela y actualiza el caché sin refetch. */
export function useSetEvaluationWindow() {
  const queryClient = useQueryClient();

  return async (schoolId: string, isOpen: boolean) => {
    const updated = await evaluationService.setWindow(schoolId, isOpen);
    queryClient.setQueryData<EvaluationWindowsOverview>(EVALUATION_WINDOWS_QUERY_KEY, (prev) =>
      prev
        ? {
            ...prev,
            schools: prev.schools.map((s) => (s.schoolId === schoolId ? updated : s)),
          }
        : prev,
    );
    return updated;
  };
}
