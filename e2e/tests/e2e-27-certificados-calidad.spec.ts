import { expect, test, type Page } from '@playwright/test';
import { accounts, type Account } from '../support/accounts';
import { api, apiLogin, apiPublic } from '../support/api';
import { expectNoSeriousViolations } from '../support/a11y';
import { loginUi } from '../support/ui';

// E2E-27 (certificación del docente tutor, corte 6): calidad de la pantalla de certificados más allá del camino feliz. Axe sin
// infracciones serias en la lista, el detalle y cada ventana (administración y cuenta de solo consulta, en escritorio y en móvil), sin
// desplazamiento horizontal de la página en 375 y 320 px, recorrido por teclado (el foco entra al diálogo, Tab no sale, Escape cierra solo
// el de arriba y el foco vuelve a quien lo abrió) y recorrido en móvil por el selector de la sección. Axe no sustituye al lector de
// pantalla ni al teléfono real. Todo con un docente y una cuenta de datos ficticios; necesita la bandeja de correo de pruebas (Mailpit).
test.describe.configure({ mode: 'serial' });

const MAILPIT = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025';
const stamp = Date.now().toString(36);
const PASSWORD = 'Prueba2026!x';
const TEACHER = `Ficticio Calidad ${stamp}`;
const TEACHER_FULL = `Docente ${TEACHER}`;
const CANDIDATE = `Candidato Calidad ${stamp}`;
const CANDIDATE_FULL = `Docente ${CANDIDATE}`;
const MOBILE = { width: 375, height: 812 };
const NARROW = { width: 320, height: 640 };

interface Named {
  id: string;
  name: string;
}

const s = {
  adminToken: '',
  school: { id: '', name: '' },
  tutorId: '',
  candidateId: '',
  certificateId: '',
  evidenceIds: [] as string[],
  viewer: undefined as unknown as Account,
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

/** Cuánto se desplaza la página hacia los lados más allá del ancho visible (0 = nada). */
const horizontalOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** El diálogo cabe en el ancho de la pantalla y sus bordes no quedan fuera. */
async function expectFitsViewport(page: Page, name: RegExp | string): Promise<void> {
  const box = await dialog(page, name).boundingBox();
  const viewport = page.viewportSize()!;
  expect(box, 'el diálogo debe estar a la vista').not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 0.5);
  expect(box!.height).toBeLessThanOrEqual(viewport.height + 0.5);
}

/** Pulsa Tab hasta que el foco llegue a un elemento que cumpla la condición (un recorrido real por teclado, no `focus()`). */
async function tabUntil(page: Page, matches: (el: Element | null) => boolean, max = 80): Promise<void> {
  for (let i = 0; i < max; i += 1) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(matches, undefined as never).catch(() => false)) return;
  }
  throw new Error(`El foco no llegó al elemento esperado tras ${max} pulsaciones de Tab`);
}

const focusedName = (page: Page) => page.evaluate(() => (document.activeElement as HTMLElement | null)?.getAttribute('aria-label') ?? (document.activeElement as HTMLElement | null)?.textContent?.trim() ?? '');
const focusIsInside = (page: Page, selector: string) => page.evaluate((sel) => !!document.activeElement?.closest(sel), selector);

/** Un docente con designación aceptada por el enlace del correo (como en los demás recorridos). */
async function acceptedTeacher(tag: string, lastName: string, cycle: number): Promise<string> {
  const roles = list<Named>((await admin('GET', '/roles')).body, 'roles');
  const email = `calidad.${tag}.${stamp}@untrm.edu.pe`;
  const created = await api<{ user: { id: string } }>(s.adminToken, 'POST', '/users', { email, firstName: 'Docente', lastName, roleId: roles.find((r) => r.name === 'Docente Tutor')!.id, schoolId: s.school.id });
  expect(created.status).toBe(201);
  expect((await admin('PUT', `/schools/${s.school.id}/cycle-tutors/${cycle}`, { tutorId: created.body.user.id })).status).toBe(200);
  expect(((await admin('POST', `/schools/${s.school.id}/cycle-tutors/${cycle}/acceptance-request`, {})).body as { emailSent: boolean }).emailSent).toBe(true);
  expect((await apiPublic('POST', `/tutor-acceptance/${await acceptanceToken(email)}`, { accept: true, availability: [{ day: 5, start: '08:00', end: '10:00', place: 'Aula E2E' }] })).status).toBe(200);
  return created.body.user.id;
}

