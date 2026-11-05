import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FollowUpFormModal } from './FollowUpFormModal';
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

describe('FollowUpFormModal', () => {
  beforeEach(() => sessionStorage.clear());

  it('recupera lo escrito al volver a abrirla y no mezcla borradores de otra persona', async () => {
    const user = userEvent.setup();
    const first = render(<FollowUpFormModal student={student} draftOwnerId="u1" onSubmit={vi.fn()} onCancel={vi.fn()} />);
    await user.type(screen.getByLabelText(/motivo de seguimiento/i), 'Bajo rendimiento');
    first.unmount();

    const other = render(<FollowUpFormModal student={student} draftOwnerId="u2" onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/motivo de seguimiento/i)).toHaveValue('');
    other.unmount();

    render(<FollowUpFormModal student={student} draftOwnerId="u1" onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText(/motivo de seguimiento/i)).toHaveValue('Bajo rendimiento');
  });

  it('exige motivo antes de confirmar', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<FollowUpFormModal student={student} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /registrar seguimiento/i }));

    expect(await screen.findByText(/describe el motivo del seguimiento/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('exige acuerdos antes de confirmar', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<FollowUpFormModal student={student} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText(/motivo de seguimiento/i), 'Bajo rendimiento');
    await user.click(screen.getByRole('button', { name: /registrar seguimiento/i }));

    expect(await screen.findByText(/describe los acuerdos tomados/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('confirma sin datos de docente cuando el acuerdo es con el propio tutorado', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<FollowUpFormModal student={student} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText(/motivo de seguimiento/i), 'Bajo rendimiento');
    await user.type(screen.getByLabelText(/acuerdos tomados/i), 'Reforzamiento semanal');
    await user.click(screen.getByRole('button', { name: /registrar seguimiento/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      reason: 'Bajo rendimiento',
      agreements: 'Reforzamiento semanal',
      withInstructor: false,
      instructorName: undefined,
      courseName: undefined,
      courseCycle: undefined,
    });
  });

  it('exige nombre, curso y ciclo cuando el acuerdo es con un docente', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<FollowUpFormModal student={student} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText(/motivo de seguimiento/i), 'Bajo rendimiento');
    await user.type(screen.getByLabelText(/acuerdos tomados/i), 'Reforzamiento semanal');
    await user.click(screen.getByLabelText(/el acuerdo es con un docente de asignatura/i));
    await user.click(screen.getByRole('button', { name: /registrar seguimiento/i }));

    expect(await screen.findByText(/indica el nombre del docente/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envía los datos del docente cuando se completan', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<FollowUpFormModal student={student} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText(/motivo de seguimiento/i), 'Bajo rendimiento');
    await user.type(screen.getByLabelText(/acuerdos tomados/i), 'Reforzamiento semanal');
    await user.click(screen.getByLabelText(/el acuerdo es con un docente de asignatura/i));
    await user.type(screen.getByLabelText(/nombre del docente/i), 'Prof. Juan Pérez');
    await user.type(screen.getByLabelText(/^curso$/i), 'Cálculo I');
    await user.type(screen.getByLabelText(/^ciclo$/i), '3');
    await user.click(screen.getByRole('button', { name: /registrar seguimiento/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        withInstructor: true,
        instructorName: 'Prof. Juan Pérez',
        courseName: 'Cálculo I',
        courseCycle: 3,
      }),
    );
  });
});
