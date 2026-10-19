import http from 'http';
import app from '../../src/app';
import { prisma } from '../../src/infrastructure/database/prisma';

/**
 * Continuidad solicitud → sesión / derivación (U01), por HTTP y base reales: el docente atiende una solicitud
 * programando una sesión o derivando el caso sin volver a buscar al estudiante ni escribir el motivo; la solicitud
 * queda enlazada, no se duplica la atención, nadie ajeno puede vincularla y el estudiante recibe un aviso que no
 * revela la derivación. Cuentas del seed. Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(120_000);

const PASSWORD = 'Demo2026!';
const EMAILS = {
  tutorado: '20191234@untrm.edu.pe', // Ana Torres, tutora Elena Ramírez
  tutor: 'elena.ramirez@untrm.edu.pe',
  otroTutor: 'jorge.salazar@untrm.edu.pe',
  coordinador: 'rosa.mendoza@untrm.edu.pe', // coordina la escuela de Ana; no programa sesiones
} as const;
type Who = keyof typeof EMAILS;

describe('solicitud de tutoría → sesión o derivación (U01)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  const tokens = {} as Record<Who, string>;
  const requestIds: string[] = [];
  const sessionIds: string[] = [];
  const referralIds: string[] = [];
  let studentId = '';
  let otherStudentId = '';
  // Hora lejana y única por corrida: no choca con las sesiones del seed ni con otras pruebas
  let slot = Date.UTC(2032, 5, 1, 15, 0) + (Date.now() % 1_000_000) * 60_000;
  const nextSlot = () => new Date((slot += 3 * 3_600_000)).toISOString();

  const call = (method: string, path: string, token: string, body?: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });

  const login = async (email: string) => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    if (res.status !== 200) throw new Error(`Login de ${email} falló: ${res.status}`);
    return ((await res.json()) as { data: { accessToken: string } }).data.accessToken;
  };

  const newRequest = async (reason: string) => {
    const res = await call('POST', '/api/tutoring-requests/me', tokens.tutorado, { caseType: 'ACADEMIC', reason });
    expect(res.status).toBe(201);
    const id = ((await res.json()) as { request: { id: string } }).request.id;
    requestIds.push(id);
    return id;
  };
  const requestOf = (id: string) => prisma.tutoringRequest.findUniqueOrThrow({ where: { id } });
  const sessionBody = (tutoringRequestId?: string, ids: string[] = [studentId]) => ({
    studentIds: ids,
    topic: 'Prueba U01: apoyo en Cálculo',
    scheduledAt: nextSlot(),
    modality: 'PRESENCIAL',
    location: 'Oficina de tutoría',
    ...(tutoringRequestId ? { tutoringRequestId } : {}),
  });
  const referralBody = (tutoringRequestId?: string) => ({
    checkedAspects: ['ACADEMIC_AT_RISK_OF_FAILING'],
    reason: 'Prueba U01: rendimiento sostenidamente bajo',
    service: 'PSICOPEDAGOGIA',
    ...(tutoringRequestId ? { tutoringRequestId } : {}),
  });

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba de continuidad solicitud → sesión/derivación.');
      return;
    }
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    baseUrl = `http://localhost:${(listening.address() as { port: number }).port}`;
    for (const who of Object.keys(EMAILS) as Who[]) tokens[who] = await login(EMAILS[who]);
    studentId = (await prisma.student.findUniqueOrThrow({ where: { studentCode: '20191234' } })).id;
    // Otro estudiante que también atiende Elena (o cualquiera distinto de Ana)
    otherStudentId = (await prisma.student.findFirstOrThrow({ where: { id: { not: studentId }, tutorId: (await prisma.student.findUniqueOrThrow({ where: { id: studentId } })).tutorId } })).id;
  });

  afterAll(async () => {
    if (dbUp) {
      await prisma.notification.deleteMany({ where: { OR: [{ tutoringRequestId: { in: requestIds } }, { referralId: { in: referralIds } }] } });
      await prisma.tutoringRequest.deleteMany({ where: { id: { in: requestIds } } });
      await prisma.sessionParticipant.deleteMany({ where: { sessionId: { in: sessionIds } } }).catch(() => undefined);
      await prisma.session.deleteMany({ where: { id: { in: sessionIds } } }).catch(() => undefined);
      await prisma.referralStatusHistory.deleteMany({ where: { referralId: { in: referralIds } } });
      await prisma.studentReferral.deleteMany({ where: { id: { in: referralIds } } });
    }
    if (server) await new Promise((resolve) => server?.close(resolve));
    await prisma.$disconnect();
  });

  it('programar una sesión desde la solicitud la vincula, la pasa a «en atención» y avisa al estudiante', async () => {
    if (!dbUp) return;
    const id = await newRequest('Prueba U01: necesito apoyo en Cálculo');
    const res = await call('POST', '/api/sessions', tokens.tutor, sessionBody(id));
    expect(res.status).toBe(201);
    const session = ((await res.json()) as { session: { id: string } }).session;
    sessionIds.push(session.id);

    const request = await requestOf(id);
    expect(request.sessionId).toBe(session.id);
    expect(request.referralId).toBeNull();
    expect(request.status).toBe('EN_ATENCION');
    expect(request.handledById).not.toBeNull();

    // El estudiante la ve en su agenda (es participante) y recibe el aviso
    const mine = (await (await call('GET', '/api/sessions', tokens.tutorado)).json()) as { sessions: { id: string }[] };
    expect(mine.sessions.map((s) => s.id)).toContain(session.id);
    const notes = await prisma.notification.findMany({ where: { tutoringRequestId: id, type: 'TUTORING_REQUEST_UPDATED' } });
    expect(notes.some((n) => n.message.includes('sesión programada'))).toBe(true);

    // No se duplica: una segunda sesión (o derivación) para la misma solicitud se rechaza y no deja nada
    const before = await prisma.session.count({ where: { tutorId: request.routedToId } });
    const again = await call('POST', '/api/sessions', tokens.tutor, sessionBody(id));
    expect(again.status).toBe(409);
    expect(((await again.json()) as { error: string }).error).toMatch(/ya tiene una sesión/i);
    expect(await prisma.session.count({ where: { tutorId: request.routedToId } })).toBe(before);
    const referral = await call('POST', `/api/students/${studentId}/referrals`, tokens.tutor, referralBody(id));
    expect(referral.status).toBe(409);
  });

  it('derivar desde la solicitud la vincula y el aviso al estudiante no dice adónde se derivó', async () => {
    if (!dbUp) return;
    const id = await newRequest('Prueba U01: me siento muy agobiado con el ciclo');
    const res = await call('POST', `/api/students/${studentId}/referrals`, tokens.tutor, referralBody(id));
    expect(res.status).toBe(201);
    const referral = ((await res.json()) as { referral: { id: string } }).referral;
    referralIds.push(referral.id);

    const request = await requestOf(id);
    expect(request.referralId).toBe(referral.id);
    expect(request.sessionId).toBeNull();
    expect(request.status).toBe('EN_ATENCION');

    const notes = await prisma.notification.findMany({ where: { tutoringRequestId: id, type: 'TUTORING_REQUEST_UPDATED' } });
    expect(notes.length).toBeGreaterThan(0);
    for (const n of notes) expect(n.message).not.toMatch(/deriv|servicio|psico/i);

    const again = await call('POST', '/api/sessions', tokens.tutor, sessionBody(id));
    expect(again.status).toBe(409);
    expect(((await again.json()) as { error: string }).error).toMatch(/ya tiene una derivación/i);
  });

  it('si la sesión vinculada se cancela, la solicitud se puede atender con otra sesión: queda enlazada a la nueva y no a la cancelada', async () => {
    if (!dbUp) return;
    const id = await newRequest('Prueba U01: reemplazo de cita cancelada');
    const first = ((await (await call('POST', '/api/sessions', tokens.tutor, sessionBody(id))).json()) as { session: { id: string } }).session;
    sessionIds.push(first.id);
    // Con la cita vigente no se puede crear otra
    expect((await call('POST', '/api/sessions', tokens.tutor, sessionBody(id))).status).toBe(409);

    expect((await call('PATCH', `/api/sessions/${first.id}/cancel`, tokens.tutor, { reason: 'Paro de transporte' })).status).toBe(200);
    // La bandeja lo dice: la cita cancelada ya no atiende la solicitud
    const inbox = (await (await call('GET', '/api/tutoring-requests?mine=true', tokens.tutor)).json()) as { requests: { id: string; sessionCancelled?: boolean }[] };
    expect(inbox.requests.find((r) => r.id === id)?.sessionCancelled).toBe(true);

    const res = await call('POST', '/api/sessions', tokens.tutor, sessionBody(id));
    expect(res.status).toBe(201);
    const second = ((await res.json()) as { session: { id: string } }).session;
    sessionIds.push(second.id);
    const request = await requestOf(id);
    expect(request.sessionId).toBe(second.id);
    expect(request.status).toBe('EN_ATENCION');
    const log = await prisma.auditLog.findFirst({ where: { entity: 'TutoringRequest', entityId: id, action: 'TUTORING_REQUEST_SESSION' }, orderBy: { createdAt: 'desc' } });
    expect(log?.details).toContain(`session:${second.id}`);
    expect(log?.details).toContain(first.id);

    // Y la nueva cita vigente vuelve a bloquear duplicados
    expect((await call('POST', '/api/sessions', tokens.tutor, sessionBody(id))).status).toBe(409);
  });

  it('si la sesión vinculada se cancela, también se puede derivar: el vínculo pasa a la derivación y no quedan las dos', async () => {
    if (!dbUp) return;
    const id = await newRequest('Prueba U01: cita cancelada y luego derivación');
    const session = ((await (await call('POST', '/api/sessions', tokens.tutor, sessionBody(id))).json()) as { session: { id: string } }).session;
    sessionIds.push(session.id);
    expect((await call('PATCH', `/api/sessions/${session.id}/cancel`, tokens.tutor, { reason: 'Enfermedad del tutor' })).status).toBe(200);

    const res = await call('POST', `/api/students/${studentId}/referrals`, tokens.tutor, referralBody(id));
    expect(res.status).toBe(201);
    const referral = ((await res.json()) as { referral: { id: string } }).referral;
    referralIds.push(referral.id);
    const request = await requestOf(id);
    expect(request.referralId).toBe(referral.id);
    expect(request.sessionId).toBeNull();
  });

  it('dos personas que reemplazan la cita cancelada a la vez: solo una queda y la otra se rechaza', async () => {
    if (!dbUp) return;
    const id = await newRequest('Prueba U01: reemplazo simultáneo');
    const first = ((await (await call('POST', '/api/sessions', tokens.tutor, sessionBody(id))).json()) as { session: { id: string } }).session;
    sessionIds.push(first.id);
    expect((await call('PATCH', `/api/sessions/${first.id}/cancel`, tokens.tutor, { reason: 'Paro' })).status).toBe(200);

    const [a, b] = await Promise.all([call('POST', '/api/sessions', tokens.tutor, sessionBody(id)), call('POST', '/api/sessions', tokens.tutor, sessionBody(id))]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    const winner = ((await (a.status === 201 ? a : b).json()) as { session: { id: string } }).session;
    sessionIds.push(winner.id);
    expect((await requestOf(id)).sessionId).toBe(winner.id);
  });

  it('la solicitud solo se vincula con una atención del mismo estudiante', async () => {
    if (!dbUp) return;
    const id = await newRequest('Prueba U01: solicitud de Ana');
    const res = await call('POST', '/api/sessions', tokens.tutor, sessionBody(id, [otherStudentId]));
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: string }).error).toMatch(/otro estudiante/i);
    const request = await requestOf(id);
    expect(request.sessionId).toBeNull();
    expect(request.status).toBe('PENDIENTE');
  });

  it('quien no la gestiona no puede vincularla: otro tutor no la encuentra y la coordinación no programa sesiones', async () => {
    if (!dbUp) return;
    const id = await newRequest('Prueba U01: permisos');
    // Otro tutor, aun con el estudiante en la sesión, no tiene alcance sobre Ana ni sobre su solicitud
    const other = await call('POST', '/api/sessions', tokens.otroTutor, sessionBody(id));
    expect([403, 404]).toContain(other.status);
    // La coordinación puede ver la solicitud, pero programar sesiones es del docente tutor
    const coord = await call('POST', '/api/sessions', tokens.coordinador, sessionBody(id));
    expect(coord.status).toBe(403);
    const referralAsOther = await call('POST', `/api/students/${studentId}/referrals`, tokens.otroTutor, referralBody(id));
    expect([403, 404]).toContain(referralAsOther.status);
    const request = await requestOf(id);
    expect(request.sessionId).toBeNull();
    expect(request.referralId).toBeNull();
    expect(request.status).toBe('PENDIENTE');
  });

  it('una solicitud inexistente se informa sin crear la sesión', async () => {
    if (!dbUp) return;
    const body = sessionBody('00000000-0000-4000-8000-000000000000');
    const before = await prisma.session.count({ where: { topic: body.topic } });
    const res = await call('POST', '/api/sessions', tokens.tutor, body);
    expect(res.status).toBe(404);
    expect(await prisma.session.count({ where: { topic: body.topic } })).toBe(before);
  });

  it('programar una sesión sin solicitud sigue funcionando igual', async () => {
    if (!dbUp) return;
    const res = await call('POST', '/api/sessions', tokens.tutor, sessionBody());
    expect(res.status).toBe(201);
    sessionIds.push(((await res.json()) as { session: { id: string } }).session.id);
  });
});
