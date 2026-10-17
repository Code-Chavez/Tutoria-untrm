import http from 'http';
import app from '../../src/app';
import { prisma } from '../../src/infrastructure/database/prisma';

/**
 * Tutor por ciclo (fase 3b) sobre HTTP real y base de datos real: la coordinación fija un tutor por ciclo de su escuela, los
 * matriculados pasan a él, un docente no atiende dos ciclos sin una excepción registrada, y quien se carga después queda con el
 * tutor del ciclo. Usa el ciclo 10 y registros propios, y los borra. Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(180_000);

const ACCOUNTS = {
  admin: { email: '7183255722@untrm.edu.pe', password: 'Admin2026!' },
  sistemas: { email: 'rosa.mendoza@untrm.edu.pe', password: 'Demo2026!' },
  mecanica: { email: 'carlos.vega@untrm.edu.pe', password: 'Demo2026!' },
} as const;
type Who = keyof typeof ACCOUNTS;

const stamp = String(Date.now());
const CODES = [`9920${stamp.slice(-6)}`, `9921${stamp.slice(-6)}`, `9922${stamp.slice(-6)}`];

describe('tutor por ciclo (fase 3b)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  const tokens = {} as Record<Who, string>;
  let periodId = '';
  let schoolSistemas = '';
  let elenaId = '';
  let jorgeId = '';
  let patriciaId = '';

  const call = (method: string, path: string, who: Who, body?: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${tokens[who]}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  const cyclePath = (cycle: number) => `/api/schools/${schoolSistemas}/cycle-tutors/${cycle}`;

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba de tutor por ciclo.');
      return;
    }
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    const address = listening.address();
    if (!address || typeof address === 'string') throw new Error('No address');
    baseUrl = `http://localhost:${address.port}`;
    for (const who of Object.keys(ACCOUNTS) as Who[]) {
      const res = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ACCOUNTS[who]) });
      tokens[who] = ((await res.json()) as { data: { accessToken: string } }).data.accessToken;
    }
    periodId = (await prisma.academicPeriod.findFirstOrThrow({ where: { isActive: true } })).id;
    schoolSistemas = (await prisma.school.findFirstOrThrow({ where: { name: 'Ingeniería de Sistemas' } })).id;
    const id = async (email: string) => (await prisma.user.findUniqueOrThrow({ where: { email } })).id;
    elenaId = await id('elena.ramirez@untrm.edu.pe');
    jorgeId = await id('jorge.salazar@untrm.edu.pe');
    patriciaId = await id('patricia.nunez@untrm.edu.pe');
    // Dos matriculados del ciclo 10 sin tutor
    for (const code of CODES.slice(0, 2)) {
      const student = await prisma.student.create({ data: { studentCode: code, firstName: 'Ciclo', lastName: `Prueba ${code}`, cycle: 10, schoolId: schoolSistemas } });
      await prisma.periodEnrollment.create({ data: { periodId, studentId: student.id, schoolId: schoolSistemas, cycle: 10 } });
    }
  });

  afterAll(async () => {
    const running = server;
    if (running) await new Promise((resolve) => running.close(resolve));
    if (dbUp) {
      await prisma.cycleTutorAssignment.deleteMany({ where: { periodId, schoolId: schoolSistemas, cycle: { in: [8, 10] } } });
      const students = await prisma.student.findMany({ where: { studentCode: { in: CODES } }, select: { id: true } });
      const ids = students.map((s) => s.id);
      await prisma.tutorAssignmentHistory.deleteMany({ where: { studentId: { in: ids } } });
      await prisma.student.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.$disconnect();
  });

  it('la coordinación fija el tutor del ciclo y los matriculados sin tutor pasan a él', async () => {
    if (!dbUp) return;
    const res = await call('PUT', cyclePath(10), 'sistemas', { tutorId: elenaId });

    expect(res.status).toBe(200);
    expect(((await res.json()) as { assigned: number }).assigned).toBe(2);
    const students = await prisma.student.findMany({ where: { studentCode: { in: CODES.slice(0, 2) } } });
    expect(students.every((s) => s.tutorId === elenaId)).toBe(true);

    const list = (await (await call('GET', `/api/schools/${schoolSistemas}/cycle-tutors`, 'sistemas')).json()) as { cycles: { cycle: number; assignment: { tutorId: string } | null; enrolled: number }[] };
    expect(list.cycles).toHaveLength(10);
    expect(list.cycles[9]).toMatchObject({ cycle: 10, assignment: { tutorId: elenaId } });
    expect(list.cycles[9].enrolled).toBeGreaterThanOrEqual(2);
  });

  it('quien se carga después en ese ciclo queda con el tutor del ciclo', async () => {
    if (!dbUp) return;
    const created = await call('POST', '/api/students', 'sistemas', { studentCode: CODES[2], firstName: 'Cargado', lastName: 'Después Prueba', cycle: 10, schoolId: schoolSistemas });
    expect(created.status).toBe(201);

    expect((await prisma.student.findUniqueOrThrow({ where: { studentCode: CODES[2] } })).tutorId).toBe(elenaId);
  });

  it('un docente no atiende dos ciclos: se rechaza, y con la excepción y su motivo se registra', async () => {
    if (!dbUp) return;
    const rejected = await call('PUT', cyclePath(8), 'sistemas', { tutorId: elenaId });
    expect(rejected.status).toBe(409);
    expect(await rejected.json()).toMatchObject({ code: 'TUTOR_HAS_CYCLE', otherCycles: [10] });

    expect((await call('PUT', cyclePath(8), 'sistemas', { tutorId: elenaId, isException: true, note: '  ' })).status).toBe(400);
    const ok = await call('PUT', cyclePath(8), 'sistemas', { tutorId: elenaId, isException: true, note: 'Aceptó por correo asumir el ciclo 8' });
    expect(ok.status).toBe(200);
    expect(await prisma.cycleTutorAssignment.findUnique({ where: { periodId_schoolId_cycle: { periodId, schoolId: schoolSistemas, cycle: 8 } } })).toMatchObject({ isException: true });
  });

  it('cambiar el tutor del ciclo mueve a sus estudiantes con historial', async () => {
    if (!dbUp) return;
    const res = await call('PUT', cyclePath(10), 'sistemas', { tutorId: jorgeId });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { moved: number }).moved).toBeGreaterThanOrEqual(3);

    const student = await prisma.student.findUniqueOrThrow({ where: { studentCode: CODES[0] } });
    expect(student.tutorId).toBe(jorgeId);
    expect(await prisma.tutorAssignmentHistory.count({ where: { studentId: student.id, previousTutorId: elenaId, newTutorId: jorgeId } })).toBe(1);
  });

  it('solo tutores de la escuela y solo su coordinación: un docente de otra escuela o un coordinador ajeno se rechazan', async () => {
    if (!dbUp) return;
    expect((await call('PUT', cyclePath(9), 'sistemas', { tutorId: patriciaId })).status).toBe(409);
    expect((await call('PUT', cyclePath(9), 'mecanica', { tutorId: elenaId })).status).toBe(403);
    expect((await call('GET', `/api/schools/${schoolSistemas}/cycle-tutors`, 'mecanica')).status).toBe(403);
    expect((await call('PUT', cyclePath(11), 'sistemas', { tutorId: elenaId })).status).toBe(400);
  });

  it('quitar al tutor del ciclo deja el ciclo sin tutor y no toca a los estudiantes', async () => {
    if (!dbUp) return;
    expect((await call('DELETE', cyclePath(8), 'admin')).status).toBe(200);
    expect((await call('DELETE', cyclePath(8), 'admin')).status).toBe(404);
    expect((await prisma.student.findUniqueOrThrow({ where: { studentCode: CODES[0] } })).tutorId).toBe(jorgeId);
  });
});
