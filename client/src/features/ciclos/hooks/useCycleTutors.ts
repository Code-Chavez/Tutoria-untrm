import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assignmentService } from '@features/asignacion/services/assignmentService';
import { cycleTutorService } from '../services/cycleTutorService';

const key = (schoolId: string | undefined) => ['cycleTutors', schoolId] as const;

export function useCycleTutors(schoolId: string | undefined) {
  return useQuery({ queryKey: key(schoolId), queryFn: () => cycleTutorService.list(schoolId as string), enabled: !!schoolId, retry: false });
}

export function useTutorOptions() {
  return useQuery({ queryKey: ['tutors', 'workload'], queryFn: () => assignmentService.getTutorWorkload(), staleTime: 30_000 });
}

/** Fijar o quitar un tutor cambia también a quién tienen asignado los estudiantes. */
function useRefresh(schoolId: string) {
  const queryClient = useQueryClient();
  return () => Promise.all([queryClient.invalidateQueries({ queryKey: key(schoolId) }), queryClient.invalidateQueries({ queryKey: ['tutors'] }), queryClient.invalidateQueries({ queryKey: ['students'] })]);
}

export function useSetCycleTutor(schoolId: string) {
  const refresh = useRefresh(schoolId);
  return useMutation({
    mutationFn: ({ cycle, ...input }: { cycle: number; tutorId: string; isException?: boolean; note?: string }) => cycleTutorService.set(schoolId, cycle, input),
    onSuccess: refresh,
  });
}

export function useRemoveCycleTutor(schoolId: string) {
  const refresh = useRefresh(schoolId);
  return useMutation({ mutationFn: (cycle: number) => cycleTutorService.remove(schoolId, cycle), onSuccess: refresh });
}
