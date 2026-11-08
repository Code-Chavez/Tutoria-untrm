import { expect, test, type Page } from '@playwright/test';
import { accounts, type Account } from '../support/accounts';
import { expectNoSeriousViolations } from '../support/a11y';
import { api, apiLogin, apiPublic } from '../support/api';
import { releaseCycles } from '../support/setup';
import { goToMenu, loginUi } from '../support/ui';

// E2E-28 (lista «Docentes tutores» de Periodo académico): la administración ve a los docentes del periodo con su designación y el estado de su
// certificado, distingue al docente sin asignación del que tiene la aceptación pendiente, busca y filtra (todo en la URL), y abre o inicia el trámite
// en la pantalla de Certificados. Una cuenta de solo consulta ve los datos sin la acción de iniciar; una cuenta con alcance sobre otra escuela no
// recibe docentes ni trámites ajenos (ni por la pantalla ni por la API) y una cuenta sin permisos no entra. Datos ficticios con un sello propio.
// Necesita la bandeja de correo de pruebas (Mailpit) para el enlace de aceptación del docente.
test.describe.configure({ mode: 'serial' });

const MAILPIT = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025';
const stamp = Date.now().toString(36);
const PASSWORD = 'Prueba2026!x';
const SCHOOL = 'Ingeniería de Sistemas';
const CYCLES = [8, 9];
const names = { accepted: `Aceptada ${stamp}`, pending: `Pendiente ${stamp}`, none: `SinCargo ${stamp}` };
const full = (key: keyof typeof names) => `Docente ${names[key]}`;

interface Named {
  id: string;
  name: string;
}

const s = {
  adminToken: '',
  school: { id: '', name: '' },
  otherSchool: { id: '', name: '' },
  periodId: '',
  acceptedId: '',
  certificateId: '',
  viewer: undefined as unknown as Account,
  outsider: undefined as unknown as Account,
};

const list = <T>(body: unknown, key: string): T[] => (Array.isArray(body) ? (body as T[]) : ((body as Record<string, T[]>)[key] ?? []));
const admin = (method: string, path: string, body?: unknown) => api(s.adminToken, method, path, body);

