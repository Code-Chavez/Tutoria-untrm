import { useQuery, useQueryClient } from '@tanstack/react-query';
import { studentService } from '@features/tutorados/services/studentService';
import { schoolService } from '@features/tutorados/services/schoolService';
import {
  STUDENTS_QUERY_KEY,
  SCHOOLS_QUERY_KEY,
  TUTOR_WORKLOAD_QUERY_KEY,
} from '@features/tutorados/hooks/useStudents';
import { assignmentService } from '../services/assignmentService';

/**
 * Carga estudiantes, escuelas y la carga de tutores para la vista de
 * asignación. Usa las mismas query keys que /tutorados, así comparten
 * caché entre ambas páginas.
 */
export function useAssignmentData() {
  const queryClient = useQueryClient();

  const studentsQuery = useQuery({
    queryKey: STUDENTS_QUERY_KEY,
    queryFn: () => studentService.getStudents(),
  });
  const schoolsQuery = useQuery({
    queryKey: SCHOOLS_QUERY_KEY,
    queryFn: () => schoolService.getSchools().catch(() => []),
  });
  const tutorsQuery = useQuery({
    queryKey: TUTOR_WORKLOAD_QUERY_KEY,
    queryFn: () => assignmentService.getTutorWorkload().catch(() => []),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: STUDENTS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: SCHOOLS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: TUTOR_WORKLOAD_QUERY_KEY });
  };

  return {
    students: studentsQuery.data ?? [],
    schools: schoolsQuery.data ?? [],
    tutors: tutorsQuery.data ?? [],
    loading: studentsQuery.isLoading || schoolsQuery.isLoading || tutorsQuery.isLoading,
    error: studentsQuery.isError,
    refresh,
  };
}
