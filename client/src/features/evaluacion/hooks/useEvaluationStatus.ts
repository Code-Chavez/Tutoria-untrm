import { useQuery, useQueryClient } from '@tanstack/react-query';
import { evaluationService } from '../services/evaluationService';

export const EVALUATION_STATUS_QUERY_KEY = ['evaluationStatus'] as const;

/** Si el tutorado autenticado puede responder el cuestionario de este periodo (HU-36). */
export function useEvaluationStatus() {
  const query = useQuery({
    queryKey: EVALUATION_STATUS_QUERY_KEY,
    queryFn: () => evaluationService.getStatus(),
  });

  return {
    status: query.data,
    loading: query.isLoading,
    error: query.isError,
    refresh: query.refetch,
  };
}

export function useInvalidateEvaluationStatus() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: EVALUATION_STATUS_QUERY_KEY });
}
