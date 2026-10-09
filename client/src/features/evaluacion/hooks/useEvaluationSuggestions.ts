import { useQuery } from '@tanstack/react-query';
import { evaluationService, EvaluationSuggestionsFilters } from '../services/evaluationService';

/** Sugerencias abiertas consolidadas del periodo activo (HU-40). */
export function useEvaluationSuggestions(filters: EvaluationSuggestionsFilters) {
  const query = useQuery({
    queryKey: [
      'evaluationSuggestions',
      filters.tutorId ?? null,
      filters.schoolId ?? null,
      filters.facultyId ?? null,
    ],
    queryFn: () => evaluationService.getSuggestions(filters),
  });

  return {
    report: query.data,
    loading: query.isLoading,
    error: query.isError,
    refresh: query.refetch,
  };
}
