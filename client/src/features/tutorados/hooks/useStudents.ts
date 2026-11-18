import { useContext, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '@features/auth/context/AuthContext';
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
export function useStudents(periodId = '', includePeriods = false) {
  const queryClient = useQueryClient();
  // Sin sesión conocida (pruebas, vistas fuera del proveedor) se conserva el comportamiento completo.
  const permissions = useContext(AuthContext)?.user?.permissions;
  const canManage = permissions ? permissions.includes('students:write') : true;

  const studentsQuery = useQuery({
    queryKey: periodId ? [...STUDENTS_QUERY_KEY, periodId] : STUDENTS_QUERY_KEY,
    queryFn: () => studentService.getStudents(periodId ? { periodId } : undefined),
  });
  const periodsQuery = useQuery({
    queryKey: ['periods', 'student-options'],
    queryFn: () => studentService.getPeriodOptions(),
    enabled: includePeriods,
  });
  const schoolsQuery = useQuery({
    queryKey: SCHOOLS_QUERY_KEY,
    queryFn: () => schoolService.getSchools().catch(() => []),
  });
  // El listado de tutores requiere students:write: sin ese permiso ni se pide (no hay espera ni error silenciado).
  const tutorsQuery = useQuery({
    queryKey: TUTOR_WORKLOAD_QUERY_KEY,
    queryFn: () => assignmentService.getTutorWorkload().catch(() => []),
    enabled: canManage,
  });

  const students = studentsQuery.data;
  const allSchools = schoolsQuery.data;
  // El servidor ya acota los estudiantes a la cuenta (p. ej. el tutor ve solo los suyos): sin students:write el selector
  // ofrece solo las escuelas presentes en esa lista, para no dar opciones que siempre devuelven vacío.
  const schools = useMemo(() => {
    const list = allSchools ?? [];
    if (canManage) return list;
    const present = new Set((students ?? []).map((s) => s.schoolId));
    return list.filter((school) => present.has(school.id));
  }, [allSchools, students, canManage]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: STUDENTS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: SCHOOLS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: TUTOR_WORKLOAD_QUERY_KEY });
  };

  return {
    students: students ?? [],
    periods: periodsQuery.data ?? [],
    periodsError: periodsQuery.isError,
    retryPeriods: periodsQuery.refetch,
    schools,
    tutors: tutorsQuery.data ?? [],
    loading: studentsQuery.isLoading || schoolsQuery.isLoading || (canManage && tutorsQuery.isLoading),
    error: studentsQuery.isError,
    refresh,
  };
}
