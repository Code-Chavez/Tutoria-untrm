import http from 'http';
import app from '../../src/app';
import { prisma } from '../../src/infrastructure/database/prisma';
import { currentPeriodId } from '../helpers/currentPeriod';
import { DEMO_PASSWORD, ownUser, removeOwnUserTraces } from '../helpers/ownUsers';

/**
 * Tutor por ciclo (fase 3b) sobre HTTP real y base de datos real: la coordinación fija un tutor por ciclo de su escuela, los
 * matriculados pasan a él, un docente no atiende dos ciclos sin una excepción registrada, ni un tercero aun con excepción, y quien
 * se carga después queda con el tutor del ciclo.
 *
 * Datos EXCLUSIVOS de cada corrida: dos escuelas propias (la segunda sirve de «escuela ajena»), dos coordinaciones propias (con las
 * que inicia sesión: no se usa ninguna cuenta de demostración), docentes propios y estudiantes propios, con nombres que llevan la
 * marca de la corrida. Ninguna asignación de ciclo preexistente (de las escuelas del sistema o de
 * una demostración) se lee como condición ni se toca: la prueba lo comprueba al final comparando una foto de las asignaciones ajenas.
 * Se limpia SOLO lo creado aquí, también cuando una prueba falla (afterAll). Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(180_000);

type Who = 'sistemas' | 'mecanica'; // coordinación de la escuela propia A / de la escuela propia B (cuentas propias de la corrida)

const stamp = String(Date.now());
const CODES = [`9920${stamp.slice(-6)}`, `9921${stamp.slice(-6)}`, `9922${stamp.slice(-6)}`];

describe('tutor por ciclo (fase 3b)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  const tokens = {} as Record<Who, string>;
  let periodId = '';
  let schoolA = ''; // escuela propia donde se trabaja
  let schoolB = ''; // escuela propia «ajena»
  let tutorA1 = '';
  let tutorA2 = '';
  let tutorOther = ''; // docente de la escuela ajena
  const ownUserIds: string[] = [];
  const ownSchoolIds: string[] = [];
  let foreignBefore = '';
  let foreignIds: string[] = [];
  const credentials = {} as Record<Who, { email: string; password: string }>;

  const call = (method: string, path: string, who: Who, body?: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${tokens[who]}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  const cyclePath = (cycle: number) => `/api/schools/${schoolA}/cycle-tutors/${cycle}`;
  /**
   * Foto de las asignaciones de ciclo preexistentes (las que NO son de esta corrida) en el momento de empezar. Otras suites pueden
   * correr a la vez y crear las suyas en sus propias escuelas: esas no son preexistentes y no se comparan; las de la foto deben
   * seguir existiendo, sin cambios.
   */
  const snapshotOf = async (ids?: string[]) =>
    JSON.stringify(
      (await prisma.cycleTutorAssignment.findMany({ where: { schoolId: { notIn: ownSchoolIds }, ...(ids ? { id: { in: ids } } : {}) }, orderBy: { id: 'asc' } })).map((a) => [
        a.id,
        a.schoolId,
        a.cycle,
        a.tutorId,
        a.isException,
        a.acceptanceStatus,
      ]),
    );

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
    periodId = await currentPeriodId(prisma);

    // Escuelas propias (misma facultad que Sistemas), con las coordinaciones de la prueba
    const sistemas = await prisma.school.findFirstOrThrow({ where: { name: 'Ingeniería de Sistemas' } });
    const school = async (name: string) => {
      const id = (await prisma.school.create({ data: { name, facultyId: sistemas.facultyId, campusId: sistemas.campusId } })).id;
      ownSchoolIds.push(id);
      return id;
    };
    schoolA = await school(`Escuela de prueba de ciclos A ${stamp}`);
    schoolB = await school(`Escuela de prueba de ciclos B ${stamp}`);
    // Coordinaciones propias: la A coordina la escuela A; la B, la B (para comprobar que una coordinación ajena se rechaza)
    const coordinator = async (suffix: 'a' | 'b', schoolId: string) => {
      const email = `ciclos-${stamp}-coord-${suffix}@untrm.edu.pe`;
      const id = await ownUser(prisma, { email, roleName: 'Coordinador', firstName: 'Coordinación', lastName: `Ciclos ${suffix.toUpperCase()} ${stamp}` });
      ownUserIds.push(id);
      await prisma.school.update({ where: { id: schoolId }, data: { coordinatorId: id } });
      return email;
    };
    credentials.sistemas = { email: await coordinator('a', schoolA), password: DEMO_PASSWORD };
    credentials.mecanica = { email: await coordinator('b', schoolB), password: DEMO_PASSWORD };
    for (const who of Object.keys(credentials) as Who[]) {
      const res = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials[who]) });
      tokens[who] = ((await res.json()) as { data: { accessToken: string } }).data.accessToken;
    }

    // Docentes propios (la cuenta nace con la clave de una cuenta de demostración, solo para existir; no inicia sesión)
    const teacher = async (suffix: string, schoolId: string) => {
      const id = await ownUser(prisma, { email: `ciclos-${stamp}-${suffix}@untrm.edu.pe`, roleName: 'Docente Tutor', firstName: 'Docente', lastName: `Ciclos ${suffix} ${stamp}`, schoolId });
      ownUserIds.push(id);
      return id;
    };
    tutorA1 = await teacher('a1', schoolA);
    tutorA2 = await teacher('a2', schoolA);
    tutorOther = await teacher('otra', schoolB);

    // Dos matriculados del ciclo 10 sin tutor, en la escuela propia
    for (const code of CODES.slice(0, 2)) {
      const student = await prisma.student.create({ data: { studentCode: code, firstName: 'Ciclo', lastName: `Prueba ${code}`, cycle: 10, schoolId: schoolA } });
      await prisma.periodEnrollment.create({ data: { periodId, studentId: student.id, schoolId: schoolA, cycle: 10 } });
    }
    foreignBefore = await snapshotOf();
    foreignIds = (JSON.parse(foreignBefore) as string[][]).map((row) => row[0]);
  });

  afterAll(async () => {
    const running = server;
    if (running) await new Promise((resolve) => running.close(resolve));
    if (dbUp) {
      // Solo lo creado en esta corrida (también si una prueba falló a medias): asignaciones de sus escuelas, sus estudiantes, sus
      // docentes, sus escuelas y lo que dejó la bitácora sobre ellos.
      const students = await prisma.student.findMany({ where: { studentCode: { in: CODES } }, select: { id: true } });
      const studentIds = students.map((s) => s.id);
      const assignmentIds = (await prisma.cycleTutorAssignment.findMany({ where: { schoolId: { in: ownSchoolIds } }, select: { id: true } })).map((a) => a.id);
      await prisma.cycleTutorAssignment.deleteMany({ where: { schoolId: { in: ownSchoolIds } } });
      await prisma.tutorAssignmentHistory.deleteMany({ where: { studentId: { in: studentIds } } });
      await prisma.student.deleteMany({ where: { id: { in: studentIds } } }); // arrastra su matrícula
      await removeOwnUserTraces(prisma, ownUserIds, [...ownSchoolIds, ...studentIds, ...assignmentIds]);
      await prisma.school.updateMany({ where: { id: { in: ownSchoolIds } }, data: { coordinatorId: null } });
      await prisma.user.deleteMany({ where: { id: { in: ownUserIds } } });
      await prisma.school.deleteMany({ where: { id: { in: ownSchoolIds } } });
    }
    await prisma.$disconnect();
  });

  it('la coordinación fija el tutor del ciclo y los matriculados sin tutor pasan a él', async () => {
    if (!dbUp) return;
    const res = await call('PUT', cyclePath(10), 'sistemas', { tutorId: tutorA1 });

    expect(res.status).toBe(200);
    expect(((await res.json()) as { assigned: number }).assigned).toBe(2);
    const students = await prisma.student.findMany({ where: { studentCode: { in: CODES.slice(0, 2) } } });
    expect(students.every((s) => s.tutorId === tutorA1)).toBe(true);

    const list = (await (await call('GET', `/api/schools/${schoolA}/cycle-tutors`, 'sistemas')).json()) as { cycles: { cycle: number; assignment: { tutorId: string } | null; enrolled: number }[] };
    expect(list.cycles).toHaveLength(10);
    expect(list.cycles[9]).toMatchObject({ cycle: 10, assignment: { tutorId: tutorA1 }, enrolled: 2 });
  });

  it('quien se carga después en ese ciclo queda con el tutor del ciclo', async () => {
    if (!dbUp) return;
    const created = await call('POST', '/api/students', 'sistemas', { studentCode: CODES[2], firstName: 'Cargado', lastName: 'Después Prueba', cycle: 10, schoolId: schoolA });
    expect(created.status).toBe(201);

    expect((await prisma.student.findUniqueOrThrow({ where: { studentCode: CODES[2] } })).tutorId).toBe(tutorA1);
  });

  it('un docente no atiende dos ciclos: se rechaza, y con la excepción y su motivo se registra', async () => {
    if (!dbUp) return;
    const rejected = await call('PUT', cyclePath(8), 'sistemas', { tutorId: tutorA1 });
    expect(rejected.status).toBe(409);
    expect(await rejected.json()).toMatchObject({ code: 'TUTOR_HAS_CYCLE', otherCycles: [10] });

    expect((await call('PUT', cyclePath(8), 'sistemas', { tutorId: tutorA1, isException: true, note: '  ' })).status).toBe(400);
    const ok = await call('PUT', cyclePath(8), 'sistemas', { tutorId: tutorA1, isException: true, note: 'Aceptó por correo asumir el ciclo 8' });
    expect(ok.status).toBe(200);
    expect(await prisma.cycleTutorAssignment.findUnique({ where: { periodId_schoolId_cycle: { periodId, schoolId: schoolA, cycle: 8 } } })).toMatchObject({ isException: true });
  });

  it('el máximo es de dos ciclos por docente: un tercero se rechaza aun con la excepción y su motivo', async () => {
    if (!dbUp) return;
    // tutorA1 ya atiende los ciclos 10 y 8 (este último por excepción)
    const third = await call('PUT', cyclePath(7), 'sistemas', { tutorId: tutorA1, isException: true, note: 'Intento de un tercer ciclo' });
    expect(third.status).toBe(400);
    expect(((await third.json()) as { error: string }).error).toMatch(/dos ciclos/);
    expect(await prisma.cycleTutorAssignment.findUnique({ where: { periodId_schoolId_cycle: { periodId, schoolId: schoolA, cycle: 7 } } })).toBeNull();
    expect(await prisma.cycleTutorAssignment.count({ where: { periodId, schoolId: schoolA, tutorId: tutorA1 } })).toBe(2);
  });

  it('cambiar el tutor del ciclo mueve a sus estudiantes con historial', async () => {
    if (!dbUp) return;
    const res = await call('PUT', cyclePath(10), 'sistemas', { tutorId: tutorA2 });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { moved: number }).moved).toBe(3);

    const student = await prisma.student.findUniqueOrThrow({ where: { studentCode: CODES[0] } });
    expect(student.tutorId).toBe(tutorA2);
    expect(await prisma.tutorAssignmentHistory.count({ where: { studentId: student.id, previousTutorId: tutorA1, newTutorId: tutorA2 } })).toBe(1);
  });

  it('solo tutores de la escuela y solo su coordinación: un docente de otra escuela o un coordinador ajeno se rechazan', async () => {
    if (!dbUp) return;
    expect((await call('PUT', cyclePath(9), 'sistemas', { tutorId: tutorOther })).status).toBe(409);
    expect((await call('PUT', cyclePath(9), 'mecanica', { tutorId: tutorA1 })).status).toBe(403);
    expect((await call('GET', `/api/schools/${schoolA}/cycle-tutors`, 'mecanica')).status).toBe(403);
    expect((await call('PUT', cyclePath(11), 'sistemas', { tutorId: tutorA1 })).status).toBe(400);
  });

  it('quitar al tutor del ciclo deja el ciclo sin tutor y no toca a los estudiantes', async () => {
    if (!dbUp) return;
    expect((await call('DELETE', cyclePath(8), 'sistemas')).status).toBe(200);
    expect((await call('DELETE', cyclePath(8), 'sistemas')).status).toBe(404);
    expect((await prisma.student.findUniqueOrThrow({ where: { studentCode: CODES[0] } })).tutorId).toBe(tutorA2);
  });

  it('las asignaciones preexistentes de otras escuelas (sistema o demostración) quedan intactas', async () => {
    if (!dbUp) return;
    expect(await snapshotOf(foreignIds)).toBe(foreignBefore);
  });
});