test.beforeAll(async () => {
  s.adminToken = await apiLogin(accounts.admin);
  const schools = list<Named>((await admin('GET', '/schools')).body, 'schools');
  s.school = schools.find((x) => /Sistemas/.test(x.name))!;
  expect(s.school, 'escuela de Sistemas sembrada').toBeTruthy();
});

test('1. preparación: docente con designación aceptada, trámite en revisión con una evidencia observada y una cuenta que solo consulta', async () => {
  s.tutorId = await acceptedTeacher('docente', TEACHER, 5);
  s.candidateId = await acceptedTeacher('candidato', CANDIDATE, 4); // sin trámite: se inicia por teclado en el caso 9
  const period = (await admin('GET', '/periods/current')).body as { period: { id: string } };

  const started = await admin('POST', '/certificates', { tutorId: s.tutorId, periodId: period.period.id, schoolId: s.school.id });
  expect(started.status).toBe(201);
  const certificate = (started.body as { certificate: { id: string; evidences: { id: string }[] } }).certificate;
  s.certificateId = certificate.id;
  s.evidenceIds = certificate.evidences.map((e) => e.id);
  expect((await admin('POST', `/certificates/${s.certificateId}/submit`, {})).status).toBe(200);
  expect((await admin('PUT', `/certificates/${s.certificateId}/evidences/${s.evidenceIds[0]}`, { result: 'OBSERVADA', comment: 'Observación ficticia de la prueba' })).status).toBe(200);

  const role = await api<{ role: Named }>(s.adminToken, 'POST', '/roles', { name: `Solo consulta calidad E2E ${stamp}`, description: 'Ficticio (E2E)', permissions: ['certificados:consultar'] });
  expect(role.status).toBe(201);
  s.viewer = { email: `calidad.consulta.${stamp}@untrm.edu.pe`, password: PASSWORD, role: 'consulta', greeting: 'Consulta' };
  const account = await api<{ user: { id: string }; invitation: { link: string } }>(s.adminToken, 'POST', '/users', { email: s.viewer.email, firstName: 'Consulta', lastName: 'Ficticia', roleId: role.body.role.id });
  expect(account.status).toBe(201);
  expect((await apiPublic('POST', '/auth/reset-password', { token: account.body.invitation.link.split('/').pop(), newPassword: PASSWORD })).status).toBe(200);
  expect((await admin('PUT', `/users/${account.body.user.id}/access`, { kind: 'SCHOOLS', schoolIds: [s.school.id] })).status).toBe(200);
});

test('2. axe (escritorio, administración): la lista, el detalle y cada ventana no tienen infracciones serias ni de estructura', async ({ page }, testInfo) => {
  await loginUi(page, accounts.admin);
  await page.goto(`/certificados?escuela=${s.school.id}`);
  await expect(page.getByRole('region', { name: 'Trámites de certificado' })).toBeVisible();
  await expectNoSeriousViolations(page, testInfo, 'certificados · lista (administración)');

  await page.getByRole('button', { name: `Ver trámite de ${TEACHER_FULL}` }).click();
  await expect(detail(page)).toBeVisible();
  await expectNoSeriousViolations(page, testInfo, 'certificados · detalle', '[role="dialog"]');

  // La evidencia observada se puede corregir: el formulario de observación también se revisa.
  await detail(page).getByRole('button', { name: 'Marcar observada: Aceptación de la designación' }).click();
  await expectNoSeriousViolations(page, testInfo, 'certificados · observar una evidencia', '[role="dialog"]');

  await detail(page).getByRole('button', { name: 'Cancelar' }).click();
  await detail(page).getByRole('button', { name: 'Devolver con observaciones' }).click();
  await expect(dialog(page, 'Devolver con observaciones')).toBeVisible();
  await expectNoSeriousViolations(page, testInfo, 'certificados · devolver con observaciones', '[aria-labelledby="cert-reason-title"]');
  await dialog(page, 'Devolver con observaciones').getByRole('button', { name: 'Cancelar' }).click();

  await detail(page).getByRole('button', { name: 'Rechazar' }).click();
  await expect(dialog(page, 'Rechazar el trámite')).toBeVisible();
  await expectNoSeriousViolations(page, testInfo, 'certificados · rechazar', '[aria-labelledby="cert-reason-title"]');
  await dialog(page, 'Rechazar el trámite').getByRole('button', { name: 'Cancelar' }).click();

  await detail(page).getByRole('button', { name: 'Anular', exact: true }).click();
  await expect(dialog(page, 'Anular el certificado')).toBeVisible();
  await expectNoSeriousViolations(page, testInfo, 'certificados · anular', '[aria-labelledby="cert-reason-title"]');
  await dialog(page, 'Anular el certificado').getByRole('button', { name: 'Cancelar' }).click();

  await page.goto('/certificados?dialogo=resolucion');
  await expect(dialog(page, 'Resolución de decanato')).toBeVisible();
  await expectNoSeriousViolations(page, testInfo, 'certificados · resolución de decanato', '[aria-labelledby="cert-resolution-title"]');
});

