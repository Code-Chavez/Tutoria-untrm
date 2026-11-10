import http from 'http';
import { prisma } from '../../src/infrastructure/database/prisma';
import { TEST_PERIOD_CREATED_AT } from '../helpers/currentPeriod';
import { DEMO_PASSWORD, removeOwnUserTraces } from '../helpers/ownUsers';

/**
 * API que usa la pantalla de certificados (corte 5), por HTTP real y base real de pruebas: opciones de filtro, docentes sin trámite
 * (candidatos), hechos del sistema para quien revisa y acciones permitidas por estado. Datos PROPIOS (periodo, facultades, escuelas,
 * roles, cuentas, designaciones, sesiones, un informe y trámites) que crea y borra. Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(240_000);

const stamp = String(Date.now());
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

type Who = 'admin' | 'director' | 'viewer' | 'otherSchool' | 'noPermission';

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('API de la pantalla de certificados (corte 5)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  const tokens = {} as Record<Who, string>;
  let periodId = '';
  let otherPeriodId = '';
  let schoolA = { id: '', name: '' };
  let schoolB = { id: '', name: '' };
  let adminId = '';
  let cycle = 0;
  let tutorRoleId = '';
  const roleIds: string[] = [];
  const userIds: string[] = [];
  const schoolIds: string[] = [];
  const facultyIds: string[] = [];
  const assignmentIds: string[] = [];
  const sessionIds: string[] = [];
  const certificateIds: string[] = [];

  const call = (method: string, path: string, who: Who | null, body?: unknown) =>
    fetch(`${baseUrl}/api${path}`, {
      method,
      headers: { ...(who ? { Authorization: `Bearer ${tokens[who]}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const json = async (res: Response) => (await res.json()) as Record<string, any>;
  const login = async (email: string, password: string) =>
    ((await json(await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }))).data as { accessToken: string }).accessToken;

  async function roleWith(label: string, codes: string[]): Promise<string> {
    const role = await prisma.role.create({ data: { name: `Rol pantalla ${label} ${stamp}`, description: 'Rol ficticio de prueba' } });
    roleIds.push(role.id);
    const permissions = await prisma.permission.findMany({ where: { code: { in: codes } } });
    expect(permissions).toHaveLength(codes.length);
    await prisma.rolePermission.createMany({ data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })) });
    return role.id;
  }

  async function account(label: Who, roleId: string, schoolsScope: string[] | null): Promise<void> {
    const hash = (await prisma.user.findFirstOrThrow({ where: { email: 'elena.ramirez@untrm.edu.pe' } })).passwordHash;
    const user = await prisma.user.create({ data: { email: `pan-${label}-${stamp}@untrm.edu.pe`, passwordHash: hash, firstName: 'Cuenta', lastName: `Pantalla ${label}`, roleId } });
    userIds.push(user.id);
    if (schoolsScope) await prisma.userAccessPolicy.create({ data: { userId: user.id, roleId, kind: 'SCHOOLS', schoolIds: schoolsScope } });
  }

  async function makeTutor(label: string, opts: { acceptance?: string; active?: boolean; school?: string; period?: string } = {}): Promise<{ id: string; assignmentId: string }> {
    const hash = (await prisma.user.findFirstOrThrow({ where: { email: 'elena.ramirez@untrm.edu.pe' } })).passwordHash;
    const school = opts.school ?? schoolA.id;
    const user = await prisma.user.create({
      data: { email: `pan-doc-${label}-${stamp}@untrm.edu.pe`, passwordHash: hash, firstName: 'Docente', lastName: `Ficticio ${label}`, roleId: tutorRoleId, schoolId: school, isActive: opts.active ?? true },
    });
    userIds.push(user.id);
    cycle += 1;
    const assignment = await prisma.cycleTutorAssignment.create({
      data: { periodId: opts.period ?? periodId, schoolId: school, cycle, tutorId: user.id, assignedById: adminId, acceptanceStatus: opts.acceptance ?? 'ACEPTADA', respondedAt: new Date('2026-02-10T12:00:00.000Z') },
    });
    assignmentIds.push(assignment.id);
    return { id: user.id, assignmentId: assignment.id };
  }

  const candidates = async (who: Who, query: string) => (await json(await call('GET', `/certificates/candidates?${query}`, who))).candidates as { tutorId: string; schoolId: string; cycles: number[]; tutorName: string }[];
  const start = async (who: Who, tutorId: string, schoolId = schoolA.id) => {
    const res = await call('POST', '/certificates', who, { tutorId, periodId, schoolId });
    expect(res.status).toBe(201);
    const c = (await json(res)).certificate;
    certificateIds.push(c.id);
    return c as { id: string; evidences: { id: string }[]; allowedActions: string[] };
  };

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba de la API de la pantalla de certificados.');
      return;
    }
    const reference = await prisma.school.findFirstOrThrow({ where: { name: 'Ingeniería de Sistemas' } });
    for (const label of ['A', 'B']) {
      const faculty = await prisma.faculty.create({ data: { name: `Facultad de Pantalla ${label} ${stamp}` } });
      facultyIds.push(faculty.id);
      const school = await prisma.school.create({ data: { name: `Escuela de Pantalla ${label} ${stamp}`, facultyId: faculty.id, campusId: reference.campusId } });
      schoolIds.push(school.id);
    }
    schoolA = { id: schoolIds[0]!, name: `Escuela de Pantalla A ${stamp}` };
    schoolB = { id: schoolIds[1]!, name: `Escuela de Pantalla B ${stamp}` };
    periodId = (await prisma.academicPeriod.create({ data: { name: `Prueba pantalla ${stamp}`, startDate: new Date('2026-01-05'), endDate: new Date('2026-06-30'), isActive: true, createdAt: TEST_PERIOD_CREATED_AT } })).id;
    otherPeriodId = (await prisma.academicPeriod.create({ data: { name: `Prueba pantalla otro ${stamp}`, startDate: new Date('2025-01-05'), endDate: new Date('2025-06-30'), isActive: false, createdAt: TEST_PERIOD_CREATED_AT } })).id;
    adminId = (await prisma.user.findFirstOrThrow({ where: { email: '7183255722@untrm.edu.pe' } })).id;
    tutorRoleId = (await prisma.role.findFirstOrThrow({ where: { name: 'Docente Tutor' } })).id;

    await account('director', await roleWith('director', ['certificados:registrar', 'certificados:aprobar', 'certificados:emitir', 'certificados:consultar']), [schoolA.id]);
    await account('viewer', await roleWith('consulta', ['certificados:consultar']), [schoolA.id]);
    await account('otherSchool', await roleWith('otra-escuela', ['certificados:registrar', 'certificados:consultar']), [schoolB.id]);
    await account('noPermission', await roleWith('sin-permiso', ['students:read']), null);

    const { default: app } = await import('../../src/app');
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    const address = listening.address();
    if (!address || typeof address === 'string') throw new Error('No address');
    baseUrl = `http://localhost:${address.port}`;
    tokens.admin = await login('7183255722@untrm.edu.pe', 'Admin2026!');
    for (const who of ['director', 'viewer', 'otherSchool', 'noPermission'] as Who[]) tokens[who] = await login(`pan-${who}-${stamp}@untrm.edu.pe`, DEMO_PASSWORD);
  });

  afterAll(async () => {
    const running = server;
    if (running) await new Promise((resolve) => running.close(resolve));
    if (dbUp) {
      await prisma.certificateEvidence.deleteMany({ where: { certificateId: { in: certificateIds } } });
      await prisma.certificate.deleteMany({ where: { id: { in: certificateIds } } });
      await prisma.tutorSemesterReport.deleteMany({ where: { periodId } });
      await prisma.session.deleteMany({ where: { id: { in: sessionIds } } });
      await prisma.cycleTutorAssignment.deleteMany({ where: { id: { in: assignmentIds } } });
      await prisma.userAccessPolicy.deleteMany({ where: { userId: { in: userIds } } });
      await removeOwnUserTraces(prisma, userIds, certificateIds);
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await prisma.rolePermission.deleteMany({ where: { roleId: { in: roleIds } } });
      await prisma.role.deleteMany({ where: { id: { in: roleIds } } });
      await prisma.academicPeriod.deleteMany({ where: { id: { in: [periodId, otherPeriodId] } } });
      await prisma.school.deleteMany({ where: { id: { in: schoolIds } } });
      await prisma.faculty.deleteMany({ where: { id: { in: facultyIds } } });
    }
    await prisma.$disconnect();
  });

  const guard = (fn: () => Promise<void>) => async () => {
    if (!dbUp) return;
    await fn();
  };

  describe('opciones de filtro', () => {
    it('la administración recibe todos los periodos y escuelas; con alcance de una escuela, solo esa', guard(async () => {
      const all = await json(await call('GET', '/certificates/options', 'admin'));
      expect(all.periods.map((p: any) => p.id)).toEqual(expect.arrayContaining([periodId, otherPeriodId]));
      expect(all.schools.map((s: any) => s.id)).toEqual(expect.arrayContaining([schoolA.id, schoolB.id]));
      expect(all).toHaveProperty('currentPeriodId');

      const scoped = await json(await call('GET', '/certificates/options', 'viewer'));
      expect(scoped.schools).toEqual([{ id: schoolA.id, name: schoolA.name, campuses: expect.arrayContaining([]) }]);
      const other = await json(await call('GET', '/certificates/options', 'otherSchool'));
      expect(other.schools).toEqual([{ id: schoolB.id, name: schoolB.name, campuses: expect.arrayContaining([]) }]);
    }));

    it('sin sesión responde 401 y sin permiso 403', guard(async () => {
      expect((await call('GET', '/certificates/options', null)).status).toBe(401);
      expect((await call('GET', '/certificates/options', 'noPermission')).status).toBe(403);
    }));

    it('«options» y «candidates» no se leen como identificador de un trámite', guard(async () => {
      expect((await call('GET', '/certificates/options', 'viewer')).status).toBe(200);
      expect((await call('GET', `/certificates/candidates?periodId=${periodId}`, 'director')).status).toBe(200);
    }));
  });

  describe('docentes sin trámite', () => {
    it('lista a los de designación aceptada del periodo y escuela; no a los demás', guard(async () => {
      const accepted = await makeTutor('cand-aceptado');
      await makeTutor('cand-pendiente', { acceptance: 'PENDIENTE' });
      await makeTutor('cand-rechazada', { acceptance: 'RECHAZADA' });
      await makeTutor('cand-inactivo', { active: false });
      await makeTutor('cand-otro-periodo', { period: otherPeriodId });
      const list = await candidates('director', `periodId=${periodId}`);
      const ids = list.map((c) => c.tutorId);
      expect(ids).toContain(accepted.id);
      expect(list.filter((c) => c.tutorName.includes('cand-')).map((c) => c.tutorName)).toEqual([`Docente Ficticio cand-aceptado`]);
      expect(list.find((c) => c.tutorId === accepted.id)).toMatchObject({ schoolId: schoolA.id, cycles: [expect.any(Number)] });
    }));

    it('un docente con trámite vigente deja de ser candidato; uno anulado o rechazado vuelve a serlo', guard(async () => {
      const t = await makeTutor('cand-trama');
      const c = await start('director', t.id);
      expect((await candidates('director', `periodId=${periodId}`)).map((x) => x.tutorId)).not.toContain(t.id);

      expect((await call('POST', `/certificates/${c.id}/void`, 'admin', { reason: 'Anulación ficticia de la prueba' })).status).toBe(200);
      expect((await candidates('director', `periodId=${periodId}`)).map((x) => x.tutorId)).toContain(t.id);
    }));

    it('varios ciclos del mismo docente salen en una sola fila', guard(async () => {
      const t = await makeTutor('cand-ciclos');
      cycle += 1;
      const second = await prisma.cycleTutorAssignment.create({ data: { periodId, schoolId: schoolA.id, cycle, tutorId: t.id, assignedById: adminId, acceptanceStatus: 'ACEPTADA', respondedAt: new Date() } });
      assignmentIds.push(second.id);
      const rows = (await candidates('director', `periodId=${periodId}`)).filter((r) => r.tutorId === t.id);
      expect(rows).toHaveLength(1);
      expect(rows[0]!.cycles).toHaveLength(2);
    }));

    it('respeta el alcance: otra escuela no los ve y pedir la escuela ajena por filtro no la abre', guard(async () => {
      const t = await makeTutor('cand-alcance');
      expect((await candidates('otherSchool', `periodId=${periodId}`)).map((c) => c.tutorId)).not.toContain(t.id);
      expect(await candidates('otherSchool', `periodId=${periodId}&schoolId=${schoolA.id}`)).toEqual([]);
      expect((await candidates('director', `periodId=${periodId}&schoolId=${schoolA.id}`)).map((c) => c.tutorId)).toContain(t.id);
    }));

    it('exige `certificados:registrar` y un periodo válido', guard(async () => {
      expect((await call('GET', `/certificates/candidates?periodId=${periodId}`, 'viewer')).status).toBe(403);
      expect((await call('GET', `/certificates/candidates?periodId=${periodId}`, null)).status).toBe(401);
      expect((await call('GET', '/certificates/candidates', 'director')).status).toBe(400);
      expect((await call('GET', '/certificates/candidates?periodId=no-uuid', 'director')).status).toBe(400);
      expect((await candidates('director', `periodId=${UNKNOWN_ID}`))).toEqual([]);
    }));
  });

  describe('hechos del sistema y acciones permitidas', () => {
    it('el detalle trae la aceptación, las sesiones realizadas y el informe, solo como información', guard(async () => {
      const t = await makeTutor('hechos');
      const c = await start('director', t.id);
      const inPeriod = (day: string) => new Date(`2026-03-${day}T14:00:00.000Z`);
      const makeSession = async (scheduledAt: Date, over: Record<string, unknown> = {}) => {
        const row = await prisma.session.create({ data: { tutorId: t.id, topic: 'Prueba ficticia', scheduledAt, durationMinutes: 45, endsAt: new Date(scheduledAt.getTime() + 45 * 60_000), ...over } });
        sessionIds.push(row.id);
      };
      await makeSession(inPeriod('02'));
      await makeSession(inPeriod('03'));
      await makeSession(inPeriod('04'), { cancelledAt: new Date() }); // cancelada: no cuenta
      await makeSession(new Date('2025-03-02T14:00:00.000Z')); // fuera del periodo: no cuenta
      await makeSession(new Date(Date.now() + 5 * 86_400_000)); // futura: todavía no se realizó

      let detail = (await json(await call('GET', `/certificates/${c.id}`, 'viewer'))).certificate;
      // Siempre en el orden del proceso, no en el de la base.
      expect(detail.evidences.map((e: any) => e.kind)).toEqual(['ACEPTACION', 'SESIONES', 'INFORME_SEMESTRAL']);
      expect(detail.facts).toMatchObject({ sessionsHeld: 2, semesterReportSubmitted: false });
      expect(detail.facts.acceptance).toMatchObject({ status: 'ACEPTADA', cycle: expect.any(Number) });
      expect(detail.facts.acceptance.respondedAt).toMatch(/^2026-02-10/);

      await prisma.tutorSemesterReport.create({ data: { periodId, tutorId: t.id, programName: 'Programa ficticio', faculty: 'Facultad ficticia', teacherCategory: 'Auxiliar', tutoringCycles: '1', phone: '999999999', individual: {}, group: {} } });
      detail = (await json(await call('GET', `/certificates/${c.id}`, 'viewer'))).certificate;
      expect(detail.facts.semesterReportSubmitted).toBe(true);
      // Los hechos no cambian la conformidad: las evidencias siguen pendientes hasta que una persona las marque.
      expect(detail.evidences.every((e: any) => e.result === 'PENDIENTE')).toBe(true);
    }));

    it('si la designación se eliminó después, el detalle lo dice sin fallar', guard(async () => {
      const t = await makeTutor('hechos-sin-designacion');
      const c = await start('director', t.id);
      await prisma.cycleTutorAssignment.deleteMany({ where: { id: t.assignmentId } });
      const detail = (await json(await call('GET', `/certificates/${c.id}`, 'viewer'))).certificate;
      expect(detail.facts.acceptance).toBeNull();
    }));

    it('cada estado ofrece solo las acciones que proceden desde él', guard(async () => {
      const t = await makeTutor('acciones');
      const c = await start('director', t.id);
      expect(c.allowedActions).toEqual(['SUBMIT', 'VOID']);
      const submitted = (await json(await call('POST', `/certificates/${c.id}/submit`, 'director', {}))).certificate;
      expect(submitted.allowedActions).toEqual(['OBSERVE', 'REJECT', 'APPROVE', 'VOID']);
      for (const e of c.evidences) await call('PUT', `/certificates/${c.id}/evidences/${e.id}`, 'director', { result: 'CONFORME' });
      expect((await json(await call('POST', `/certificates/${c.id}/approve`, 'director', {}))).certificate.allowedActions).toEqual(['GENERATE', 'VOID']);
      const voided = (await json(await call('POST', `/certificates/${c.id}/void`, 'admin', { reason: 'Anulación ficticia de la prueba' }))).certificate;
      expect(voided.allowedActions).toEqual([]);
      // La lista también las trae, para no pedir el detalle de cada fila.
      const row = ((await json(await call('GET', `/certificates?periodId=${periodId}`, 'viewer'))).certificates as any[]).find((r) => r.id === c.id);
      expect(row.allowedActions).toEqual([]);
    }));
  });
});
