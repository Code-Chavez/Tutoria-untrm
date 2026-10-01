import { useQuery } from '@tanstack/react-query';
import { evaluationService, EvaluationStatisticsFilters } from '../services/evaluationService';

/** Estadísticas de evaluación por tutor del periodo activo (HU-39). */
export function useEvaluationStatistics(filters: EvaluationStatisticsFilters) {
  const query = useQuery({
    queryKey: ['evaluationStatistics', filters.schoolId ?? null, filters.facultyId ?? null],
    queryFn: () => evaluationService.getStatistics(filters),
  });

  return {
    report: query.data,
    loading: query.isLoading,
    error: query.isError,
    refresh: query.refetch,
  };
}
