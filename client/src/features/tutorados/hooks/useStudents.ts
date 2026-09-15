import { useCallback, useEffect, useState } from 'react';
import { Student, studentService } from '../services/studentService';
import { School, schoolService } from '../services/schoolService';

interface State {
  students: Student[];
  schools: School[];
  loading: boolean;
  error: boolean;
}

/**
 * Carga la lista completa de estudiantes y el catálogo de escuelas.
 * El filtrado y la paginación se resuelven en el cliente sobre estos datos.
 */
export function useStudents() {
  const [state, setState] = useState<State>({
    students: [],
    schools: [],
    loading: true,
    error: false,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let ignore = false;

    Promise.all([studentService.getStudents(), schoolService.getSchools().catch(() => [])])
      .then(([students, schools]) => {
        if (ignore) return;
        setState({ students, schools, loading: false, error: false });
      })
      .catch(() => {
        if (ignore) return;
        setState({ students: [], schools: [], loading: false, error: true });
      });

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  return { ...state, refresh };
}
