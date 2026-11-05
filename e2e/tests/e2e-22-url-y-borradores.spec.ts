import { expect, test, type Page } from '@playwright/test';
import { accounts } from '../support/accounts';
import { api, apiLogin } from '../support/api';
import { loginUi } from '../support/ui';

// E2E-22 (estado en la URL y borradores): los filtros viven en la URL (recargar o abrir el enlace en otra pestaña los restaura);
// las ventanas se abren, se cierran y responden a Atrás/Adelante; lo escrito se conserva como borrador de la pestaña, en el formulario
// correcto, y se limpia al guardar o al descartar; y el borrador de una persona no aparece en la sesión de otra cuenta.
// Todo con datos ficticios creados por la propia prueba.
test.describe.configure({ mode: 'serial' });

const stamp = Date.now().toString(36);
const DRAFT_NOTICE = /Recuperamos lo que habías escrito/;

const s = {
  token: '',
  page: undefined as unknown as Page,
  studentA: { id: '', code: '' },
  studentB: { id: '', code: '' },
};

const draftKeys = (page: Page) => page.evaluate(() => Object.keys(sessionStorage).filter((k) => k.startsWith('sit.draft.')));
const dialog = (page: Page, name: RegExp) => page.getByRole('dialog', { name });

async function createStudent(tag: string): Promise<{ id: string; code: string }> {
  const schools = (await api<{ schools?: { id: string; name: string }[] } | { id: string; name: string }[]>(s.token, 'GET', '/schools')).body;
  const list = Array.isArray(schools) ? schools : (schools?.schools ?? []);
  const code = String(Date.now()).slice(-7) + tag;
  const res = await api<{ student: { id: string } }>(s.token, 'POST', '/students', { studentCode: code, firstName: `Ficticio${tag}`, lastName: `Borrador ${code}`, cycle: 3, schoolId: list[0].id });
  expect(res.status).toBe(201);
  return { id: res.body.student.id, code };
}

test.beforeAll(async ({ browser }) => {
  s.token = await apiLogin(accounts.admin);
  s.studentA = await createStudent('1');
  s.studentB = await createStudent('2');
  s.page = await (await browser.newContext()).newPage();
  await loginUi(s.page, accounts.admin);
});

test.afterAll(async () => {
  await s.page?.context().close();
});

test('1. Pendientes: los filtros se restauran al recargar y al abrir el enlace en otra pestaña', async () => {
  const page = s.page;
  await page.goto('/pendientes');
  await page.getByLabel('Buscar pendiente').fill('prueba');
  await expect(page).toHaveURL(/q=prueba/);
  const school = page.getByLabel('Escuela profesional');
  const firstSchool = await school.locator('option').nth(1).getAttribute('value');
  if (firstSchool) {
    await school.selectOption(firstSchool);
    await expect(page).toHaveURL(new RegExp(`escuela=${firstSchool}`));
  }
  const kindValue = await page.getByLabel('Tipo de pendiente').locator('option').nth(1).getAttribute('value');
  if (kindValue) {
    await page.getByLabel('Tipo de pendiente').selectOption(kindValue);
    await expect(page).toHaveURL(new RegExp(`tipo=${kindValue}`));
  }
  const url = page.url();

  await page.reload();
  await expect(page.getByLabel('Buscar pendiente')).toHaveValue('prueba');
  if (firstSchool) await expect(page.getByLabel('Escuela profesional')).toHaveValue(firstSchool);
  if (kindValue) await expect(page.getByLabel('Tipo de pendiente')).toHaveValue(kindValue);

  const other = await page.context().newPage();
  await other.goto(url);
  await expect(other.getByLabel('Buscar pendiente')).toHaveValue('prueba');
  if (firstSchool) await expect(other.getByLabel('Escuela profesional')).toHaveValue(firstSchool);
  if (kindValue) await expect(other.getByLabel('Tipo de pendiente')).toHaveValue(kindValue);
  await other.close();

  // Un valor inexistente en la URL no rompe la pantalla.
  await page.goto('/pendientes?tipo=NO_EXISTE&escuela=000');
  await expect(page.getByRole('heading', { level: 1, name: 'Pendientes' })).toBeVisible();
});

