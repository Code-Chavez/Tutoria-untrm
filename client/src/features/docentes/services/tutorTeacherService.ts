import { apiClient } from '@shared/services/apiClient';

/** Estado de la designación de un docente en una escuela y periodo (los mismos valores que el servidor). */
export type TeacherAcceptance = 'SIN_ASIGNACION' | 'SIN_SOLICITAR' | 'PENDIENTE' | 'VENCIDA' | 'ACEPTADA' | 'RECHAZADA';

export interface TutorTeacher {
  tutorId: string;
  tutorName: string;
  schoolId: string | null;
  schoolName: string;
  cycles: { cycle: number; acceptance: TeacherAcceptance }[];
  acceptance: TeacherAcceptance;
  certificateId: string | null;
  certificateStatus: string | null;
  /** Hay una designación aceptada y ningún trámite vigente; para iniciarlo además hace falta el permiso de registrar. */
  canStartCertificate: boolean;
}

export interface TutorTeacherFilters {
  periodId: string;
  schoolId: string;
  status: string;
  certificateStatus: string;
  q: string;
}

const clean = (params: Record<string, string>) => Object.fromEntries(Object.entries(params).filter(([, value]) => value !== ''));

export const tutorTeacherService = {
  list: async (filters: TutorTeacherFilters): Promise<TutorTeacher[]> =>
    (await apiClient.get<{ teachers: TutorTeacher[] }>('/tutor-teachers', { params: clean({ ...filters }) })).data.teachers,
};
