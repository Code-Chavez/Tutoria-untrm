import ExcelJS from 'exceljs';
import { ScheduleAttendanceReport } from '@application/dtos/report.dto';

const NAVY = 'FF0B1F3F';

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

// Construye el .xlsx del consolidado de horarios y asistencia (HU-27, Art.
// 15.d): resumen + detalle de sesiones. No persiste nada; recibe el reporte
// ya calculado por GetScheduleAttendanceReportUseCase.
export class ScheduleAttendanceReportWorkbook {
  async build(report: ScheduleAttendanceReport): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SIT UNTRM';
    workbook.created = report.generatedAt;

    // ── Resumen ──────────────────────────────────────────────
    const summary = workbook.addWorksheet('Resumen');
    summary.columns = [{ width: 28 }, { width: 40 }];
    summary.addRow(['Consolidado de horarios y asistencia']).font = {
      bold: true,
      size: 14,
      color: { argb: NAVY },
    };
    summary.addRow([]);
    summary.addRow(['Tutor', report.tutorName]);
    summary.addRow([
      'Periodo',
      report.periodFrom || report.periodTo
        ? `${report.periodFrom?.toLocaleDateString('es-PE') ?? '—'} a ${report.periodTo?.toLocaleDateString('es-PE') ?? '—'}`
        : 'Historial completo',
    ]);
    summary.addRow(['Generado', report.generatedAt.toLocaleString('es-PE')]);
    summary.addRow(['Total de sesiones', report.totalSessions]);
    summary.addRow(['Sesiones individuales', report.individualSessions]);
    summary.addRow(['Sesiones grupales', report.groupSessions]);
    summary.addRow(['Sesiones canceladas', report.cancelledSessions]);
    summary.addRow(['Asistencias confirmadas', report.attendanceConfirmed]);
    summary.addRow(['Asistencias pendientes', report.attendancePending]);
    summary.getColumn(1).font = { bold: true };

    // ── Detalle ──────────────────────────────────────────────
    const detail = workbook.addWorksheet('Sesiones');
    detail.columns = [
      { header: 'Fecha', key: 'date', width: 20 },
      { header: 'Tema', key: 'topic', width: 35 },
      { header: 'Duración (min)', key: 'duration', width: 16 },
      { header: 'Modalidad', key: 'modality', width: 14 },
      { header: 'Tutorados', key: 'students', width: 40 },
      { header: 'Estado', key: 'status', width: 14 },
      { header: 'Asistencia', key: 'attendance', width: 16 },
    ];
    detail.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    detail.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };

    report.sessions.forEach((s) => {
      detail.addRow({
        date: s.scheduledAt.toLocaleString('es-PE'),
        topic: s.topic,
        duration: s.durationMinutes,
        modality: s.modality === 'PRESENCIAL' ? 'Presencial' : 'Virtual',
        students: s.studentNames.join(', '),
        status: STATUS_LABEL[s.status] ?? s.status,
        attendance: attendanceLabel(s.attendanceConfirmed),
      });
    });

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }
}
