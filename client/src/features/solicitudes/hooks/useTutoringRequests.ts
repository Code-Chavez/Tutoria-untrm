import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tutoringRequestService, type TutoringRequestStatus, type UpdateRequestStatusData } from '../services/tutoringRequestService';

export const OWN_REQUESTS_KEY = ['tutoringRequests', 'own'] as const;
export const INBOX_KEY = ['tutoringRequests', 'inbox'] as const;

export function useOwnTutoringRequests() {
  const query = useQuery({ queryKey: OWN_REQUESTS_KEY, queryFn: () => tutoringRequestService.getOwn() });
  return { requests: query.data ?? [], loading: query.isLoading, error: query.isError };
}

export function useTutoringRequestsInbox(status?: TutoringRequestStatus) {
  const query = useQuery({
    queryKey: [...INBOX_KEY, status ?? 'ALL'],
    queryFn: () => tutoringRequestService.getInbox(status),
  });
  return { requests: query.data ?? [], loading: query.isLoading, error: query.isError, refresh: query.refetch };
}

export function useUpdateTutoringRequestStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRequestStatusData }) => tutoringRequestService.updateStatus(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tutoringRequests'] }),
  });
}
