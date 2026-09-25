import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RiskAlerts } from './RiskAlerts';
import { alertService, type StudentAlert } from '../services/alertService';

vi.mock('../services/alertService', () => ({
  alertService: { getAlerts: vi.fn() },
}));

let mockRole = 'Docente Tutor';
vi.mock('@features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { firstName: 'Elena', lastName: 'Ramírez', role: mockRole } }),
}));

const mocked = vi.mocked(alertService);

const noSessionsAlert: StudentAlert = {
  type: 'NO_SESSIONS',
  studentId: 's1',
  studentCode: '20191234',
  studentName: 'Ana Torres',
  cycle: 5,
  riskReason: 'Bajo rendimiento',
  tutorId: 't1',
  tutorName: 'Elena Ramírez',
};

const missedSessionsAlert: StudentAlert = {
  type: 'MISSED_SESSIONS',
  studentId: 's2',
  studentCode: '20195678',
  studentName: 'Luis Pérez',
  cycle: 3,
  riskReason: 'Inasistencias',
  tutorId: 't1',
  tutorName: 'Elena Ramírez',
  missedCount: 3,
};

describe('RiskAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRole = 'Docente Tutor';
  });

  it('pide las alertas del propio tutor cuando el rol es Docente Tutor', async () => {
    mocked.getAlerts.mockResolvedValue([]);
    render(<RiskAlerts />);

    await screen.findByText(/sin alertas activas/i);
    expect(mocked.getAlerts).toHaveBeenCalledWith(true);
  });

  it('pide todas las alertas cuando el rol es Coordinador', async () => {
    mockRole = 'Coordinador';
    mocked.getAlerts.mockResolvedValue([]);
    render(<RiskAlerts />);

    await screen.findByText(/sin alertas activas/i);
    expect(mocked.getAlerts).toHaveBeenCalledWith(false);
  });

  it('muestra un tutorado sin sesiones registradas', async () => {
    mocked.getAlerts.mockResolvedValue([noSessionsAlert]);
    render(<RiskAlerts />);

    expect(await screen.findByText(/ana torres/i)).toBeInTheDocument();
    expect(screen.getByText(/sin sesiones registradas/i)).toBeInTheDocument();
    expect(screen.getByText(/tutor: elena ramírez/i)).toBeInTheDocument();
  });

  it('muestra un tutorado con inasistencias por encima del umbral', async () => {
    mocked.getAlerts.mockResolvedValue([missedSessionsAlert]);
    render(<RiskAlerts />);

    expect(await screen.findByText(/luis pérez/i)).toBeInTheDocument();
    expect(screen.getByText(/3 sesiones sin asistencia confirmada/i)).toBeInTheDocument();
  });

  it('muestra un estado de sin acceso cuando el rol no tiene permiso (403)', async () => {
    mocked.getAlerts.mockRejectedValue({ response: { status: 403 } });
    render(<RiskAlerts />);

    expect(await screen.findByText(/sin acceso a las alertas/i)).toBeInTheDocument();
  });
});