test('2. Pedir listas: escuela, tipo de lista y observación se restauran; la observación es borrador de la pestaña', async () => {
  const page = s.page;
  await page.goto('/pedir-listas');
  await page.getByLabel('Qué lista pedir').selectOption('DOCENTES');
  await expect(page).toHaveURL(/lista=docentes/);
  const schoolSel = page.getByLabel('Escuela profesional');
  const second = await schoolSel.locator('option').nth(1).getAttribute('value');
  if (second) {
    await schoolSel.selectOption(second);
    await expect(page).toHaveURL(new RegExp(`escuela=${second}`));
  }
  await page.getByLabel('Observaciones (opcional)').fill(`Solo docentes con carga ${stamp}`);
  await expect(page).not.toHaveURL(/Solo|carga/); // lo escrito no va a la URL
  await page.reload();
  await expect(page.getByLabel('Qué lista pedir')).toHaveValue('DOCENTES');
  if (second) await expect(page.getByLabel('Escuela profesional')).toHaveValue(second);
  await expect(page.getByLabel('Observaciones (opcional)')).toHaveValue(`Solo docentes con carga ${stamp}`);
  expect(await draftKeys(page)).toEqual(expect.arrayContaining([expect.stringContaining('pedido-listas.nota')]));

  // Otra pestaña con el mismo enlace restaura los filtros, no el borrador (es de cada pestaña).
  const other = await page.context().newPage();
  await other.goto(page.url());
  await expect(other.getByLabel('Qué lista pedir')).toHaveValue('DOCENTES');
  await expect(other.getByLabel('Observaciones (opcional)')).toHaveValue('');
  await other.close();
});

test('3. Estudiantes: «Nuevo estudiante» abre, cierra y responde a Atrás/Adelante; el borrador se recupera y se limpia al descartar', async () => {
  const page = s.page;
  await page.goto('/tutorados');
  await page.getByRole('button', { name: 'Nuevo estudiante' }).first().click();
  await expect(dialog(page, /Nuevo estudiante/)).toBeVisible();
  await expect(page).toHaveURL(/dialogo=nuevo/);

  await page.goBack();
  await expect(dialog(page, /Nuevo estudiante/)).toHaveCount(0);
  await expect(page).not.toHaveURL(/dialogo=/);
  await page.goForward();
  await expect(dialog(page, /Nuevo estudiante/)).toBeVisible();

  await page.getByLabel('Nombres').fill('Borradora');
  await page.getByLabel('Apellidos').fill(`Ficticia ${stamp}`);
  await expect(page).not.toHaveURL(/Borradora|Ficticia/); // datos personales fuera de la URL

  // Cancelar conserva el borrador.
  await dialog(page, /Nuevo estudiante/).getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialog(page, /Nuevo estudiante/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Nuevo estudiante' }).first().click();
  await expect(page.getByRole('status').filter({ hasText: DRAFT_NOTICE })).toBeVisible();
  await expect(page.getByLabel('Nombres')).toHaveValue('Borradora');

  // Recargar con la ventana abierta: la ventana y el borrador siguen ahí.
  await page.reload();
  await expect(dialog(page, /Nuevo estudiante/)).toBeVisible();
  await expect(page.getByLabel('Nombres')).toHaveValue('Borradora');
  await expect(page.getByLabel('Apellidos')).toHaveValue(`Ficticia ${stamp}`);

  // Descartar limpia el formulario y el almacenamiento de esa ventana.
  await page.getByRole('button', { name: 'Descartar borrador' }).click();
  await expect(page.getByLabel('Nombres')).toHaveValue('');
  await expect(page.getByRole('status').filter({ hasText: DRAFT_NOTICE })).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel('Nombres')).toHaveValue('');
  expect((await draftKeys(page)).filter((k) => k.endsWith('estudiante.nuevo'))).toEqual([]);
});

