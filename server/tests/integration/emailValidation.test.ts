import http from 'http';
import app from '../../src/app';
import { prisma } from '../../src/infrastructure/database/prisma';

/**
 * Validación de correos (RF-01) por HTTP y base reales: la cuenta de usuario es del dominio institucional, el correo se guarda
 * en una sola forma (sin espacios y en minúsculas) y no hay dos cuentas ni dos estudiantes con el mismo correo aunque difieran
 * en mayúsculas; el ingreso y la recuperación aceptan el correo escrito con espacios o mayúsculas. Los estudiantes, que usan
 * correo de contacto (a menudo personal), no pasan por el dominio. Cuentas del seed; todo lo que crea lo borra. Se omite sin base
 * de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(120_000);

const ADMIN = { email: '7183255722@untrm.edu.pe', password: 'Admin2026!' };
const TUTOR = { email: 'elena.ramirez@untrm.edu.pe', password: 'Demo2026!' };
const stamp = String(Date.now());
const ACCOUNT = `valida-${stamp}@untrm.edu.pe`;
const STUDENT_MAIL = `contacto-${stamp}@gmail.com`;
const CODES = [`9930${stamp.slice(-6)}`, `9931${stamp.slice(-6)}`];

describe('validación de correos (RF-01)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  let adminToken = '';
  let tutorToken = '';
  let roleId = '';
  let schoolId = '';

  const call = (method: string, path: string, token: string | undefined, body?: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  const login = async (email: string, password: string) => call('POST', '/api/auth/login', undefined, { email, password });
  const newUser = (email: string) => ({ email, firstName: 'Prueba', lastName: 'Correo', roleId });

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la validación de correos.');
      return;
    }
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    baseUrl = `http://localhost:${(listening.address() as { port: number }).port}`;
    adminToken = ((await (await login(ADMIN.email, ADMIN.password)).json()) as { data: { accessToken: string } }).data.accessToken;
    tutorToken = ((await (await login(TUTOR.email, TUTOR.password)).json()) as { data: { accessToken: string } }).data.accessToken;
    roleId = (await prisma.role.findFirstOrThrow({ where: { name: 'Tutorado' } })).id;
    schoolId = (await prisma.school.findFirstOrThrow({ where: { name: 'Ingeniería de Sistemas' } })).id;
  });

  afterAll(async () => {
    if (dbUp) {
      const users = await prisma.user.findMany({ where: { email: { startsWith: `valida-${stamp}` } }, select: { id: true } });
      const ids = users.map((u) => u.id);
      await prisma.passwordResetToken.deleteMany({ where: { userId: { in: ids } } });
      await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await prisma.student.deleteMany({ where: { studentCode: { in: CODES } } });
    }
    if (server) await new Promise((resolve) => server?.close(resolve));
    await prisma.$disconnect();
  });

  describe('cuentas de usuario', () => {
    it('la política que aplica el servidor se muestra a los formularios, solo a quien administra cuentas', async () => {
      if (!dbUp) return;
      const res = await call('GET', '/api/users/email-policy', adminToken);
      expect(res.status).toBe(200);
      expect(((await res.json()) as { allowedDomains: string[] }).allowedDomains).toContain('untrm.edu.pe');
      expect((await call('GET', '/api/users/email-policy', tutorToken)).status).toBe(403);
      expect((await call('GET', '/api/users/email-policy', undefined)).status).toBe(401);
    });

    it('un correo de otro dominio no crea la cuenta, y el mensaje dice cuál se espera', async () => {
      if (!dbUp) return;
      const res = await call('POST', '/api/users', adminToken, newUser(`valida-${stamp}@gmail.com`));
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: string }).error).toMatch(/institucional \(@untrm\.edu\.pe\)/);
      expect(await prisma.user.count({ where: { email: `valida-${stamp}@gmail.com` } })).toBe(0);
    });

    it('un correo mal formado no crea la cuenta', async () => {
      if (!dbUp) return;
      expect((await call('POST', '/api/users', adminToken, newUser('sin-arroba'))).status).toBe(400);
    });

    it('el correo se guarda en una sola forma: escrito con espacios y mayúsculas queda en minúsculas', async () => {
      if (!dbUp) return;
      const res = await call('POST', '/api/users', adminToken, newUser(`  Valida-${stamp}@UNTRM.edu.pe `));
      expect(res.status).toBe(201);
      expect((await prisma.user.findFirstOrThrow({ where: { email: ACCOUNT } })).email).toBe(ACCOUNT);
    });

    it('no hay dos cuentas con el mismo correo, aunque se escriba distinto', async () => {
      if (!dbUp) return;
      const res = await call('POST', '/api/users', adminToken, newUser(`VALIDA-${stamp}@untrm.edu.pe`));
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: string }).error).toMatch(/ya está registrado/);
      expect(await prisma.user.count({ where: { email: { equals: ACCOUNT, mode: 'insensitive' } } })).toBe(1);
    });

    it('al editar, el correo nuevo pasa por las mismas reglas', async () => {
      if (!dbUp) return;
      const id = (await prisma.user.findFirstOrThrow({ where: { email: ACCOUNT } })).id;
      expect((await call('PATCH', `/api/users/${id}`, adminToken, { email: `valida-${stamp}@hotmail.com` })).status).toBe(400);
      expect((await call('PATCH', `/api/users/${id}`, adminToken, { email: TUTOR.email.toUpperCase() })).status).toBe(400); // ya es de otra cuenta
      const ok = await call('PATCH', `/api/users/${id}`, adminToken, { email: ` Valida-${stamp}-b@UNTRM.edu.pe` });
      expect(ok.status).toBe(200);
      expect(await prisma.user.count({ where: { email: `valida-${stamp}-b@untrm.edu.pe` } })).toBe(1);
    });
  });

  describe('ingreso y recuperación', () => {
    it('ingresa aunque el correo se escriba con espacios y mayúsculas', async () => {
      if (!dbUp) return;
      expect((await login(`  ${TUTOR.email.toUpperCase()} `, TUTOR.password)).status).toBe(200);
    });

    it('un correo mal formado en el ingreso se informa como formato, no como credenciales', async () => {
      if (!dbUp) return;
      const res = await login('sin-arroba', TUTOR.password);
      expect(res.status).toBe(400);
    });

    it('la recuperación de contraseña acepta el correo con espacios y mayúsculas y responde igual exista o no la cuenta', async () => {
      if (!dbUp) return;
      const known = await call('POST', '/api/auth/forgot-password', undefined, { email: ` ${TUTOR.email.toUpperCase()}` });
      const unknown = await call('POST', '/api/auth/forgot-password', undefined, { email: `nadie-${stamp}@untrm.edu.pe` });
      expect(known.status).toBe(unknown.status);
      expect(await known.json()).toEqual(await unknown.json());
      expect((await call('POST', '/api/auth/forgot-password', undefined, { email: 'sin-arroba' })).status).toBe(400);
    });
  });

  describe('estudiantes (correo de contacto)', () => {
    const student = (code: string, email: string) => ({ studentCode: code, firstName: 'Contacto', lastName: 'Prueba', email, cycle: 3, schoolId });

    it('admite un correo personal, lo guarda normalizado, y vacío queda como «sin correo»', async () => {
      if (!dbUp) return;
      const res = await call('POST', '/api/students', adminToken, student(CODES[0], `  ${STUDENT_MAIL.toUpperCase()} `));
      expect(res.status).toBe(201);
      expect((await prisma.student.findUniqueOrThrow({ where: { studentCode: CODES[0] } })).email).toBe(STUDENT_MAIL);

      const second = await call('POST', '/api/students', adminToken, student(CODES[1], ''));
      expect(second.status).toBe(201);
      expect((await prisma.student.findUniqueOrThrow({ where: { studentCode: CODES[1] } })).email).toBeNull();
    });

    it('no hay dos estudiantes con el mismo correo (alta y edición), aunque difiera en mayúsculas', async () => {
      if (!dbUp) return;
      const dup = await call('POST', '/api/students', adminToken, student(`9932${stamp.slice(-6)}`, STUDENT_MAIL.toUpperCase()));
      expect(dup.status).toBe(409);
      expect(((await dup.json()) as { error: string }).error).toMatch(/Ya hay un estudiante con el correo/);
      expect(await prisma.student.count({ where: { studentCode: `9932${stamp.slice(-6)}` } })).toBe(0);

      const other = await prisma.student.findUniqueOrThrow({ where: { studentCode: CODES[1] } });
      expect((await call('PATCH', `/api/students/${other.id}`, adminToken, { email: STUDENT_MAIL })).status).toBe(409);
      // Dejar el suyo (o escribirlo con otra forma) no es un duplicado
      const mine = await prisma.student.findUniqueOrThrow({ where: { studentCode: CODES[0] } });
      expect((await call('PATCH', `/api/students/${mine.id}`, adminToken, { email: STUDENT_MAIL.toUpperCase() })).status).toBe(200);
    });

    it('un correo mal formado no crea el estudiante', async () => {
      if (!dbUp) return;
      expect((await call('POST', '/api/students', adminToken, student(`9933${stamp.slice(-6)}`, 'sin-arroba'))).status).toBe(400);
    });
  });
});
