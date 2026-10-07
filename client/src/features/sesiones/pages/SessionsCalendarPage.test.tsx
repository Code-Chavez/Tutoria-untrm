import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { SessionsCalendarPage } from './SessionsCalendarPage';
import { sessionService, TutoringSession } from '../services/sessionService';
import { studentService, Student } from '@features/tutorados/services/studentService';

vi.mock('../services/sessionService', () => ({
  sessionService: {
    getMySessions: vi.fn(),
    scheduleSession: vi.fn(),
    listEvidence: vi.fn().mockResolvedValue([]),
    uploadEvidence: vi.fn(),
    downloadEvidence: vi.fn(),
    recordAttendance: vi.fn(),
  },
}));
vi.mock('@features/tutorados/services/studentService', () => ({
  studentService: { getStudents: vi.fn() },
}));

const student1: Student = {
  id: 's1',
  studentCode: '20191234',
  firstName: 'Ana',
  lastName: 'Torres',
  email: null,
  phone: null,
  cycle: 5,
  isAtRisk: false,
  isActive: true,
  schoolId: 'school-1',
};

const student2: Student = {
  id: 's2',
  studentCode: '20195678',
  firstName: 'Luis',
  lastName: 'Pérez',
  email: null,
  phone: null,
  cycle: 5,
  isAtRisk: false,
  isActive: true,
  schoolId: 'school-1',
};

// "Hoy" fijo: jueves 15 de octubre de 2026.
const NOW = new Date(2026, 9, 15, 10, 0, 0);

const individualSession: TutoringSession = {
  id: 'sess-1',
  tutorId: 'tutor-1',
  topic: 'Reforzamiento de Cálculo',
  scheduledAt: new Date(2026, 9, 15, 15, 0).toISOString(),
  durationMinutes: 45,
  endsAt: new Date(2026, 9, 15, 15, 45).toISOString(),
  modality: 'VIRTUAL',
  location: null,
  meetingLink: 'https://meet.example.com/abc',
  studentIds: ['s1'],
  attendedStudentIds: [],
  absentStudentIds: [],
  attendance: null,
  cancelledAt: null,
  cancelReason: null,
  createdAt: new Date(2026, 9, 1).toISOString(),
};

const groupSession: TutoringSession = {
  id: 'sess-2',
  tutorId: 'tutor-1',
  topic: 'Taller de hábitos de estudio',
  scheduledAt: new Date(2026, 9, 20, 11, 0).toISOString(),
  durationMinutes: 45,
  endsAt: new Date(2026, 9, 20, 11, 45).toISOString(),
  modality: 'PRESENCIAL',
  location: 'Auditorio principal',
  meetingLink: null,
  studentIds: ['s1', 's2'],
  attendedStudentIds: [],
  absentStudentIds: [],
  attendance: null,
  cancelledAt: null,
  cancelReason: null,
  createdAt: new Date(2026, 9, 1).toISOString(),
};

describe('SessionsCalendarPage', () => {
  beforeEach(() => {
    // Solo se congela `Date`: dejar temporizadores reales evita que
    // `findBy*`/`waitFor` de Testing Library se cuelguen esperando su poll.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    vi.mocked(sessionService.getMySessions).mockResolvedValue([individualSession, groupSession]);
    vi.mocked(studentService.getStudents).mockResolvedValue([student1, student2]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra ambas sesiones del mes en la vista mensual', async () => {
    render(
      <QueryClientTestWrapper>
        <SessionsCalendarPage />
      </QueryClientTestWrapper>,
    );

    expect(await screen.findByText(/reforzamiento de cálculo/i)).toBeInTheDocument();
    expect(screen.getByText(/taller de hábitos de estudio/i)).toBeInTheDocument();
  });

  it('abre el detalle con los participantes al hacer clic en una sesión grupal', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientTestWrapper>
        <SessionsCalendarPage />
      </QueryClientTestWrapper>,
    );

    await user.click(await screen.findByText(/taller de hábitos de estudio/i));

    expect(await screen.findByText(/sesión grupal/i)).toBeInTheDocument();
    expect(screen.getByText(/ana torres · 20191234/i)).toBeInTheDocument();
    expect(screen.getByText(/luis pérez · 20195678/i)).toBeInTheDocument();
    expect(screen.getByText(/auditorio principal/i)).toBeInTheDocument();
  });

  it('en la vista semanal solo muestra las sesiones de la semana actual', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientTestWrapper>
        <SessionsCalendarPage />
      </QueryClientTestWrapper>,
    );

    await screen.findByText(/reforzamiento de cálculo/i);
    await user.click(screen.getByRole('button', { name: /semanal/i }));

    await waitFor(() => {
      expect(screen.getByText(/reforzamiento de cálculo/i)).toBeInTheDocument();
    });
    // La sesión grupal (20 de oct.) cae en la semana siguiente.
    expect(screen.queryByText(/taller de hábitos de estudio/i)).not.toBeInTheDocument();
  });

  it('registra quiénes asistieron a una sesión grupal ya realizada y actualiza el detalle (A07)', async () => {
    const pastGroup: TutoringSession = {
      ...groupSession,
      id: 'sess-past',
      topic: 'Taller de estrategias',
      scheduledAt: new Date(2026, 9, 13, 11, 0).toISOString(),
      endsAt: new Date(2026, 9, 13, 11, 45).toISOString(),
    };
    vi.mocked(sessionService.getMySessions).mockResolvedValue([pastGroup]);
    vi.mocked(sessionService.recordAttendance).mockResolvedValue({
      ...pastGroup,
      attendedStudentIds: ['s1'],
      absentStudentIds: ['s2'],
    });
    const user = userEvent.setup();
    render(
      <QueryClientTestWrapper>
        <SessionsCalendarPage />
      </QueryClientTestWrapper>,
    );

    await user.click(await screen.findByText(/taller de estrategias/i));
    await user.click(await screen.findByLabelText(/ana torres · 20191234/i));
    await user.click(screen.getByRole('button', { name: /guardar asistencia/i }));

    await waitFor(() => expect(sessionService.recordAttendance).toHaveBeenCalledWith('sess-past', ['s1']));
    expect(await screen.findByText(/asistieron 1 de 2 tutorados/i)).toBeInTheDocument();
  });
});
