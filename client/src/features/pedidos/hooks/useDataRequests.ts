import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { schoolService } from '@features/tutorados/services/schoolService';
import { dataRequestService } from '../services/dataRequestService';

const REQUESTS_KEY = ['dataRequests'] as const;
const SCHOOLS_KEY = ['schools', 'request'] as const;

export function useRequestSchools() {
  return useQuery({ queryKey: SCHOOLS_KEY, queryFn: () => schoolService.getSchools() });
}

export function useDataRequests() {
  return useQuery({ queryKey: REQUESTS_KEY, queryFn: () => dataRequestService.list() });
}

export function useSendDataRequest() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: { schoolId: string; cycles: number[]; note?: string }) => dataRequestService.send(input), onSuccess: () => queryClient.invalidateQueries({ queryKey: REQUESTS_KEY }) });
}

export function useMarkReceived() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (id: string) => dataRequestService.markReceived(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: REQUESTS_KEY }) });
}

export function useSetRequestEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ schoolId, email }: { schoolId: string; email: string | null }) => dataRequestService.setRequestEmail(schoolId, email),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SCHOOLS_KEY }),
  });
}
