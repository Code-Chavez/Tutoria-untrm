import http from 'http';
import app from '../../src/app';
import { prisma } from '../../src/infrastructure/database/prisma';
import { TEST_PERIOD_CREATED_AT } from '../helpers/currentPeriod';
import { PrismaAcademicPeriodRepository } from '../../src/infrastructure/repositories/PrismaAcademicPeriodRepository';
import { PrismaPeriodSummaryRepository } from '../../src/infrastructure/repositories/PrismaPeriodSummaryRepository';
import { PrismaAuditLogRepository } from '../../src/infrastructure/repositories/PrismaAuditLogRepository';
import { ClosePeriodUseCase, PeriodConfirmationError, PeriodNotActiveError, ReopenPeriodUseCase, PeriodReopenError } from '../../src/application/use-cases/periods/PeriodLifecycleUseCases';

/**
 * Cierre de periodo (fase 1) contra la base real. Trabaja con un **periodo propio de la prueba** (no el vigente del
 * sistema), para no dejar en solo lectura a las demás suites que corren a la vez; el efecto de «sin periodo vigente» sobre
 * las escrituras se prueba aparte (unitaria y E2E). Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(120_000);

const ACCOUNTS = {
  admin: { email: '7183255722@untrm.edu.pe', password: 'Admin2026!' },
  tutor: { email: 'elena.ramirez@untrm.edu.pe', password: 'Demo2026!' },
  student: { email: '20191234@untrm.edu.pe', password: 'Demo2026!' },
} as const;
type Who = keyof typeof ACCOUNTS;

const stamp = Date.now();
const NAME = `PRUEBA-CIERRE-${stamp}`;

describe('cierre de periodo (fase 1)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  let periodId = '';
  let adminId = '';
  const tokens = {} as Record<Who, string>;
  const periods = new PrismaAcademicPeriodRepository(prisma);
  const close = new ClosePeriodUseCase(periods, new PrismaPeriodSummaryRepository(prisma), new PrismaAuditLogRepository(prisma));
  const reopen = new ReopenPeriodUseCase(periods, new PrismaAuditLogRepository(prisma));

  const call = (method: string, path: string, who?: Who, body?: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { ...(who ? { Authorization: `Bearer ${tokens[who]}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba de cierre de periodo.');
      return;
    }
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    const address = listening.address();
    if (!address || typeof address === 'string') throw new Error('No address');
    baseUrl = `http://localhost:${address.port}`;

    for (const who of Object.keys(ACCOUNTS) as Who[]) {
      const res = await call('POST', '/api/auth/login', undefined, ACCOUNTS[who]);
      tokens[who] = ((await res.json()) as { data: { accessToken: string } }).data.accessToken;
    }
    adminId = (await prisma.user.findFirstOrThrow({ where: { email: ACCOUNTS.admin.email } })).id;
    const created = await prisma.academicPeriod.create({
      data: { name: NAME, startDate: new Date('2026-01-05'), endDate: new Date('2026-06-30'), isActive: true, createdAt: TEST_PERIOD_CREATED_AT },
    });
    periodId = created.id;
  });

  afterAll(async () => {
    const running = server;
    if (running) await new Promise((resolve) => running.close(resolve));
    if (dbUp && periodId) await prisma.academicPeriod.deleteMany({ where: { id: periodId } }); // arrastra su corte de matrícula
    await prisma.$disconnect();
  });

  it('sin el nombre exacto del periodo no cierra', async () => {
    if (!dbUp) return;
    await expect(close.execute(adminId, periodId, 'otro nombre')).rejects.toBeInstanceOf(PeriodConfirmationError);

    expect((await prisma.academicPeriod.findUniqueOrThrow({ where: { id: periodId } })).isActive).toBe(true);
  });

  it('la DBU ve la vista previa de un periodo vigente; otros roles no', async () => {
    if (!dbUp) return;
    const res = await call('GET', `/api/periods/${periodId}/closure`, 'admin');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { state: string; isPreview: boolean; summary: { students: { total: number } } };
    expect(body).toMatchObject({ state: 'VIGENTE', isPreview: true });
    expect(body.summary.students.total).toBeGreaterThan(0);

    expect((await call('GET', `/api/periods/${periodId}/closure`, 'tutor')).status).toBe(403);
    expect((await call('GET', `/api/periods/${periodId}/closure`, 'student')).status).toBe(403);
  });

  it('solo la DBU cierra, con confirmación, y la API responde 400 si el nombre no coincide', async () => {
    if (!dbUp) return;
    expect((await call('POST', `/api/periods/${periodId}/close`, 'tutor', { confirmName: NAME })).status).toBe(403);
    expect((await call('POST', `/api/periods/${periodId}/close`, undefined, { confirmName: NAME })).status).toBe(401);
    expect((await call('POST', `/api/periods/${periodId}/close`, 'admin', { confirmName: 'x' })).status).toBe(400);
    expect((await call('POST', `/api/periods/${periodId}/close`, 'admin', {})).status).toBe(400);
  });

  it('cierra: congela la matrícula, guarda el resumen y deja quién y cuándo; queda en la bitácora', async () => {
    if (!dbUp) return;
    const res = await call('POST', `/api/periods/${periodId}/close`, 'admin', { confirmName: NAME });
    expect(res.status).toBe(200);

    const row = await prisma.academicPeriod.findUniqueOrThrow({ where: { id: periodId } });
    expect(row.isActive).toBe(false);
    expect(row.closedAt).not.toBeNull();
    expect(row.closedById).toBe(adminId);
    expect((row.closureSummary as { students: { total: number } }).students.total).toBeGreaterThan(0);
    expect(await prisma.studentPeriodSnapshot.count({ where: { periodId } })).toBeGreaterThan(0);

    const audit = await prisma.auditLog.findMany({ where: { action: 'PERIOD_CLOSED', entityId: periodId } });
    expect(audit).toHaveLength(1);
    expect(audit[0].userId).toBe(adminId);
  });

  it('un periodo cerrado muestra su resumen guardado, y no se puede cerrar otra vez', async () => {
    if (!dbUp) return;
    const view = (await (await call('GET', `/api/periods/${periodId}/closure`, 'admin')).json()) as { state: string; isPreview: boolean };
    expect(view).toMatchObject({ state: 'CERRADO', isPreview: false });

    expect((await call('POST', `/api/periods/${periodId}/close`, 'admin', { confirmName: NAME })).status).toBe(409);
    await expect(close.execute(adminId, periodId, NAME)).rejects.toBeInstanceOf(PeriodNotActiveError);
  });

  it('no se reabre mientras haya otro periodo vigente (el del sistema)', async () => {
    if (!dbUp) return;
    await expect(reopen.execute(adminId, periodId)).rejects.toBeInstanceOf(PeriodReopenError);
    expect((await call('POST', `/api/periods/${periodId}/reopen`, 'admin')).status).toBe(409);
    expect((await call('POST', `/api/periods/${periodId}/reopen`, 'tutor')).status).toBe(403);
  });

  it('dos cierres simultáneos del mismo periodo: solo uno gana', async () => {
    if (!dbUp) return;
    const other = await prisma.academicPeriod.create({ data: { name: `${NAME}-b`, startDate: new Date('2026-01-05'), endDate: new Date('2026-06-30'), isActive: true, createdAt: TEST_PERIOD_CREATED_AT } });
    try {
      const results = await Promise.all([periods.close(other.id, adminId, new Date(), {}), periods.close(other.id, adminId, new Date(), {})]);

      expect(results.filter(Boolean)).toHaveLength(1);
    } finally {
      await prisma.academicPeriod.deleteMany({ where: { id: other.id } });
    }
  });

  it('cualquier persona autenticada puede saber si hay periodo abierto', async () => {
    if (!dbUp) return;
    for (const who of ['admin', 'tutor', 'student'] as Who[]) {
      const res = await call('GET', '/api/periods/current', who);
      expect(res.status).toBe(200);
      expect(await res.json()).toHaveProperty('open');
    }
    expect((await call('GET', '/api/periods/current')).status).toBe(401);
  });

  it('el catálogo ya no permite abrir otro periodo mientras haya uno vigente', async () => {
    if (!dbUp) return;
    const res = await call('POST', '/api/catalogs/periods', 'admin', { name: `${NAME}-c`, startDate: '2027-01-01', endDate: '2027-06-30', isActive: true });

    expect(res.status).toBe(400);
    expect(JSON.stringify(await res.json())).toMatch(/Cierre de periodo/);
  });
});
