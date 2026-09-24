import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LinkPortalAccountModal, PortalAccountOption } from './LinkPortalAccountModal';
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
  userId: null,
};

const options: PortalAccountOption[] = [
  { userId: 'u1', fullName: 'Ana Torres', email: '20191234@untrm.edu.pe' },
  { userId: 'u2', fullName: 'Luis Pérez', email: '20195678@untrm.edu.pe' },
];

describe('LinkPortalAccountModal', () => {
  it('parte de "Sin vincular" cuando el estudiante no tiene cuenta', async () => {
    render(
      <LinkPortalAccountModal
        student={student}
        options={options}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/cuenta de portal \(tutorado\)/i)).toHaveValue('');
  });

  it('envía el userId elegido al guardar', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <LinkPortalAccountModal
        student={student}
        options={options}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/cuenta de portal \(tutorado\)/i), 'u1');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(onSubmit).toHaveBeenCalledWith('u1');
  });

  it('envía null al guardar sin seleccionar cuenta', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <LinkPortalAccountModal
        student={{ ...student, userId: 'u1' }}
        options={options}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/cuenta de portal \(tutorado\)/i), '');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(onSubmit).toHaveBeenCalledWith(null);
  });
});
