import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sessionService } from '../services/sessionService';
import { studentService } from '@features/tutorados/services/studentService';
import { STUDENTS_QUERY_KEY } from '@features/tutorados/hooks/useStudents';

export const MY_SESSIONS_QUERY_KEY = ['mySessions'] as const;

/**
 * Carga la agenda de sesiones del tutor autenticado junto con sus tutorados,
 * para poder mostrar nombres de participantes en el calendario sin más
 * llamadas por sesión. Los tutorados comparten caché con /tutorados.
 */
export function useMySessions() {
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: MY_SESSIONS_QUERY_KEY,
    queryFn: () => sessionService.getMySessions(),
  });
  const studentsQuery = useQuery({
    queryKey: STUDENTS_QUERY_KEY,
    queryFn: () => studentService.getStudents(),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: MY_SESSIONS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: STUDENTS_QUERY_KEY });
  };

  return {
    sessions: sessionsQuery.data ?? [],
    students: studentsQuery.data ?? [],
    loading: sessionsQuery.isLoading || studentsQuery.isLoading,
    error: sessionsQuery.isError,
    refresh,
  };
}
