import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { campusService, type CampusKind } from '../services/campusService';

const KEY = ['campuses'] as const;

export function useCampuses() {
  return useQuery({ queryKey: KEY, queryFn: () => campusService.overview() });
}

/** Cambiar una sede o la sede de una escuela cambia también la lista de escuelas que ven los demás formularios. */
function useRefresh() {
  const queryClient = useQueryClient();
  return () => Promise.all([queryClient.invalidateQueries({ queryKey: KEY }), queryClient.invalidateQueries({ queryKey: ['schools'] })]);
}

export function useCreateCampus() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: ({ name, kind }: { name: string; kind: CampusKind }) => campusService.create(name, kind), onSuccess: refresh });
}

export function useUpdateCampus() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: ({ id, ...changes }: { id: string; name?: string; isActive?: boolean; city?: string | null; kind?: CampusKind }) => campusService.update(id, changes), onSuccess: refresh });
}

export function useSetSchoolCampus() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: ({ schoolId, campusId }: { schoolId: string; campusId: string }) => campusService.setSchoolCampus(schoolId, campusId), onSuccess: refresh });
}

export function useSetSchoolCampuses() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: ({ schoolId, campusIds }: { schoolId: string; campusIds: string[] }) => campusService.setSchoolCampuses(schoolId, campusIds), onSuccess: refresh });
}