test('3. axe (escritorio, cuenta de solo consulta): la lista y el detalle sin acciones no tienen infracciones serias', async ({ page }, testInfo) => {
  await loginUi(page, s.viewer);
  await page.goto('/certificados');
  await expect(page.getByRole('region', { name: 'Trámites de certificado' })).toBeVisible();
  await expectNoSeriousViolations(page, testInfo, 'certificados · lista (solo consulta)');
  await page.getByRole('button', { name: `Ver trámite de ${TEACHER_FULL}` }).click();
  await expect(detail(page)).toBeVisible();
  await expectNoSeriousViolations(page, testInfo, 'certificados · detalle (solo consulta)', '[role="dialog"]');
});

for (const [label, viewport] of [['375 px', MOBILE], ['320 px', NARROW]] as const) {
  test(`4. móvil ${label}: la página no se desplaza hacia los lados y cada ventana cabe en la pantalla`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await loginUi(page, accounts.admin);
    await page.goto(`/certificados?escuela=${s.school.id}`);
    await expect(page.getByRole('region', { name: 'Trámites de certificado' })).toBeVisible();
    expect(await horizontalOverflow(page), 'la lista no debe desbordar la página').toBe(0);

    await page.getByRole('button', { name: `Ver trámite de ${TEACHER_FULL}` }).click();
    await expect(detail(page)).toBeVisible();
    await expectFitsViewport(page, /Certificado de Docente/);
    expect(await horizontalOverflow(page)).toBe(0);

    for (const [button, title] of [['Rechazar', 'Rechazar el trámite'], ['Anular', 'Anular el certificado']] as const) {
      await detail(page).getByRole('button', { name: button, exact: true }).scrollIntoViewIfNeeded();
      await detail(page).getByRole('button', { name: button, exact: true }).click();
      await expect(dialog(page, title)).toBeVisible();
      await expectFitsViewport(page, title);
      // Los botones de la ventana se alcanzan desplazándola, no quedan cortados.
      const submit = dialog(page, title).getByRole('button', { name: title });
      await submit.scrollIntoViewIfNeeded();
      await expect(submit).toBeInViewport();
      expect(await horizontalOverflow(page)).toBe(0);
      await dialog(page, title).getByRole('button', { name: 'Cancelar' }).click();
    }
  });
}

test('5. axe (móvil 375 px): la lista y el detalle no tienen infracciones serias ni de estructura', async ({ page }, testInfo) => {
  await page.setViewportSize(MOBILE);
  await loginUi(page, accounts.admin);
  await page.goto(`/certificados?escuela=${s.school.id}`);
  await expect(page.getByRole('region', { name: 'Trámites de certificado' })).toBeVisible();
  await expectNoSeriousViolations(page, testInfo, 'certificados · lista (móvil)');
  await page.getByRole('button', { name: `Ver trámite de ${TEACHER_FULL}` }).click();
  await expect(detail(page)).toBeVisible();
  await expectNoSeriousViolations(page, testInfo, 'certificados · detalle (móvil)', '[role="dialog"]');
});

test('6. móvil: se llega a Certificados por el selector de la sección, se abre el trámite y se marca una evidencia', async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await loginUi(page, accounts.admin);
  await page.goto('/pedir-listas');
  await page.getByLabel('Tarea del periodo').selectOption({ label: 'Certificados' });
  await expect(page).toHaveURL(/\/certificados/);
  await expect(page.getByRole('heading', { level: 1, name: 'Certificados' }).last()).toBeVisible();

  await page.getByRole('button', { name: `Ver trámite de ${TEACHER_FULL}` }).click();
  await expect(detail(page)).toBeVisible();
  const mark = detail(page).getByRole('button', { name: 'Marcar conforme: Sesiones realizadas' });
  await mark.scrollIntoViewIfNeeded();
  await mark.tap().catch(() => mark.click());
  await expect(detail(page).getByRole('button', { name: 'Marcar conforme: Sesiones realizadas' })).toBeDisabled(); // quedó conforme
  await expectFitsViewport(page, /Certificado de Docente/);
});

