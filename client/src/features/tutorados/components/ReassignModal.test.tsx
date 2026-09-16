import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReassignModal } from './ReassignModal';
import type { Student } from '../services/studentService';
import type { TutorWorkload } from '@features/asignacion/services/assignmentService';

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
  tutorId: 'tutor-old',
};

const tutors: TutorWorkload[] = [
  { tutorId: 'tutor-old', fullName: 'Jorge Salazar', email: 'jorge@untrm.edu.pe', assignedCount: 5 },
  { tutorId: 'tutor-new', fullName: 'Elena Ramírez', email: 'elena@untrm.edu.pe', assignedCount: 2 },
];

describe('ReassignModal', () => {
  it('excluye al tutor actual de las opciones', () => {
    render(
      <ReassignModal
        student={student}
        tutors={tutors}
        currentTutorName="Jorge Salazar"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const select = screen.getByLabelText(/nuevo tutor/i);
    expect(screen.queryByRole('option', { name: /jorge salazar/i })).not.toBeInTheDocument();
    expect(select).toBeInTheDocument();
  });

  it('exige motivo antes de confirmar', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ReassignModal
        student={student}
        tutors={tutors}
        currentTutorName="Jorge Salazar"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/nuevo tutor/i), 'tutor-new');
    await user.click(screen.getByRole('button', { name: /^reasignar$/i }));

    expect(await screen.findByText(/indica el motivo/i)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirma con el tutor y el motivo elegidos', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ReassignModal
        student={student}
        tutors={tutors}
        currentTutorName="Jorge Salazar"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/nuevo tutor/i), 'tutor-new');
    await user.type(screen.getByLabelText(/motivo de la reasignación/i), 'Reorganización de carga');
    await user.click(screen.getByRole('button', { name: /^reasignar$/i }));

    expect(onConfirm).toHaveBeenCalledWith('tutor-new', 'Reorganización de carga');
  });
});