test('4. Estudiantes: el borrador de una edición vuelve al estudiante correcto y no se mezcla con otro', async () => {
  const page = s.page;
  await page.goto(`/tutorados?dialogo=editar&estudiante=${s.studentA.id}`);
  await expect(dialog(page, /Editar estudiante/)).toBeVisible();
  await expect(page.getByLabel('Nombres')).toHaveValue('Ficticio1');
  await page.getByLabel('Nombres').fill('CambioA');

  await page.goto(`/tutorados?dialogo=editar&estudiante=${s.studentB.id}`);
  await expect(dialog(page, /Editar estudiante/)).toBeVisible();
  await expect(page.getByLabel('Nombres')).toHaveValue('Ficticio2'); // no hereda lo escrito para A
  await expect(page.getByRole('status').filter({ hasText: DRAFT_NOTICE })).toHaveCount(0);

  await page.goto(`/tutorados?dialogo=editar&estudiante=${s.studentA.id}`);
  await expect(page.getByLabel('Nombres')).toHaveValue('CambioA');
  await expect(page.getByRole('status').filter({ hasText: DRAFT_NOTICE })).toBeVisible();
});

test('5. Estudiantes: guardar con éxito limpia el borrador', async () => {
  const page = s.page;
  // El borrador de A sigue presente; se guarda y debe desaparecer.
  await page.goto(`/tutorados?dialogo=editar&estudiante=${s.studentA.id}`);
  await expect(page.getByLabel('Nombres')).toHaveValue('CambioA');
  await dialog(page, /Editar estudiante/).getByRole('button', { name: /Guardar|Actualizar/ }).click();
  await expect(dialog(page, /Editar estudiante/)).toHaveCount(0);
  await expect.poll(async () => (await draftKeys(page)).filter((k) => k.endsWith(`estudiante.${s.studentA.id}`))).toEqual([]);

  const res = await api<unknown>(s.token, 'GET', `/students?q=${s.studentA.code}`);
  const rows = Array.isArray(res.body) ? res.body : ((res.body as { students?: unknown[]; data?: unknown[] }).students ?? (res.body as { data?: unknown[] }).data ?? []);
  expect((rows as { id: string; firstName: string }[]).find((r) => r.id === s.studentA.id)?.firstName).toBe('CambioA');

  await page.goto(`/tutorados?dialogo=editar&estudiante=${s.studentA.id}`);
  await expect(page.getByLabel('Nombres')).toHaveValue('CambioA'); // ahora es el dato guardado
  await expect(page.getByRole('status').filter({ hasText: DRAFT_NOTICE })).toHaveCount(0);
});

