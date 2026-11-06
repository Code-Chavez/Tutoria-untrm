import http from 'http';
import { prisma } from '../../src/infrastructure/database/prisma';
import { TEST_PERIOD_CREATED_AT } from '../helpers/currentPeriod';
import { DEMO_PASSWORD, removeOwnUserTraces } from '../helpers/ownUsers';

/**
 * Consulta de certificados (corte 2) por HTTP real y base real de pruebas: el permiso `certificados:consultar` y el alcance por
 * escuela. Datos PROPIOS: un periodo, roles a medida, cuentas y trámites que crea y borra; las cuentas sembradas solo inician sesión
 * (la administración, que tiene todo el catálogo). Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(180_000);

const stamp = String(Date.now());
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

type Who = 'admin' | 'schoolA' | 'faculty' | 'noScope' | 'ownScope' | 'noPermission';

describe('consulta de certificados: permiso y alcance por escuela (corte 2)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  const tokens = {} as Record<Who, string>;
  let periodId = '';
  let schoolA = { id: '', facultyId: '' };
  let schoolB = { id: '', facultyId: '' };
  let tutorId = '';
  let adminId = '';
  let certA = '';
  let certB = '';
  let certAVoided = '';
  const roleIds: string[] = [];
  const userIds: string[] = [];
  const certificateIds: string[] = [];
  const schoolIds: string[] = [];
  const facultyIds: string[] = [];

  const call = (path: string, who: Who | null) =>
    fetch(`${baseUrl}/api${path}`, { headers: who ? { Authorization: `Bearer ${tokens[who]}` } : {} });
  const json = async (res: Response) => (await res.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const listIds = async (who: Who, query = '') => ((await json(await call(`/certificates${query}`, who))).certificates as { id: string }[]).map((c) => c.id);

  async function roleWith(label: string, codes: string[]): Promise<string> {
    const role = await prisma.role.create({ data: { name: `Rol cert ${label} ${stamp}`, description: 'Rol ficticio de prueba' } });
    roleIds.push(role.id);
    const permissions = await prisma.permission.findMany({ where: { code: { in: codes } } });
    expect(permissions).toHaveLength(codes.length);
    await prisma.rolePermission.createMany({ data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })) });
    return role.id;
  }

  async function accountWith(label: string, roleId: string): Promise<string> {
    const hash = (await prisma.user.findFirstOrThrow({ where: { email: 'elena.ramirez@untrm.edu.pe' } })).passwordHash;
    const user = await prisma.user.create({ data: { email: `cert-${label}-${stamp}@untrm.edu.pe`, passwordHash: hash, firstName: 'Cuenta', lastName: `Cert ${label}`, roleId } });
    userIds.push(user.id);
    return user.id;
  }

  const login = async (email: string, password: string) =>
    ((await json(await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }))).data as { accessToken: string }).accessToken;

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba HTTP de consulta de certificados.');
      return;
    }
    // Facultades y escuelas PROPIAS, una de cada facultad: las suites corren a la vez sobre la misma base y otra puede borrar su
    // escuela mientras un trámite nuestro la referencia; además el alcance por facultad se prueba contra una facultad distinta.
    // Cada escuela lleva la sede de una de referencia: otra suite comprueba que ninguna escuela quede sin sede.
    const reference = await prisma.school.findFirstOrThrow({ where: { name: 'Ingeniería de Sistemas' } });
    for (const label of ['A', 'B']) {
      const faculty = await prisma.faculty.create({ data: { name: `Facultad cert ${label} ${stamp}` } });
      facultyIds.push(faculty.id);
      const school = await prisma.school.create({ data: { name: `Escuela cert ${label} ${stamp}`, facultyId: faculty.id, campusId: reference.campusId } });
      schoolIds.push(school.id);
    }
    schoolA = { id: schoolIds[0]!, facultyId: facultyIds[0]! };
    schoolB = { id: schoolIds[1]!, facultyId: facultyIds[1]! };

    periodId = (await prisma.academicPeriod.create({ data: { name: `Prueba consulta certificados ${stamp}`, startDate: new Date('2026-01-05'), endDate: new Date('2026-06-30'), isActive: true, createdAt: TEST_PERIOD_CREATED_AT } })).id;
    adminId = (await prisma.user.findFirstOrThrow({ where: { email: '7183255722@untrm.edu.pe' } })).id;
    const tutorRole = await prisma.role.findFirstOrThrow({ where: { name: 'Docente Tutor' } });
    tutorId = await accountWith('tutor', tutorRole.id);

    const make = async (schoolId: string, data: Record<string, unknown> = {}) => {
      const row = await prisma.certificate.create({ data: { periodId, schoolId, tutorId, createdById: adminId, ...data } as never });
      certificateIds.push(row.id);
      return row.id;
    };
    // Un mismo docente solo puede tener un trámite vigente por escuela y periodo: la escuela A tiene uno vigente y uno anulado.
    certAVoided = await make(schoolA.id, { status: 'ANULADO', voidReason: 'Prueba de consulta', voidedById: adminId, voidedAt: new Date() });
    certA = await make(schoolA.id, { status: 'EN_REVISION' });
    certB = await make(schoolB.id, { status: 'INICIADO' });
    await prisma.certificateEvidence.create({ data: { certificateId: certA, kind: 'ACEPTACION', result: 'CONFORME', reviewedById: adminId, reviewedAt: new Date() } });
    await prisma.certificateEvidence.create({ data: { certificateId: certA, kind: 'SESIONES' } });

    const viewerRole = await roleWith('consulta', ['certificados:consultar']);
    const schoolAId = await accountWith('escuela-a', viewerRole);
    const facultyId = await accountWith('facultad', viewerRole);
    const noScopeId = await accountWith('sin-alcance', viewerRole);
    const ownId = await accountWith('propio', viewerRole);
    await prisma.userAccessPolicy.createMany({
      data: [
        { userId: schoolAId, roleId: viewerRole, kind: 'SCHOOLS', schoolIds: [schoolA.id] },
        { userId: facultyId, roleId: viewerRole, kind: 'FACULTIES', facultyIds: [schoolB.facultyId] },
        { userId: ownId, roleId: viewerRole, kind: 'OWN' },
      ],
    });
    // Rol con otros permisos pero sin los de certificados.
    const noPermRole = await roleWith('sin-permiso', ['students:read']);
    await accountWith('sin-permiso', noPermRole);
    void noScopeId;

    const { default: app } = await import('../../src/app');
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    const address = listening.address();
    if (!address || typeof address === 'string') throw new Error('No address');
    baseUrl = `http://localhost:${address.port}`;
    tokens.admin = await login('7183255722@untrm.edu.pe', 'Admin2026!');
    tokens.schoolA = await login(`cert-escuela-a-${stamp}@untrm.edu.pe`, DEMO_PASSWORD);
    tokens.faculty = await login(`cert-facultad-${stamp}@untrm.edu.pe`, DEMO_PASSWORD);
    tokens.noScope = await login(`cert-sin-alcance-${stamp}@untrm.edu.pe`, DEMO_PASSWORD);
    tokens.ownScope = await login(`cert-propio-${stamp}@untrm.edu.pe`, DEMO_PASSWORD);
    tokens.noPermission = await login(`cert-sin-permiso-${stamp}@untrm.edu.pe`, DEMO_PASSWORD);
  });

  afterAll(async () => {
    const running = server;
    if (running) await new Promise((resolve) => running.close(resolve));
    if (dbUp) {
      await prisma.certificateEvidence.deleteMany({ where: { certificateId: { in: certificateIds } } });
      await prisma.certificate.deleteMany({ where: { id: { in: certificateIds } } });
      await prisma.userAccessPolicy.deleteMany({ where: { userId: { in: userIds } } });
      await removeOwnUserTraces(prisma, userIds);
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await prisma.rolePermission.deleteMany({ where: { roleId: { in: roleIds } } });
      await prisma.role.deleteMany({ where: { id: { in: roleIds } } });
      await prisma.academicPeriod.deleteMany({ where: { id: periodId } });
      await prisma.school.deleteMany({ where: { id: { in: schoolIds } } });
      await prisma.faculty.deleteMany({ where: { id: { in: facultyIds } } });
    }
    await prisma.$disconnect();
  });

  const guard = (fn: () => Promise<void>) => async () => {
    if (!dbUp) return;
    await fn();
  };

  describe('permiso', () => {
    it('sin sesión responde 401', guard(async () => {
      expect((await call('/certificates', null)).status).toBe(401);
      expect((await call(`/certificates/${certA}`, null)).status).toBe(401);
    }));

    it('una cuenta sin `certificados:consultar` recibe 403 en la lista y en el detalle', guard(async () => {
      expect((await call('/certificates', 'noPermission')).status).toBe(403);
      expect((await call(`/certificates/${certA}`, 'noPermission')).status).toBe(403);
    }));

    it('los permisos nuevos existen en el catálogo y la administración los tiene todos', guard(async () => {
      const codes = ['registrar', 'aprobar', 'emitir', 'consultar', 'descargar', 'administrar'].map((c) => `certificados:${c}`);
      const rows = await prisma.permission.findMany({ where: { code: { in: codes } } });
      expect(rows).toHaveLength(6);
      const adminRole = await prisma.role.findFirstOrThrow({ where: { name: 'Administrador DBU' }, include: { permissions: true } });
      const adminPermissionIds = new Set(adminRole.permissions.map((p) => p.permissionId));
      for (const row of rows) expect(adminPermissionIds.has(row.id)).toBe(true);
    }));

    it('el Coordinador y el Docente Tutor base no reciben permisos de certificación', guard(async () => {
      for (const name of ['Coordinador', 'Docente Tutor', 'Tutorado', 'Profesional de Servicio', 'Vicerrectorado', 'Decano']) {
        const role = await prisma.role.findFirstOrThrow({ where: { name }, include: { permissions: { include: { permission: true } } } });
        expect(role.permissions.filter((p) => p.permission.code.startsWith('certificados:')).map((p) => p.permission.code)).toEqual([]);
      }
    }));
  });

  describe('alcance', () => {
    it('la administración ve todos los trámites', guard(async () => {
      const ids = await listIds('admin');
      expect(ids).toEqual(expect.arrayContaining([certA, certB, certAVoided]));
    }));

    it('con alcance de una escuela solo ve los de esa escuela', guard(async () => {
      const ids = await listIds('schoolA');
      expect(ids).toEqual(expect.arrayContaining([certA, certAVoided]));
      expect(ids).not.toContain(certB);
    }));

    it('con alcance de una facultad ve las escuelas de esa facultad y no las de otra', guard(async () => {
      const ids = await listIds('faculty');
      expect(ids).toContain(certB);
      expect(ids).not.toContain(certA);
    }));

    it('pedir por filtro una escuela fuera del alcance no la abre: la lista llega vacía', guard(async () => {
      expect(await listIds('schoolA', `?schoolId=${schoolB.id}&periodId=${periodId}`)).toEqual([]);
      expect(await listIds('faculty', `?schoolId=${schoolA.id}&periodId=${periodId}`)).toEqual([]);
      // El mismo filtro dentro del alcance sí devuelve.
      expect(await listIds('schoolA', `?schoolId=${schoolA.id}&periodId=${periodId}`)).toEqual(expect.arrayContaining([certA]));
    }));

    it('el detalle de un trámite ajeno responde 404, igual que uno que no existe', guard(async () => {
      const foreign = await call(`/certificates/${certB}`, 'schoolA');
      const missing = await call(`/certificates/${UNKNOWN_ID}`, 'schoolA');
      const malformed = await call('/certificates/no-es-un-uuid', 'schoolA');
      expect([foreign.status, missing.status, malformed.status]).toEqual([404, 404, 404]);
      expect(await json(foreign)).toEqual(await json(missing));
    }));

    it('con permiso pero sin alcance (ninguno, o solo los propios estudiantes) recibe 403', guard(async () => {
      for (const who of ['noScope', 'ownScope'] as Who[]) {
        expect((await call('/certificates', who)).status).toBe(403);
        expect((await call(`/certificates/${certA}`, who)).status).toBe(403);
      }
    }));
  });

  describe('contenido', () => {
    it('filtra por periodo y por estado, y rechaza un estado que no existe', guard(async () => {
      expect(await listIds('admin', `?periodId=${periodId}&status=ANULADO`)).toEqual([certAVoided]);
      expect((await listIds('admin', `?periodId=${periodId}`)).sort()).toEqual([certA, certB, certAVoided].sort());
      expect((await call('/certificates?status=INVENTADO', 'admin')).status).toBe(400);
      expect((await call('/certificates?periodId=no-uuid', 'admin')).status).toBe(400);
    }));

    it('el detalle trae los nombres y las evidencias, sin datos internos', guard(async () => {
      const body = await json(await call(`/certificates/${certA}`, 'schoolA'));
      const c = body.certificate;
      expect(c).toMatchObject({ id: certA, status: 'EN_REVISION', isDemo: true, number: null, schoolId: schoolA.id, tutorId, hasUnsignedPdf: false });
      expect(c.tutorName).toContain('Cuenta');
      expect(c.periodName).toContain('Prueba consulta certificados');
      expect(c.evidences).toHaveLength(2);
      expect(c.evidences[0]).toMatchObject({ kind: 'ACEPTACION', result: 'CONFORME', reviewedByName: expect.any(String) });
      expect(c.evidences[1]).toMatchObject({ kind: 'SESIONES', result: 'PENDIENTE', reviewedByName: null });
      // Nada del PDF ni de los datos congelados sale por la consulta.
      for (const key of ['snapshot', 'unsignedStorageKey', 'unsignedSha256', 'storageKey']) expect(c).not.toHaveProperty(key);
    }));

    it('un trámite anulado conserva su motivo', guard(async () => {
      const c = (await json(await call(`/certificates/${certAVoided}`, 'admin'))).certificate;
      expect(c).toMatchObject({ status: 'ANULADO', voidReason: 'Prueba de consulta' });
      expect(c.voidedAt).toEqual(expect.any(String));
    }));
  });
});
