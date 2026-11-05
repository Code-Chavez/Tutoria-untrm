import http from 'http';
import app from '../../src/app';
import { prisma } from '../../src/infrastructure/database/prisma';
import { removeOwnUserTraces } from '../helpers/ownUsers';

/**
 * Sedes y escuela del docente tutor (fase 3a) sobre HTTP real y base de datos real: Vicerrectorado configura las sedes y la sede
 * de cada escuela, un docente tutor se registra con su escuela y solo recibe estudiantes de ella. Usa registros propios (también
 * dos escuelas propias: no cambia la sede de ninguna escuela real) y los borra. Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(180_000);

const ACCOUNTS = {
  admin: { email: '7183255722@untrm.edu.pe', password: 'Admin2026!' },
  vice: { email: 'vicerrectorado.academico@untrm.edu.pe', password: 'Demo2026!' },
  coord: { email: 'rosa.mendoza@untrm.edu.pe', password: 'Demo2026!' },
} as const;
type Who = keyof typeof ACCOUNTS;

const stamp = String(Date.now());
const CAMPUS_NAME = `Sede Prueba ${stamp}`;
const STUDENT_CODE = `9910${stamp.slice(-6)}`;
const TUTOR_EMAIL = `tutor-sede-${stamp}@untrm.edu.pe`;
const NO_ID = '00000000-0000-4000-8000-000000000000';

describe('sedes y escuela del docente tutor (fase 3a)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  const tokens = {} as Record<Who, string>;
  let schoolSistemas = '';
  let schoolMecanica = '';
  let campusId = '';
  let studentId = '';
  let tutorId = '';

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
      console.warn('Sin base de datos: se omite la prueba de sedes.');
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
    // Dos escuelas propias (con la facultad y la sede de una real, que solo se lee): la prueba cambia la sede de la primera y asigna
    // un docente a la segunda, sin tocar ninguna escuela que no sea suya. Sus nombres no se usan en ninguna comprobación.
    const reference = await prisma.school.findFirstOrThrow({ where: { name: 'Ingeniería de Sistemas' } });
    const own = (name: string) => prisma.school.create({ data: { name: `${name} ${stamp}`, facultyId: reference.facultyId, campusId: reference.campusId } });
    schoolSistemas = (await own('Escuela de prueba de sedes A')).id;
    schoolMecanica = (await own('Escuela de prueba de sedes B')).id;
  });

  afterAll(async () => {
    const running = server;
    if (running) await new Promise((resolve) => running.close(resolve));
    if (dbUp) {
      // Solo lo creado en esta corrida (también si una prueba falló a medias), en el orden que piden las claves foráneas.
      const ownSchools = [schoolSistemas, schoolMecanica].filter(Boolean);
      const students = await prisma.student.findMany({ where: { studentCode: STUDENT_CODE }, select: { id: true } });
      const tutors = await prisma.user.findMany({ where: { email: TUTOR_EMAIL }, select: { id: true } });
      const campuses = await prisma.campus.findMany({ where: { name: CAMPUS_NAME }, select: { id: true } });
      const studentIds = students.map((s) => s.id);
      const tutorIds = tutors.map((t) => t.id);
      await prisma.tutorAssignmentHistory.deleteMany({ where: { studentId: { in: studentIds } } });
      await prisma.student.deleteMany({ where: { id: { in: studentIds } } });
      await removeOwnUserTraces(prisma, tutorIds, [...ownSchools, ...campuses.map((c) => c.id), ...studentIds]);
      await prisma.user.deleteMany({ where: { id: { in: tutorIds } } });
      await prisma.school.deleteMany({ where: { id: { in: ownSchools } } });
      await prisma.campus.deleteMany({ where: { id: { in: campuses.map((c) => c.id) } } });
    }
    await prisma.$disconnect();
  });

  it('la migración deja las tres sedes de la universidad y cada escuela en una sede', async () => {
    if (!dbUp) return;
    const names = (await prisma.campus.findMany()).map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining(['Sede Central', 'Sede Bagua', 'Sede Utcubamba']));
    expect(await prisma.school.count({ where: { campusId: null, isActive: true } })).toBe(0);
  });

  it('Vicerrectorado ve las sedes con las escuelas y su sede, sin acceso a los estudiantes', async () => {
    if (!dbUp) return;
    const res = await call('GET', '/api/campuses', 'vice');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { campuses: { name: string }[]; schools: { id: string; campusId: string | null }[] };
    expect(body.campuses.map((c) => c.name)).toContain('Sede Bagua');
    expect(body.schools.find((s) => s.id === schoolSistemas)).toBeDefined();

    expect((await call('GET', '/api/students', 'vice')).status).toBe(403);
  });

  it('la coordinación no administra las sedes', async () => {
    if (!dbUp) return;
    expect((await call('GET', '/api/campuses', 'coord')).status).toBe(403);
    expect((await call('POST', '/api/campuses', 'coord', { name: CAMPUS_NAME })).status).toBe(403);
    expect((await call('PUT', `/api/schools/${schoolSistemas}/campus`, 'coord', { campusId: NO_ID })).status).toBe(403);
  });

  it('Vicerrectorado crea una sede (sin repetir nombre), se la asigna a una escuela y la desactiva; todo queda en la bitácora', async () => {
    if (!dbUp) return;
    const created = await call('POST', '/api/campuses', 'vice', { name: CAMPUS_NAME });
    expect(created.status).toBe(201);
    campusId = ((await created.json()) as { campus: { id: string } }).campus.id;
    expect((await call('POST', '/api/campuses', 'admin', { name: CAMPUS_NAME })).status).toBe(409);
    expect((await call('POST', '/api/campuses', 'vice', { name: 'x' })).status).toBe(400);

    expect((await call('PUT', `/api/schools/${schoolSistemas}/campus`, 'vice', { campusId })).status).toBe(200);
    expect((await prisma.school.findUniqueOrThrow({ where: { id: schoolSistemas } })).campusId).toBe(campusId);

    expect((await call('PATCH', `/api/campuses/${campusId}`, 'vice', { isActive: false })).status).toBe(200);
    // Una sede inactiva ya no se puede asignar a otra escuela
    expect((await call('PUT', `/api/schools/${schoolMecanica}/campus`, 'vice', { campusId })).status).toBe(404);

    const actions = (await prisma.auditLog.findMany({ where: { entityId: { in: [campusId, schoolSistemas] } } })).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(['CAMPUS_CREATED', 'SCHOOL_CAMPUS_SET', 'CAMPUS_UPDATED']));
  });

  it('un docente tutor se registra con su escuela: sin ella (o con una que no existe) se rechaza', async () => {
    if (!dbUp) return;
    const tutorRole = await prisma.role.findUniqueOrThrow({ where: { name: 'Docente Tutor' } });
    const base = { email: TUTOR_EMAIL, firstName: 'Tutor', lastName: 'Sede Prueba', roleId: tutorRole.id };

    const without = await call('POST', '/api/users', 'admin', base);
    expect(without.status).toBe(400);
    expect(((await without.json()) as { error: string }).error).toMatch(/escuela/i);
    expect((await call('POST', '/api/users', 'admin', { ...base, schoolId: NO_ID })).status).toBe(400);

    const ok = await call('POST', '/api/users', 'admin', { ...base, schoolId: schoolMecanica });
    expect(ok.status).toBe(201);
    tutorId = ((await ok.json()) as { user: { id: string } }).user.id;
    expect((await prisma.user.findUniqueOrThrow({ where: { id: tutorId } })).schoolId).toBe(schoolMecanica);
  });

  it('solo recibe estudiantes de su escuela: otra escuela se rechaza (asignar y reasignar) y la suya se acepta', async () => {
    if (!dbUp) return;
    const student = await prisma.student.create({ data: { studentCode: STUDENT_CODE, firstName: 'Sin', lastName: 'Tutor Prueba', cycle: 3, schoolId: schoolSistemas } });
    studentId = student.id;

    const wrong = await call('POST', '/api/students/assign', 'admin', { tutorId, studentIds: [studentId] });
    expect(wrong.status).toBe(409);
    expect(((await wrong.json()) as { error: string }).error).toMatch(/otra escuela/);
    expect((await prisma.student.findUniqueOrThrow({ where: { id: studentId } })).tutorId).toBeNull();

    // El mismo tutor sí atiende a un estudiante de su escuela
    await prisma.student.update({ where: { id: studentId }, data: { schoolId: schoolMecanica } });
    const right = await call('POST', '/api/students/assign', 'admin', { tutorId, studentIds: [studentId] });
    expect(right.status).toBe(200);

    // Reasignar a un tutor de otra escuela (Elena, de Sistemas) tampoco
    const elena = await prisma.user.findUniqueOrThrow({ where: { email: 'elena.ramirez@untrm.edu.pe' } });
    const reassign = await call('PATCH', `/api/students/${studentId}/reassign`, 'admin', { newTutorId: elena.id, reason: 'Prueba automática' });
    expect(reassign.status).toBe(409);
    expect((await prisma.student.findUniqueOrThrow({ where: { id: studentId } })).tutorId).toBe(tutorId);
  });

  it('la carga de tutores informa la escuela de cada uno, para ofrecer solo los de la escuela del estudiante', async () => {
    if (!dbUp) return;
    const res = await call('GET', '/api/tutors/workload', 'admin');
    const tutors = ((await res.json()) as { tutors: { tutorId: string; schoolId: string | null }[] }).tutors;

    expect(tutors.find((t) => t.tutorId === tutorId)?.schoolId).toBe(schoolMecanica);
  });
});
