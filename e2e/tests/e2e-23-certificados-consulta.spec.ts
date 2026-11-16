import { expect, test } from '@playwright/test';
import { accounts, type Account } from '../support/accounts';
import { api, apiLogin, apiPublic } from '../support/api';
import { loginUi } from '../support/ui';

// E2E-23 (certificación del docente tutor, corte 2: permisos y consulta): los permisos nuevos se ven y se eligen en la pantalla de
// roles; una cuenta solo consulta los trámites de su escuela, el permiso retirado rige en la siguiente solicitud y una cuenta sin
// autorización no puede consultar ni concederse nada. Los trámites todavía no se crean por la aplicación (corte 3), por lo que aquí
// se comprueba el permiso y el alcance con la lista vacía; el contenido por escuela lo cubre la prueba de integración del servidor.
// Todo con roles y cuentas ficticios creados por la propia prueba.
test.describe.configure({ mode: 'serial' });

const stamp = Date.now().toString(36);
const roleName = `Consulta de certificados E2E ${stamp}`;
const plainRoleName = `Sin certificados E2E ${stamp}`;
const PASSWORD = 'Prueba2026!x';
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';
const CERTIFICATE_PERMISSIONS = ['certificados:registrar', 'certificados:aprobar', 'certificados:emitir', 'certificados:consultar', 'certificados:descargar', 'certificados:administrar'];

interface Named {
  id: string;
  name: string;
}
interface RoleRow extends Named {
  permissions?: { code: string }[];
}
interface CertificateRow {
  id: string;
  schoolId: string;
}

const s = {
  adminToken: '',
  roleId: '',
  plainRoleId: '',
  viewer: { id: '', token: '', account: undefined as unknown as Account },
  plain: { id: '', token: '', account: undefined as unknown as Account },
  ownSchool: { id: '', name: '' },
  otherSchool: { id: '', name: '' },
};

const list = <T>(body: unknown, key: string): T[] => (Array.isArray(body) ? (body as T[]) : ((body as Record<string, T[]>)[key] ?? []));
const accountFor = (tag: string, role: string): Account => ({ email: `cert.${tag}.${stamp}@untrm.edu.pe`, password: PASSWORD, role, greeting: 'Cuenta' });

async function createAccount(account: Account, roleId: string): Promise<{ id: string; token: string }> {
  const created = await api<{ user: { id: string }; invitation: { link: string } }>(s.adminToken, 'POST', '/users', { email: account.email, firstName: 'Cuenta', lastName: 'Ficticia', roleId });
  expect(created.status).toBe(201);
  const token = created.body.invitation.link.split('/').pop() as string;
  expect((await apiPublic('POST', '/auth/reset-password', { token, newPassword: PASSWORD })).status).toBe(200);
  return { id: created.body.user.id, token: await apiLogin(account) };
}

test.beforeAll(async () => {
  s.adminToken = await apiLogin(accounts.admin);
  const schools = list<Named>((await api(s.adminToken, 'GET', '/schools')).body, 'schools');
  const own = schools.find((x) => /Sistemas/.test(x.name));
  const other = schools.find((x) => x.id !== own?.id);
  expect(own && other, 'dos escuelas sembradas').toBeTruthy();
  s.ownSchool = own!;
  s.otherSchool = other!;
});

test('1. los permisos de certificación aparecen en la pantalla de roles y se pueden elegir', async ({ page }) => {
  await loginUi(page, accounts.admin);
  await page.goto('/roles');
  await page.getByRole('button', { name: 'Nuevo rol' }).click();
  await page.getByLabel('Nombre del rol').fill(roleName);
  await page.getByLabel('Descripción', { exact: true }).fill('Consulta de certificados, ficticio (E2E)');
  for (const code of CERTIFICATE_PERMISSIONS) await expect(page.getByRole('checkbox', { name: new RegExp(code) }), `permiso ${code} en la pantalla`).toBeVisible();
  await page.getByRole('checkbox', { name: /certificados:consultar/ }).check();
  await page.getByRole('checkbox', { name: /certificados:aprobar/ }).check();
  await page.getByRole('button', { name: 'Crear rol' }).click();
  await expect(page.getByRole('button', { name: new RegExp(roleName) })).toBeVisible();

  const roles = new Map(list<RoleRow>((await api(s.adminToken, 'GET', '/roles')).body, 'roles').map((r) => [r.name, r]));
  const created = roles.get(roleName);
  expect(created?.permissions?.map((p) => p.code).sort()).toEqual(['certificados:aprobar', 'certificados:consultar']);
  s.roleId = created!.id;
});

test('2. el Administrador base tiene todo el catálogo de certificación y los demás roles base ninguno', async () => {
  const roles = list<RoleRow & { isBase?: boolean }>((await api(s.adminToken, 'GET', '/roles')).body, 'roles');
  const certCodes = (role: RoleRow) => (role.permissions ?? []).map((p) => p.code).filter((c) => c.startsWith('certificados:')).sort();
  const admin = roles.find((r) => r.name === 'Administrador DBU');
  expect(certCodes(admin!)).toEqual([...CERTIFICATE_PERMISSIONS].sort());
  for (const name of ['Coordinador', 'Docente Tutor', 'Tutorado', 'Profesional de Servicio', 'Vicerrectorado', 'Decano']) {
    expect(certCodes(roles.find((r) => r.name === name)!), `${name} no recibe permisos de certificación`).toEqual([]);
  }
});

