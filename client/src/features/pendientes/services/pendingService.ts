import { apiClient } from '@shared/services/apiClient';

export type PendingKind =
  | 'DESIGNATION_REJECTED'
  | 'ACCEPTANCE_EMAIL_FAILED'
  | 'DESIGNATION_NO_RESPONSE'
  | 'TUTOR_INACTIVE'
  | 'CYCLE_WITHOUT_TUTOR'
  | 'CANCELLED_SESSION_NO_FOLLOWUP';

export interface PendingItem {
  kind: PendingKind;
  schoolId: string;
  schoolName: string;
  cycle: number | null;
  title: string;
  detail: string;
  since: string;
  link: string;
}

export const pendingService = {
  list: async (): Promise<PendingItem[]> => {
    const response = await apiClient.get<{ items: PendingItem[] }>('/institutional-pending');
    return response.data.items;
  },
};
