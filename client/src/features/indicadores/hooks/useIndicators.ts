import { useQuery } from '@tanstack/react-query';
import { indicatorsService, IndicatorsFilters } from '../services/indicatorsService';

/** Indicadores del periodo activo, acotados por rol y filtros (HU-45). */
export function useIndicators(filters: IndicatorsFilters) {
  const query = useQuery({
    queryKey: ['indicators', filters],
    queryFn: () => indicatorsService.getIndicators(filters),
  });
  return { report: query.data, loading: query.isLoading, error: query.isError, refresh: query.refetch };
}
