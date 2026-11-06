import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { accounts, type Account } from '../support/accounts';
import { api, apiLogin, apiPublic } from '../support/api';
import { goToMenu, loginUi } from '../support/ui';

// E2E-26 (certificación del docente tutor, corte 5: la pantalla): la administración abre «Certificados» desde Periodo académico, filtra por
// escuela, inicia el trámite de un docente con designación aceptada, revisa las evidencias (con lo que el sistema sabe como información),
// observa, devuelve, aprueba, registra la resolución de decanato, genera y descarga el PDF de demostración y lo anula. Comprueba el estado
// en la URL (recargar, otra pestaña, Atrás y Adelante), que lo escrito queda como borrador y no en la URL, y los permisos: una cuenta que solo
// consulta ve la pantalla sin acciones y una cuenta sin permisos no entra. Todo con un docente y una cuenta de datos ficticios.
// Necesita la bandeja de correo de pruebas (Mailpit) para el enlace de aceptación del docente.
test.describe.configure({ mode: 'serial' });

const MAILPIT = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025';
const stamp = Date.now().toString(36);
const PASSWORD = 'Prueba2026!x';
const TEACHER = `Ficticio Pantalla ${stamp}`;
const TEACHER_FULL = `Docente ${TEACHER}`;

interface Named {
  id: string;
  name: string;
}

const s = {
  adminToken: '',
  school: { id: '', name: '' },
  tutorId: '',
  viewer: undefined as unknown as Account,
  certificateId: '',
  number: '',
};

const list = <T>(body: unknown, key: string): T[] => (Array.isArray(body) ? (body as T[]) : ((body as Record<string, T[]>)[key] ?? []));
const admin = (method: string, path: string, body?: unknown) => api(s.adminToken, method, path, body);
const dialog = (page: Page, name: RegExp | string) => page.getByRole('dialog', { name });
const detail = (page: Page) => dialog(page, /Certificado de Docente/);

async function acceptanceToken(email: string): Promise<string> {
  for (let i = 0; i < 60; i += 1) {
    const found = (await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email} subject:"docente tutor"`)}`)).json()) as { messages?: { ID: string }[] };
    const message = found.messages?.[0];
    if (message) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${message.ID}`)).json()) as { Text: string };
      const match = /\/aceptar-tutoria\/([0-9a-f]{64})/.exec(full.Text);
      if (match) return match[1] as string;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No llegó el correo de aceptación a ${email}`);
}

async function openCertificates(page: Page): Promise<void> {
  await goToMenu(page, 'Certificados');
  await expect(page).toHaveURL(/\/certificados/);
  await expect(page.getByRole('heading', { level: 1, name: 'Certificados' }).last()).toBeVisible();
}

test.beforeAll(async () => {
  s.adminToken = await apiLogin(accounts.admin);
  const schools = list<Named>((await admin('GET', '/schools')).body, 'schools');
  s.school = schools.find((x) => /Sistemas/.test(x.name))!;
  expect(s.school, 'escuela de Sistemas sembrada').toBeTruthy();
});

test('1. preparación: un docente con designación aceptada y una cuenta que solo consulta certificados', async () => {
  const roles = list<Named>((await admin('GET', '/roles')).body, 'roles');
  const email = `pantalla.docente.${stamp}@untrm.edu.pe`;
  const created = await api<{ user: { id: string } }>(s.adminToken, 'POST', '/users', { email, firstName: 'Docente', lastName: TEACHER, roleId: roles.find((r) => r.name === 'Docente Tutor')!.id, schoolId: s.school.id });
  expect(created.status).toBe(201);
  s.tutorId = created.body.user.id;
  expect((await admin('PUT', `/schools/${s.school.id}/cycle-tutors/6`, { tutorId: s.tutorId })).status).toBe(200);
  expect(((await admin('POST', `/schools/${s.school.id}/cycle-tutors/6/acceptance-request`, {})).body as { emailSent: boolean }).emailSent).toBe(true);
  expect((await apiPublic('POST', `/tutor-acceptance/${await acceptanceToken(email)}`, { accept: true, availability: [{ day: 4, start: '10:00', end: '12:00', place: 'Aula E2E' }] })).status).toBe(200);

  const role = await api<{ role: Named }>(s.adminToken, 'POST', '/roles', { name: `Solo consulta de certificados E2E ${stamp}`, description: 'Ficticio (E2E)', permissions: ['certificados:consultar'] });
  expect(role.status).toBe(201);
  s.viewer = { email: `pantalla.consulta.${stamp}@untrm.edu.pe`, password: PASSWORD, role: 'consulta', greeting: 'Consulta' };
  const account = await api<{ user: { id: string }; invitation: { link: string } }>(s.adminToken, 'POST', '/users', { email: s.viewer.email, firstName: 'Consulta', lastName: 'Ficticia', roleId: role.body.role.id });
  expect(account.status).toBe(201);
  expect((await apiPublic('POST', '/auth/reset-password', { token: account.body.invitation.link.split('/').pop(), newPassword: PASSWORD })).status).toBe(200);
  expect((await admin('PUT', `/users/${account.body.user.id}/access`, { kind: 'SCHOOLS', schoolIds: [s.school.id] })).status).toBe(200);
});

