import { ScheduleAttendanceReportPdf } from '@infrastructure/parsers/ScheduleAttendanceReportPdf';
import { ScheduleAttendanceReport } from '@application/dtos/report.dto';

describe('ScheduleAttendanceReportPdf', () => {
  const builder = new ScheduleAttendanceReportPdf();

  const baseReport: ScheduleAttendanceReport = {
    tutorId: 'tutor-1',
    tutorName: 'Elena Ramírez',
    periodFrom: null,
    periodTo: null,
    generatedAt: new Date('2026-09-25T10:00:00Z'),
    totalSessions: 1,
    individualSessions: 1,
    groupSessions: 0,
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
    ],
  };

  it('genera un buffer PDF válido con sesiones', async () => {
    const buffer = await builder.build(baseReport);

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('genera un buffer PDF válido cuando no hay sesiones en el periodo', async () => {
    const buffer = await builder.build({ ...baseReport, totalSessions: 0, sessions: [] });

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('pagina correctamente cuando hay muchas sesiones', async () => {
    const manySessions = Array.from({ length: 60 }, (_, i) => ({
      ...baseReport.sessions[0],
      id: `s${i}`,
      topic: `Sesión número ${i} con un tema bastante largo para forzar el salto de línea`,
    }));

    const buffer = await builder.build({ ...baseReport, sessions: manySessions });

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });
});
