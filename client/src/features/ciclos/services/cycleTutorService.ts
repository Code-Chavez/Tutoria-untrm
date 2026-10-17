import { apiClient } from '@shared/services/apiClient';
import type { AvailabilitySlot } from './tutorAcceptanceService';

export type AcceptanceStatus = 'SIN_SOLICITAR' | 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA';

export interface CycleRow {
  cycle: number;
  assignment: {
    tutorId: string;
    isException: boolean;
    note: string | null;
    acceptanceStatus: AcceptanceStatus;
    availability: AvailabilitySlot[] | null;
    declineReason: string | null;
  } | null;
  enrolled: number;
  withoutTutor: number;
}

export interface CycleTutorsView {
  periodId: string;
  periodName: string;
  cycles: CycleRow[];
}

export interface SetCycleTutorResult {
  assigned: number;
  moved: number;
  /** Si el correo de aceptación salió (null cuando el docente ya había respondido). */
  acceptanceEmailSent?: boolean | null;
}

export const cycleTutorService = {
  list: async (schoolId: string): Promise<CycleTutorsView> => (await apiClient.get<CycleTutorsView>(`/schools/${schoolId}/cycle-tutors`)).data,
  set: async (schoolId: string, cycle: number, input: { tutorId: string; isException?: boolean; note?: string }): Promise<SetCycleTutorResult> =>
    (await apiClient.put<SetCycleTutorResult>(`/schools/${schoolId}/cycle-tutors/${cycle}`, input)).data,
  resendAcceptance: async (schoolId: string, cycle: number): Promise<boolean> =>
    (await apiClient.post<{ emailSent: boolean }>(`/schools/${schoolId}/cycle-tutors/${cycle}/acceptance-request`)).data.emailSent,
  remove: async (schoolId: string, cycle: number): Promise<void> => {
    await apiClient.delete(`/schools/${schoolId}/cycle-tutors/${cycle}`);
  },
};