test('2. «Certificados» es una pestaña de Periodo académico; el filtro de escuela queda en la URL y se restaura al recargar', async ({ page, context }) => {
  await loginUi(page, accounts.admin);
  await openCertificates(page);
  await expect(page.getByRole('note')).toContainText('Demostración sin valor');
  // La pantalla está dentro de «Periodo académico»: su barra de pestañas se ve y «Certificados» es la actual.
  const tabs = page.getByRole('navigation', { name: 'Secciones de Periodo académico' });
  await expect(tabs.getByRole('link', { name: 'Certificados', exact: true })).toHaveAttribute('aria-current', 'page');

  await page.getByLabel('Escuela profesional').selectOption(s.school.id);
  await expect(page).toHaveURL(new RegExp(`escuela=${s.school.id}`));
  await page.reload();
  await expect(page.getByLabel('Escuela profesional')).toHaveValue(s.school.id);

  // Un valor inexistente en la URL no rompe la pantalla.
  // Se abre en una pestaña nueva: WebKit en Linux se cae («Page crashed») al navegar con page.goto justo después de recargar la misma pestaña.
  const other = await context.newPage();
  await other.goto('/certificados?periodo=nope&escuela=ajena&estado=INVENTADO&certificado=');
  await expect(other.getByRole('heading', { level: 1, name: 'Certificados' }).last()).toBeVisible();
  await expect(other.getByLabel('Estado')).toHaveValue('');
  await other.close();
});

test('3. se inicia el trámite del docente sin trámite y el detalle muestra lo que el sistema sabe, solo como información', async ({ page }) => {
  await loginUi(page, accounts.admin);
  await page.goto(`/certificados?escuela=${s.school.id}`);
  await page.getByRole('button', { name: `Iniciar trámite de ${TEACHER_FULL}` }).click();
  const d = detail(page);
  await expect(d).toBeVisible();
  await expect(page).toHaveURL(/certificado=[0-9a-f-]{36}/);
  s.certificateId = new URL(page.url()).searchParams.get('certificado') as string;

  await expect(d.getByText('Iniciado', { exact: true })).toBeVisible();
  await expect(d.getByText(/Designación del ciclo 6: aceptada/)).toBeVisible();
  await expect(d.getByText('No consta un informe semestral presentado en el periodo.')).toBeVisible();
  await expect(d.getByText(/solo como información/)).toBeVisible();
  await expect(d.getByText(/cumplió/i)).toHaveCount(0);
  // El docente ya no figura entre los que no tienen trámite.
  await d.getByRole('button', { name: 'Cerrar', exact: true }).last().click();
  await expect(page.getByRole('button', { name: `Iniciar trámite de ${TEACHER_FULL}` })).toHaveCount(0);
});

test('4. Atrás cierra el trámite y Adelante lo vuelve a abrir; el enlace funciona en otra pestaña', async ({ page, context }) => {
  await loginUi(page, accounts.admin);
  await page.goto(`/certificados?escuela=${s.school.id}`);
  await page.getByRole('button', { name: `Ver trámite de ${TEACHER_FULL}` }).click();
  await expect(detail(page)).toBeVisible();

  await page.goBack();
  await expect(detail(page)).toHaveCount(0);
  await expect(page).not.toHaveURL(/certificado=/);
  await page.goForward();
  await expect(detail(page)).toBeVisible();

  const other = await context.newPage();
  await other.goto(page.url());
  await expect(detail(other)).toBeVisible();
  await other.close();

  await page.reload();
  await expect(detail(page)).toBeVisible();
});