test('6. Amonestaciones: la ventana responde a Atrás, el borrador se recupera, y se limpia al descartar y al registrar', async () => {
  const page = s.page;
  await page.goto('/amonestaciones');
  await page.getByRole('button', { name: 'Nueva amonestación' }).click();
  await expect(dialog(page, /Nueva amonestación/)).toBeVisible();
  await expect(page).toHaveURL(/nuevo=1/);
  await page.goBack();
  await expect(dialog(page, /Nueva amonestación/)).toHaveCount(0);
  await page.goForward();
  await expect(dialog(page, /Nueva amonestación/)).toBeVisible();

  const reason = `Incumplimiento de sesiones ${stamp}`;
  await page.getByLabel('Motivo').fill(reason);
  await expect(page).not.toHaveURL(/Incumplimiento/);
  await dialog(page, /Nueva amonestación/).getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialog(page, /Nueva amonestación/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Nueva amonestación' }).click();
  // Sin recargar, la página sigue montada: lo escrito se conserva tal cual (el aviso de «recuperado» es solo para tras recargar).
  await expect(page.getByLabel('Motivo')).toHaveValue(reason);

  await page.reload();
  await expect(page.getByRole('status').filter({ hasText: DRAFT_NOTICE })).toBeVisible();
  await expect(page.getByLabel('Motivo')).toHaveValue(reason);
  await page.getByRole('button', { name: 'Descartar borrador' }).click();
  await expect(page.getByLabel('Motivo')).toHaveValue('');
  expect((await draftKeys(page)).filter((k) => k.endsWith('amonestacion.nueva'))).toEqual([]);

  // Registrar con éxito: el borrador no sobrevive.
  await page.getByLabel('Motivo').fill(reason);
  const tutor = page.getByLabel('Docente tutor');
  const tutorValue = await tutor.locator('option:not([value=""])').first().getAttribute('value');
  expect(tutorValue, 'hay al menos un docente tutor sembrado').toBeTruthy();
  await tutor.selectOption(tutorValue!);
  await dialog(page, /Nueva amonestación/).getByRole('button', { name: /Registrar|Guardar|Emitir/ }).click();
  await expect(dialog(page, /Nueva amonestación/)).toHaveCount(0);
  await expect(page).not.toHaveURL(/nuevo=1/);
  await expect.poll(async () => (await draftKeys(page)).filter((k) => k.endsWith('amonestacion.nueva'))).toEqual([]);
  await page.getByRole('button', { name: 'Nueva amonestación' }).click();
  await expect(page.getByLabel('Motivo')).toHaveValue('');
  await expect(page.getByRole('status').filter({ hasText: DRAFT_NOTICE })).toHaveCount(0);
});

test('7. Identidad visual: lo escrito sin guardar se recupera y se limpia al descartar', async () => {
  const page = s.page;
  await page.goto('/identidad');
  const original = await page.getByLabel('Nombre corto').inputValue();
  await page.getByLabel('Nombre corto').fill(`${original}-E2E`);
  await page.reload();
  await expect(page.getByLabel('Nombre corto')).toHaveValue(`${original}-E2E`);
  await expect(page.getByRole('status').filter({ hasText: DRAFT_NOTICE })).toBeVisible();
  await page.getByRole('button', { name: 'Descartar borrador' }).click();
  await expect(page.getByLabel('Nombre corto')).toHaveValue(original);
  await page.reload();
  await expect(page.getByLabel('Nombre corto')).toHaveValue(original);
  await expect(page.getByRole('status').filter({ hasText: DRAFT_NOTICE })).toHaveCount(0);
});

test('8. Correos de las escuelas: editar y lo escrito sobreviven a recargar, y la escuela enfocada se restaura', async ({ browser }) => {
  // El administrador no tiene escuelas a cargo; se usa la coordinadora sembrada, en su propia sesión.
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginUi(page, accounts.coordinator);
  await page.goto('/correos-escuelas');
  const edit = page.getByRole('button', { name: /^Editar el correo de/ }).first();
  if ((await edit.count()) > 0) {
    await edit.click();
    await expect(page).toHaveURL(/editar=/);
  }
  const input = page.locator('input[type="email"]').first();
  await expect(input).toBeVisible();
  await input.fill(`escuela.${stamp}@untrm.edu.pe`);
  await page.reload();
  await expect(page.locator('input[type="email"]').first()).toHaveValue(`escuela.${stamp}@untrm.edu.pe`);
  await expect(page).not.toHaveURL(/untrm\.edu\.pe/); // el correo escrito no va a la URL
  await context.close();
});

test('9. Un borrador no aparece en la sesión de otra cuenta, ni en la misma pestaña tras cambiar de usuario', async () => {
  const page = s.page;
  await page.goto('/tutorados?dialogo=nuevo');
  await page.getByLabel('Nombres').fill('SoloDelAdmin');
  expect((await draftKeys(page)).length).toBeGreaterThan(0);

  // Misma pestaña: el administrador cierra la ventana (el borrador queda), cierra sesión y entra la coordinadora.
  await dialog(page, /Nuevo estudiante/).getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialog(page, /Nuevo estudiante/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
  await loginUi(page, accounts.coordinator);
  await page.goto('/tutorados?dialogo=nuevo');
  await expect(dialog(page, /Nuevo estudiante/)).toBeVisible();
  await expect(page.getByLabel('Nombres')).toHaveValue('');
  await expect(page.getByRole('status').filter({ hasText: DRAFT_NOTICE })).toHaveCount(0);
  const keys = await draftKeys(page);
  expect(keys.some((k) => k.includes('SoloDelAdmin'))).toBe(false);

  // Otra sesión (contexto distinto) tampoco lo ve.
  const second = await page.context().browser()!.newContext();
  const other = await second.newPage();
  await loginUi(other, accounts.coordinator);
  await other.goto('/tutorados?dialogo=nuevo');
  await expect(other.getByLabel('Nombres')).toHaveValue('');
  await second.close();
});
