import { useCallback, useMemo } from 'react';
import { useUrlParams } from '@shared/hooks/useUrlParams';
import type { ReportFilterValues } from './reportFilterService';

/**
 * Los filtros combinados de reportes (semestre, facultad, escuela, ciclo y tutor) viven en la URL
 * (`?periodo=&facultad=&escuela=&ciclo=&tutor=`): recargar o compartir el enlace conserva el mismo reporte.
 */
export function useReportFiltersUrl(): [ReportFilterValues, (next: ReportFilterValues) => void] {
  const url = useUrlParams();
  const [periodId, facultyId, schoolId, cycle, tutorId] = [url.get('periodo'), url.get('facultad'), url.get('escuela'), url.get('ciclo'), url.get('tutor')];
  const values = useMemo<ReportFilterValues>(() => ({ periodId, facultyId, schoolId, cycle, tutorId }), [periodId, facultyId, schoolId, cycle, tutorId]);
  const setValues = useCallback(
    (next: ReportFilterValues) => url.set({ periodo: next.periodId, facultad: next.facultyId, escuela: next.schoolId, ciclo: next.cycle, tutor: next.tutorId }, { replace: true }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url.set],
  );
  return [values, setValues];
}
