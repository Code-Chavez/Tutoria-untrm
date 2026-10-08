import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { signedDocumentService } from '../services/signedDocumentService';

export function useReferralSignedDocuments(referralId: string) {
  const queryClient = useQueryClient();
  const key = ['signedDocuments', 'referral', referralId];
  const list = useQuery({ queryKey: key, queryFn: () => signedDocumentService.listForReferral(referralId) });
  const attach = useMutation({
    mutationFn: (file: File) => signedDocumentService.attachToReferral(referralId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  return { documents: list.data ?? [], loading: list.isLoading, attach: attach.mutateAsync };
}

export function useAttendanceSheetDocuments(studentId: string) {
  const queryClient = useQueryClient();
  const key = ['signedDocuments', 'attendance-sheet', studentId];
  const list = useQuery({ queryKey: key, queryFn: () => signedDocumentService.listForAttendanceSheet(studentId) });
  const attach = useMutation({
    mutationFn: (file: File) => signedDocumentService.attachToAttendanceSheet(studentId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  return {
    period: list.data?.period,
    documents: list.data?.documents ?? [],
    loading: list.isLoading,
    attach: attach.mutateAsync,
  };
}
