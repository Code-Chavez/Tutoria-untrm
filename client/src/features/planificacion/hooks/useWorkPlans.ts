import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workPlanService, WorkPlanContent } from '../services/workPlanService';

const OVERVIEW_KEY = ['workPlans'] as const;
const planKey = (schoolId: string) => ['workPlan', schoolId] as const;

/** Escuelas gestionables por el usuario y si ya tienen plan en el periodo activo. */
export function useWorkPlansOverview() {
  const query = useQuery({
    queryKey: OVERVIEW_KEY,
    queryFn: () => workPlanService.getOverview(),
  });
  return { overview: query.data, loading: query.isLoading, error: query.isError, refresh: query.refetch };
}

/** Plan de trabajo de una escuela (null si aún no se elaboró). */
export function useWorkPlan(schoolId: string) {
  const query = useQuery({
    queryKey: planKey(schoolId),
    queryFn: () => workPlanService.getBySchool(schoolId),
    enabled: !!schoolId,
  });
  return { view: query.data, loading: query.isLoading, error: query.isError, refresh: query.refetch };
}

export function useSaveWorkPlan(schoolId: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (content: WorkPlanContent) => workPlanService.save(schoolId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKey(schoolId) });
      queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
    },
  });
  return mutation;
}

export function useUploadWorkPlanResolution(schoolId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => workPlanService.uploadResolution(schoolId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKey(schoolId) });
      queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
    },
  });
}
