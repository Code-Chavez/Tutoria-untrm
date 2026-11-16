import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { tutorTeacherService, type TutorTeacherFilters } from '../services/tutorTeacherService';

/** Se comparte la raíz con los certificados: iniciar o avanzar un trámite deja esta lista al día. */
export function useTutorTeachers(filters: TutorTeacherFilters, enabled: boolean) {
  return useQuery({
    queryKey: ['certificates', 'tutor-teachers', filters],
    queryFn: () => tutorTeacherService.list(filters),
    enabled,
    placeholderData: keepPreviousData,
  });
}