test('7. teclado: Tab llega al botón, Enter abre el trámite, el foco queda dentro, Escape cierra solo el diálogo de arriba y el foco vuelve', async ({ page }) => {
  await loginUi(page, accounts.admin);
  await page.goto(`/certificados?escuela=${s.school.id}`);
  await expect(page.getByRole('region', { name: 'Trámites de certificado' })).toBeVisible();

  // Con el teclado hasta el botón de este docente; Enter abre su trámite.
  await tabUntil(page, () => (document.activeElement as HTMLElement | null)?.getAttribute('aria-label')?.startsWith('Ver trámite de Docente Ficticio Calidad') ?? false, 120);
  const opener = await focusedName(page);
  expect(opener).toBe(`Ver trámite de ${TEACHER_FULL}`);
  await page.keyboard.press('Enter');
  await expect(detail(page)).toBeVisible();
  expect(await focusIsInside(page, '[role="dialog"]'), 'al abrir, el foco pasa al diálogo').toBe(true);

  // Tab no sale del diálogo (se recorre más de una vuelta).
  for (let i = 0; i < 25; i += 1) {
    await page.keyboard.press('Tab');
    expect(await focusIsInside(page, '[role="dialog"]'), `Tab nº ${i + 1} no debe sacar el foco del diálogo`).toBe(true);
  }

  // Un segundo diálogo encima: Escape cierra solo el de arriba.
  await detail(page).getByRole('button', { name: 'Rechazar' }).focus();
  await page.keyboard.press('Enter');
  await expect(dialog(page, 'Rechazar el trámite')).toBeVisible();
  expect(await focusIsInside(page, '[aria-labelledby="cert-reason-title"]')).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog(page, 'Rechazar el trámite')).toHaveCount(0);
  await expect(detail(page)).toBeVisible();

  // Escape otra vez cierra el trámite y el foco vuelve al botón que lo abrió.
  await page.keyboard.press('Escape');
  await expect(detail(page)).toHaveCount(0);
  expect(await focusedName(page)).toBe(opener);
});

test('8. teclado: escribir un motivo y cerrarlo con Escape conserva el borrador; se envía con el teclado', async ({ page }) => {
  await loginUi(page, accounts.admin);
  await page.goto(`/certificados?certificado=${s.certificateId}`);
  await expect(detail(page)).toBeVisible();
  await detail(page).getByRole('button', { name: 'Anular', exact: true }).focus();
  await page.keyboard.press('Enter');
  const reason = dialog(page, 'Anular el certificado');
  await expect(reason).toBeVisible();
  await page.keyboard.type('Motivo escrito solo con el teclado');
  await page.keyboard.press('Escape');
  await expect(reason).toHaveCount(0);

  await detail(page).getByRole('button', { name: 'Anular', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(dialog(page, 'Anular el certificado').getByRole('status').filter({ hasText: 'Recuperamos lo que habías escrito' })).toBeVisible();
  await expect(dialog(page, 'Anular el certificado').getByLabel('Motivo de la anulación')).toHaveValue('Motivo escrito solo con el teclado');
  await page.keyboard.press('Escape'); // cerrar con Escape no anula: el trámite sigue vivo
  await expect(dialog(page, 'Anular el certificado')).toHaveCount(0);
  const state = (await admin('GET', `/certificates/${s.certificateId}`)).body as { certificate: { status: string } };
  expect(state.certificate.status).toBe('EN_REVISION');
});

test('9. teclado: el trámite de un docente sin trámite se inicia solo con el teclado y su detalle recibe el foco', async ({ page }) => {
  await loginUi(page, accounts.admin);
  await page.goto(`/certificados?escuela=${s.school.id}`);
  await expect(page.getByRole('button', { name: `Iniciar trámite de ${CANDIDATE_FULL}` })).toBeVisible();
  await tabUntil(page, () => (document.activeElement as HTMLElement | null)?.getAttribute('aria-label')?.startsWith('Iniciar trámite de Docente Candidato Calidad') ?? false, 160);
  await page.keyboard.press('Enter');
  const d = dialog(page, new RegExp(`Certificado de ${CANDIDATE_FULL}`));
  await expect(d).toBeVisible();
  expect(await focusIsInside(page, '[role="dialog"]'), 'el detalle del trámite recién iniciado recibe el foco').toBe(true);
  await expect(d.getByText('Iniciado', { exact: true })).toBeVisible();
  // Con el teclado se llega a «Enviar a revisión» y se envía.
  await tabUntil(page, () => (document.activeElement as HTMLElement | null)?.textContent?.trim() === 'Enviar a revisión', 40);
  await page.keyboard.press('Enter');
  await expect(d.getByText('En revisión', { exact: true })).toBeVisible();
});
