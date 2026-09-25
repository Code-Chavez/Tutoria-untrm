import { describe, it, expect } from 'vitest';
import { getSessionStatus } from './sessionStatus';
import type { TutoringSession } from '../services/sessionService';

const baseSession: TutoringSession = {
  id: 's1',
  tutorId: 'tutor-1',
  topic: 'Reforzamiento',
  scheduledAt: '2026-10-05T15:00:00.000Z',
  durationMinutes: 45,
  endsAt: '2026-10-05T15:45:00.000Z',
  modality: 'PRESENCIAL',
  location: 'Oficina 204',
  meetingLink: null,
  studentIds: ['a1'],
  createdAt: '2026-10-01T00:00:00.000Z',
};

describe('getSessionStatus', () => {
  it('es PROXIMA antes de la hora de inicio', () => {
    expect(getSessionStatus(baseSession, new Date('2026-10-05T14:00:00.000Z'))).toBe('PROXIMA');
  });

  it('es EN_CURSO entre el inicio y el fin', () => {
    expect(getSessionStatus(baseSession, new Date('2026-10-05T15:20:00.000Z'))).toBe('EN_CURSO');
  });

  it('es REALIZADA después del fin', () => {
    expect(getSessionStatus(baseSession, new Date('2026-10-05T16:00:00.000Z'))).toBe('REALIZADA');
  });
});
