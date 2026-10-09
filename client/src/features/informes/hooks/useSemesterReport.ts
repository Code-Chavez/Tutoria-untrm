import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { semesterReportService, SemesterReportContent } from '../services/semesterReportService';

const QUERY_KEY = ['semesterReport', 'me'] as const;

/** Informe semestral del tutor autenticado: guardado + borrador autollenado (HU-43). */
export function useMySemesterReport() {
  const query = useQuery({ queryKey: QUERY_KEY, queryFn: () => semesterReportService.getMine() });
  return { view: query.data, loading: query.isLoading, error: query.isError, refresh: query.refetch };
}

export function useSaveSemesterReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: SemesterReportContent) => semesterReportService.saveMine(content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
