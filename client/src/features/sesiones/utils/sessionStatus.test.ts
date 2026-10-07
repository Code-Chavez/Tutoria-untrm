import { describe, it, expect } from 'vitest';
import { getSessionStatus, isModifiable } from './sessionStatus';
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
  attendedStudentIds: [],
  absentStudentIds: [],
  attendance: null,
  cancelledAt: null,
  cancelReason: null,
  createdAt: '2026-10-01T00:00:00.000Z',
};

describe('getSessionStatus', () => {
  it('es PROXIMA antes de la hora de inicio', () => {
    expect(getSessionStatus(baseSession, new Date('2026-10-05T14:00:00.000Z'))).toBe('PROXIMA');
  });

  it('es EN_CURSO entre el inicio y el fin', () => {
    expect(getSessionStatus(baseSession, new Date('2026-10-05T15:20:00.000Z'))).toBe('EN_CURSO');
  });

  describe('después del fin: depende de la asistencia registrada (A07)', () => {
    const after = new Date('2026-10-05T16:00:00.000Z');

    it('es POR_REGISTRAR si nadie registró la asistencia: haber pasado la hora no la vuelve realizada', () => {
      expect(getSessionStatus(baseSession, after)).toBe('POR_REGISTRAR');
    });

    it('es REALIZADA si asistió al menos un participante', () => {
      expect(getSessionStatus({ ...baseSession, attendedStudentIds: ['a1'] }, after)).toBe('REALIZADA');
    });

    it('es INASISTENCIA si se registró que nadie asistió', () => {
      expect(getSessionStatus({ ...baseSession, absentStudentIds: ['a1'] }, after)).toBe('INASISTENCIA');
    });

    it('es REALIZADA en cuanto hay asistentes, aunque la hora de fin no haya llegado', () => {
      expect(getSessionStatus({ ...baseSession, attendedStudentIds: ['a1'] }, new Date('2026-10-05T15:20:00.000Z'))).toBe('REALIZADA');
    });

    it('solo se puede reprogramar o cancelar lo que no empezó o sigue en curso sin asistentes', () => {
      expect(isModifiable('PROXIMA')).toBe(true);
      expect(isModifiable('EN_CURSO')).toBe(true);
      for (const status of ['REALIZADA', 'INASISTENCIA', 'POR_REGISTRAR', 'CANCELADA'] as const) {
        expect(isModifiable(status)).toBe(false);
      }
    });
  });

  it('es CANCELADA sin importar la hora, si cancelledAt está definido', () => {
    const cancelled = { ...baseSession, cancelledAt: '2026-10-04T00:00:00.000Z' };
    expect(getSessionStatus(cancelled, new Date('2026-10-05T14:00:00.000Z'))).toBe('CANCELADA');
    expect(getSessionStatus(cancelled, new Date('2026-10-05T16:00:00.000Z'))).toBe('CANCELADA');
  });
});
