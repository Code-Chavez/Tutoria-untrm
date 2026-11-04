import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CancelSessionModal } from './CancelSessionModal';
import type { TutoringSession } from '../services/sessionService';

const session: TutoringSession = {
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
  attendedStudentIds: [],
  absentStudentIds: [],
  attendance: null,
  cancelledAt: null,
  cancelReason: null,
  createdAt: new Date(2026, 9, 1).toISOString(),
};

describe('CancelSessionModal', () => {
  beforeEach(() => sessionStorage.clear());

  it('recupera el motivo escrito al volver a abrirla y se puede descartar', async () => {
    const user = userEvent.setup();
    const modal = <CancelSessionModal session={session} draftOwnerId="u1" onConfirm={vi.fn()} onCancel={vi.fn()} />;
    const first = render(modal);
    await user.type(screen.getByRole('textbox'), 'Se cruza con examen');
    first.unmount();

    render(modal);
    expect(screen.getByRole('textbox')).toHaveValue('Se cruza con examen');
    await user.click(screen.getByRole('button', { name: /descartar borrador/i }));
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('exige el motivo antes de confirmar', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<CancelSessionModal session={session} onConfirm={onConfirm} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /cancelar sesión/i }));

    expect(await screen.findByText(/indica el motivo de la cancelación/i)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirma con el motivo escrito', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<CancelSessionModal session={session} onConfirm={onConfirm} onCancel={vi.fn()} />);

    await user.type(
      screen.getByLabelText(/motivo de la cancelación/i),
      'El tutor tuvo una emergencia',
    );
    await user.click(screen.getByRole('button', { name: /cancelar sesión/i }));

    expect(onConfirm).toHaveBeenCalledWith('El tutor tuvo una emergencia');
  });
});
