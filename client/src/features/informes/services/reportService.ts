import { apiClient } from '@shared/services/apiClient';

// Consolidado de horarios y asistencia por tutor (HU-27, Art. 15.d).
// REALIZADA exige asistentes registrados (A07); INASISTENCIA = nadie asistió; POR_REGISTRAR = falta registrar la asistencia.
export type ScheduleAttendanceStatus =
  | 'CANCELADA'
  | 'PROXIMA'
  | 'EN_CURSO'
  | 'REALIZADA'
  | 'INASISTENCIA'
  | 'POR_REGISTRAR';

export interface ScheduleAttendanceSessionRow {
  id: string;
  topic: string;
  scheduledAt: string;
  durationMinutes: number;
  modality: 'PRESENCIAL' | 'VIRTUAL';
  studentNames: string[];
  status: ScheduleAttendanceStatus;
  attendanceConfirmed: boolean | null;
  /** Cuántos de los programados asistieron; null si aún no se registró. */
  attendedCount: number | null;
  participantCount: number;
}

export interface ScheduleAttendanceReport {
  tutorId: string;
  tutorName: string;
  periodFrom: string | null;
  periodTo: string | null;
  generatedAt: string;
  totalSessions: number;
  individualSessions: number;
  groupSessions: number;
  cancelledSessions: number;
  heldSessions: number;
  noShowSessions: number;
  pendingRollSessions: number;
  attendanceConfirmed: number;
  attendancePending: number;
  sessions: ScheduleAttendanceSessionRow[];
}

export interface ScheduleAttendanceParams {
  // mine: el docente tutor consulta su propio consolidado.
  // tutorId: el coordinador (o rol con acceso) elige un tutor específico.
  mine?: boolean;
  tutorId?: string;
  from?: string; // ISO date
  to?: string; // ISO date
}

function buildQuery(params: ScheduleAttendanceParams): string {
  const query = new URLSearchParams();
  if (params.mine) query.set('mine', 'true');
  else if (params.tutorId) query.set('tutorId', params.tutorId);
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  return query.toString();
}

// Dispara la descarga de un blob en el navegador.
function saveBlob(data: Blob, filename: string): void {
  const url = window.URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export const reportService = {
  getScheduleAttendanceReport: async (
    params: ScheduleAttendanceParams,
  ): Promise<ScheduleAttendanceReport> => {
    const response = await apiClient.get<{ report: ScheduleAttendanceReport }>(
      `/reports/schedule-attendance?${buildQuery(params)}`,
    );
    return response.data.report;
  },

  downloadScheduleAttendanceExcel: async (params: ScheduleAttendanceParams): Promise<void> => {
    const response = await apiClient.get(
      `/reports/schedule-attendance/excel?${buildQuery(params)}`,
      { responseType: 'blob' },
    );
    saveBlob(response.data as Blob, 'consolidado-horarios-asistencia.xlsx');
  },

  downloadScheduleAttendancePdf: async (params: ScheduleAttendanceParams): Promise<void> => {
    const response = await apiClient.get(`/reports/schedule-attendance/pdf?${buildQuery(params)}`, {
      responseType: 'blob',
    });
    saveBlob(response.data as Blob, 'consolidado-horarios-asistencia.pdf');
  },
};
