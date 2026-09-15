import { useEffect, useState } from 'react';
import { studentService } from '@features/tutorados/services/studentService';

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

/**
 * Calcula las métricas del panel a partir de los estudiantes que ya expone el
 * backend (GET /students). No inventa datos: si el rol no puede consultarlos,
 * lo informa para que la vista muestre un estado neutro.
 */
export function useDashboardMetrics(): State {
  const [state, setState] = useState<State>({
    metrics: null,
    loading: true,
    error: false,
    forbidden: false,
  });

  useEffect(() => {
    let ignore = false;

    studentService
      .getStudents()
      .then((students) => {
        if (ignore) return;
        setState({
          metrics: {
            totalStudents: students.length,
            activeStudents: students.filter((s) => s.isActive).length,
            atRiskStudents: students.filter((s) => s.isAtRisk).length,
          },
          loading: false,
          error: false,
          forbidden: false,
        });
      })
      .catch((err: unknown) => {
        if (ignore) return;
        const status =
          typeof err === 'object' && err !== null && 'response' in err
            ? (err as { response?: { status?: number } }).response?.status
            : undefined;
        setState({ metrics: null, loading: false, error: true, forbidden: status === 403 });
      });

    return () => {
      ignore = true;
    };
  }, []);

  return state;
}
