import http from 'http';
import app from '../../src/app';
import { prisma } from '../../src/infrastructure/database/prisma';

/**
 * Matriz de acceso sobre HTTP real y base de datos real (A18). Usa las cuentas del seed
 * (`pnpm run seed`). Sin base de datos disponible las pruebas se omiten, salvo con
 * REQUIRE_DB_TESTS=1 (CI), donde su ausencia es un fallo: la suite no puede pasar "en verde"
 * sin haber comprobado los controles de acceso.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';

// Seis inicios de sesión con bcrypt (coste 12) superan los 5 s por defecto en un runner lento.
jest.setTimeout(120_000);

const ACCOUNTS = {
  admin: { email: '7183255722@untrm.edu.pe', password: 'Admin2026!' },
  coordinador: { email: 'rosa.mendoza@untrm.edu.pe', password: 'Demo2026!' },
  tutor: { email: 'elena.ramirez@untrm.edu.pe', password: 'Demo2026!' },
  servicio: { email: 'lucia.flores@untrm.edu.pe', password: 'Demo2026!' },
  vicerrectorado: { email: 'vicerrectorado.academico@untrm.edu.pe', password: 'Demo2026!' },
  tutorado: { email: '20191234@untrm.edu.pe', password: 'Demo2026!' },
} as const;

type Role = keyof typeof ACCOUNTS;
const ALL_ROLES = Object.keys(ACCOUNTS) as Role[];

// Rol → permitido. «Denegado» exige 403; «permitido» exige que la petición pase la
// autorización (cualquier respuesta distinta de 401/403, incluido un 400 por cuerpo vacío).
const MATRIX: { method: string; path: string; allowed: Role[] }[] = [
  { method: 'GET', path: '/api/students', allowed: ['admin', 'coordinador', 'tutor'] },
  { method: 'POST', path: '/api/students', allowed: ['admin', 'coordinador'] },
  { method: 'POST', path: '/api/students/import/report', allowed: ['admin', 'coordinador'] },
  { method: 'GET', path: '/api/users', allowed: ['admin', 'coordinador'] },
  { method: 'POST', path: '/api/users', allowed: ['admin'] },
  { method: 'GET', path: '/api/catalogs/faculties', allowed: ['admin'] },
  { method: 'GET', path: '/api/system-parameters', allowed: ['admin'] },
  { method: 'GET', path: '/api/consolidated-reports', allowed: ['admin', 'vicerrectorado'] },
  { method: 'GET', path: '/api/indicators', allowed: ['admin', 'coordinador', 'vicerrectorado'] },
  { method: 'GET', path: '/api/work-plans', allowed: ['admin', 'coordinador'] },
  { method: 'POST', path: '/api/sessions', allowed: ['admin', 'tutor'] },
  { method: 'GET', path: '/api/referrals', allowed: ['admin', 'coordinador', 'tutor', 'servicio'] },
  { method: 'POST', path: '/api/students/00000000-0000-0000-0000-000000000000/referrals', allowed: ['admin', 'tutor', 'servicio'] },
];

type StudentList = { students: { id: string }[] };
const rows = (body: StudentList) => body.students;

describe('matriz de acceso HTTP (A18)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  const tokens = {} as Record<Role, { access: string; refresh: string }>;

  const call = (method: string, path: string, token?: string) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(method === 'GET' ? {} : { 'Content-Type': 'application/json' }),
      },
      body: method === 'GET' ? undefined : '{}',
    });

  const post = (path: string, body: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  const login = async (role: Role) => {
    const res = await post('/api/auth/login', ACCOUNTS[role]);
    if (res.status !== 200) throw new Error(`Login de ${role} falló: ${res.status}`);
    const { data } = (await res.json()) as { data: { accessToken: string; refreshToken: string } };
    return { access: data.accessToken, refresh: data.refreshToken };
  };

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la matriz de acceso HTTP.');
      return;
    }
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    const address = listening.address();
    if (!address || typeof address === 'string') throw new Error('No address');
    baseUrl = `http://localhost:${address.port}`;
    for (const role of ALL_ROLES) tokens[role] = await login(role);
  });

  afterAll(async () => {
    const running = server;
    if (running) await new Promise((resolve) => running.close(resolve));
    await prisma.$disconnect();
  });

  it.each(MATRIX)('$method $path respeta los permisos de cada rol', async ({ method, path, allowed }) => {
    if (!dbUp) return;
    const wrong: string[] = [];

    for (const role of ALL_ROLES) {
      const res = await call(method, path, tokens[role].access);
      const isAllowed = allowed.includes(role);
      const passed = res.status !== 401 && res.status !== 403;
      if (passed !== isAllowed) wrong.push(`${role}: ${res.status} (esperado ${isAllowed ? 'permitido' : '403'})`);
    }

    expect(wrong).toEqual([]);
  });

  it('un docente tutor solo ve a sus tutorados y no puede abrir el expediente de otro (A03)', async () => {
    if (!dbUp) return;
    const mine = rows((await (await call('GET', '/api/students', tokens.tutor.access)).json()) as StudentList);
    const all = rows((await (await call('GET', '/api/students', tokens.admin.access)).json()) as StudentList);

    const myIds = new Set(mine.map((s) => s.id));
    const foreign = all.find((s) => !myIds.has(s.id));
    expect(mine.length).toBeGreaterThan(0);
    expect(foreign).toBeDefined();

    const record = await call('GET', `/api/students/${foreign?.id}/record`, tokens.tutor.access);
    expect(record.status).toBe(404);
  });

  it('el refresh token rota y el anterior deja de servir (A16)', async () => {
    if (!dbUp) return;
    const { refresh } = await login('tutor');

    const first = await post('/api/auth/refresh', { refreshToken: refresh });
    expect(first.status).toBe(200);
    const { data } = (await first.json()) as { data: { accessToken: string; refreshToken: string } };
    expect(data.refreshToken).not.toBe(refresh);

    const reused = await post('/api/auth/refresh', { refreshToken: refresh });
    expect(reused.status).toBe(401);

    // El token nuevo sigue siendo válido (la reutilización inmediata cae en la ventana de gracia).
    const next = await post('/api/auth/refresh', { refreshToken: data.refreshToken });
    expect(next.status).toBe(200);
  });
});
