import { apiClient } from '@shared/services/apiClient';

export interface CycleRow {
  cycle: number;
  assignment: { tutorId: string; isException: boolean; note: string | null } | null;
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
}

export const cycleTutorService = {
  list: async (schoolId: string): Promise<CycleTutorsView> => (await apiClient.get<CycleTutorsView>(`/schools/${schoolId}/cycle-tutors`)).data,
  set: async (schoolId: string, cycle: number, input: { tutorId: string; isException?: boolean; note?: string }): Promise<SetCycleTutorResult> =>
    (await apiClient.put<SetCycleTutorResult>(`/schools/${schoolId}/cycle-tutors/${cycle}`, input)).data,
  remove: async (schoolId: string, cycle: number): Promise<void> => {
    await apiClient.delete(`/schools/${schoolId}/cycle-tutors/${cycle}`);
  },
};
