import { useQuery } from '@tanstack/react-query';
import { reportFilterService } from './reportFilterService';

/** Opciones de los controles de filtro, ya acotadas al alcance del rol (HU-47). */
export function useReportFilterOptions() {
  return useQuery({
    queryKey: ['reportFilterOptions'],
    queryFn: () => reportFilterService.getOptions(),
    staleTime: 5 * 60 * 1000,
  });
}
