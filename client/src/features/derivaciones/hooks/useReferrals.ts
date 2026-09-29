import { useQuery, useQueryClient } from '@tanstack/react-query';
import { referralService, StudentReferral } from '../services/referralService';

export const REFERRALS_QUERY_KEY = ['referrals'] as const;

/** Bandeja de derivaciones visibles para el usuario autenticado (HU-30), cacheada. */
export function useReferrals() {
  const query = useQuery({
    queryKey: REFERRALS_QUERY_KEY,
    queryFn: () => referralService.getReferrals(),
  });

  return {
    referrals: query.data ?? [],
    loading: query.isLoading,
    error: query.isError,
    refresh: query.refetch,
  };
}

/** Actualiza una derivación en el caché tras un cambio de estado, sin refetch. */
export function useUpdateReferralInCache() {
  const queryClient = useQueryClient();

  return (updated: StudentReferral) => {
    queryClient.setQueryData<StudentReferral[]>(REFERRALS_QUERY_KEY, (prev) =>
      prev ? prev.map((r) => (r.id === updated.id ? updated : r)) : prev,
    );
  };
}

export const REFERRAL_TRACKING_QUERY_KEY = ['referrals', 'tracking'] as const;

/** Tablero de seguimiento de casos derivados para la DBU (HU-34, Art. 22.b). */
export function useReferralTracking() {
  const query = useQuery({
    queryKey: REFERRAL_TRACKING_QUERY_KEY,
    queryFn: () => referralService.getTracking(),
  });

  return {
    report: query.data,
    loading: query.isLoading,
    error: query.isError,
    refresh: query.refetch,
  };
}
