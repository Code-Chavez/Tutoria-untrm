import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { accounts, type Account } from '../support/accounts';
import { api, apiLogin, apiPublic } from '../support/api';
import { loginUi } from '../support/ui';

// E2E-21 (roles configurables, permisos y alcance): la administración crea un rol, elige sus permisos y lo asigna a una cuenta con
// alcance limitado a una escuela; esa cuenta ve solo lo de su escuela (en pantalla y en el servidor); quitar un permiso rige en la
// siguiente solicitud; cambiar de rol y volver al anterior no reactiva el alcance viejo; y una cuenta sin autorización no puede
// darse privilegios ni tocar los roles protegidos. Todo con cuentas y estudiantes ficticios creados por la propia prueba.
test.describe.configure({ mode: 'serial' });

const stamp = Date.now().toString(36);
const roleName = `Rol E2E ${stamp}`;
const otherRoleName = `Rol E2E B ${stamp}`;
const PASSWORD = 'Prueba2026!x';
const MAIL = `revisor.e2e.${stamp}@untrm.edu.pe`;
const FIRST = 'Revisora';

interface Named {
  id: string;
  name: string;
}
interface RoleRow extends Named {
  isBase?: boolean;
  permissions?: { code: string }[];
}
interface StudentRow {
  id: string;
  studentCode: string;
  schoolId: string;
}

const s = {
  adminToken: '',
  roleId: '',
  otherRoleId: '',
  userId: '',
  ownSchool: { id: '', name: '' },
  otherSchool: { id: '', name: '' },
  own: { id: '', code: '' },
  foreign: { id: '', code: '' },
  userToken: '',
  context: undefined as unknown as BrowserContext,
  page: undefined as unknown as Page,
};
const account = (): Account => ({ email: MAIL, password: PASSWORD, role: roleName, greeting: FIRST });

const list = <T>(body: unknown, key: string): T[] => (Array.isArray(body) ? (body as T[]) : ((body as Record<string, T[]>)[key] ?? []));

async function createStudent(school: Named, tag: string): Promise<{ id: string; code: string }> {
  const code = String(Date.now()).slice(-7) + tag; // 8 dígitos, único por corrida
  const res = await api<{ student: { id: string } }>(s.adminToken, 'POST', '/students', { studentCode: code, firstName: 'Ficticio', lastName: `E2E ${code}`, cycle: 3, schoolId: school.id });
  expect(res.status, `crear estudiante en ${school.name}`).toBe(201);
  return { id: res.body.student.id, code };
}

async function rolesByName(): Promise<Map<string, RoleRow>> {
  const res = await api(s.adminToken, 'GET', '/roles');
  return new Map(list<RoleRow>(res.body, 'roles').map((r) => [r.name, r]));
}

test.beforeAll(async ({ browser }) => {
  s.adminToken = await apiLogin(accounts.admin);
  const schools = list<Named>((await api(s.adminToken, 'GET', '/schools')).body, 'schools');
  const own = schools.find((x) => /Sistemas/.test(x.name));
  const other = schools.find((x) => x.id !== own?.id);
  expect(own && other, 'dos escuelas sembradas').toBeTruthy();
  s.ownSchool = own!;
  s.otherSchool = other!;
  s.own = await createStudent(own!, '1');
  s.foreign = await createStudent(other!, '2');
  s.context = await browser.newContext();
  s.page = await s.context.newPage();
});

test.afterAll(async () => {
  await s.context?.close();
});

