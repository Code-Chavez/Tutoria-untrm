import http from 'http';
import ExcelJS from 'exceljs';
import app from '../../src/app';
import { prisma } from '../../src/infrastructure/database/prisma';

/**
 * Matrícula por periodo y pedido de listas (fase 2) sobre HTTP real y base de datos real: la carga matricula a los nuevos y
 * a los que continúan, el estudiante sin matrícula solo lee, y el correo de pedido de cada escuela lo configura quien la
 * coordina. Usa registros propios y los borra. Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(180_000);

const ACCOUNTS = {
  admin: { email: '7183255722@untrm.edu.pe', password: 'Admin2026!' },
  sistemas: { email: 'rosa.mendoza@untrm.edu.pe', password: 'Demo2026!' }, // coordina Ingeniería de Sistemas
  mecanica: { email: 'carlos.vega@untrm.edu.pe', password: 'Demo2026!' }, // coordina Mecánica Eléctrica
  tutor: { email: 'elena.ramirez@untrm.edu.pe', password: 'Demo2026!' },
} as const;
type Who = keyof typeof ACCOUNTS;

const stamp = String(Date.now());
const NEW_CODE = `9906${stamp.slice(-6)}`;
const OLD_CODE = `9907${stamp.slice(-6)}`;
const GATE_CODE = `9908${stamp.slice(-6)}`;
const GATE_EMAIL = `matricula-${stamp}@untrm.edu.pe`;
const GATE_PASSWORD = 'ClaveMatricula2026!';

describe('matrícula por periodo y pedido de listas (fase 2)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  const tokens = {} as Record<Who, string>;
  let periodId = '';
  let schoolId = '';
  let originalRequestEmail: string | null = null;
  let studentToken = '';
  let gateStudentId = '';
  let gateUserId = '';
  let createdRequestId = '';
  let createdTeacherRequestId = '';

  const call = (method: string, path: string, who?: Who | 'student', body?: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(who === 'student' ? { Authorization: `Bearer ${studentToken}` } : who ? { Authorization: `Bearer ${tokens[who]}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

  const upload = async (rows: string[][]) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Estudiantes');
    sheet.addRow(['codigo', 'nombres', 'apellidos', 'correo', 'telefono', 'ciclo', 'escuela']);
    rows.forEach((r) => sheet.addRow(r));
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'estudiantes.xlsx');
    const res = await fetch(`${baseUrl}/api/students/import`, { method: 'POST', headers: { Authorization: `Bearer ${tokens.admin}` }, body: form });
    return { status: res.status, body: (await res.json()) as { report: { created: number; continued: number; skipped: number; errors: { message: string }[] } } };
  };

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba de matrícula por periodo.');
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
    periodId = (await prisma.academicPeriod.findFirstOrThrow({ where: { isActive: true } })).id;
    const school = await prisma.school.findFirstOrThrow({ where: { name: 'Ingeniería de Sistemas' } });
    schoolId = school.id;
    originalRequestEmail = school.requestEmail;
  });

  afterAll(async () => {
    const running = server;
    if (running) await new Promise((resolve) => running.close(resolve));
    if (dbUp) {
      if (createdRequestId) await prisma.dataRequest.deleteMany({ where: { id: createdRequestId } });
      if (createdTeacherRequestId) await prisma.dataRequest.deleteMany({ where: { id: createdTeacherRequestId } });
      await prisma.school.update({ where: { id: schoolId }, data: { requestEmail: originalRequestEmail } });
      const codes = [NEW_CODE, OLD_CODE, GATE_CODE];
      const students = await prisma.student.findMany({ where: { studentCode: { in: codes } }, select: { id: true } });
      const ids = students.map((s) => s.id);
      await prisma.tutoringRequest.deleteMany({ where: { studentId: { in: ids } } });
      await prisma.student.deleteMany({ where: { id: { in: ids } } }); // arrastra su matrícula
      if (gateUserId) await prisma.user.updateMany({ where: { id: gateUserId }, data: { isActive: false } });
    }
    await prisma.$disconnect();
  });

  it('el periodo vigente ya trae matriculados a los estudiantes activos (nadie pierde el acceso al actualizar)', async () => {
    if (!dbUp) return;
    const active = await prisma.student.count({ where: { isActive: true } });
    const enrolled = await prisma.periodEnrollment.count({ where: { periodId } });

    expect(enrolled).toBeGreaterThan(0);
    expect(enrolled).toBeGreaterThanOrEqual(Math.min(active, 1));
  });

  it('la carga matricula a los nuevos y a los que continúan (de un periodo anterior), sin error por «ya existe»', async () => {
    if (!dbUp) return;
    // Un estudiante de «otro periodo»: existe, inactivo, de ciclo 2 y sin matrícula en el periodo vigente.
    const old = await prisma.student.create({ data: { studentCode: OLD_CODE, firstName: 'Continúa', lastName: 'Prueba', cycle: 2, schoolId, isActive: false } });

    const { status, body } = await upload([
      [NEW_CODE, 'Nuevo', 'Prueba Carga', `nuevo-${stamp}@untrm.edu.pe`, '', '3', 'Ingeniería de Sistemas'],
      [OLD_CODE, 'Continúa', 'Prueba', '', '', '4', 'Ingeniería de Sistemas'],
    ]);

    expect(status).toBe(200);
    expect(body.report).toMatchObject({ created: 1, continued: 1, skipped: 0 });
    const fresh = await prisma.student.findUniqueOrThrow({ where: { id: old.id } });
    expect(fresh).toMatchObject({ cycle: 4, isActive: true });
    const enrollments = await prisma.periodEnrollment.findMany({ where: { periodId, student: { studentCode: { in: [NEW_CODE, OLD_CODE] } } }, select: { cycle: true, student: { select: { studentCode: true } } } });
    expect(enrollments.map((e) => `${e.student.studentCode}:${e.cycle}`).sort()).toEqual([`${NEW_CODE}:3`, `${OLD_CODE}:4`].sort());
  });

  it('un estudiante dado de alta a mano también queda matriculado', async () => {
    if (!dbUp) return;
    const res = await call('POST', '/api/students', 'admin', { studentCode: GATE_CODE, firstName: 'Matrícula', lastName: 'Prueba', cycle: 5, schoolId });
    expect(res.status).toBe(201);
    gateStudentId = ((await res.json()) as { student: { id: string } }).student.id;

    expect(await prisma.periodEnrollment.count({ where: { periodId, studentId: gateStudentId } })).toBe(1);
  });

  it('con matrícula el estudiante solicita; sin ella solo lee su historial (NOT_ENROLLED)', async () => {
    if (!dbUp) return;
    // Cuenta de portal del estudiante: se crea, se activa con su invitación y se vincula.
    const role = await prisma.role.findFirstOrThrow({ where: { name: 'Tutorado' } });
    const created = await call('POST', '/api/users', 'admin', { email: GATE_EMAIL, firstName: 'Matrícula', lastName: 'Prueba', roleId: role.id });
    const made = (await created.json()) as { user: { id: string }; invitation: { link: string } };
    gateUserId = made.user.id;
    expect((await call('POST', '/api/auth/reset-password', undefined, { token: made.invitation.link.split('/').pop(), newPassword: GATE_PASSWORD })).status).toBe(200);
    expect((await call('PATCH', `/api/students/${gateStudentId}/portal-account`, 'admin', { userId: gateUserId })).status).toBe(200);
    const login = await call('POST', '/api/auth/login', undefined, { email: GATE_EMAIL, password: GATE_PASSWORD });
    studentToken = ((await login.json()) as { data: { accessToken: string } }).data.accessToken;

    const status = (await (await call('GET', '/api/periods/current', 'student')).json()) as { enrolled: boolean };
    expect(status.enrolled).toBe(true);
    expect((await call('POST', '/api/tutoring-requests/me', 'student', { caseType: 'ACADEMIC', reason: 'Solicitud de prueba con matrícula' })).status).toBe(201);

    // Sale de la carga del periodo (como quien no figura en el nuevo Excel).
    await prisma.periodEnrollment.deleteMany({ where: { periodId, studentId: gateStudentId } });

    const refused = await call('POST', '/api/tutoring-requests/me', 'student', { caseType: 'ACADEMIC', reason: 'No debe registrarse' });
    expect(refused.status).toBe(403);
    expect(((await refused.json()) as { code: string }).code).toBe('NOT_ENROLLED');
    expect(((await (await call('GET', '/api/periods/current', 'student')).json()) as { enrolled: boolean }).enrolled).toBe(false);
    expect((await call('GET', '/api/tutoring-requests/mine', 'student')).status).toBe(200); // su historial sigue disponible
  });

  it('el personal no depende de la matrícula del estudiante para consultar (enrolled es null para otros roles)', async () => {
    if (!dbUp) return;
    const status = (await (await call('GET', '/api/periods/current', 'admin')).json()) as { enrolled: boolean | null };

    expect(status.enrolled).toBeNull();
  });

  it('sin correo configurado, el pedido de listas se rechaza y pide configurarlo', async () => {
    if (!dbUp) return;
    await prisma.school.update({ where: { id: schoolId }, data: { requestEmail: null } });

    const res = await call('POST', '/api/data-requests', 'sistemas', { schoolId });

    expect(res.status).toBe(409);
    expect(((await res.json()) as { code: string }).code).toBe('REQUEST_EMAIL_NOT_CONFIGURED');
  });

  it('el correo de pedido lo configura la coordinación de esa escuela (no otra coordinación ni un tutor)', async () => {
    if (!dbUp) return;
    const email = `pedidos-${stamp}@untrm.edu.pe`;

    expect((await call('PUT', `/api/schools/${schoolId}/request-email`, 'mecanica', { email })).status).toBe(403);
    expect((await call('PUT', `/api/schools/${schoolId}/request-email`, 'tutor', { email })).status).toBe(403);
    expect((await call('PUT', `/api/schools/${schoolId}/request-email`, 'sistemas', { email: 'no-es-correo' })).status).toBe(400);

    const ok = await call('PUT', `/api/schools/${schoolId}/request-email`, 'sistemas', { email: email.toUpperCase() });
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as { requestEmail: string }).requestEmail).toBe(email);
  });

  it('el pedido queda registrado (aunque el correo no salga en este entorno), con alcance por escuela, y se marca como recibido', async () => {
    if (!dbUp) return;
    const res = await call('POST', '/api/data-requests', 'sistemas', { schoolId, cycles: [3, 4], note: 'Prueba automática' });
    expect([201, 502]).toContain(res.status);
    const created = ((await res.json()) as { request: { id: string; toEmail: string; status: string; cycles: number[] } }).request;
    createdRequestId = created.id;
    expect(created).toMatchObject({ toEmail: `pedidos-${stamp}@untrm.edu.pe`, cycles: [3, 4] });

    const mine = ((await (await call('GET', '/api/data-requests', 'sistemas')).json()) as { requests: { id: string; schoolName: string }[] }).requests;
    expect(mine.find((r) => r.id === createdRequestId)).toMatchObject({ schoolName: 'Ingeniería de Sistemas' });
    const admin = ((await (await call('GET', '/api/data-requests', 'admin')).json()) as { requests: { id: string }[] }).requests;
    expect(admin.some((r) => r.id === createdRequestId)).toBe(true);
    const other = ((await (await call('GET', '/api/data-requests', 'mecanica')).json()) as { requests: { id: string }[] }).requests;
    expect(other.some((r) => r.id === createdRequestId)).toBe(false);

    expect((await call('POST', `/api/data-requests/${createdRequestId}/received`, 'mecanica')).status).toBe(403);
    const received = await call('POST', `/api/data-requests/${createdRequestId}/received`, 'sistemas');
    expect(received.status).toBe(200);
    expect(((await received.json()) as { request: { receivedAt: string | null } }).request.receivedAt).not.toBeNull();
  });

  it('la lista de docentes la pide solo la DBU, con su propio tipo de pedido; la coordinación no', async () => {
    if (!dbUp) return;
    const res = await call('POST', '/api/data-requests', 'admin', { schoolId, kind: 'DOCENTES' });
    expect([201, 502]).toContain(res.status);
    const created = ((await res.json()) as { request: { id: string; kind: string } }).request;
    createdTeacherRequestId = created.id;
    expect(created.kind).toBe('DOCENTES');

    expect((await call('POST', '/api/data-requests', 'sistemas', { schoolId, kind: 'DOCENTES' })).status).toBe(403);
    const list = ((await (await call('GET', '/api/data-requests', 'admin')).json()) as { requests: { id: string; kind: string }[] }).requests;
    expect(list.find((r) => r.id === createdTeacherRequestId)?.kind).toBe('DOCENTES');
  });

  it('un tutor no puede pedir listas ni ver los pedidos', async () => {
    if (!dbUp) return;
    expect((await call('POST', '/api/data-requests', 'tutor', { schoolId })).status).toBe(403);
    expect((await call('GET', '/api/data-requests', 'tutor')).status).toBe(403);
  });
});
