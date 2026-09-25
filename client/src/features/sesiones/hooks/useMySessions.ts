import { useCallback, useEffect, useState } from 'react';
import { TutoringSession, sessionService } from '../services/sessionService';
import { Student, studentService } from '@features/tutorados/services/studentService';

interface State {
  sessions: TutoringSession[];
  students: Student[];
  loading: boolean;
  error: boolean;
}

/**
 * Carga la agenda de sesiones del tutor autenticado junto con sus tutorados,
 * para poder mostrar nombres de participantes en el calendario sin más
 * llamadas por sesión.
 */
export function useMySessions() {
  const [state, setState] = useState<State>({
    sessions: [],
    students: [],
    loading: true,
    error: false,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let ignore = false;

    Promise.all([sessionService.getMySessions(), studentService.getStudents()])
      .then(([sessions, students]) => {
        if (ignore) return;
        setState({ sessions, students, loading: false, error: false });
      })
      .catch(() => {
        if (ignore) return;
        setState({ sessions: [], students: [], loading: false, error: true });
      });

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  return { ...state, refresh };
}
