import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { CycleTutorsPage } from './CycleTutorsPage';
import { cycleTutorService, type CycleRow } from '../services/cycleTutorService';
import { assignmentService } from '@features/asignacion/services/assignmentService';
import { schoolService } from '@features/tutorados/services/schoolService';

vi.mock('../services/cycleTutorService', () => ({ cycleTutorService: { list: vi.fn(), set: vi.fn(), remove: vi.fn(), resendAcceptance: vi.fn() } }));
vi.mock('@features/asignacion/services/assignmentService', () => ({ assignmentService: { getTutorWorkload: vi.fn() } }));
vi.mock('@features/tutorados/services/schoolService', () => ({ schoolService: { getSchools: vi.fn() } }));
vi.mock('@features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'Administrador DBU' } }) }));

const mocked = vi.mocked(cycleTutorService);

const cycles = Array.from({ length: 10 }, (_, i) => ({ cycle: i + 1, assignment: null as CycleRow['assignment'], enrolled: i === 0 ? 8 : 0, withoutTutor: 0 }));

const renderPage = () =>
  render(
    <QueryClientTestWrapper>
      <CycleTutorsPage />
    </QueryClientTestWrapper>,
  );

describe('CycleTutorsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(schoolService.getSchools).mockResolvedValue([{ id: 's1', name: 'Ingeniería de Sistemas', facultyId: 'f1', isActive: true }]);
    vi.mocked(assignmentService.getTutorWorkload).mockResolvedValue([
      { tutorId: 't1', fullName: 'Elena Ramírez', email: 'e@untrm.edu.pe', assignedCount: 0, schoolId: 's1' },
      { tutorId: 't2', fullName: 'Docente de Mecánica', email: 'm@untrm.edu.pe', assignedCount: 0, schoolId: 's2' },
    ]);
    mocked.list.mockResolvedValue({ periodId: 'p1', periodName: '2026-II', cycles });
  });

  it('ofrece solo los docentes de la escuela y asigna al elegido', async () => {
    mocked.set.mockResolvedValue({ assigned: 8, moved: 0 });
    renderPage();

    const select = await screen.findByLabelText('Tutor del ciclo 1');
    expect(screen.queryByRole('option', { name: 'Docente de Mecánica' })).not.toBeInTheDocument();
    await userEvent.selectOptions(select, 't1');

    await waitFor(() => expect(mocked.set).toHaveBeenCalledWith('s1', 1, { tutorId: 't1' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Ciclo 1: 8 estudiante(s) asignados');
  });

  it('si el docente ya tiene otro ciclo pide el motivo y registra la excepción', async () => {
    mocked.set
      .mockRejectedValueOnce(Object.assign(new Error('x'), { isAxiosError: true, response: { data: { code: 'TUTOR_HAS_CYCLE', error: 'El docente ya es tutor del ciclo 1 en este periodo.' } } }))
      .mockResolvedValueOnce({ assigned: 0, moved: 0 });
    renderPage();

    await userEvent.selectOptions(await screen.findByLabelText('Tutor del ciclo 2'), 't1');
    const dialog = await screen.findByRole('dialog', { name: 'Registrar excepción' });
    expect(dialog).toHaveTextContent('ya es tutor del ciclo 1');
    const register = screen.getByRole('button', { name: 'Registrar excepción' });
    expect(register).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Motivo de la excepción'), 'Aceptó por correo');
    await userEvent.click(register);

    await waitFor(() => expect(mocked.set).toHaveBeenLastCalledWith('s1', 2, { tutorId: 't1', isException: true, note: 'Aceptó por correo' }));
  });

  it('muestra un ciclo con tutor como excepción y permite quitarlo', async () => {
    mocked.list.mockResolvedValue({ periodId: 'p1', periodName: '2026-II', cycles: cycles.map((c) => (c.cycle === 3 ? { ...c, assignment: { tutorId: 't1', isException: true, note: 'x', acceptanceStatus: 'PENDIENTE' as const, availability: null, declineReason: null } } : c)) });
    mocked.remove.mockResolvedValue();
    renderPage();

    expect(await screen.findByText('Excepción')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar tutor del ciclo 3' }));

    await waitFor(() => expect(mocked.remove).toHaveBeenCalledWith('s1', 3));
  });

  it('muestra si el docente aceptó (con su disponibilidad), rechazó (con su motivo) o está pendiente, y permite reenviar el correo', async () => {
    const base = { tutorId: 't1', isException: false, note: null, availability: null, declineReason: null };
    mocked.list.mockResolvedValue({
      periodId: 'p1',
      periodName: '2026-II',
      cycles: cycles.map((c) =>
        c.cycle === 1
          ? { ...c, assignment: { ...base, acceptanceStatus: 'ACEPTADA' as const, availability: [{ day: 2, start: '10:00', end: '11:30', place: 'Aula 12' }] } }
          : c.cycle === 2
            ? { ...c, assignment: { ...base, acceptanceStatus: 'RECHAZADA' as const, declineReason: 'Licencia por estudios' } }
            : c.cycle === 3
              ? { ...c, assignment: { ...base, acceptanceStatus: 'PENDIENTE' as const } }
              : c,
      ),
    });
    mocked.resendAcceptance.mockResolvedValue(true);
    renderPage();

    expect(await screen.findByText('Aceptó')).toBeInTheDocument();
    expect(screen.getByText('Martes 10:00–11:30 (Aula 12)')).toBeInTheDocument();
    expect(screen.getByText('Rechazó')).toBeInTheDocument();
    expect(screen.getByText('Motivo: Licencia por estudios')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reenviar correo del ciclo 1' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Reenviar correo del ciclo 3' }));

    await waitFor(() => expect(mocked.resendAcceptance).toHaveBeenCalledWith('s1', 3));
    expect(await screen.findByRole('status')).toHaveTextContent('Ciclo 3: correo enviado al docente.');
  });

  it('muestra primero los ciclos sin tutor (con estudiantes), luego los rechazados, y al final los ya resueltos', async () => {
    const base = { tutorId: 't1', isException: false, note: null, availability: null, declineReason: null };
    mocked.list.mockResolvedValue({
      periodId: 'p1',
      periodName: '2026-II',
      cycles: cycles.map((c) =>
        c.cycle === 1
          ? { ...c, enrolled: 5, assignment: { ...base, acceptanceStatus: 'ACEPTADA' as const } }
          : c.cycle === 2
            ? { ...c, enrolled: 4, assignment: { ...base, acceptanceStatus: 'RECHAZADA' as const, declineReason: 'Licencia' } }
            : c.cycle === 7
              ? { ...c, enrolled: 6 }
              : c,
      ),
    });
    renderPage();

    await screen.findByLabelText('Tutor del ciclo 7');
    const order = screen.getAllByLabelText(/^Tutor del ciclo /).map((el) => el.getAttribute('aria-label'));
    expect(order.slice(0, 3)).toEqual(['Tutor del ciclo 7', 'Tutor del ciclo 2', 'Tutor del ciclo 3']);
    expect(order.at(-1)).toBe('Tutor del ciclo 1');
    expect(screen.getByText('Sin tutor')).toBeInTheDocument();
  });
});