test('1. la administración crea un rol con permisos y lo asigna a una cuenta con alcance de una sola escuela', async ({ page }) => {
  await loginUi(page, accounts.admin);

  // Rol nuevo, con permisos elegidos en la pantalla.
  await page.goto('/roles');
  await page.getByRole('button', { name: 'Nuevo rol' }).click();
  await page.getByLabel('Nombre del rol').fill(roleName);
  await page.getByLabel('Descripción', { exact: true }).fill('Consulta de tutorados, ficticio (E2E)');
  await page.getByRole('checkbox', { name: /students:read/ }).check();
  await page.getByRole('checkbox', { name: /tutoring-requests:read/ }).check();
  await page.getByRole('button', { name: 'Crear rol' }).click();
  await expect(page.getByRole('button', { name: new RegExp(roleName) })).toBeVisible();

  const created = (await rolesByName()).get(roleName);
  expect(created, 'el rol quedó creado en el servidor').toBeTruthy();
  expect(created!.permissions?.map((p) => p.code).sort()).toEqual(['students:read', 'tutoring-requests:read']);
  s.roleId = created!.id;

  // Cuenta ficticia con ese rol (la invitación se activa por la API para poder entrar de inmediato).
  const user = await api<{ user: { id: string }; invitation: { link: string } }>(s.adminToken, 'POST', '/users', { email: MAIL, firstName: FIRST, lastName: 'Ficticia', roleId: s.roleId });
  expect(user.status).toBe(201);
  s.userId = user.body.user.id;
  const token = user.body.invitation.link.split('/').pop() as string;
  expect((await apiPublic('POST', '/auth/reset-password', { token, newPassword: PASSWORD })).status).toBe(200);

  // Estado inicial seguro: un rol personalizado nace sin alcance.
  const before = await api<{ access: { policy: { kind: string } | null } }>(s.adminToken, 'GET', `/users/${s.userId}/access`);
  expect(before.status).toBe(200);
  expect(before.body.access.policy?.kind ?? 'NONE').toBe('NONE');

  // Alcance limitado a una escuela, desde «Rol y alcance».
  await page.goto(`/users?q=${encodeURIComponent(MAIL)}`);
  const row = page.getByRole('row', { name: new RegExp(MAIL) });
  await expect(row).toContainText(roleName);
  await row.getByRole('button', { name: 'Rol y alcance' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Alcance').selectOption('SCHOOLS');
  await dialog.getByRole('checkbox', { name: new RegExp(s.ownSchool.name) }).check();
  await dialog.getByRole('button', { name: 'Guardar alcance' }).click();
  await expect(dialog.getByText('Alcance guardado.')).toBeVisible();

  const after = await api<{ access: { policy: { kind: string; schoolIds: string[] } } }>(s.adminToken, 'GET', `/users/${s.userId}/access`);
  expect(after.body.access.policy.kind).toBe('SCHOOLS');
  expect(after.body.access.policy.schoolIds).toEqual([s.ownSchool.id]);
});

test('2. la cuenta ve a los estudiantes de su escuela y el servidor rechaza los de otra, por pantalla, URL directa y API', async () => {
  const page = s.page;
  await loginUi(page, account());
  s.userToken = await apiLogin(account());

  // Pantalla: lista de estudiantes con solo su escuela.
  await page.goto('/tutorados');
  await page.getByLabel('Buscar estudiante').fill(s.own.code);
  await expect(page.getByRole('row', { name: new RegExp(s.own.code) })).toBeVisible();
  await page.getByLabel('Buscar estudiante').fill(s.foreign.code);
  await expect(page.getByRole('row', { name: new RegExp(s.foreign.code) })).toHaveCount(0);

  // API: la lista llega recortada a su escuela.
  const mine = await api<{ students: StudentRow[] }>(s.userToken, 'GET', '/students');
  expect(mine.status).toBe(200);
  expect(mine.body.students.length).toBeGreaterThan(0);
  expect(mine.body.students.every((x) => x.schoolId === s.ownSchool.id)).toBe(true);
  expect(mine.body.students.some((x) => x.id === s.foreign.id)).toBe(false);

  // API directa: el expediente propio abre; el ajeno no (ni el PDF del expediente).
  expect((await api(s.userToken, 'GET', `/students/${s.own.id}/record`)).status).toBe(200);
  const foreignRecord = await api(s.userToken, 'GET', `/students/${s.foreign.id}/record`);
  expect([403, 404], `expediente ajeno respondió ${foreignRecord.status}`).toContain(foreignRecord.status);
  const foreignPdf = await api(s.userToken, 'GET', `/students/${s.foreign.id}/record/pdf`);
  expect([403, 404], `PDF del expediente ajeno respondió ${foreignPdf.status}`).toContain(foreignPdf.status);

  // URL directa en el navegador.
  await page.goto(`/expediente/${s.foreign.id}`);
  await expect(page.getByText('No se pudo cargar el expediente')).toBeVisible();
  await page.goto(`/expediente/${s.own.id}`);
  await expect(page.getByText('No se pudo cargar el expediente')).toHaveCount(0);

  // Sin permiso de escritura no puede modificar ni siquiera a los suyos.
  expect((await api(s.userToken, 'PATCH', `/students/${s.own.id}`, { firstName: 'Otro' })).status).toBe(403);
});

test('3a. al retirar un permiso con la sesión abierta, la siguiente solicitud queda bloqueada', async () => {
  const roles = await rolesByName();
  const current = roles.get(roleName)!.permissions!.map((p) => p.code);
  const kept = current.filter((c) => c !== 'students:read');
  expect((await api(s.adminToken, 'PUT', `/roles/${s.roleId}`, { permissions: kept })).status).toBe(200);

  // El mismo token, sin volver a iniciar sesión.
  const blocked = await api(s.userToken, 'GET', '/students');
  expect(blocked.status).toBe(403);
  expect((await api(s.userToken, 'GET', `/students/${s.own.id}/record`)).status).toBe(403);

  // Pantalla: recargar con la sesión abierta ya no deja entrar a Estudiantes.
  await s.page.goto('/tutorados');
  await expect(s.page.locator('#contenido').getByRole('heading', { name: 'Acceso denegado' })).toBeVisible();
});

test('3b. cambiar de rol y volver al anterior no reactiva el alcance viejo', async () => {
  // Se devuelve el permiso y se crea un segundo rol para el cambio.
  expect((await api(s.adminToken, 'PUT', `/roles/${s.roleId}`, { permissions: ['students:read', 'tutoring-requests:read'] })).status).toBe(200);
  const second = await api<{ role: Named }>(s.adminToken, 'POST', '/roles', { name: otherRoleName, description: 'Segundo rol ficticio (E2E)', permissions: ['students:read'] });
  expect(second.status).toBe(201);
  s.otherRoleId = second.body.role.id;

  // Antes del cambio el alcance de escuela sigue vigente.
  const scoped = await api<{ students: StudentRow[] }>(s.userToken, 'GET', '/students');
  expect(scoped.status).toBe(200);
  expect(scoped.body.students.length).toBeGreaterThan(0);

  // Cambio de rol: el alcance vuelve a «ninguno».
  expect((await api(s.adminToken, 'PUT', `/users/${s.userId}/role`, { roleId: s.otherRoleId })).status).toBe(200);
  const mid = await api<{ access: { policy: { kind: string } | null } }>(s.adminToken, 'GET', `/users/${s.userId}/access`);
  expect(mid.body.access.policy?.kind ?? 'NONE').toBe('NONE');

  // Se vuelve a asignar el rol anterior: el alcance viejo (SCHOOLS) no reaparece.
  expect((await api(s.adminToken, 'PUT', `/users/${s.userId}/role`, { roleId: s.roleId })).status).toBe(200);
  const back = await api<{ access: { policy: { kind: string } | null } }>(s.adminToken, 'GET', `/users/${s.userId}/access`);
  expect(back.body.access.policy?.kind ?? 'NONE').toBe('NONE');

  const token = await apiLogin(account());
  const none = await api<{ students: StudentRow[] }>(token, 'GET', '/students');
  const visible = none.status === 200 ? none.body.students : [];
  expect(visible, 'con alcance «ninguno» no se ve ningún estudiante').toHaveLength(0);
  expect([403, 404]).toContain((await api(token, 'GET', `/students/${s.own.id}/record`)).status);

  // La pantalla lo muestra: lista vacía, sin el estudiante que antes veía.
  await s.page.goto('/tutorados');
  await s.page.getByLabel('Buscar estudiante').fill(s.own.code);
  await expect(s.page.getByRole('row', { name: new RegExp(s.own.code) })).toHaveCount(0);

  // Solo una decisión explícita de la administración lo vuelve a abrir.
  expect((await api(s.adminToken, 'PUT', `/users/${s.userId}/access`, { kind: 'SCHOOLS', schoolIds: [s.ownSchool.id] })).status).toBe(200);
  const reopened = await api<{ students: StudentRow[] }>(token, 'GET', '/students');
  expect(reopened.status).toBe(200);
  expect(reopened.body.students.length).toBeGreaterThan(0);
});

test('4. una cuenta sin autorización no puede darse privilegios ni modificar los roles protegidos', async () => {
  const token = await apiLogin(account());
  const roles = await rolesByName();
  const adminRole = roles.get('Administrador DBU')!;
  const tutorRole = roles.get('Docente Tutor')!;

  // Sin `admin:system`: nada de lo siguiente prospera.
  expect((await api(token, 'PUT', `/users/${s.userId}/role`, { roleId: adminRole.id })).status).toBe(403);
  expect((await api(token, 'PUT', `/users/${s.userId}/access`, { kind: 'INSTITUTION' })).status).toBe(403);
  expect((await api(token, 'PUT', `/roles/${s.roleId}`, { permissions: ['students:read', 'admin:system'] })).status).toBe(403);
  expect((await api(token, 'PUT', `/roles/${tutorRole.id}`, { description: 'Alterado' })).status).toBe(403);
  expect((await api(token, 'POST', '/roles', { name: `Rol propio ${stamp}`, description: 'Intento', permissions: ['admin:system'] })).status).toBe(403);
  expect((await api(token, 'PATCH', `/roles/${tutorRole.id}/status`, { isActive: false })).status).toBe(403);

  // Nada cambió: sigue con su rol y alcance.
  const still = await api<{ access: { policy: { kind: string } } }>(s.adminToken, 'GET', `/users/${s.userId}/access`);
  expect(still.body.access.policy.kind).toBe('SCHOOLS');

  // Pantallas de administración: acceso denegado por URL directa.
  await s.page.goto('/roles');
  await expect(s.page.locator('#contenido').getByRole('heading', { name: 'Acceso denegado' })).toBeVisible();
  await s.page.goto('/users');
  await expect(s.page.locator('#contenido').getByRole('heading', { name: 'Acceso denegado' })).toBeVisible();

  // Incluso la administración no puede alterar un rol base ni delegar la administración del sistema.
  const baseEdit = await api(s.adminToken, 'PUT', `/roles/${tutorRole.id}`, { description: 'Alterado' });
  expect(baseEdit.status).toBeGreaterThanOrEqual(400);
  const delegate = await api(s.adminToken, 'POST', '/roles', { name: `Rol delegado ${stamp}`, description: 'Intento', permissions: ['admin:system'] });
  expect(delegate.status).toBeGreaterThanOrEqual(400);
});
