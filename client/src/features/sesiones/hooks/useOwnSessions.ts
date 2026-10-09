import { useQuery } from '@tanstack/react-query';
import { sessionService } from '../services/sessionService';

export const OWN_SESSIONS_QUERY_KEY = ['ownSessions'] as const;

/** Agenda del tutorado autenticado (Art. 8: fecha, modalidad, lugar o enlace, cancelaciones). */
export function useOwnSessions() {
  const query = useQuery({
    queryKey: OWN_SESSIONS_QUERY_KEY,
    queryFn: () => sessionService.getOwnSessions(),
  });
  return { sessions: query.data ?? [], loading: query.isLoading, error: query.isError, refresh: query.refetch };
}
