import { ScheduleAttendanceReport } from '@application/dtos/report.dto';
import { BrandedWorkbook } from '../export/BrandedWorkbook';

const STATUS_LABEL: Record<string, string> = {
  CANCELADA: 'Cancelada',
  PROXIMA: 'Próxima',
  EN_CURSO: 'En curso',
  REALIZADA: 'Realizada',
};

function attendanceLabel(confirmed: boolean | null): string {
  if (confirmed === null) return 'N/A (grupal)';
  return confirmed ? 'Confirmada' : 'Pendiente';
}

function periodLabel(report: ScheduleAttendanceReport): string {
  return report.periodFrom || report.periodTo
    ? `${report.periodFrom?.toLocaleDateString('es-PE') ?? '—'} a ${report.periodTo?.toLocaleDateString('es-PE') ?? '—'}`
    : 'Historial completo';
}

// Excel del consolidado de horarios y asistencia (HU-27, Art. 15.d) sobre el
// motor de exportación (HU-46): hoja de resumen + detalle de sesiones. No
// persiste nada; recibe el reporte ya calculado.
export class ScheduleAttendanceReportWorkbook {
  build(report: ScheduleAttendanceReport): Promise<Buffer> {
    const details = [
      `Tutor: ${report.tutorName}`,
      `Periodo: ${periodLabel(report)}`,
      `Generado: ${report.generatedAt.toLocaleString('es-PE')}`,
    ];
    return new BrandedWorkbook(report.generatedAt)
      .addSheet({
        name: 'Resumen',
        title: 'Consolidado de horarios y asistencia',
        details,
        columns: [{ header: 'Indicador', width: 30 }, { header: 'Valor', width: 14 }],
        rows: [
          ['Total de sesiones', report.totalSessions],
          ['Sesiones individuales', report.individualSessions],
          ['Sesiones grupales', report.groupSessions],
          ['Sesiones canceladas', report.cancelledSessions],
          ['Asistencias confirmadas', report.attendanceConfirmed],
          ['Asistencias pendientes', report.attendancePending],
        ],
      })
      .addSheet({
        name: 'Sesiones',
        title: 'Detalle de sesiones',
        details,
        columns: [
          { header: 'Fecha', width: 20 },
          { header: 'Tema', width: 35 },
          { header: 'Duración (min)', width: 16 },
          { header: 'Modalidad', width: 14 },
          { header: 'Tutorados', width: 40 },
          { header: 'Estado', width: 14 },
          { header: 'Asistencia', width: 16 },
        ],
        rows: report.sessions.map((s) => [
          s.scheduledAt.toLocaleString('es-PE'),
          s.topic,
          s.durationMinutes,
          s.modality === 'PRESENCIAL' ? 'Presencial' : 'Virtual',
          s.studentNames.join(', '),
          STATUS_LABEL[s.status] ?? s.status,
          attendanceLabel(s.attendanceConfirmed),
        ]),
      })
      .toBuffer();
  }
}
