import type React from 'react';
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
    cancelledAt: null,
    cancelReason: null,
    createdAt: new Date(2026, 9, 1).toISOString(),
    ...overrides,
  };
}

function renderModal(props: Partial<React.ComponentProps<typeof SessionDetailModal>> & {
  session: TutoringSession;
  allSessions: TutoringSession[];
}) {
  return render(
    <SessionDetailModal
      students={[student]}
      onClose={vi.fn()}
      onRegisterAttendance={vi.fn()}
      onReschedule={vi.fn()}
      onCancelSession={vi.fn()}
      {...props}
    />,
  );
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
    renderModal({ session: future, allSessions: [future] });

    expect(screen.getByText(/podrás registrar la asistencia/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /registrar asistencia/i })).not.toBeInTheDocument();
  });

  it('permite registrar asistencia de una sesión ya realizada sin registro previo', async () => {
    const onRegister = vi.fn();
    const past = makeSession();
    const user = userEvent.setup();
    renderModal({ session: past, allSessions: [past], onRegisterAttendance: onRegister });

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
    renderModal({ session: confirmed, allSessions: [confirmed] });

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
    renderModal({ session: target, allSessions: [...priorConfirmed, target] });

    expect(screen.getByText(/se alcanzó el máximo de 8 sesiones/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /registrar asistencia/i })).not.toBeInTheDocument();
  });

  it('no muestra la sección de asistencia en sesiones grupales', () => {
    const group = makeSession({ studentIds: ['s1', 's2'] });
    renderModal({ session: group, allSessions: [group] });

    expect(screen.queryByText(/sesión de asistencia|asistencia registrada|de 8/i)).not.toBeInTheDocument();
  });

  it('permite reprogramar y cancelar una sesión próxima o en curso', async () => {
    const onReschedule = vi.fn();
    const onCancelSession = vi.fn();
    const upcoming = makeSession({ scheduledAt: new Date(2026, 9, 15, 9, 0).toISOString() });
    const user = userEvent.setup();
    renderModal({
      session: upcoming,
      allSessions: [upcoming],
      onReschedule,
      onCancelSession,
    });

    await user.click(screen.getByRole('button', { name: /^reprogramar$/i }));
    expect(onReschedule).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /cancelar sesión/i }));
    expect(onCancelSession).toHaveBeenCalled();
  });

  it('no permite reprogramar ni cancelar una sesión ya realizada', () => {
    const past = makeSession();
    renderModal({ session: past, allSessions: [past] });

    expect(screen.queryByRole('button', { name: /^reprogramar$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancelar sesión/i })).not.toBeInTheDocument();
  });

  it('muestra el motivo cuando la sesión está cancelada, sin acciones de modificarla', () => {
    const cancelled = makeSession({
      cancelledAt: new Date(2026, 9, 9).toISOString(),
      cancelReason: 'El tutor tuvo una emergencia',
    });
    renderModal({ session: cancelled, allSessions: [cancelled] });

    expect(screen.getByText(/cancelada el/i)).toBeInTheDocument();
    expect(screen.getByText(/el tutor tuvo una emergencia/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^reprogramar$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancelar sesión/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /registrar asistencia/i })).not.toBeInTheDocument();
  });

  it('muestra un mensaje cuando la sesión no tiene evidencias adjuntas', () => {
    const session = makeSession();
    renderModal({ session, allSessions: [session], evidences: [] });

    expect(screen.getByText(/aún no se adjuntaron evidencias/i)).toBeInTheDocument();
  });

  it('lista las evidencias adjuntas con autor y tamaño (HU-25)', () => {
    const session = makeSession();
    renderModal({
      session,
      allSessions: [session],
      evidences: [
        {
          id: 'ev-1',
          sessionId: 'sess-1',
          fileName: 'constancia.pdf',
          mimeType: 'application/pdf',
          fileSize: 2048,
          uploadedByName: 'Elena Ramírez',
          createdAt: new Date(2026, 9, 9).toISOString(),
        },
      ],
    });

    expect(screen.getByText('constancia.pdf')).toBeInTheDocument();
    expect(screen.getByText(/2\.0 KB · Elena Ramírez/i)).toBeInTheDocument();
  });

  it('permite adjuntar una nueva evidencia', async () => {
    const onUploadEvidence = vi.fn();
    const session = makeSession();
    renderModal({ session, allSessions: [session], evidences: [], onUploadEvidence });

    const file = new File(['contenido'], 'evidencia.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    expect(onUploadEvidence).toHaveBeenCalledWith(file);
  });

  it('descarga una evidencia al hacer clic en su nombre', async () => {
    const onDownloadEvidence = vi.fn();
    const session = makeSession();
    const user = userEvent.setup();
    const evidence = {
      id: 'ev-1',
      sessionId: 'sess-1',
      fileName: 'constancia.pdf',
      mimeType: 'application/pdf',
      fileSize: 2048,
      uploadedByName: 'Elena Ramírez',
      createdAt: new Date(2026, 9, 9).toISOString(),
    };
    renderModal({ session, allSessions: [session], evidences: [evidence], onDownloadEvidence });

    await user.click(screen.getByRole('button', { name: /constancia\.pdf/i }));
    expect(onDownloadEvidence).toHaveBeenCalledWith(evidence);
  });
});
