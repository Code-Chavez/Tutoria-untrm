import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tutoringRequestService, type TutoringRequestStatus, type UpdateRequestStatusData } from '../services/tutoringRequestService';

export const OWN_REQUESTS_KEY = ['tutoringRequests', 'own'] as const;
export const INBOX_KEY = ['tutoringRequests', 'inbox'] as const;

/** Cada cuánto se revisa si el tutor ya respondió, mientras la estudiante tiene abierta la pantalla. */
export const OWN_REQUESTS_POLL_MS = 30_000;

export function useOwnTutoringRequests() {
  // La respuesta del tutor llega por otro lado: sin esto la lista seguía en «Pendiente» hasta recargar la página (H7 del ensayo del piloto).
  const query = useQuery({
    queryKey: OWN_REQUESTS_KEY,
    queryFn: () => tutoringRequestService.getOwn(),
    staleTime: 0,
    refetchInterval: OWN_REQUESTS_POLL_MS,
    refetchOnWindowFocus: true,
  });
  return { requests: query.data ?? [], loading: query.isLoading, error: query.isError };
}

export const RECIPIENT_KEY = ['tutoringRequests', 'recipient'] as const;

/** A quién llegará la solicitud del propio estudiante (null si no se sabe: la pantalla funciona igual). */
export function useOwnRequestRecipient() {
  const query = useQuery({ queryKey: RECIPIENT_KEY, queryFn: () => tutoringRequestService.getRecipient() });
  return query.data ?? null;
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
