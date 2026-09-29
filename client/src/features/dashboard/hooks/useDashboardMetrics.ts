import { useQuery } from '@tanstack/react-query';
import { studentService } from '@features/tutorados/services/studentService';
import { STUDENTS_QUERY_KEY } from '@features/tutorados/hooks/useStudents';

export interface DashboardMetrics {
  totalStudents: number;
  activeStudents: number;
  atRiskStudents: number;
}

interface State {
  metrics: DashboardMetrics | null;
  loading: boolean;
  error: boolean;
  /** El rol actual no tiene permiso para leer estudiantes (403). */
  forbidden: boolean;
}

function getStatus(err: unknown): number | undefined {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    return (err as { response?: { status?: number } }).response?.status;
  }
  return undefined;
}

/**
 * Calcula las métricas del panel a partir de los estudiantes que ya expone el
 * backend (GET /students). Usa la misma query key que la bandeja de
 * tutorados, así comparten caché: si ya se visitó /tutorados, el panel de
 * inicio no vuelve a pedir la lista. No inventa datos: si el rol no puede
 * consultarlos, lo informa para que la vista muestre un estado neutro.
 */
export function useDashboardMetrics(): State {
  const query = useQuery({
    queryKey: STUDENTS_QUERY_KEY,
    queryFn: () => studentService.getStudents(),
  });

  if (!query.isError) {
    const students = query.data ?? [];
    return {
      metrics: query.data
        ? {
            totalStudents: students.length,
            activeStudents: students.filter((s) => s.isActive).length,
            atRiskStudents: students.filter((s) => s.isAtRisk).length,
          }
        : null,
      loading: query.isLoading,
      error: false,
      forbidden: false,
    };
  }

  return {
    metrics: null,
    loading: false,
    error: true,
    forbidden: getStatus(query.error) === 403,
  };
}
