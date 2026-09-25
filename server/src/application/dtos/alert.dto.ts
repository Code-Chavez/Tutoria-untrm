// Alertas de inasistencia y riesgo (HU-26): se calculan al vuelo a partir de
// los tutorados en riesgo y sus sesiones, sin persistirse — como el estado
// de una sesión (PROXIMA/REALIZADA/...), no son un registro histórico.
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
  // Solo presente para MISSED_SESSIONS: cuántas sesiones individuales ya
  // pasaron sin asistencia confirmada (Anexo N°4).
  missedCount?: number;
}
