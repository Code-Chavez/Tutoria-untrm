import { isHeldSession, sessionOutcome } from '@application/use-cases/sessions/sessionOutcome';
import { SessionWithParticipants } from '@domain/entities/Session';

const hour = 3_600_000;
const now = new Date('2026-10-08T12:00:00Z');
const at = (offsetHours: number) => new Date(now.getTime() + offsetHours * hour);

const session = (over: Partial<SessionWithParticipants>): SessionWithParticipants =>
  ({
    scheduledAt: at(-2),
    endsAt: at(-1),
    cancelledAt: null,
    studentIds: ['a'],
    attendedStudentIds: [],
    absentStudentIds: [],
    attendance: null,
    ...over,
  }) as SessionWithParticipants;

describe('sessionOutcome (A07)', () => {
  it.each([
    ['cancelada, aunque haya asistentes registrados', { cancelledAt: at(-3), attendedStudentIds: ['a'] }, 'CANCELADA'],
    ['próxima', { scheduledAt: at(1), endsAt: at(2) }, 'PROXIMA'],
    ['en curso', { scheduledAt: at(-0.5), endsAt: at(0.5) }, 'EN_CURSO'],
    ['ya pasó y asistió alguien', { attendedStudentIds: ['a'] }, 'REALIZADA'],
    ['asistencia registrada desde que empezó, sin esperar a que termine', { scheduledAt: at(-0.5), endsAt: at(0.5), attendedStudentIds: ['a'] }, 'REALIZADA'],
    ['ya pasó y se registró que nadie asistió', { absentStudentIds: ['a'] }, 'INASISTENCIA'],
    ['ya pasó y nadie registró la asistencia', {}, 'POR_REGISTRAR'],
    ['grupal con un solo asistente: se realizó', { studentIds: ['a', 'b', 'c'], attendedStudentIds: ['b'], absentStudentIds: ['a', 'c'] }, 'REALIZADA'],
  ] as const)('%s → %s', (_name, over, expected) => {
    expect(sessionOutcome(session(over as Partial<SessionWithParticipants>), now)).toBe(expected);
  });

  it('solo «realizada» cuenta como sesión realizada', () => {
    expect(isHeldSession(session({ attendedStudentIds: ['a'] }), now)).toBe(true);
    for (const over of [{}, { absentStudentIds: ['a'] }, { cancelledAt: at(-3) }, { scheduledAt: at(1), endsAt: at(2) }]) {
      expect(isHeldSession(session(over), now)).toBe(false);
    }
  });
});
