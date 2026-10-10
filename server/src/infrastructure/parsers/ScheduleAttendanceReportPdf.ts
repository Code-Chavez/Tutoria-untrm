import { ScheduleAttendanceReport } from '@application/dtos/report.dto';
import { BrandedPdf } from '../export/BrandedPdf';

const STATUS_LABEL: Record<string, string> = {
  CANCELADA: 'Cancelada',
  PROXIMA: 'Próxima',
  EN_CURSO: 'En curso',
  REALIZADA: 'Realizada',
  INASISTENCIA: 'Sin asistentes',
  POR_REGISTRAR: 'Asistencia por registrar',
};

// Individual: confirmación del Anexo N°4; grupal: cuántos de los programados asistieron (A07).
function attendanceLabel(s: ScheduleAttendanceReport['sessions'][number]): string {
  if (s.status === 'CANCELADA') return 'N/A';
  if (s.participantCount > 1) {
    return s.attendedCount === null ? 'Sin registrar' : `${s.attendedCount} de ${s.participantCount}`;
  }
  if (s.attendanceConfirmed === null) return 'N/A';
  return s.attendanceConfirmed ? 'Confirmada' : 'Pendiente';
}

// PDF del consolidado de horarios y asistencia (HU-27, Art. 15.d) sobre el
// motor de exportación (HU-46): resumen + tabla de sesiones. No persiste
// nada; recibe el reporte ya calculado.
export class ScheduleAttendanceReportPdf {
  build(report: ScheduleAttendanceReport): Promise<Buffer> {
    const period =
      report.periodFrom || report.periodTo
        ? `${report.periodFrom?.toLocaleDateString('es-PE') ?? '—'} a ${report.periodTo?.toLocaleDateString('es-PE') ?? '—'}`
        : 'Historial completo';

    return new BrandedPdf({
      title: 'Consolidado de horarios y asistencia',
      subtitle: 'Anexo N° 5 · Art. 15.d del Protocolo de Tutoría',
      generatedAt: report.generatedAt,
    })
      .keyValues([
        ['Tutor', report.tutorName],
        ['Periodo', period],
        ['Total de sesiones', report.totalSessions],
        ['Realizadas (con asistentes) / sin asistentes / por registrar', `${report.heldSessions} / ${report.noShowSessions} / ${report.pendingRollSessions}`],
        ['Individuales / grupales', `${report.individualSessions} / ${report.groupSessions}`],
        ['Canceladas', report.cancelledSessions],
        ['Asistencias confirmadas / pendientes', `${report.attendanceConfirmed} / ${report.attendancePending}`],
      ])
      .heading('Sesiones')
      .table(
        [
          { label: 'Fecha', weight: 2 },
          { label: 'Tema', weight: 3 },
          { label: 'Modalidad', weight: 1.3 },
          { label: 'Estado', weight: 1.5 },
          { label: 'Asistencia', weight: 1.5 },
        ],
        report.sessions.map((s) => [
          s.scheduledAt.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }),
          s.topic,
          s.modality === 'PRESENCIAL' ? 'Presencial' : 'Virtual',
          STATUS_LABEL[s.status] ?? s.status,
          attendanceLabel(s),
        ]),
      )
      .toBuffer();
  }
}
