import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RiskModal } from './RiskModal';
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

describe('RiskModal', () => {
  it('exige un motivo antes de confirmar', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<RiskModal student={student} onConfirm={onConfirm} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /marcar en riesgo/i }));

    expect(await screen.findByText(/indica el motivo/i)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirma con el motivo escrito', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<RiskModal student={student} onConfirm={onConfirm} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText(/motivo del riesgo/i), 'Bajo rendimiento académico');
    await user.click(screen.getByRole('button', { name: /marcar en riesgo/i }));

    expect(onConfirm).toHaveBeenCalledWith('Bajo rendimiento académico');
  });
});
