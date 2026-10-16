import { apiClient } from '@shared/services/apiClient';

export interface PeriodBrief {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface PeriodStatus {
  /** Hay un periodo vigente: la tutoría opera. Sin periodo vigente todo queda en solo lectura. */
  open: boolean;
  period: PeriodBrief | null;
}

export interface PeriodSummary {
  students: { total: number; active: number; atRisk: number };
  tutors: number;
  sessions: { total: number; individual: number; group: number; cancelled: number; withAttendance: number };
  referrals: { total: number; open: number };
  tutoringRequests: { total: number; open: number };
  evaluations: { responses: number };
  semesterReports: { submitted: number };
  pending: { openRequests: number; openReferrals: number; upcomingSessions: number };
}

export type PeriodState = 'VIGENTE' | 'CERRADO' | 'SIN_ABRIR';

export interface PeriodClosure {
  period: PeriodBrief;
  state: PeriodState;
  closedAt: string | null;
  summary: PeriodSummary;
  /** Vista previa calculada ahora (vigente) o resumen guardado al cerrar (cerrado). */
  isPreview: boolean;
}

export const periodService = {
  async current(): Promise<PeriodStatus> {
    return (await apiClient.get<PeriodStatus>('/periods/current')).data;
  },
  async closure(id: string): Promise<PeriodClosure> {
    return (await apiClient.get<PeriodClosure>(`/periods/${id}/closure`)).data;
  },
  async close(id: string, confirmName: string): Promise<PeriodClosure> {
    return (await apiClient.post<PeriodClosure>(`/periods/${id}/close`, { confirmName })).data;
  },
  async reopen(id: string): Promise<void> {
    await apiClient.post(`/periods/${id}/reopen`);
  },
};
