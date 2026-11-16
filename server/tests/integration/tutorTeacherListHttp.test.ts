import http from 'http';
import { prisma } from '../../src/infrastructure/database/prisma';
import { TEST_PERIOD_CREATED_AT } from '../helpers/currentPeriod';
import { DEMO_PASSWORD, removeOwnUserTraces } from '../helpers/ownUsers';

/**
 * Lista de docentes tutores de un periodo por HTTP real y base real de pruebas: designación, trámite de certificación, filtros, y el
 * permiso y el alcance por escuela (mismos que los certificados). Datos PROPIOS (periodo, escuelas, roles, cuentas, designaciones y
 * trámites que crea y borra). Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(180_000);

const stamp = String(Date.now());

type Who = 'admin' | 'schoolA' | 'noScope' | 'noPermission';
interface Row {
  tutorId: string;
  tutorName: string;
  schoolId: string | null;
  schoolName: string;
  cycles: { cycle: number; acceptance: string }[];
  acceptance: string;
  certificateId: string | null;
  certificateStatus: string | null;
  canStartCertificate: boolean;
}

describe('lista de docentes tutores: designación, trámite, filtros, permiso y alcance', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  const tokens = {} as Record<Who, string>;
  let periodId = '';
  let adminId = '';
  const schoolIds: string[] = [];
  const facultyIds: string[] = [];
  const roleIds: string[] = [];
  const userIds: string[] = [];
  const certificateIds: string[] = [];
  const t = {} as Record<'accepted' | 'pending' | 'expired' | 'none' | 'declined' | 'otherSchool', string>;

  const call = (path: string, who: Who | null) => fetch(`${baseUrl}/api${path}`, { headers: who ? { Authorization: `Bearer ${tokens[who]}` } : {} });
  const json = async (res: Response) => (await res.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** Solo las filas de los docentes de esta prueba: la base de pruebas trae otros docentes sembrados. */
  const rows = async (who: Who, query = ''): Promise<Row[]> => {
    const res = await call(`/tutor-teachers?periodId=${periodId}${query}`, who);
    expect(res.status).toBe(200);
    return ((await json(res)).teachers as Row[]).filter((r) => r.tutorName.includes(stamp));
  };
  const byName = (list: Row[], key: keyof typeof t) => list.find((r) => r.tutorId === t[key]);

  async function roleWith(label: string, codes: string[]): Promise<string> {
    const role = await prisma.role.create({ data: { name: `Rol docentes ${label} ${stamp}`, description: 'Rol ficticio de prueba' } });
    roleIds.push(role.id);
    const permissions = await prisma.permission.findMany({ where: { code: { in: codes } } });
    expect(permissions).toHaveLength(codes.length);
    await prisma.rolePermission.createMany({ data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })) });
    return role.id;
  }

  async function account(label: string, roleId: string, extra: { firstName?: string; schoolId?: string } = {}): Promise<string> {
    const hash = (await prisma.user.findFirstOrThrow({ where: { email: 'elena.ramirez@untrm.edu.pe' } })).passwordHash;
    const user = await prisma.user.create({
      data: { email: `docentes-${label}-${stamp}@untrm.edu.pe`, passwordHash: hash, firstName: extra.firstName ?? 'Cuenta', lastName: `Docentes ${label} ${stamp}`, roleId, schoolId: extra.schoolId },
    });
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
      console.warn('Sin base de datos: se omite la prueba HTTP de la lista de docentes tutores.');
      return;
    }
    const reference = await prisma.school.findFirstOrThrow({ where: { name: 'Ingeniería de Sistemas' } });
    for (const label of ['A', 'B']) {
      const faculty = await prisma.faculty.create({ data: { name: `Facultad docentes ${label} ${stamp}` } });
      facultyIds.push(faculty.id);
      const school = await prisma.school.create({ data: { name: `Escuela docentes ${label} ${stamp}`, facultyId: faculty.id, campusId: reference.campusId } });
      schoolIds.push(school.id);
    }
    const [schoolA, schoolB] = [schoolIds[0]!, schoolIds[1]!];
    periodId = (await prisma.academicPeriod.create({ data: { name: `Prueba docentes tutores ${stamp}`, startDate: new Date('2026-01-05'), endDate: new Date('2026-06-30'), isActive: true, createdAt: TEST_PERIOD_CREATED_AT } })).id;
    adminId = (await prisma.user.findFirstOrThrow({ where: { email: '7183255722@untrm.edu.pe' } })).id;
    const tutorRole = await prisma.role.findFirstOrThrow({ where: { name: 'Docente Tutor' } });

    // «Óscar» lleva tilde: la búsqueda por nombre no debe distinguirla.
    t.accepted = await account('aceptada', tutorRole.id, { firstName: 'Óscar', schoolId: schoolA });
    t.pending = await account('pendiente', tutorRole.id, { schoolId: schoolA });
    t.expired = await account('vencida', tutorRole.id, { schoolId: schoolA });
    t.declined = await account('rechazada', tutorRole.id, { schoolId: schoolA });
    t.none = await account('sin-asignacion', tutorRole.id, { schoolId: schoolA });
    t.otherSchool = await account('otra-escuela', tutorRole.id, { schoolId: schoolB });

    const assign = (tutorId: string, schoolId: string, cycle: number, data: Record<string, unknown>) =>
      prisma.cycleTutorAssignment.create({ data: { periodId, schoolId, cycle, tutorId, assignedById: adminId, ...data } as never });
    await assign(t.accepted, schoolA, 1, { acceptanceStatus: 'ACEPTADA' });
    await assign(t.accepted, schoolA, 2, { acceptanceStatus: 'PENDIENTE', acceptanceExpiresAt: new Date(Date.now() + 86_400_000) });
    await assign(t.pending, schoolA, 3, { acceptanceStatus: 'PENDIENTE', acceptanceExpiresAt: new Date(Date.now() + 86_400_000) });
    await assign(t.expired, schoolA, 4, { acceptanceStatus: 'PENDIENTE', acceptanceExpiresAt: new Date(Date.now() - 3_600_000) });
    await assign(t.declined, schoolA, 5, { acceptanceStatus: 'RECHAZADA', declineReason: 'Prueba' });
    await assign(t.otherSchool, schoolB, 1, { acceptanceStatus: 'ACEPTADA' });
    const cert = await prisma.certificate.create({ data: { periodId, schoolId: schoolB, tutorId: t.otherSchool, createdById: adminId, status: 'EN_REVISION' } as never });
    certificateIds.push(cert.id);

    const viewerRole = await roleWith('consulta', ['certificados:consultar']);
    const viewerA = await account('lector-a', viewerRole);
    await account('sin-alcance', viewerRole);
    await prisma.userAccessPolicy.create({ data: { userId: viewerA, roleId: viewerRole, kind: 'SCHOOLS', schoolIds: [schoolA] } });
    await account('sin-permiso', await roleWith('sin-permiso', ['students:read']));

    const { default: app } = await import('../../src/app');
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    const address = listening.address();
    if (!address || typeof address === 'string') throw new Error('No address');
    baseUrl = `http://localhost:${address.port}`;
    tokens.admin = await login('7183255722@untrm.edu.pe', 'Admin2026!');
    tokens.schoolA = await login(`docentes-lector-a-${stamp}@untrm.edu.pe`, DEMO_PASSWORD);
    tokens.noScope = await login(`docentes-sin-alcance-${stamp}@untrm.edu.pe`, DEMO_PASSWORD);
    tokens.noPermission = await login(`docentes-sin-permiso-${stamp}@untrm.edu.pe`, DEMO_PASSWORD);
  });

  afterAll(async () => {
    const running = server;
    if (running) await new Promise((resolve) => running.close(resolve));
    if (dbUp) {
      await prisma.certificateEvidence.deleteMany({ where: { certificateId: { in: certificateIds } } });
      await prisma.certificate.deleteMany({ where: { id: { in: certificateIds } } });
      await prisma.cycleTutorAssignment.deleteMany({ where: { periodId } });
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

  it('sin sesión 401; sin `certificados:consultar` 403; con permiso pero sin escuelas 403', guard(async () => {
    expect((await call(`/tutor-teachers?periodId=${periodId}`, null)).status).toBe(401);
    expect((await call(`/tutor-teachers?periodId=${periodId}`, 'noPermission')).status).toBe(403);
    expect((await call(`/tutor-teachers?periodId=${periodId}`, 'noScope')).status).toBe(403);
  }));

  it('distingue sin asignación, pendiente, vencida, aceptada y rechazada, con los ciclos de cada docente', guard(async () => {
    const list = await rows('admin');
    expect(list).toHaveLength(6);
    expect(byName(list, 'none')).toMatchObject({ acceptance: 'SIN_ASIGNACION', cycles: [], canStartCertificate: false, certificateStatus: null });
    expect(byName(list, 'pending')).toMatchObject({ acceptance: 'PENDIENTE', cycles: [{ cycle: 3, acceptance: 'PENDIENTE' }] });
    expect(byName(list, 'expired')).toMatchObject({ acceptance: 'VENCIDA', cycles: [{ cycle: 4, acceptance: 'VENCIDA' }] });
    expect(byName(list, 'declined')).toMatchObject({ acceptance: 'RECHAZADA' });
    // Dos ciclos, uno aceptado y otro pendiente: el resumen pide atención (pendiente) y los ciclos se ven uno por uno.
    expect(byName(list, 'accepted')).toMatchObject({ acceptance: 'PENDIENTE', cycles: [{ cycle: 1, acceptance: 'ACEPTADA' }, { cycle: 2, acceptance: 'PENDIENTE' }], canStartCertificate: true });
  }));

  it('muestra el estado del trámite y no permite iniciar otro mientras hay uno vigente', guard(async () => {
    const other = byName(await rows('admin'), 'otherSchool');
    expect(other).toMatchObject({ acceptance: 'ACEPTADA', certificateStatus: 'EN_REVISION', canStartCertificate: false });
    expect(other?.certificateId).toBe(certificateIds[0]);
    expect(other?.schoolName).toContain(`Escuela docentes B ${stamp}`);
  }));

  it('un trámite anulado no cuenta como vigente: se ve su estado y se puede iniciar otro', guard(async () => {
    await prisma.certificate.update({ where: { id: certificateIds[0]! }, data: { status: 'ANULADO', voidReason: 'Prueba de lista', voidedById: adminId, voidedAt: new Date() } });
    try {
      expect(byName(await rows('admin'), 'otherSchool')).toMatchObject({ certificateStatus: 'ANULADO', canStartCertificate: true });
    } finally {
      await prisma.certificate.update({ where: { id: certificateIds[0]! }, data: { status: 'EN_REVISION', voidReason: null, voidedById: null, voidedAt: null } });
    }
  }));

  it('filtra por escuela, por estado de la designación, por estado del trámite y por nombre sin distinguir tildes', guard(async () => {
    const [schoolA, schoolB] = schoolIds as [string, string];
    expect((await rows('admin', `&schoolId=${schoolB}`)).map((r) => r.tutorId)).toEqual([t.otherSchool]);
    expect((await rows('admin', `&schoolId=${schoolA}`)).map((r) => r.tutorId).sort()).toEqual([t.accepted, t.pending, t.expired, t.declined, t.none].sort());
    expect((await rows('admin', '&status=SIN_ASIGNACION')).map((r) => r.tutorId)).toEqual([t.none]);
    expect((await rows('admin', '&status=VENCIDA')).map((r) => r.tutorId)).toEqual([t.expired]);
    expect((await rows('admin', '&certificateStatus=EN_REVISION')).map((r) => r.tutorId)).toEqual([t.otherSchool]);
    expect((await rows('admin', '&certificateStatus=SIN_TRAMITE')).map((r) => r.tutorId).sort()).toEqual([t.accepted, t.pending, t.expired, t.declined, t.none].sort());
    expect((await rows('admin', `&q=${encodeURIComponent('oscar')}`)).map((r) => r.tutorId)).toEqual([t.accepted]);
    expect((await rows('admin', `&q=${encodeURIComponent('ÓSCAR')}`)).map((r) => r.tutorId)).toEqual([t.accepted]);
  }));

  it('el alcance por escuela se aplica en el servidor: la otra escuela no llega ni pidiéndola por filtro', guard(async () => {
    const [schoolA, schoolB] = schoolIds as [string, string];
    const list = await rows('schoolA');
    expect(list.map((r) => r.tutorId).sort()).toEqual([t.accepted, t.pending, t.expired, t.declined, t.none].sort());
    expect(list.every((r) => r.schoolId === schoolA)).toBe(true);
    expect(await rows('schoolA', `&schoolId=${schoolB}`)).toEqual([]);
    const raw = JSON.stringify(((await json(await call(`/tutor-teachers?periodId=${periodId}&schoolId=${schoolB}`, 'schoolA'))).teachers as Row[]));
    expect(raw).not.toContain(t.otherSchool);
    expect(raw).not.toContain(certificateIds[0]!);
  }));

  it('no entrega correo ni datos internos de las cuentas', guard(async () => {
    const body = JSON.stringify(await json(await call(`/tutor-teachers?periodId=${periodId}`, 'admin')));
    expect(body).not.toMatch(/passwordHash|@untrm\.edu\.pe/);
  }));

  it('rechaza un periodo inexistente o mal formado y un estado inventado con 400', guard(async () => {
    expect((await call('/tutor-teachers?periodId=00000000-0000-4000-8000-000000000000', 'admin')).status).toBe(400);
    expect((await call('/tutor-teachers?periodId=nada', 'admin')).status).toBe(400);
    expect((await call('/tutor-teachers', 'admin')).status).toBe(400);
    expect((await call(`/tutor-teachers?periodId=${periodId}&status=INVENTADO`, 'admin')).status).toBe(400);
    expect((await call(`/tutor-teachers?periodId=${periodId}&certificateStatus=INVENTADO`, 'admin')).status).toBe(400);
  }));
});
