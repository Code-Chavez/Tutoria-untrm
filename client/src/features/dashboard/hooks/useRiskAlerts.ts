import { useEffect, useState } from 'react';
import { useAuth } from '@features/auth/hooks/useAuth';
import { alertService, StudentAlert } from '../services/alertService';

interface State {
  alerts: StudentAlert[];
  loading: boolean;
  /** El rol actual no tiene permiso para leer alertas (403). */
  forbidden: boolean;
}

const TUTOR_ROLE_NAME = 'Docente Tutor';

/**
 * Alertas de inasistencia y riesgo (HU-26) para el panel. El Docente Tutor
 * ve solo las de sus propios tutorados; el resto de roles con acceso
 * (Coordinador, Administrador) las ve todas.
 */
export function useRiskAlerts(): State {
  const { user } = useAuth();
  const [state, setState] = useState<State>({ alerts: [], loading: true, forbidden: false });

  useEffect(() => {
    let ignore = false;
    const mine = user?.role === TUTOR_ROLE_NAME;

    alertService
      .getAlerts(mine)
      .then((alerts) => {
        if (!ignore) setState({ alerts, loading: false, forbidden: false });
      })
      .catch((err: unknown) => {
        if (ignore) return;
        const status =
          typeof err === 'object' && err !== null && 'response' in err
            ? (err as { response?: { status?: number } }).response?.status
            : undefined;
        setState({ alerts: [], loading: false, forbidden: status === 403 });
      });

    return () => {
      ignore = true;
    };
  }, [user?.role]);

  return state;
}