test('5. revisión: no se aprueba con evidencias pendientes; una observación guarda su comentario como borrador y no en la URL', async ({ page }) => {
  await loginUi(page, accounts.admin);
  await page.goto(`/certificados?certificado=${s.certificateId}`);
  const d = detail(page);
  await d.getByRole('button', { name: 'Enviar a revisión' }).click();
  await expect(d.getByText('En revisión', { exact: true })).toBeVisible();
  await expect(d.getByRole('button', { name: 'Aprobar' })).toBeDisabled();
  await expect(d.getByText('Faltan por revisar 3 evidencia(s)')).toBeVisible();

  await d.getByRole('button', { name: 'Marcar observada: Informe semestral' }).click();
  await expect(d.getByRole('button', { name: 'Guardar observación' })).toBeDisabled();
  await d.getByLabel(/Qué se observa de «Informe semestral»/).fill('Falta el informe del semestre');
  expect(page.url()).not.toContain('Falta'); // lo escrito no va a la URL

  // Recargar: el trámite sigue abierto y el comentario vuelve como borrador de esta pestaña.
  await page.reload();
  await expect(detail(page)).toBeVisible();
  await detail(page).getByRole('button', { name: 'Marcar observada: Informe semestral' }).click();
  await expect(detail(page).getByRole('status').filter({ hasText: 'Recuperamos lo que habías escrito' })).toBeVisible();
  await expect(detail(page).getByLabel(/Qué se observa de «Informe semestral»/)).toHaveValue('Falta el informe del semestre');
  await detail(page).getByRole('button', { name: 'Guardar observación' }).click();
  // La evidencia quedó observada con su comentario y quién la revisó.
  await expect(detail(page).getByText('Comentario: Falta el informe del semestre')).toBeVisible();
  await expect(detail(page).getByRole('button', { name: 'Devolver con observaciones' })).toBeEnabled();
  expect(await page.evaluate(() => Object.keys(sessionStorage).filter((k) => k.includes('certificado.evidencia')))).toEqual([]); // guardada: el borrador se limpia
});

test('6. se devuelve con observaciones, se reenvía, se corrige y se aprueba con las tres evidencias conformes', async ({ page }) => {
  await loginUi(page, accounts.admin);
  await page.goto(`/certificados?certificado=${s.certificateId}`);
  const d = detail(page);
  await d.getByRole('button', { name: 'Devolver con observaciones' }).click();
  const note = dialog(page, 'Devolver con observaciones');
  await expect(page).toHaveURL(/dialogo=observar/);
  await note.getByLabel(/Nota para quien inicia/).fill('Subsanar el informe semestral');
  await note.getByRole('button', { name: 'Devolver el trámite' }).click();
  await expect(note).toHaveCount(0);
  await expect(d.getByText('Observado', { exact: true })).toBeVisible();
  await expect(d.getByText(/Subsanar el informe semestral/)).toBeVisible();

  await d.getByRole('button', { name: 'Reenviar a revisión' }).click();
  await expect(d.getByText('En revisión', { exact: true })).toBeVisible();
  for (const kind of ['Aceptación de la designación', 'Sesiones realizadas', 'Informe semestral']) {
    await d.getByRole('button', { name: `Marcar conforme: ${kind}` }).click();
    await expect(d.getByRole('button', { name: `Marcar conforme: ${kind}` })).toBeDisabled();
  }
  await expect(d.getByRole('button', { name: 'Aprobar' })).toBeEnabled();
  await d.getByRole('button', { name: 'Aprobar' }).click();
  await expect(d.getByText('Aprobado', { exact: true })).toBeVisible();
});

test('7. sin resolución de decanato no se genera; se registra desde la pantalla y entonces se genera el PDF de demostración', async ({ page }, testInfo) => {
  await loginUi(page, accounts.admin);
  await page.goto(`/certificados?certificado=${s.certificateId}`);
  const d = detail(page);

  const existing = list<{ number: string }>((await admin('GET', `/committee-resolutions?schoolId=${s.school.id}`)).body, 'resolutions');
  if (existing.length === 0) {
    await d.getByRole('button', { name: 'Generar PDF de demostración' }).click();
    await expect(d.getByRole('alert')).toContainText(/resolución de decanato/);
    await d.getByRole('button', { name: 'Registrar la resolución de decanato' }).click();
    const res = dialog(page, 'Resolución de decanato');
    await expect(page).toHaveURL(/dialogo=resolucion/);
    await res.getByLabel('Escuela profesional').selectOption(s.school.id);
    await res.getByLabel('Número de la resolución').fill(`030-2026-E2E-${stamp}`);
    await res.getByRole('button', { name: 'Guardar resolución' }).click();
    await expect(res).toHaveCount(0);
  } else {
    testInfo.annotations.push({ type: 'omitido', description: 'La escuela y el periodo ya tenían resolución de una corrida anterior' });
  }

  await d.getByRole('button', { name: 'Generar PDF de demostración' }).click();
  await expect(d.getByText('PDF generado, sin firma', { exact: true })).toBeVisible();
  const number = (await d.locator('dt:has-text("Número de registro") + dd').textContent()) ?? '';
  expect(number).toMatch(/^DEMO-\d{3,}-\d{4}\/UNTRM\/[A-Z0-9]+-[A-Z0-9]+$/);
  s.number = number;
  await expect(d.getByRole('button', { name: 'Generar PDF de demostración' })).toHaveCount(0);
});