async function acceptanceToken(email: string): Promise<string> {
  for (let i = 0; i < 60; i += 1) {
    const found = (await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email} subject:"docente tutor"`)}`)).json()) as { messages?: { ID: string }[] };
    const message = found.messages?.[0];
    if (message) {
      const body = (await (await fetch(`${MAILPIT}/api/v1/message/${message.ID}`)).json()) as { Text: string };
      const match = /\/aceptar-tutoria\/([0-9a-f]{64})/.exec(body.Text);
      if (match) return match[1] as string;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No llegó el correo de aceptación a ${email}`);
}

async function teacher(key: keyof typeof names, cycle: number | null): Promise<string> {
  const roles = list<Named>((await admin('GET', '/roles')).body, 'roles');
  const email = `docentes.${key}.${stamp}@untrm.edu.pe`;
  const created = await api<{ user: { id: string } }>(s.adminToken, 'POST', '/users', { email, firstName: 'Docente', lastName: names[key], roleId: roles.find((r) => r.name === 'Docente Tutor')!.id, schoolId: s.school.id });
  expect(created.status).toBe(201);
  const id = created.body.user.id;
  if (cycle === null) return id;
  expect((await admin('PUT', `/schools/${s.school.id}/cycle-tutors/${cycle}`, { tutorId: id })).status).toBe(200);
  expect(((await admin('POST', `/schools/${s.school.id}/cycle-tutors/${cycle}/acceptance-request`, {})).body as { emailSent: boolean }).emailSent).toBe(true);
  if (key === 'accepted') {
    expect((await apiPublic('POST', `/tutor-acceptance/${await acceptanceToken(email)}`, { accept: true, availability: [{ day: 2, start: '10:00', end: '12:00', place: 'Aula E2E' }] })).status).toBe(200);
  }
  return id;
}

async function viewerAccount(label: string, schoolId: string): Promise<Account> {
  const role = await api<{ role: Named }>(s.adminToken, 'POST', '/roles', { name: `Solo consulta docentes ${label} E2E ${stamp}`, description: 'Ficticio (E2E)', permissions: ['certificados:consultar'] });
  expect(role.status).toBe(201);
  const account: Account = { email: `docentes.${label}.${stamp}@untrm.edu.pe`, password: PASSWORD, role: label, greeting: 'Consulta' };
  const created = await api<{ user: { id: string }; invitation: { link: string } }>(s.adminToken, 'POST', '/users', { email: account.email, firstName: 'Consulta', lastName: 'Ficticia', roleId: role.body.role.id });
  expect(created.status).toBe(201);
  expect((await apiPublic('POST', '/auth/reset-password', { token: created.body.invitation.link.split('/').pop(), newPassword: PASSWORD })).status).toBe(200);
  expect((await admin('PUT', `/users/${created.body.user.id}/access`, { kind: 'SCHOOLS', schoolIds: [schoolId] })).status).toBe(200);
  return account;
}

const row = (page: Page, key: keyof typeof names) => page.getByRole('row').filter({ hasText: full(key) });

async function openList(page: Page): Promise<void> {
  await goToMenu(page, 'Docentes tutores');
  await expect(page).toHaveURL(/\/docentes-tutores/);
  await expect(page.getByRole('heading', { level: 1, name: 'Docentes tutores' }).last()).toBeVisible();
}

test.beforeAll(async () => {
  s.adminToken = await apiLogin(accounts.admin);
  const schools = list<Named>((await admin('GET', '/schools')).body, 'schools');
  s.school = schools.find((x) => x.name === SCHOOL)!;
  s.otherSchool = schools.find((x) => x.id !== s.school.id)!;
  expect(s.school && s.otherSchool, 'dos escuelas sembradas').toBeTruthy();
  s.periodId = ((await admin('GET', '/periods/current')).body as { period: { id: string } }).period.id;
  await releaseCycles(SCHOOL, accounts.tutor.email, CYCLES);
});

test.afterAll(async () => {
  await releaseCycles(SCHOOL, accounts.tutor.email, CYCLES);
});

test('1. preparación: un docente con designación aceptada, uno con la aceptación pendiente, uno sin asignación y dos cuentas que solo consultan', async () => {
  s.acceptedId = await teacher('accepted', CYCLES[0]!);
  await teacher('pending', CYCLES[1]!);
  await teacher('none', null);
  s.viewer = await viewerAccount('misescuela', s.school.id);
  s.outsider = await viewerAccount('otraescuela', s.otherSchool.id);
});

test('2. «Docentes tutores» es una pestaña de Periodo académico; muestra designación, ciclos y estado del certificado de cada docente', async ({ page }) => {
  await loginUi(page, accounts.admin);
  await openList(page);
  const tabs = page.getByRole('navigation', { name: 'Secciones de Periodo académico' });
  await expect(tabs.getByRole('link', { name: /^Docentes tutores/ })).toHaveAttribute('aria-current', 'page');

  await page.getByLabel('Buscar por nombre').fill(stamp);
  await expect(page).toHaveURL(new RegExp(`q=${stamp}`));
  await expect(page.getByRole('row').filter({ hasText: 'Docente' })).toHaveCount(3 + 1); // tres docentes y la fila de encabezado
  const accepted = row(page, 'accepted');
  await expect(accepted).toContainText(SCHOOL);
  await expect(accepted).toContainText(`Ciclo ${CYCLES[0]}: Aceptada`);
  await expect(accepted).toContainText('Sin trámite');
  await expect(row(page, 'pending')).toContainText(`Ciclo ${CYCLES[1]}: Pendiente de aceptar`);
  const none = row(page, 'none');
  await expect(none).toContainText('Sin asignación');
  await expect(none).not.toContainText('Pendiente de aceptar');
});

test('3. buscar y filtrar: por escuela, por designación y por trámite; todo queda en la URL y se restaura al recargar', async ({ page }) => {
  await loginUi(page, accounts.admin);
  await page.goto(`/docentes-tutores?q=${stamp}`);
  await expect(row(page, 'none')).toBeVisible();

  await page.getByLabel('Designación').selectOption('SIN_ASIGNACION');
  await expect(page).toHaveURL(/estado=SIN_ASIGNACION/);
  await expect(row(page, 'none')).toBeVisible();
  await expect(row(page, 'pending')).toHaveCount(0);
  await expect(row(page, 'accepted')).toHaveCount(0);

  await page.getByLabel('Designación').selectOption('PENDIENTE');
  await expect(row(page, 'pending')).toBeVisible();
  await expect(row(page, 'none')).toHaveCount(0);

  await page.getByLabel('Designación').selectOption('');
  await page.getByLabel('Trámite de certificado').selectOption('SIN_TRAMITE');
  await expect(page).toHaveURL(/tramite=SIN_TRAMITE/);
  await expect(row(page, 'accepted')).toBeVisible();
  await page.getByLabel('Trámite de certificado').selectOption('EN_REVISION');
  await expect(page.getByText('Ningún docente coincide')).toBeVisible();
  await page.getByLabel('Trámite de certificado').selectOption('');

  await page.getByLabel('Escuela profesional').selectOption(s.otherSchool.id);
  await expect(page).toHaveURL(new RegExp(`escuela=${s.otherSchool.id}`));
  await expect(page.getByText('Ningún docente coincide')).toBeVisible();
  await page.getByLabel('Escuela profesional').selectOption(s.school.id);
  await expect(row(page, 'accepted')).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('Escuela profesional')).toHaveValue(s.school.id);
  await expect(page.getByLabel('Buscar por nombre')).toHaveValue(stamp);
  await expect(row(page, 'accepted')).toBeVisible();

  // Sin tildes ni mayúsculas
  await page.getByLabel('Buscar por nombre').fill(`sincargo ${stamp}`.toUpperCase());
  await expect(row(page, 'none')).toBeVisible();
  await expect(row(page, 'accepted')).toHaveCount(0);
});

test('4. una cuenta de solo consulta ve los datos de su escuela, sin la acción de iniciar el trámite', async ({ page }) => {
  await loginUi(page, s.viewer);
  await page.goto(`/docentes-tutores?q=${stamp}`);
  await expect(row(page, 'accepted')).toBeVisible();
  await expect(row(page, 'accepted')).toContainText(`Ciclo ${CYCLES[0]}: Aceptada`);
  await expect(page.getByRole('button', { name: /Iniciar trámite de/ })).toHaveCount(0);
});

test('5. la administración inicia el trámite del docente con designación aceptada y llega a su detalle en Certificados; la lista lo muestra', async ({ page }) => {
  await loginUi(page, accounts.admin);
  await page.goto(`/docentes-tutores?q=${stamp}`);
  // Solo el docente con designación aceptada y sin trámite tiene la acción
  await expect(page.getByRole('button', { name: /Iniciar trámite de/ })).toHaveCount(1);
  await expect(row(page, 'accepted').getByRole('button', { name: `Iniciar trámite de ${full('accepted')}` })).toBeVisible();
  await row(page, 'accepted').getByRole('button', { name: `Iniciar trámite de ${full('accepted')}` }).click();

  await expect(page).toHaveURL(/\/certificados\?.*certificado=[0-9a-f-]{36}/);
  s.certificateId = new URL(page.url()).searchParams.get('certificado') as string;
  await expect(page.getByRole('dialog', { name: new RegExp(`Certificado de ${full('accepted')}`) })).toBeVisible();

  // De vuelta en la lista, el trámite aparece y ya no se puede iniciar otro; «Ver trámite» abre el mismo detalle
  await page.goto(`/docentes-tutores?q=${stamp}`);
  await expect(row(page, 'accepted')).toContainText('Iniciado');
  await expect(page.getByRole('button', { name: /Iniciar trámite de/ })).toHaveCount(0);
  await row(page, 'accepted').getByRole('button', { name: `Ver trámite de ${full('accepted')}` }).click();
  await expect(page).toHaveURL(new RegExp(`certificado=${s.certificateId}`));
  await expect(page.getByRole('dialog', { name: new RegExp(`Certificado de ${full('accepted')}`) })).toBeVisible();

  await page.goto(`/docentes-tutores?q=${stamp}&tramite=INICIADO`);
  await expect(row(page, 'accepted')).toBeVisible();
  await expect(row(page, 'none')).toHaveCount(0);
});

test('6. una cuenta con alcance sobre otra escuela no recibe docentes ni trámites ajenos, ni por la pantalla ni por la API', async ({ page }) => {
  await loginUi(page, s.outsider);
  await page.goto(`/docentes-tutores?q=${stamp}`);
  await expect(page.getByText('Ningún docente coincide')).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Docente' })).toHaveCount(0);
  // Aunque pida la escuela ajena a mano en la URL, el servidor no la abre
  await page.goto(`/docentes-tutores?escuela=${s.school.id}&q=${stamp}`);
  await expect(page.getByRole('row').filter({ hasText: 'Docente' })).toHaveCount(0);

  const token = await apiLogin(s.outsider);
  const own = await api<{ teachers: { tutorName: string }[] }>(token, 'GET', `/tutor-teachers?periodId=${s.periodId}&schoolId=${s.school.id}`);
  expect(own.status).toBe(200);
  expect(own.body.teachers).toEqual([]);
  const all = await api<{ teachers: { tutorName: string; schoolId: string }[] }>(token, 'GET', `/tutor-teachers?periodId=${s.periodId}`);
  expect(all.status).toBe(200);
  expect(all.body.teachers.filter((t) => t.tutorName.includes(stamp))).toEqual([]);
  expect(all.body.teachers.every((t) => t.schoolId === s.otherSchool.id)).toBe(true);
  // El trámite de la otra escuela responde «no encontrado», igual que uno que no existe
  expect((await api(token, 'GET', `/certificates/${s.certificateId}`)).status).toBe(404);
});

test('7. sin sesión o sin permisos de certificación no se consulta la lista, y la pantalla no se abre', async ({ page }) => {
  const anonymous = await fetch(`${process.env.E2E_API_URL ?? 'http://localhost:3000/api'}/tutor-teachers?periodId=${s.periodId}`);
  expect(anonymous.status).toBe(401);
  const tutor = await apiLogin(accounts.tutor);
  expect((await api(tutor, 'GET', `/tutor-teachers?periodId=${s.periodId}`)).status).toBe(403);
  await loginUi(page, accounts.tutor);
  await page.goto('/docentes-tutores');
  await expect(page.locator('#contenido').getByRole('heading', { name: 'Acceso denegado' })).toBeVisible();
});

test('8. axe (administración): la lista no tiene infracciones serias ni de estructura', async ({ page }, testInfo) => {
  await loginUi(page, accounts.admin);
  await page.goto(`/docentes-tutores?q=${stamp}`);
  await expect(row(page, 'accepted')).toBeVisible();
  await expectNoSeriousViolations(page, testInfo, 'docentes tutores · lista (administración)');
});

test('9. historial entre pantallas: con filtros aplicados se abre un trámite en Certificados; Atrás vuelve a la lista con los mismos filtros y resultados y Adelante abre el mismo trámite', async ({ page }) => {
  await loginUi(page, accounts.admin);
  await goToMenu(page, 'Docentes tutores');
  // Filtros aplicados desde la propia pantalla, uno tras otro y sin esperas intermedias: solo el docente de esta prueba con trámite iniciado
  // (el caso 11 comprueba por separado que ninguno se pierda; issue #255).
  await page.getByLabel('Buscar por nombre').fill(stamp);
  await expect(page).toHaveURL(new RegExp(`q=${stamp}`));
  await page.getByLabel('Escuela profesional').selectOption(s.school.id);
  await expect(page).toHaveURL(new RegExp(`escuela=${s.school.id}`));
  await page.getByLabel('Trámite de certificado').selectOption('INICIADO');
  await expect(page).toHaveURL(/tramite=INICIADO/);
  await expect(row(page, 'accepted')).toBeVisible();
  await expect(row(page, 'none')).toHaveCount(0);
  const listUrl = page.url();
  expect(new URL(listUrl).searchParams.get('q')).toBe(stamp);
  expect(new URL(listUrl).searchParams.get('escuela')).toBe(s.school.id);
  expect(new URL(listUrl).searchParams.get('tramite')).toBe('INICIADO');

  await row(page, 'accepted').getByRole('button', { name: `Ver trámite de ${full('accepted')}` }).click();
  await expect(page).toHaveURL(new RegExp(`/certificados\?.*certificado=${s.certificateId}`));
  const certificateUrl = page.url();
  const detail = page.getByRole('dialog', { name: new RegExp(`Certificado de ${full('accepted')}`) });
  await expect(detail).toBeVisible();

  // Atrás: la lista, con la misma dirección, los mismos filtros en los controles y los mismos resultados
  await page.goBack();
  await expect(page).toHaveURL(listUrl);
  await expect(page.getByRole('heading', { level: 1, name: 'Docentes tutores' }).last()).toBeVisible();
  await expect(page.getByLabel('Buscar por nombre')).toHaveValue(stamp);
  await expect(page.getByLabel('Escuela profesional')).toHaveValue(s.school.id);
  await expect(page.getByLabel('Trámite de certificado')).toHaveValue('INICIADO');
  await expect(row(page, 'accepted')).toBeVisible();
  await expect(row(page, 'none')).toHaveCount(0);
  await expect(row(page, 'pending')).toHaveCount(0);

  // Adelante: otra vez el mismo trámite abierto en Certificados
  await page.goForward();
  await expect(page).toHaveURL(certificateUrl);
  await expect(detail).toBeVisible();
});

test('10. comportamiento actual (documentado, no es una garantía): dentro de la lista los filtros reemplazan la entrada del historial, así que Atrás no recupera la combinación anterior sino que sale de la pantalla', async ({ page }) => {
  await loginUi(page, accounts.admin);
  await goToMenu(page, 'Docentes tutores');
  await page.getByLabel('Designación').selectOption('ACEPTADA');
  await expect(page).toHaveURL(/estado=ACEPTADA/);
  await page.getByLabel('Trámite de certificado').selectOption('INICIADO');
  await expect(page).toHaveURL(/tramite=INICIADO/);
  await page.goBack();
  // No volvió a «solo estado=ACEPTADA»: salió de la lista (al panel de inicio, de donde se entró)
  await expect(page).not.toHaveURL(/\/docentes-tutores/);
  test.info().annotations.push({ type: 'diferencia', description: 'Recuperar combinaciones anteriores de filtros con Atrás exigiría cambiar replace: true por una entrada de historial por cambio; hoy no se hace.' });
});

test('11. cambios rápidos (issue #255): buscar, elegir escuela y elegir estado sin pausas conserva los tres filtros en la URL y la lista muestra el resultado que les corresponde', async ({ page }) => {
  await loginUi(page, accounts.admin);
  for (let i = 0; i < 6; i += 1) {
    await page.goto('/docentes-tutores');
    await expect(page.getByLabel('Buscar por nombre')).toBeVisible();
    await page.getByLabel('Buscar por nombre').fill(stamp);
    await page.getByLabel('Escuela profesional').selectOption(s.school.id);
    await page.getByLabel('Trámite de certificado').selectOption('SIN_TRAMITE');
    // Los tres filtros llegan a la URL...
    await expect(page).toHaveURL(new RegExp(`q=${stamp}`));
    await expect(page).toHaveURL(new RegExp(`escuela=${s.school.id}`));
    await expect(page).toHaveURL(/tramite=SIN_TRAMITE/);
    // ...y a la lista: los dos docentes de la prueba sin trámite (pendiente y sin asignación), no el que ya tiene trámite
    await expect(row(page, 'pending')).toBeVisible();
    await expect(row(page, 'none')).toBeVisible();
    await expect(row(page, 'accepted')).toHaveCount(0);
  }
});

test('12. vista móvil (375 px): se llega a «Docentes tutores» desde el selector de la sección, no hay desplazamiento horizontal de la página, los filtros y las acciones se pueden usar y no hay infracciones de axe', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await loginUi(page, accounts.admin);
  const noHorizontalScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

  // Desde otra pestaña de la sección, el selector «Tarea del periodo» lleva a la lista
  await page.goto('/pedir-listas');
  await page.locator('#period-task').selectOption('/docentes-tutores');
  await expect(page).toHaveURL(/\/docentes-tutores/);
  await expect(page.getByRole('heading', { level: 1, name: 'Docentes tutores' }).last()).toBeVisible();

  await page.getByLabel('Buscar por nombre').fill(stamp);
  await expect(row(page, 'accepted')).toBeVisible();
  expect(await noHorizontalScroll()).toBe(true);
  await expectNoSeriousViolations(page, testInfo, 'docentes tutores · lista (móvil 375 px)');

  // Un filtro se puede usar con el teléfono y la lista responde
  await page.getByLabel('Designación').selectOption('SIN_ASIGNACION');
  await expect(row(page, 'none')).toBeVisible();
  await expect(row(page, 'accepted')).toHaveCount(0);
  await page.getByLabel('Designación').selectOption('');

  // La acción de la fila se alcanza (la tabla se desplaza dentro de su región, no la página) y abre el trámite
  const open = row(page, 'accepted').getByRole('button', { name: `Ver trámite de ${full('accepted')}` });
  await open.scrollIntoViewIfNeeded();
  await expect(open).toBeVisible();
  await open.click();
  await expect(page).toHaveURL(new RegExp(`certificado=${s.certificateId}`));
  await expect(page.getByRole('dialog', { name: new RegExp(`Certificado de ${full('accepted')}`) })).toBeVisible();
  expect(await noHorizontalScroll()).toBe(true);

  // Atrás vuelve a la lista con el mismo filtro de búsqueda
  await page.goBack();
  await expect(page.getByLabel('Buscar por nombre')).toHaveValue(stamp);
  await expect(row(page, 'accepted')).toBeVisible();
});
