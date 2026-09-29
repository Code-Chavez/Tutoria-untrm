import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@features/auth/hooks/useAuth';
import { alertService, StudentAlert } from '../services/alertService';

interface State {
  alerts: StudentAlert[];
  loading: boolean;
  /** El rol actual no tiene permiso para leer alertas (403). */
  forbidden: boolean;
}

const TUTOR_ROLE_NAME = 'Docente Tutor';

function getStatus(err: unknown): number | undefined {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    return (err as { response?: { status?: number } }).response?.status;
  }
  return undefined;
}

/**
 * Alertas de inasistencia y riesgo (HU-26) para el panel. El Docente Tutor
 * ve solo las de sus propios tutorados; el resto de roles con acceso
 * (Coordinador, Administrador) las ve todas.
 */
export function useRiskAlerts(): State {
  const { user } = useAuth();
  const mine = user?.role === TUTOR_ROLE_NAME;

  const query = useQuery<StudentAlert[]>({
    queryKey: ['riskAlerts', mine],
    queryFn: () => alertService.getAlerts(mine),
  });

  if (query.isError) {
    return { alerts: [], loading: false, forbidden: getStatus(query.error) === 403 };
  }

  return { alerts: query.data ?? [], loading: query.isLoading, forbidden: false };
}