test('3. una cuenta con el permiso consulta solo lo de su escuela; sin alcance no consulta nada', async () => {
  s.viewer.account = accountFor('consulta', roleName);
  const made = await createAccount(s.viewer.account, s.roleId);
  s.viewer.id = made.id;
  s.viewer.token = made.token;

  // Un rol personalizado nace sin alcance: tiene el permiso pero no ve nada.
  expect((await api(s.viewer.token, 'GET', '/certificates')).status).toBe(403);
  expect((await api(s.viewer.token, 'GET', `/certificates/${UNKNOWN_ID}`)).status).toBe(403);

  // Alcance de una escuela: la lista responde, solo con filas de esa escuela, y pedir otra escuela por filtro no la abre.
  expect((await api(s.adminToken, 'PUT', `/users/${s.viewer.id}/access`, { kind: 'SCHOOLS', schoolIds: [s.ownSchool.id] })).status).toBe(200);
  const own = await api<{ certificates: CertificateRow[] }>(s.viewer.token, 'GET', '/certificates');
  expect(own.status).toBe(200);
  expect(own.body.certificates.every((c) => c.schoolId === s.ownSchool.id)).toBe(true);
  const foreign = await api<{ certificates: CertificateRow[] }>(s.viewer.token, 'GET', `/certificates?schoolId=${s.otherSchool.id}`);
  expect(foreign.status).toBe(200);
  expect(foreign.body.certificates).toEqual([]);

  // Un trámite que no existe y uno mal escrito responden 404; filtros inválidos, 400.
  expect((await api(s.viewer.token, 'GET', `/certificates/${UNKNOWN_ID}`)).status).toBe(404);
  expect((await api(s.viewer.token, 'GET', '/certificates/no-es-un-uuid')).status).toBe(404);
  expect((await api(s.viewer.token, 'GET', '/certificates?status=INVENTADO')).status).toBe(400);
  expect((await api(s.viewer.token, 'GET', '/certificates?periodId=no-uuid')).status).toBe(400);
});

test('4. al retirar el permiso con la sesión abierta, la siguiente solicitud queda bloqueada', async () => {
  expect((await api(s.viewer.token, 'GET', '/certificates')).status).toBe(200);
  const updated = await api(s.adminToken, 'PUT', `/roles/${s.roleId}`, { permissions: ['certificados:aprobar'] });
  expect(updated.status).toBe(200);
  expect((await api(s.viewer.token, 'GET', '/certificates')).status).toBe(403);
  // Se devuelve el permiso: vuelve a consultar, con el alcance que tenía definido.
  expect((await api(s.adminToken, 'PUT', `/roles/${s.roleId}`, { permissions: ['certificados:aprobar', 'certificados:consultar'] })).status).toBe(200);
  expect((await api(s.viewer.token, 'GET', '/certificates')).status).toBe(200);
});

test('5. una cuenta sin autorización no consulta ni puede concederse permisos de certificación', async () => {
  const plain = await api<{ role: Named }>(s.adminToken, 'POST', '/roles', { name: plainRoleName, description: 'Sin certificación, ficticio (E2E)', permissions: ['students:read'] });
  expect(plain.status).toBe(201);
  s.plainRoleId = plain.body.role.id;
  s.plain.account = accountFor('sin-permiso', plainRoleName);
  const made = await createAccount(s.plain.account, s.plainRoleId);
  s.plain.id = made.id;
  s.plain.token = made.token;

  expect((await api(s.plain.token, 'GET', '/certificates')).status).toBe(403);
  expect((await api(s.plain.token, 'GET', `/certificates/${UNKNOWN_ID}`)).status).toBe(403);
  expect((await api('', 'GET', '/certificates')).status).toBe(401);

  // No puede ampliar su propio rol con permisos de certificación ni asignarse uno que los tenga.
  expect((await api(s.plain.token, 'PUT', `/roles/${s.plainRoleId}`, { permissions: ['students:read', 'certificados:consultar'] })).status).toBe(403);
  expect((await api(s.plain.token, 'PUT', `/users/${s.plain.id}/role`, { roleId: s.roleId })).status).toBe(403);
  const after = new Map(list<RoleRow>((await api(s.adminToken, 'GET', '/roles')).body, 'roles').map((r) => [r.name, r]));
  expect(after.get(plainRoleName)?.permissions?.map((p) => p.code)).toEqual(['students:read']);
});

test('6. la administración sí puede delegar el permiso de emitir a un rol a medida', async () => {
  const delegated = await api<{ role: RoleRow }>(s.adminToken, 'POST', '/roles', { name: `Emisión E2E ${stamp}`, description: 'Emite certificados, ficticio (E2E)', permissions: ['certificados:consultar', 'certificados:emitir'] });
  expect(delegated.status).toBe(201);
  expect(delegated.body.role.permissions?.map((p) => p.code).sort()).toEqual(['certificados:consultar', 'certificados:emitir']);
});

