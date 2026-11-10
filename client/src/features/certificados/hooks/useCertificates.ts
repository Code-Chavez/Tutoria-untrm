import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { certificateService, type CertificateFilters, type EvidenceResult } from '../services/certificateService';

const ROOT = ['certificates'] as const;

export function useCertificateOptions() {
  return useQuery({
    queryKey: [...ROOT, 'options'],
    queryFn: () => certificateService.options(),
    staleTime: 60_000,
  });
}

export function useCertificates(filters: CertificateFilters, enabled: boolean) {
  return useQuery({
    queryKey: [...ROOT, 'list', filters],
    queryFn: () => certificateService.list(filters),
    enabled,
  });
}

export function useCertificateCandidates(periodId: string, schoolId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...ROOT, 'candidates', periodId, schoolId],
    queryFn: () => certificateService.candidates(periodId, schoolId),
    enabled,
  });
}

/** Un trámite con sus evidencias y los hechos que el sistema conoce. Un identificador viejo o ajeno responde 404 y no se reintenta. */
export function useCertificate(id: string) {
  return useQuery({
    queryKey: [...ROOT, 'detail', id],
    queryFn: () => certificateService.get(id),
    enabled: id !== '',
    retry: false,
  });
}

export function useCommitteeResolutions(periodId: string, schoolId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...ROOT, 'resolutions', periodId, schoolId],
    queryFn: () => certificateService.resolutions(periodId, schoolId),
    enabled,
  });
}

/** Cada acción deja la lista, los candidatos y el detalle al día: el servidor es quien decide el estado. */
function useRefreshing<TInput>(run: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROOT }),
  });
}

export const useStartCertificate = () => useRefreshing((input: { tutorId: string; periodId: string; schoolId: string }) => certificateService.start(input));
export const useSubmitCertificate = () => useRefreshing((id: string) => certificateService.submit(id));
export const useReviewEvidence = () =>
  useRefreshing((input: { id: string; evidenceId: string; result: EvidenceResult; comment?: string }) =>
    certificateService.reviewEvidence(input.id, input.evidenceId, {
      result: input.result,
      comment: input.comment,
    }),
  );
export const useObserveCertificate = () => useRefreshing((input: { id: string; note: string }) => certificateService.observe(input.id, input.note));
export const useRejectCertificate = () => useRefreshing((input: { id: string; reason: string }) => certificateService.reject(input.id, input.reason));
export const useApproveCertificate = () => useRefreshing((id: string) => certificateService.approve(id));
export const useGenerateCertificate = () => useRefreshing((input: { id: string; campusId?: string }) => certificateService.generate(input.id, input.campusId));
export const useVoidCertificate = () => useRefreshing((input: { id: string; reason: string }) => certificateService.void(input.id, input.reason));
export const useSaveResolution = () => useRefreshing((input: { periodId: string; schoolId: string; number: string; issuedOn: string }) => certificateService.saveResolution(input));
