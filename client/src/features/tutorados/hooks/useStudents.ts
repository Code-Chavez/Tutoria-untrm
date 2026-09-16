import { useCallback, useEffect, useState } from 'react';
import { Student, studentService } from '../services/studentService';
import { School, schoolService } from '../services/schoolService';
import { TutorWorkload, assignmentService } from '@features/asignacion/services/assignmentService';

interface State {
  students: Student[];
  schools: School[];
  tutors: TutorWorkload[];
  loading: boolean;
  error: boolean;
}

/**
 * Carga la lista completa de estudiantes, el catálogo de escuelas y los
 * tutores disponibles (para mostrar/reasignar el tutor de cada tutorado).
 * El filtrado y la paginación se resuelven en el cliente sobre estos datos.
 */
export function useStudents() {
  const [state, setState] = useState<State>({
    students: [],
    schools: [],
    tutors: [],
    loading: true,
    error: false,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let ignore = false;

    Promise.all([
      studentService.getStudents(),
      schoolService.getSchools().catch(() => []),
      // El listado de tutores requiere students:write; los roles de solo
      // lectura simplemente no lo obtienen (se degrada sin romper la vista).
      assignmentService.getTutorWorkload().catch(() => []),
    ])
      .then(([students, schools, tutors]) => {
        if (ignore) return;
        setState({ students, schools, tutors, loading: false, error: false });
      })
      .catch(() => {
        if (ignore) return;
        setState({ students: [], schools: [], tutors: [], loading: false, error: true });
      });

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  return { ...state, refresh };
}
