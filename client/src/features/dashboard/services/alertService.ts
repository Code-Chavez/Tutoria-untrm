import { apiClient } from '@shared/services/apiClient';

// Alertas de inasistencia y riesgo (HU-26), calculadas por el servidor a
// partir de los tutorados en riesgo (HU-11) y sus sesiones.
export type AlertType = 'NO_SESSIONS' | 'MISSED_SESSIONS';

export interface StudentAlert {
  type: AlertType;
  studentId: string;
  studentCode: string;
  studentName: string;
  cycle: number;
  riskReason: string | null;
  tutorId: string | null;
  tutorName: string | null;
  missedCount?: number;
}

export const alertService = {
  // mine=true limita a los tutorados del tutor autenticado (panel del
  // Docente Tutor); sin el parámetro, trae todas (panel del Coordinador).
  getAlerts: async (mine: boolean): Promise<StudentAlert[]> => {
    const response = await apiClient.get<{ alerts: StudentAlert[] }>(
      mine ? '/alerts?mine=true' : '/alerts',
    );
    return response.data.alerts;
  },
};