test('8. el PDF se descarga desde la pantalla: es un PDF de una sola página con el nombre de archivo del certificado', async ({ page }, testInfo) => {
  await loginUi(page, accounts.admin);
  await page.goto(`/certificados?certificado=${s.certificateId}`);
  const d = detail(page);
  const [download] = await Promise.all([page.waitForEvent('download'), d.getByRole('button', { name: 'Descargar PDF' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^certificado-DEMO-\d{3,}-\d{4}-UNTRM-[A-Z0-9-]+\.pdf$/);
  const path = await download.path();
  const bytes = readFileSync(path!);
  expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  expect(bytes.toString('latin1').match(/\/Type \/Page(?!s)/g)).toHaveLength(1);
  await expect(d.getByText('El PDF de demostración se descargó.')).toBeVisible();
  await testInfo.attach('certificado-demostracion.pdf', { body: bytes, contentType: 'application/pdf' });
});

test('9. anular exige un motivo de al menos 10 caracteres, lo conserva como borrador y deja el trámite sin acciones', async ({ page }) => {
  await loginUi(page, accounts.admin);
  await page.goto(`/certificados?certificado=${s.certificateId}`);
  const d = detail(page);
  await d.getByRole('button', { name: 'Anular', exact: true }).click();
  const reason = dialog(page, 'Anular el certificado');
  await expect(page).toHaveURL(/dialogo=anular/);
  await expect(reason.getByRole('button', { name: 'Anular el certificado' })).toBeDisabled();
  await reason.getByLabel('Motivo de la anulación').fill('Anulación ficticia de la prueba');

  // Atrás cierra la ventana del motivo y el borrador se conserva al volver a abrirla.
  await page.goBack();
  await expect(reason).toHaveCount(0);
  await d.getByRole('button', { name: 'Anular', exact: true }).click();
  await expect(dialog(page, 'Anular el certificado').getByRole('status').filter({ hasText: 'Recuperamos lo que habías escrito' })).toBeVisible();
  await expect(dialog(page, 'Anular el certificado').getByLabel('Motivo de la anulación')).toHaveValue('Anulación ficticia de la prueba');
  await dialog(page, 'Anular el certificado').getByRole('button', { name: 'Anular el certificado' }).click();

  await expect(d.getByText('Anulado', { exact: true }).first()).toBeVisible();
  await expect(d.getByText(/Anulación ficticia de la prueba/)).toBeVisible();
  await expect(d.getByRole('button', { name: 'Anular', exact: true })).toHaveCount(0);
  await expect(d.getByText(s.number)).toBeVisible(); // un anulado conserva su número
});

test('10. una cuenta que solo consulta ve la pantalla sin acciones; una cuenta sin permisos no entra', async ({ page, browser }) => {
  await loginUi(page, s.viewer);
  await goToMenu(page, 'Certificados');
  await expect(page.getByRole('heading', { level: 1, name: 'Certificados' }).last()).toBeVisible();
  await expect(page.getByText('Docentes sin trámite')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Resolución de decanato' })).toHaveCount(0);
  await page.getByRole('button', { name: `Ver trámite de ${TEACHER_FULL}` }).click();
  const d = detail(page);
  await expect(d).toBeVisible();
  for (const name of ['Aprobar', 'Rechazar', 'Anular', 'Enviar a revisión', 'Generar PDF de demostración', 'Descargar PDF']) await expect(d.getByRole('button', { name })).toHaveCount(0);

  const other = await (await browser.newContext()).newPage();
  await loginUi(other, accounts.tutor);
  await other.goto('/certificados');
  await expect(other.getByRole('heading', { level: 1, name: 'Acceso denegado' }).last()).toBeVisible();
  await other.context().close();
});
