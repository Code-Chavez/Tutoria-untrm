import { useCallback, useEffect, useState } from 'react';
import { Student, studentService } from '@features/tutorados/services/studentService';
import { School, schoolService } from '@features/tutorados/services/schoolService';
import { TutorWorkload, assignmentService } from '../services/assignmentService';

interface State {
  students: Student[];
  schools: School[];
  tutors: TutorWorkload[];
  loading: boolean;
  error: boolean;
}

/** Carga estudiantes, escuelas y la carga de tutores para la vista de asignación. */
export function useAssignmentData() {
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
