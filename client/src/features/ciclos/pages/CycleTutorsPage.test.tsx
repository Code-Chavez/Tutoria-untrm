import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientTestWrapper } from '@shared/test-utils/QueryClientTestWrapper';
import { CycleTutorsPage } from './CycleTutorsPage';
import { cycleTutorService } from '../services/cycleTutorService';
import { assignmentService } from '@features/asignacion/services/assignmentService';
import { schoolService } from '@features/tutorados/services/schoolService';

vi.mock('../services/cycleTutorService', () => ({ cycleTutorService: { list: vi.fn(), set: vi.fn(), remove: vi.fn() } }));
vi.mock('@features/asignacion/services/assignmentService', () => ({ assignmentService: { getTutorWorkload: vi.fn() } }));
vi.mock('@features/tutorados/services/schoolService', () => ({ schoolService: { getSchools: vi.fn() } }));
vi.mock('@features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'Administrador DBU' } }) }));

const mocked = vi.mocked(cycleTutorService);

const cycles = Array.from({ length: 10 }, (_, i) => ({ cycle: i + 1, assignment: null as null | { tutorId: string; isException: boolean; note: string | null }, enrolled: i === 0 ? 8 : 0, withoutTutor: 0 }));

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
    mocked.list.mockResolvedValue({ periodId: 'p1', periodName: '2026-II', cycles: cycles.map((c) => (c.cycle === 3 ? { ...c, assignment: { tutorId: 't1', isException: true, note: 'x' } } : c)) });
    mocked.remove.mockResolvedValue();
    renderPage();

    expect(await screen.findByText('Excepción')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar tutor del ciclo 3' }));

    await waitFor(() => expect(mocked.remove).toHaveBeenCalledWith('s1', 3));
  });
});
