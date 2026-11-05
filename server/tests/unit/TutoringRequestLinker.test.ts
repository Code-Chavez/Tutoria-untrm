import { TutoringRequestLinker } from '@application/use-cases/tutoring-requests/TutoringRequestLinker';
import { InvalidTutoringRequestStatusError } from '@application/use-cases/tutoring-requests/TutoringRequestErrors';

// Vínculo solicitud → sesión/derivación: una sesión cancelada ya no atiende la solicitud y se puede reemplazar.
function build(request: Record<string, unknown>, session?: { cancelledAt: Date | null } | null) {
  const requests = {
    findById: jest.fn().mockResolvedValue({ id: 'r1', studentId: 's1', routedToId: 'tutor-1', sessionId: null, referralId: null, ...request }),
    attachFollowUp: jest.fn().mockResolvedValue({ id: 'r1' }),
  };
  const guard = { scopeFor: jest.fn().mockResolvedValue({ kind: 'ALL' }) };
  const students = { findById: jest.fn().mockResolvedValue({ id: 's1', userId: 'u-est' }) };
  const notifications = { create: jest.fn() };
  const auditLogs = { create: jest.fn() };
  const sessions = { findById: jest.fn().mockResolvedValue(session ?? null) };
  const linker = new TutoringRequestLinker(requests as never, guard as never, students as never, notifications as never, auditLogs as never, sessions as never);
  return { linker, requests, auditLogs, sessions };
}

describe('TutoringRequestLinker: reemplazo de una cita cancelada', () => {
  it('sin vínculo previo, se vincula como siempre (sin reemplazo)', async () => {
    const { linker, requests } = build({});
    const request = await linker.prepare('t', 'r1', ['s1']);
    expect(await linker.attach('t', request, { kind: 'session', id: 'x2' })).toBe(true);
    expect(requests.attachFollowUp).toHaveBeenCalledWith('r1', { sessionId: 'x2' }, 't', undefined);
  });

  it('con la sesión vinculada vigente, se rechaza (no se duplica la atención)', async () => {
    const { linker } = build({ sessionId: 'x1' }, { cancelledAt: null });
    await expect(linker.prepare('t', 'r1', ['s1'])).rejects.toBeInstanceOf(InvalidTutoringRequestStatusError);
  });

  it('con la sesión vinculada cancelada, se permite y el nuevo vínculo reemplaza solo a esa sesión', async () => {
    const { linker, requests, auditLogs } = build({ sessionId: 'x1', status: 'EN_ATENCION' }, { cancelledAt: new Date() });
    const request = await linker.prepare('t', 'r1', ['s1']);
    expect(await linker.attach('t', request, { kind: 'session', id: 'x2' })).toBe(true);
    expect(requests.attachFollowUp).toHaveBeenCalledWith('r1', { sessionId: 'x2' }, 't', 'x1');
    expect(auditLogs.create.mock.calls[0][0].details).toContain('reemplaza la sesión cancelada x1');
  });

  it('con la sesión cancelada también se puede derivar', async () => {
    const { linker, requests } = build({ sessionId: 'x1' }, { cancelledAt: new Date() });
    const request = await linker.prepare('t', 'r1', ['s1']);
    await linker.attach('t', request, { kind: 'referral', id: 'ref-1' });
    expect(requests.attachFollowUp).toHaveBeenCalledWith('r1', { referralId: 'ref-1' }, 't', 'x1');
  });

  it('si otra persona ya la reemplazó, attach devuelve false (el llamador deshace lo que creó)', async () => {
    const { linker, requests } = build({ sessionId: 'x1' }, { cancelledAt: new Date() });
    requests.attachFollowUp.mockResolvedValue(null);
    const request = await linker.prepare('t', 'r1', ['s1']);
    expect(await linker.attach('t', request, { kind: 'session', id: 'x2' })).toBe(false);
  });

  it('con una derivación vinculada se rechaza aunque haya una sesión cancelada', async () => {
    const { linker } = build({ sessionId: 'x1', referralId: 'ref-0' }, { cancelledAt: new Date() });
    await expect(linker.prepare('t', 'r1', ['s1'])).rejects.toBeInstanceOf(InvalidTutoringRequestStatusError);
  });

  it('una sesión que ya no existe no cuenta como cancelada: se rechaza', async () => {
    const { linker } = build({ sessionId: 'x1' }, null);
    await expect(linker.prepare('t', 'r1', ['s1'])).rejects.toBeInstanceOf(InvalidTutoringRequestStatusError);
  });
});
