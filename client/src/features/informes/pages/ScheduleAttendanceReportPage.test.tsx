import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScheduleAttendanceReportPage } from './ScheduleAttendanceReportPage';
import { reportService, type ScheduleAttendanceReport } from '../services/reportService';
import { assignmentService } from '@features/asignacion/services/assignmentService';

vi.mock('../services/reportService', () => ({
  reportService: {
    getScheduleAttendanceReport: vi.fn(),
    downloadScheduleAttendancePdf: vi.fn(),
    downloadScheduleAttendanceExcel: vi.fn(),
  },
}));

vi.mock('@features/asignacion/services/assignmentService', () => ({
  assignmentService: { getTutorWorkload: vi.fn() },
}));

let mockRole = 'Docente Tutor';
vi.mock('@features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { firstName: 'Elena', lastName: 'Ramírez', role: mockRole } }),
}));

const mockedReports = vi.mocked(reportService);
const mockedAssignments = vi.mocked(assignmentService);

const sampleReport: ScheduleAttendanceReport = {
  tutorId: 'tutor-1',
  tutorName: 'Elena Ramírez',
  periodFrom: null,
  periodTo: null,
  generatedAt: new Date(2026, 9, 25).toISOString(),
  totalSessions: 2,
  individualSessions: 1,
  groupSessions: 1,
  cancelledSessions: 0,
  attendanceConfirmed: 1,
  attendancePending: 0,
  sessions: [
    {
      id: 's1',
      topic: 'Reforzamiento de Cálculo',
      scheduledAt: new Date(2026, 9, 20, 10, 0).toISOString(),
      durationMinutes: 45,
      modality: 'VIRTUAL',
      studentNames: ['Ana Torres'],
      status: 'REALIZADA',
      attendanceConfirmed: true,
    },
    {
      id: 's2',
      topic: 'Taller grupal',
      scheduledAt: new Date(2026, 9, 18, 10, 0).toISOString(),
      durationMinutes: 45,
      modality: 'PRESENCIAL',
      studentNames: ['Ana Torres', 'Luis Pérez'],
      status: 'REALIZADA',
      attendanceConfirmed: null,
    },
  ],
};

describe('ScheduleAttendanceReportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRole = 'Docente Tutor';
  });

  it('carga automáticamente el consolidado propio cuando el rol es Docente Tutor', async () => {
    mockedReports.getScheduleAttendanceReport.mockResolvedValue(sampleReport);
    render(<ScheduleAttendanceReportPage />);

    expect(await screen.findByText(/sesiones de elena ramírez/i)).toBeInTheDocument();
    expect(mockedReports.getScheduleAttendanceReport).toHaveBeenCalledWith({
      mine: true,
      tutorId: undefined,
      from: undefined,
      to: undefined,
    });
    expect(screen.getByText('Reforzamiento de Cálculo')).toBeInTheDocument();
    expect(screen.queryByText(/selecciona un tutor/i)).not.toBeInTheDocument();
  });

  it('muestra el selector de tutor y no carga nada hasta elegir uno (Coordinador)', async () => {
    mockRole = 'Coordinador';
    mockedAssignments.getTutorWorkload.mockResolvedValue([
      { tutorId: 'tutor-1', fullName: 'Elena Ramírez', email: 'e@x.com', assignedCount: 5 },
    ]);
    render(<ScheduleAttendanceReportPage />);

    expect(await screen.findByRole('heading', { name: /selecciona un tutor/i })).toBeInTheDocument();
    expect(mockedReports.getScheduleAttendanceReport).not.toHaveBeenCalled();
    expect(screen.getByRole('option', { name: 'Elena Ramírez' })).toBeInTheDocument();
  });

  it('genera el consolidado del tutor elegido al hacer clic (Coordinador)', async () => {
    mockRole = 'Coordinador';
    mockedAssignments.getTutorWorkload.mockResolvedValue([
      { tutorId: 'tutor-1', fullName: 'Elena Ramírez', email: 'e@x.com', assignedCount: 5 },
    ]);
    mockedReports.getScheduleAttendanceReport.mockResolvedValue(sampleReport);
    const user = userEvent.setup();
    render(<ScheduleAttendanceReportPage />);

    await screen.findByRole('option', { name: 'Elena Ramírez' });
    await user.selectOptions(screen.getByRole('combobox'), 'tutor-1');
    await user.click(screen.getByRole('button', { name: /generar consolidado/i }));

    expect(await screen.findByText(/sesiones de elena ramírez/i)).toBeInTheDocument();
    expect(mockedReports.getScheduleAttendanceReport).toHaveBeenCalledWith(
      expect.objectContaining({ tutorId: 'tutor-1' }),
    );
  });

  it('permite exportar a PDF y Excel cuando el rol tiene permiso', async () => {
    mockedReports.getScheduleAttendanceReport.mockResolvedValue(sampleReport);
    const user = userEvent.setup();
    render(<ScheduleAttendanceReportPage />);

    await screen.findByText(/sesiones de elena ramírez/i);
    await user.click(screen.getByRole('button', { name: /pdf/i }));
    expect(mockedReports.downloadScheduleAttendancePdf).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /excel/i }));
    expect(mockedReports.downloadScheduleAttendanceExcel).toHaveBeenCalled();
  });

  it('no muestra botones de exportación para un rol sin permiso (Vicerrectorado)', async () => {
    mockRole = 'Vicerrectorado';
    mockedAssignments.getTutorWorkload.mockResolvedValue([]);
    render(<ScheduleAttendanceReportPage />);

    await screen.findByRole('heading', { name: /selecciona un tutor/i });
    expect(screen.queryByRole('button', { name: /pdf/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /excel/i })).not.toBeInTheDocument();
  });
});
