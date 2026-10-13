import http from 'http';
import app from '../../src/app';
import { prisma } from '../../src/infrastructure/database/prisma';

/**
 * Bitácora de accesos sensibles (RNF-COMP-01) sobre HTTP real y base de datos real: ver un expediente, descargarlo y
 * el intento de un tutor ajeno dejan su rastro con actor, entidad, resultado e IP, y la bitácora no contiene el contenido.
 * Usa las cuentas del seed y no crea datos. Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(120_000);

const ACCOUNTS = {
  elena: { email: 'elena.ramirez@untrm.edu.pe', password: 'Demo2026!' }, // tutora de Ana
  jorge: { email: 'jorge.salazar@untrm.edu.pe', password: 'Demo2026!' }, // otro tutor
} as const;
type Who = keyof typeof ACCOUNTS;

describe('bitácora de accesos sensibles (RNF-COMP-01)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  const tokens = {} as Record<Who, string>;
  const users = {} as Record<Who, string>;
  let studentId = '';
  let startedAt = new Date();

  const get = (path: string, who: Who) => fetch(`${baseUrl}${path}`, { headers: { Authorization: `Bearer ${tokens[who]}` } });

  const login = async (who: Who) => {
    const res = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ACCOUNTS[who]) });
    if (res.status !== 200) throw new Error(`Login de ${who} falló: ${res.status}`);
    return ((await res.json()) as { data: { accessToken: string } }).data.accessToken;
  };

  // La bitácora se escribe al terminar la respuesta, sin que la petición espere: se consulta con un breve reintento.
  const entries = async (where: { userId: string; action: string; entity: string }, expected: number) => {
    for (let i = 0; i < 30; i += 1) {
      const rows = await prisma.auditLog.findMany({ where: { ...where, entityId: studentId, createdAt: { gte: startedAt } }, orderBy: { createdAt: 'asc' } });
      if (rows.length >= expected) return rows;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return prisma.auditLog.findMany({ where: { ...where, entityId: studentId, createdAt: { gte: startedAt } } });
  };

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba de la bitácora de accesos.');
      return;
    }
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    const address = listening.address();
    if (!address || typeof address === 'string') throw new Error('No address');
    baseUrl = `http://localhost:${address.port}`;
    for (const who of Object.keys(ACCOUNTS) as Who[]) {
      tokens[who] = await login(who);
      users[who] = (await prisma.user.findFirstOrThrow({ where: { email: ACCOUNTS[who].email } })).id;
    }
    studentId = (await prisma.student.findFirstOrThrow({ where: { studentCode: '20191234' } })).id;
    startedAt = new Date();
  });

  afterAll(async () => {
    const running = server;
    if (running) await new Promise((resolve) => running.close(resolve));
    await prisma.$disconnect();
  });

  it('la consulta del expediente por su tutora queda registrada como concedida, con su IP', async () => {
    if (!dbUp) return;
    expect((await get(`/api/students/${studentId}/record`, 'elena')).status).toBe(200);

    const rows = await entries({ userId: users.elena, action: 'READ', entity: 'StudentRecord' }, 1);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].details).toBe('Consulta concedida');
    expect(rows[0].ipAddress).toBeTruthy();
  });

  it('el intento de otro tutor sobre el expediente ajeno queda registrado como denegado', async () => {
    if (!dbUp) return;
    const res = await get(`/api/students/${studentId}/record`, 'jorge');
    expect(res.status).toBe(404);

    const rows = await entries({ userId: users.jorge, action: 'READ', entity: 'StudentRecord' }, 1);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].details).toMatch(/denegada o sin resultado \(HTTP 404\)/);
  });

  it('el permiso insuficiente también deja rastro (el registro va antes de la autorización)', async () => {
    if (!dbUp) return;
    await get(`/api/students/${studentId}/support-contact`, 'jorge');

    const rows = await entries({ userId: users.jorge, action: 'READ', entity: 'SupportContact' }, 1);
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it('la descarga del expediente en PDF se registra como descarga', async () => {
    if (!dbUp) return;
    const res = await get(`/api/students/${studentId}/record/pdf`, 'elena');
    expect(res.status).toBe(200);
    await res.arrayBuffer();

    const rows = await entries({ userId: users.elena, action: 'DOWNLOAD', entity: 'StudentRecord' }, 1);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].details).toBe('Descarga concedida');
  });

  it('la bitácora no guarda el contenido consultado', async () => {
    if (!dbUp) return;
    const rows = await entries({ userId: users.elena, action: 'READ', entity: 'StudentRecord' }, 1);
    const text = JSON.stringify(rows);

    expect(text).not.toMatch(/Ana|Torres|aspectsDiscussed|agreements/);
  });
});
