import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { admonitionService } from '../services/admonitionService';

const KEY = ['admonitions'] as const;

export function useAdmonitions() {
  return useQuery({ queryKey: KEY, queryFn: () => admonitionService.list() });
}

/** Solo quien puede emitir (Decano, DBU) consulta esta lista; para los demás no se pide. */
export function useAdmonishableTutors(enabled: boolean) {
  return useQuery({ queryKey: ['admonitions', 'tutors'], queryFn: () => admonitionService.tutors(), enabled, staleTime: 60_000 });
}

export function useIssueAdmonition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { tutorId: string; issuedOn: string; reason: string; file?: File | null }) => admonitionService.issue(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
