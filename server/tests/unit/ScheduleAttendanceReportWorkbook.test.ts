import ExcelJS from 'exceljs';
import { ScheduleAttendanceReportWorkbook } from '@infrastructure/parsers/ScheduleAttendanceReportWorkbook';
import { ScheduleAttendanceReport } from '@application/dtos/report.dto';

describe('ScheduleAttendanceReportWorkbook', () => {
  const builder = new ScheduleAttendanceReportWorkbook();

  const report: ScheduleAttendanceReport = {
    tutorId: 'tutor-1',
    tutorName: 'Elena Ramírez',
    periodFrom: null,
    periodTo: null,
    generatedAt: new Date('2026-09-25T10:00:00Z'),
    totalSessions: 2,
    individualSessions: 1,
    groupSessions: 1,
    cancelledSessions: 0,
    attendanceConfirmed: 1,
    attendancePending: 0,
    sessions: [
      {
        id: 's1',
        topic: 'Reforzamiento',
        scheduledAt: new Date('2026-09-20T10:00:00Z'),
        durationMinutes: 45,
        modality: 'VIRTUAL',
        studentNames: ['Ana Torres'],
        status: 'REALIZADA',
        attendanceConfirmed: true,
      },
      {
        id: 's2',
        topic: 'Taller grupal',
        scheduledAt: new Date('2026-09-18T10:00:00Z'),
        durationMinutes: 45,
        modality: 'PRESENCIAL',
        studentNames: ['Ana Torres', 'Luis Pérez'],
        status: 'REALIZADA',
        attendanceConfirmed: null,
      },
    ],
  };

  it('genera un .xlsx con las hojas Resumen y Sesiones', async () => {
    const buffer = await builder.build(report);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

    const summary = workbook.getWorksheet('Resumen');
    const detail = workbook.getWorksheet('Sesiones');
    expect(summary).toBeDefined();
    expect(detail).toBeDefined();

    // Encabezado + 2 sesiones.
    expect(detail?.rowCount).toBe(3);
    expect(detail?.getRow(2).getCell(2).value).toBe('Reforzamiento');
    expect(detail?.getRow(2).getCell(5).value).toBe('Ana Torres');
    expect(detail?.getRow(3).getCell(5).value).toBe('Ana Torres, Luis Pérez');
  });
});
