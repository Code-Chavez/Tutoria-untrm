import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReferralFormModal } from './ReferralFormModal';
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

describe('ReferralFormModal', () => {
  it('exige marcar al menos un aspecto antes de confirmar', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ReferralFormModal student={student} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /derivar caso/i }));

    expect(await screen.findByText(/marca al menos un aspecto/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('exige el motivo antes de confirmar', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ReferralFormModal student={student} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByLabelText(/está en riesgo de repetir algún curso/i));
    await user.click(screen.getByRole('button', { name: /derivar caso/i }));

    expect(await screen.findByText(/describe el motivo de la derivación/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('pre-selecciona y envía el servicio sugerido automáticamente (HU-29)', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ReferralFormModal student={student} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByLabelText(/está en riesgo de repetir algún curso/i));
    await user.type(
      screen.getByLabelText(/motivo de la derivación/i),
      'Bajo rendimiento sostenido',
    );
    await user.click(screen.getByRole('button', { name: /derivar caso/i }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      service: 'ESCUELA'
    }));
  });

  it('envía el checklist, motivo y servicio elegidos', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ReferralFormModal student={student} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByLabelText(/está en riesgo de repetir algún curso/i));
    await user.click(screen.getByLabelText(/agrede verbalmente a sus compañeros/i));
    await user.type(
      screen.getByLabelText(/motivo de la derivación/i),
      'Bajo rendimiento y conflictos con compañeros',
    );
    await user.selectOptions(screen.getByLabelText(/servicio al que se deriva/i), 'PSICOPEDAGOGIA');
    await user.click(screen.getByRole('button', { name: /derivar caso/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      checkedAspects: ['ACADEMIC_AT_RISK_OF_FAILING', 'SOCIAL_VERBALLY_AGGRESSIVE'],
      reason: 'Bajo rendimiento y conflictos con compañeros',
      service: 'PSICOPEDAGOGIA',
    });
  });

  it('permite desmarcar un aspecto ya marcado', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ReferralFormModal student={student} onSubmit={onSubmit} onCancel={vi.fn()} />);

    const checkbox = screen.getByLabelText(/está en riesgo de repetir algún curso/i);
    await user.click(checkbox);
    await user.click(checkbox);
    await user.type(screen.getByLabelText(/motivo de la derivación/i), 'Motivo cualquiera');
    await user.selectOptions(screen.getByLabelText(/servicio al que se deriva/i), 'SALUD');
    await user.click(screen.getByRole('button', { name: /derivar caso/i }));

    expect(await screen.findByText(/marca al menos un aspecto/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
