import { useQuery, useQueryClient } from '@tanstack/react-query';
import { studentService } from '../services/studentService';
import { schoolService } from '../services/schoolService';
import { assignmentService } from '@features/asignacion/services/assignmentService';

// Exportadas para que otras vistas que comparten estos mismos datos
// (panel de inicio, asignación) reusen la misma entrada de caché en vez de
// volver a pedirlos.
export const STUDENTS_QUERY_KEY = ['students'] as const;
export const SCHOOLS_QUERY_KEY = ['schools'] as const;
export const TUTOR_WORKLOAD_QUERY_KEY = ['tutorWorkload'] as const;

/**
 * Carga la lista completa de estudiantes, el catálogo de escuelas y los
 * tutores disponibles (para mostrar/reasignar el tutor de cada tutorado).
 * El filtrado y la paginación se resuelven en el cliente sobre estos datos.
 */
export function useStudents() {
  const queryClient = useQueryClient();

  const studentsQuery = useQuery({
    queryKey: STUDENTS_QUERY_KEY,
    queryFn: () => studentService.getStudents(),
  });
  const schoolsQuery = useQuery({
    queryKey: SCHOOLS_QUERY_KEY,
    queryFn: () => schoolService.getSchools().catch(() => []),
  });
  // El listado de tutores requiere students:write; los roles de solo
  // lectura simplemente no lo obtienen (se degrada sin romper la vista).
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
