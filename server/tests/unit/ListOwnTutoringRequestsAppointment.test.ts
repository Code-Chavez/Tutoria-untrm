import { ListOwnTutoringRequestsUseCase } from '@application/use-cases/tutoring-requests/ListTutoringRequestsUseCase';

// Historial del estudiante: la cita de su solicitud (vigente, cancelada o la que reemplazó a una cancelada), sin datos reservados.
const OLD = '11111111-1111-4111-8111-111111111111';

function build(request: Record<string, unknown>, session: Record<string, unknown> | null, logs: { entityId: string; action: string; details: string }[] = []) {
  const requests = {
    findByStudent: jest.fn().mockResolvedValue([
      { id: 'r1', studentId: 's1', requestedById: 'u', source: 'STUDENT', caseType: 'ACADEMIC', reason: 'x', routedToId: 't', routedToRole: 'tutor', status: 'EN_ATENCION', responseNote: null, handledById: null, handledAt: null, sessionId: null, referralId: null, createdAt: new Date(), ...request },
    ]),
  };
  const students = { findByUserId: jest.fn().mockResolvedValue({ id: 's1' }), findById: jest.fn().mockResolvedValue({ id: 's1', firstName: 'Ana', lastName: 'Torres', studentCode: '1' }) };
  const users = { findById: jest.fn().mockResolvedValue({ firstName: 'Elena', lastName: 'Ramírez' }) };
  const sessions = { findById: jest.fn().mockResolvedValue(session) };
  const audit = { findAll: jest.fn().mockResolvedValue(logs) };
  return new ListOwnTutoringRequestsUseCase(requests as never, students as never, users as never, sessions as never, audit as never);
}

const session = (over: Record<string, unknown>) => ({
  id: 'x2',
  scheduledAt: new Date('2026-11-05T15:00:00Z'),
  modality: 'PRESENCIAL',
  location: 'Aula 302',
  meetingLink: null,
  cancelledAt: null,
  cancelReason: null,
  topic: 'Reservado: tema que el tutor anotó',
  ...over,
});

describe('historial propio: la cita de la solicitud', () => {
  it('sin sesión vinculada no hay cita', async () => {
    const [view] = await build({}, null).execute('u');
    expect(view.appointment).toBeUndefined();
  });

  it('cita vigente: fecha, modalidad y lugar; nada de notas ni motivos internos', async () => {
    const [view] = await build({ sessionId: 'x2' }, session({})).execute('u');
    expect(view.appointment).toEqual({ state: 'VIGENTE', scheduledAt: '2026-11-05T15:00:00.000Z', modality: 'PRESENCIAL', place: 'Aula 302', replacedSessionIds: [] });
    expect(JSON.stringify(view.appointment)).not.toMatch(/Reservado|tema/);
  });

  it('cita cancelada sin reemplazo', async () => {
    const [view] = await build({ sessionId: 'x1' }, session({ cancelledAt: new Date() })).execute('u');
    expect(view.appointment).toMatchObject({ state: 'CANCELADA', replacedSessionIds: [] });
  });

  it('nueva cita vigente que reemplazó a una cancelada: lleva el identificador de la cancelada', async () => {
    const logs = [
      { entityId: 'r1', action: 'TUTORING_REQUEST_SESSION', details: 'session:x1' },
      { entityId: 'r1', action: 'TUTORING_REQUEST_SESSION', details: `session:x2 (reemplaza la sesión cancelada ${OLD})` },
      { entityId: 'otra', action: 'TUTORING_REQUEST_SESSION', details: 'session:z (reemplaza la sesión cancelada 22222222-2222-4222-8222-222222222222)' },
    ];
    const [view] = await build({ sessionId: 'x2' }, session({}), logs).execute('u');
    expect(view.appointment).toMatchObject({ state: 'VIGENTE', replacedSessionIds: [OLD] });
  });

  it('cita virtual: muestra el enlace como lugar', async () => {
    const [view] = await build({ sessionId: 'x2' }, session({ modality: 'VIRTUAL', location: null, meetingLink: 'https://meet.example/abc' })).execute('u');
    expect(view.appointment?.place).toBe('https://meet.example/abc');
  });
});
