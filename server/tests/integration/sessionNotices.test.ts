import http from 'http';
import app from '../../src/app';
import { prisma } from '../../src/infrastructure/database/prisma';

/**
 * Avisos de sesión (U06) y a quién llega una solicitud (U02), por HTTP y base reales: programar, reprogramar y cancelar una sesión
 * avisa a la persona estudiante (que lo ve en su bandeja de avisos, con la fecha, el lugar y el motivo) y a quien lo hizo se le dice
 * a quién no se pudo avisar; una sesión que atiende una solicitud no duplica el aviso; el estudiante sabe, antes de enviar, quién
 * recibirá su solicitud. Cuentas del seed; todo lo que crea lo borra. Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(180_000);

const stamp = Date.now();
const MARK = `Aviso de sesión ${stamp}`;
const ACC = {
  admin: ['7183255722@untrm.edu.pe', 'Admin2026!'],
  tutor: ['elena.ramirez@untrm.edu.pe', 'Demo2026!'],
  ana: ['20191234@untrm.edu.pe', 'Demo2026!'],
  otroTutor: ['jorge.salazar@untrm.edu.pe', 'Demo2026!'],
} as const;
type Who = keyof typeof ACC;
const CODE = `9940${String(stamp).slice(-6)}`;

describe('avisos de sesión y destinatario de la solicitud', () => {
  let server: http.Server | undefined;
  let base = '';
  let dbUp = false;
  const tok = {} as Record<Who, string>;
  let anaId = '';
  let anaUserId = '';
  let slot = Date.UTC(2036, 2, 1, 15, 0) + (stamp % 1_000_000) * 60_000;
  const nextSlot = () => new Date((slot += 3 * 3_600_000)).toISOString();

  const call = async (who: Who, method: string, path: string, body?: unknown) => {
    const res = await fetch(`${base}${path}`, { method, headers: { Authorization: `Bearer ${tok[who]}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, json: (await res.json().catch(() => null)) as Record<string, unknown> | null };
  };
  const schedule = (who: Who, studentIds: string[], extra: Record<string, unknown> = {}) =>
    call(who, 'POST', '/api/sessions', { studentIds, topic: MARK, scheduledAt: nextSlot(), modality: 'PRESENCIAL', location: 'Aula 204', ...extra });
  const noticesOf = (sessionId: string) => prisma.notification.findMany({ where: { sessionId }, orderBy: { createdAt: 'asc' } });

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omiten los avisos de sesión.');
      return;
    }
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    base = `http://localhost:${(listening.address() as { port: number }).port}`;
    for (const who of Object.keys(ACC) as Who[]) {
      const res = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ACC[who][0], password: ACC[who][1] }) });
      tok[who] = ((await res.json()) as { data: { accessToken: string } }).data.accessToken;
    }
    const ana = await prisma.student.findUniqueOrThrow({ where: { studentCode: '20191234' } });
    anaId = ana.id;
    anaUserId = ana.userId as string;
  });

  afterAll(async () => {
    if (dbUp) {
      const sessions = (await prisma.session.findMany({ where: { topic: MARK }, select: { id: true } })).map((s) => s.id);
      const requests = (await prisma.tutoringRequest.findMany({ where: { reason: MARK }, select: { id: true } })).map((r) => r.id);
      await prisma.notification.deleteMany({ where: { OR: [{ sessionId: { in: sessions } }, { tutoringRequestId: { in: requests } }] } });
      await prisma.tutoringRequest.deleteMany({ where: { id: { in: requests } } });
      await prisma.sessionChangeHistory.deleteMany({ where: { sessionId: { in: sessions } } });
      await prisma.sessionParticipant.deleteMany({ where: { sessionId: { in: sessions } } });
      await prisma.session.deleteMany({ where: { id: { in: sessions } } });
      await prisma.student.deleteMany({ where: { studentCode: CODE } });
    }
    if (server) await new Promise((resolve) => server?.close(resolve));
    await prisma.$disconnect();
  });

  describe('avisos de sesión', () => {
    it('programar avisa a la estudiante con la fecha y el lugar, y a la tutora se le dice a quién se avisó', async () => {
      if (!dbUp) return;
      const res = await schedule('tutor', [anaId]);
      expect(res.status).toBe(201);
      const session = res.json?.session as { id: string; notice: { notified: number; notReached: number } };
      expect(session.notice).toEqual({ notified: 1, notReached: 0 });

      const [notice] = await noticesOf(session.id);
      expect(notice).toMatchObject({ userId: anaUserId, type: 'SESSION_SCHEDULED', read: false });
      expect(notice.message).toContain('Tu tutor programó una sesión de tutoría');
      expect(notice.message).toContain('Lugar: Aula 204');
      // Y ella lo ve en su bandeja de avisos
      const bell = await call('ana', 'GET', '/api/notifications');
      const list = (Array.isArray(bell.json) ? bell.json : (bell.json?.notifications ?? [])) as { sessionId?: string; type: string }[];
      expect(list.some((n) => n.sessionId === session.id && n.type === 'SESSION_SCHEDULED')).toBe(true);
    });

    it('reprogramar y cancelar avisan con el motivo', async () => {
      if (!dbUp) return;
      const created = await schedule('tutor', [anaId]);
      const id = (created.json?.session as { id: string }).id;

      const moved = await call('tutor', 'PATCH', `/api/sessions/${id}/reschedule`, { scheduledAt: nextSlot(), reason: 'Paro de transporte' });
      expect(moved.status).toBe(200);
      expect((moved.json?.session as { notice: unknown }).notice).toEqual({ notified: 1, notReached: 0 });

      const cancelled = await call('tutor', 'PATCH', `/api/sessions/${id}/cancel`, { reason: 'Enfermedad del tutor' });
      expect(cancelled.status).toBe(200);
      expect((cancelled.json?.session as { notice: unknown }).notice).toEqual({ notified: 1, notReached: 0 });

      const notices = await noticesOf(id);
      expect(notices.map((n) => n.type)).toEqual(['SESSION_SCHEDULED', 'SESSION_RESCHEDULED', 'SESSION_CANCELLED']);
      expect(notices[1].message).toContain('Motivo: Paro de transporte');
      expect(notices[2].message).toContain('Motivo: Enfermedad del tutor');
    });

    it('quien intenta cambiar la sesión de otro no avisa a nadie', async () => {
      if (!dbUp) return;
      const id = ((await schedule('tutor', [anaId])).json?.session as { id: string }).id;
      const before = (await noticesOf(id)).length;

      expect((await call('otroTutor', 'PATCH', `/api/sessions/${id}/cancel`, { reason: 'No me corresponde' })).status).toBe(403);
      expect((await noticesOf(id)).length).toBe(before);
    });

    it('a quien no tiene cuenta del portal no se le puede avisar, y se le dice a quien programó para que lo comunique por otro medio', async () => {
      if (!dbUp) return;
      const school = await prisma.school.findFirstOrThrow({ where: { name: 'Ingeniería de Sistemas' } });
      const created = await call('admin', 'POST', '/api/students', { studentCode: CODE, firstName: 'SinPortal', lastName: 'Prueba', cycle: 3, schoolId: school.id });
      expect(created.status).toBe(201);
      const studentId = (created.json?.student as { id: string }).id;

      const res = await schedule('admin', [studentId]);
      expect(res.status).toBe(201);
      const session = res.json?.session as { id: string; notice: unknown };
      expect(session.notice).toEqual({ notified: 0, notReached: 1 });
      expect(await noticesOf(session.id)).toHaveLength(0);
    });

    it('una sesión que atiende una solicitud no duplica el aviso: la estudiante recibe uno solo, el de su solicitud', async () => {
      if (!dbUp) return;
      const request = await call('ana', 'POST', '/api/tutoring-requests/me', { caseType: 'ACADEMIC', reason: MARK });
      expect(request.status).toBe(201);
      const requestId = (request.json?.request as { id: string }).id;

      const res = await schedule('tutor', [anaId], { tutoringRequestId: requestId });
      expect(res.status).toBe(201);
      const session = res.json?.session as { id: string; notice: unknown };
      expect(session.notice).toEqual({ notified: 1, notReached: 0 });

      expect(await noticesOf(session.id)).toHaveLength(0); // ningún aviso de sesión repetido
      const ofRequest = await prisma.notification.findMany({ where: { tutoringRequestId: requestId, userId: anaUserId, type: 'TUTORING_REQUEST_UPDATED' } });
      expect(ofRequest).toHaveLength(1);
      expect(ofRequest[0].message).toContain('sesión programada');
    });
  });

  describe('a quién llega la solicitud (U02)', () => {
    it('la estudiante lo sabe antes de enviar: su tutora, con su nombre', async () => {
      if (!dbUp) return;
      const res = await call('ana', 'GET', '/api/tutoring-requests/recipient');
      expect(res.status).toBe(200);
      expect(res.json?.recipient).toMatchObject({ kind: 'tutor', name: expect.stringContaining('Elena') });
    });

    it('es de la estudiante: el personal no lo consulta, y sin sesión no hay respuesta', async () => {
      if (!dbUp) return;
      expect((await call('tutor', 'GET', '/api/tutoring-requests/recipient')).status).toBe(403);
      expect((await fetch(`${base}/api/tutoring-requests/recipient`)).status).toBe(401);
    });

    it('en su panel de inicio ve sus solicitudes pendientes y quién debe responder', async () => {
      if (!dbUp) return;
      const request = await call('ana', 'POST', '/api/tutoring-requests/me', { caseType: 'ACADEMIC', reason: MARK });
      expect(request.status).toBe(201);

      const panel = await call('ana', 'GET', '/api/home-panel');
      const kpis = ((panel.json?.panel as { kpis?: unknown[] } | undefined)?.kpis ?? []) as { key: string; value: string; hint?: string; link?: string }[];
      const mine = kpis.find((k) => k.key === 'my-requests');
      expect(mine).toMatchObject({ link: '/solicitar-tutoria' });
      expect(mine?.value).toMatch(/esperando respuesta/);
      expect(mine?.hint).toContain('Te avisaremos en cuanto Elena');
    });
  });
});
