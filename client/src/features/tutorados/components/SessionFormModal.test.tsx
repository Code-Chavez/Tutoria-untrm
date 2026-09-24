import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionFormModal } from './SessionFormModal';
import type { Student } from '../services/studentService';

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

describe('SessionFormModal', () => {
  it('exige fecha y hora antes de confirmar', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <SessionFormModal
        student={student}
        durationMinutes={45}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/tema de la sesión/i), 'Reforzamiento');
    await user.click(screen.getByRole('button', { name: /programar sesión/i }));

    expect(await screen.findByText(/indica la fecha y la hora/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('exige el tema antes de confirmar', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <SessionFormModal
        student={student}
        durationMinutes={45}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/fecha/i), '2026-10-01');
    await user.type(screen.getByLabelText(/hora/i), '15:00');
    await user.click(screen.getByRole('button', { name: /programar sesión/i }));

    expect(await screen.findByText(/indica el tema/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('confirma con la fecha/hora combinadas en ISO', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <SessionFormModal
        student={student}
        durationMinutes={45}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/fecha/i), '2026-10-01');
    await user.type(screen.getByLabelText(/hora/i), '15:00');
    await user.type(screen.getByLabelText(/tema de la sesión/i), 'Reforzamiento de Cálculo');
    await user.click(screen.getByRole('button', { name: /programar sesión/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      studentId: 's1',
      topic: 'Reforzamiento de Cálculo',
      scheduledAt: new Date('2026-10-01T15:00').toISOString(),
    });
  });
});
