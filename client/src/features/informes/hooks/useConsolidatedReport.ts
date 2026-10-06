import { useQuery } from '@tanstack/react-query';
import { consolidatedReportService, ConsolidatedFilters } from '../services/consolidatedReportService';

/** Informe consolidado por escuela y facultad del periodo activo (HU-44). */
export function useConsolidatedReport(filters: ConsolidatedFilters) {
  const query = useQuery({
    queryKey: ['consolidatedReport', filters],
    queryFn: () => consolidatedReportService.getReport(filters),
  });
  return { report: query.data, loading: query.isLoading, error: query.isError, refresh: query.refetch };
}
