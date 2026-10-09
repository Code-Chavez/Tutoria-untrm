import http from 'http';
import app from '../../src/app';
import { prisma } from '../../src/infrastructure/database/prisma';

/**
 * Circuito completo de una solicitud de tutoría (R01) por HTTP y base reales: el tutorado la registra
 * desde su cuenta, la recibe su tutor (con aviso), la ve en su bandeja y la atiende; el estudiante ve su
 * historial con la respuesta y recibe el aviso; el expediente la incorpora. Cubre también que nadie
 * ajeno la ve ni la modifica. Cuentas del seed. Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(120_000);

const PASSWORD = 'Demo2026!';
const EMAILS = {
  tutorado: '20191234@untrm.edu.pe', // Ana Torres, tutora Elena Ramírez
  tutor: 'elena.ramirez@untrm.edu.pe',
  otroTutor: 'jorge.salazar@untrm.edu.pe',
  coordinador: 'rosa.mendoza@untrm.edu.pe', // coordina Ingeniería de Sistemas, la escuela de Ana
  otroCoordinador: 'carlos.vega@untrm.edu.pe', // coordina Mecánica Eléctrica
  otroTutorado: '20195678@untrm.edu.pe',
} as const;
type Who = keyof typeof EMAILS;

describe('circuito de solicitudes de tutoría (R01)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  const tokens = {} as Record<Who, string>;
  let adminToken = '';
  let requestId = '';
  let studentId = '';

  const call = (method: string, path: string, token: string, body?: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });

  const login = async (email: string, password: string) => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.status !== 200) throw new Error(`Login de ${email} falló: ${res.status}`);
    return ((await res.json()) as { data: { accessToken: string } }).data.accessToken;
  };

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite el circuito de solicitudes.');
      return;
    }
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    baseUrl = `http://localhost:${(listening.address() as { port: number }).port}`;
    for (const who of Object.keys(EMAILS) as Who[]) tokens[who] = await login(EMAILS[who], PASSWORD);
    adminToken = await login('7183255722@untrm.edu.pe', 'Admin2026!');
    studentId = (await prisma.student.findUniqueOrThrow({ where: { studentCode: '20191234' } })).id;
  });

  afterAll(async () => {
    if (dbUp) {
      await prisma.notification.deleteMany({ where: { tutoringRequestId: requestId } });
      if (requestId) await prisma.tutoringRequest.deleteMany({ where: { id: requestId } });
    }
    if (server) await new Promise((resolve) => server?.close(resolve));
    await prisma.$disconnect();
  });

  it('el tutorado registra su solicitud desde su cuenta (regresión: antes fallaba con 500)', async () => {
    if (!dbUp) return;
    const res = await call('POST', '/api/tutoring-requests/me', tokens.tutorado, { caseType: 'ACADEMIC', reason: 'Prueba R01: apoyo en Cálculo' });
    expect(res.status).toBe(201);
    const { request } = (await res.json()) as { request: { id: string; status: string; routedToRole: string } };
    expect(request.status).toBe('PENDIENTE');
    expect(request.routedToRole).toBe('tutor');
    requestId = request.id;
  });

  it('su tutor recibe el aviso y la ve en su bandeja; el estudiante la ve en su historial', async () => {
    if (!dbUp) return;
    const notes = (await (await call('GET', '/api/notifications', tokens.tutor)).json()) as { type: string; tutoringRequestId?: string }[] | { notifications: { type: string; tutoringRequestId?: string }[] };
    const list = Array.isArray(notes) ? notes : notes.notifications;
    expect(list.some((n) => n.type === 'TUTORING_REQUEST_CREATED' && n.tutoringRequestId === requestId)).toBe(true);

    const inbox = (await (await call('GET', '/api/tutoring-requests?mine=true', tokens.tutor)).json()) as { requests: { id: string; studentName: string }[] };
    expect(inbox.requests.map((r) => r.id)).toContain(requestId);
    expect(inbox.requests.find((r) => r.id === requestId)?.studentName).toContain('Ana');

    const own = (await (await call('GET', '/api/tutoring-requests/mine', tokens.tutorado)).json()) as { requests: { id: string; status: string }[] };
    expect(own.requests.find((r) => r.id === requestId)?.status).toBe('PENDIENTE');
  });

  it('nadie ajeno la ve ni la modifica: otro tutor, otra coordinación y otro tutorado', async () => {
    if (!dbUp) return;
    for (const who of ['otroTutor', 'otroCoordinador'] as Who[]) {
      const inbox = (await (await call('GET', '/api/tutoring-requests', tokens[who])).json()) as { requests: { id: string }[] };
      expect(inbox.requests.map((r) => r.id)).not.toContain(requestId);
      const patch = await call('PATCH', `/api/tutoring-requests/${requestId}/status`, tokens[who], { status: 'EN_ATENCION' });
      expect(patch.status).toBe(404);
    }
    const other = (await (await call('GET', '/api/tutoring-requests/mine', tokens.otroTutorado)).json()) as { requests: { id: string }[] };
    expect(other.requests.map((r) => r.id)).not.toContain(requestId);
    const forbidden = await call('PATCH', `/api/tutoring-requests/${requestId}/status`, tokens.tutorado, { status: 'ATENDIDA', note: 'me la respondo yo' });
    expect(forbidden.status).toBe(403); // el estudiante no tiene permiso de gestionar solicitudes
  });

  it('la coordinación de su escuela también la ve en la bandeja', async () => {
    if (!dbUp) return;
    const inbox = (await (await call('GET', '/api/tutoring-requests', tokens.coordinador)).json()) as { requests: { id: string }[] };
    expect(inbox.requests.map((r) => r.id)).toContain(requestId);
  });

  it('el tutor la pasa a en atención y luego la atiende con su respuesta; solo avanza', async () => {
    if (!dbUp) return;
    const step1 = await call('PATCH', `/api/tutoring-requests/${requestId}/status`, tokens.tutor, { status: 'EN_ATENCION' });
    expect(step1.status).toBe(200);

    const noNote = await call('PATCH', `/api/tutoring-requests/${requestId}/status`, tokens.tutor, { status: 'ATENDIDA' });
    expect(noNote.status).toBe(409);

    const step2 = await call('PATCH', `/api/tutoring-requests/${requestId}/status`, tokens.tutor, { status: 'ATENDIDA', note: 'Te espero el jueves a las 10:00 en mi oficina.' });
    expect(step2.status).toBe(200);
    const { request } = (await step2.json()) as { request: { status: string; handledByName: string; responseNote: string } };
    expect(request).toMatchObject({ status: 'ATENDIDA', responseNote: 'Te espero el jueves a las 10:00 en mi oficina.' });
    expect(request.handledByName).toContain('Elena');

    const back = await call('PATCH', `/api/tutoring-requests/${requestId}/status`, tokens.tutor, { status: 'EN_ATENCION' });
    expect(back.status).toBe(409);
  });

  it('el estudiante ve la respuesta y recibe el aviso; el expediente y la bitácora la registran', async () => {
    if (!dbUp) return;
    const own = (await (await call('GET', '/api/tutoring-requests/mine', tokens.tutorado)).json()) as { requests: { id: string; status: string; responseNote: string }[] };
    const mine = own.requests.find((r) => r.id === requestId);
    expect(mine).toMatchObject({ status: 'ATENDIDA', responseNote: 'Te espero el jueves a las 10:00 en mi oficina.' });

    const notes = (await (await call('GET', '/api/notifications', tokens.tutorado)).json()) as { type: string; tutoringRequestId?: string }[] | { notifications: { type: string; tutoringRequestId?: string }[] };
    const list = Array.isArray(notes) ? notes : notes.notifications;
    expect(list.some((n) => n.type === 'TUTORING_REQUEST_UPDATED' && n.tutoringRequestId === requestId)).toBe(true);

    const record = (await (await call('GET', `/api/students/${studentId}/record`, tokens.tutor)).json()) as { timeline: { type: string; id: string; status?: string }[] } | { record: { timeline: { type: string; id: string; status?: string }[] } };
    const timeline = 'timeline' in record ? record.timeline : record.record.timeline;
    expect(timeline.find((e) => e.type === 'tutoringRequest' && e.id === requestId)?.status).toBe('ATENDIDA');

    const audit = (await (await call('GET', '/api/audit?action=TUTORING_REQUEST_STATUS&pageSize=10', adminToken)).json()) as { items: { entityId: string }[] };
    expect(audit.items.filter((a) => a.entityId === requestId).length).toBeGreaterThanOrEqual(2);
  });
});
