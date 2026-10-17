import { apiClient } from '@shared/services/apiClient';

export interface AcceptanceInfo {
  tutorName: string;
  school: string;
  cycle: number;
  period: string;
  isException: boolean;
  maxWeeklyHours: number;
  sessionMinutes: number;
}

export interface AvailabilitySlot {
  /** 1 = lunes … 6 = sábado. */
  day: number;
  start: string;
  end: string;
  place?: string;
}

export const DAY_LABEL: Record<number, string> = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' };

// Rutas públicas: la autorización es el enlace personal que llegó por correo.
export const tutorAcceptanceService = {
  info: async (token: string): Promise<AcceptanceInfo> => (await apiClient.get<AcceptanceInfo>(`/tutor-acceptance/${token}`)).data,
  respond: async (token: string, response: { accept: boolean; availability?: AvailabilitySlot[]; reason?: string }): Promise<void> => {
    await apiClient.post(`/tutor-acceptance/${token}`, response);
  },
};
