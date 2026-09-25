import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RescheduleSessionModal } from './RescheduleSessionModal';
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
  attendance: null,
  cancelledAt: null,
  cancelReason: null,
  createdAt: new Date(2026, 9, 1).toISOString(),
};

describe('RescheduleSessionModal', () => {
  it('exige fecha, hora y motivo antes de confirmar', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<RescheduleSessionModal session={session} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /reprogramar/i }));

    expect(await screen.findByText(/indica la nueva fecha y hora/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('exige el motivo antes de confirmar', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<RescheduleSessionModal session={session} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText(/nueva fecha/i), '2026-10-15');
    await user.type(screen.getByLabelText(/nueva hora/i), '10:00');
    await user.click(screen.getByRole('button', { name: /reprogramar/i }));

    expect(await screen.findByText(/indica el motivo/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('confirma con la nueva fecha/hora en ISO y el motivo', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<RescheduleSessionModal session={session} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText(/nueva fecha/i), '2026-10-15');
    await user.type(screen.getByLabelText(/nueva hora/i), '10:00');
    await user.type(
      screen.getByLabelText(/motivo de la reprogramación/i),
      'El tutorado solicitó cambio de horario',
    );
    await user.click(screen.getByRole('button', { name: /reprogramar/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      scheduledAt: new Date('2026-10-15T10:00').toISOString(),
      reason: 'El tutorado solicitó cambio de horario',
    });
  });
});
