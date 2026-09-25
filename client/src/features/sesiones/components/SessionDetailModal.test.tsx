import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionDetailModal } from './SessionDetailModal';
import type { TutoringSession } from '../services/sessionService';
import type { Student } from '@features/tutorados/services/studentService';

const student: Student = {
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

const NOW = new Date(2026, 9, 10, 12, 0, 0);

function makeSession(overrides: Partial<TutoringSession> = {}): TutoringSession {
  return {
    id: 'sess-1',
    tutorId: 'tutor-1',
    topic: 'Reforzamiento de Cálculo',
    scheduledAt: new Date(2026, 9, 10, 9, 0).toISOString(),
    durationMinutes: 45,
    endsAt: new Date(2026, 9, 10, 9, 45).toISOString(),
    modality: 'PRESENCIAL',
    location: 'Oficina 204',
    meetingLink: null,
    studentIds: ['s1'],
    attendance: null,
    createdAt: new Date(2026, 9, 1).toISOString(),
    ...overrides,
  };
}

describe('SessionDetailModal', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('no permite registrar asistencia antes de que empiece la sesión', () => {
    const future = makeSession({ scheduledAt: new Date(2026, 9, 15, 9, 0).toISOString() });
    render(
      <SessionDetailModal
        session={future}
        students={[student]}
        allSessions={[future]}
        onClose={vi.fn()}
        onRegisterAttendance={vi.fn()}
      />,
    );

    expect(screen.getByText(/podrás registrar la asistencia/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /registrar asistencia/i })).not.toBeInTheDocument();
  });

  it('permite registrar asistencia de una sesión ya realizada sin registro previo', async () => {
    const onRegister = vi.fn();
    const past = makeSession();
    const user = userEvent.setup();
    render(
      <SessionDetailModal
        session={past}
        students={[student]}
        allSessions={[past]}
        onClose={vi.fn()}
        onRegisterAttendance={onRegister}
      />,
    );

    expect(screen.getByText(/sesión 1 de 8/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /registrar asistencia/i }));
    expect(onRegister).toHaveBeenCalled();
  });

  it('muestra la asistencia ya confirmada sin botón de registro', () => {
    const confirmed = makeSession({
      attendance: {
        id: 'att-1',
        sessionId: 'sess-1',
        sequenceNumber: 3,
        confirmedAt: new Date(2026, 9, 10, 9, 45).toISOString(),
        createdAt: new Date(2026, 9, 10, 9, 45).toISOString(),
      },
    });
    render(
      <SessionDetailModal
        session={confirmed}
        students={[student]}
        allSessions={[confirmed]}
        onClose={vi.fn()}
        onRegisterAttendance={vi.fn()}
      />,
    );

    expect(screen.getByText(/asistencia registrada · sesión 3 de 8/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /registrar asistencia/i })).not.toBeInTheDocument();
  });

  it('oculta el registro de asistencia cuando se alcanzó el máximo de 8', () => {
    const target = makeSession({ id: 'sess-9' });
    const priorConfirmed = Array.from({ length: 8 }, (_, i) =>
      makeSession({
        id: `sess-prior-${i}`,
        attendance: {
          id: `att-${i}`,
          sessionId: `sess-prior-${i}`,
          sequenceNumber: i + 1,
          confirmedAt: new Date(2026, 9, i + 1).toISOString(),
          createdAt: new Date(2026, 9, i + 1).toISOString(),
        },
      }),
    );
    render(
      <SessionDetailModal
        session={target}
        students={[student]}
        allSessions={[...priorConfirmed, target]}
        onClose={vi.fn()}
        onRegisterAttendance={vi.fn()}
      />,
    );

    expect(screen.getByText(/se alcanzó el máximo de 8 sesiones/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /registrar asistencia/i })).not.toBeInTheDocument();
  });

  it('no muestra la sección de asistencia en sesiones grupales', () => {
    const group = makeSession({ studentIds: ['s1', 's2'] });
    render(
      <SessionDetailModal
        session={group}
        students={[student]}
        allSessions={[group]}
        onClose={vi.fn()}
        onRegisterAttendance={vi.fn()}
      />,
    );

    expect(screen.queryByText(/sesión de asistencia|asistencia registrada|de 8/i)).not.toBeInTheDocument();
  });
});
