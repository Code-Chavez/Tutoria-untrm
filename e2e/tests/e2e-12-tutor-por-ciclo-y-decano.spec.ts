import { expect, test } from '@playwright/test';
import { accounts } from '../support/accounts';
import { api, apiLogin } from '../support/api';
import { goToMenu, loginUi } from '../support/ui';

// E2E-12 (fases 3 a 5, tutoría por ciclo): la coordinación elige al tutor del ciclo 10 de su escuela, al docente le llega un
// correo con un enlace de un solo uso, acepta con su disponibilidad (sin iniciar sesión) y la coordinación ve su respuesta;
// después el Decano de la facultad registra una amonestación que la coordinación puede consultar.
// Los correos de desarrollo van a Mailpit.
const MAILPIT = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025';
const reason = `Prueba E2E de amonestación ${Date.now().toString(36)}`;
let acceptanceLink = '';

test.describe.configure({ mode: 'serial' });

async function schoolId(token: string): Promise<string> {
  const { body } = await api<{ schools: { id: string; name: string }[] }>(token, 'GET', '/schools');
  return body.schools.find((s) => s.name === 'Ingeniería de Sistemas')!.id;
}

test.beforeAll(async () => {
  // Parte limpio: sin tutor asignado al ciclo 10 (de una corrida anterior).
  const token = await apiLogin(accounts.admin);
  await api(token, 'DELETE', `/schools/${await schoolId(token)}/cycle-tutors/10`);
});

test.afterAll(async () => {
  const token = await apiLogin(accounts.admin);
  await api(token, 'DELETE', `/schools/${await schoolId(token)}/cycle-tutors/10`);
});

test('la coordinadora elige a Elena como tutora del ciclo 10 y queda pendiente de su respuesta', async ({ page }) => {
  await loginUi(page, accounts.coordinator);
  await goToMenu(page, 'Tutores por ciclo');
  await expect(page.getByRole('heading', { name: 'Tutores por ciclo' }).last()).toBeVisible();

  const select = page.getByLabel('Tutor del ciclo 10');
  await expect(select).toBeVisible({ timeout: 45_000 });
  const elena = await select.locator('option', { hasText: 'Elena' }).first().getAttribute('value');
  await select.selectOption(elena!);

  await expect(page.getByRole('status').filter({ hasText: /Ciclo 10:/ })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole('listitem').filter({ has: page.getByLabel('Tutor del ciclo 10') }).getByText('Pendiente')).toBeVisible();
});

test('a Elena le llega el correo con su enlace personal', async () => {
  let message: { ID: string } | undefined;
  for (let i = 0; i < 40 && !message; i += 1) {
    const list = (await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${accounts.tutor.email} subject:"ciclo 10"`)}`)).json()) as { messages: { ID: string }[] };
    message = list.messages?.[0];
    if (!message) await new Promise((r) => setTimeout(r, 500));
  }
  expect(message, 'el correo de aceptación debe llegar a la bandeja de pruebas').toBeTruthy();
  const full = (await (await fetch(`${MAILPIT}/api/v1/message/${message!.ID}`)).json()) as { Subject: string; Text: string };
  expect(full.Subject).toMatch(/Confirmación como docente tutor — .*, ciclo 10/);
  const match = /(https?:\/\/\S+\/aceptar-tutoria\/[0-9a-f]{64})/.exec(full.Text);
  expect(match, 'el correo trae el enlace de aceptación').toBeTruthy();
  acceptanceLink = match![1];
});

test('Elena abre el enlace sin iniciar sesión y acepta con su disponibilidad; el enlace no se reutiliza', async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto(acceptanceLink);
  await expect(page.getByRole('heading', { name: 'Tutoría — ciclo 10' })).toBeVisible({ timeout: 45_000 });

  await page.getByRole('radio', { name: 'Acepto' }).click();
  await page.getByLabel('Día 1').selectOption('2');
  await page.getByLabel('Lugar 1').fill('Aula 12 E2E');
  await page.getByRole('button', { name: 'Enviar respuesta' }).click();
  await expect(page.getByRole('status')).toContainText('Su disponibilidad quedó registrada', { timeout: 45_000 });

  await page.goto(acceptanceLink);
  await expect(page.getByRole('heading', { name: 'Enlace no válido' })).toBeVisible({ timeout: 45_000 });
});

test('la coordinadora ve que Elena aceptó y su disponibilidad', async ({ page }) => {
  await loginUi(page, accounts.coordinator);
  await goToMenu(page, 'Tutores por ciclo');

  const row = page.getByRole('listitem').filter({ has: page.getByLabel('Tutor del ciclo 10') });
  await expect(row.getByText('Aceptó')).toBeVisible({ timeout: 45_000 });
  await expect(row).toContainText('Martes');
  await expect(row).toContainText('Aula 12 E2E');
});

test('el Decano registra una amonestación a Elena y la coordinadora la consulta; Elena no la ve', async ({ page, browser }) => {
  await loginUi(page, accounts.dean);
  await goToMenu(page, 'Amonestaciones');
  await expect(page.getByRole('heading', { name: 'Amonestaciones' }).last()).toBeVisible();

  await page.getByRole('button', { name: 'Nueva amonestación' }).click();
  const tutor = page.getByLabel('Docente tutor');
  const elena = await tutor.locator('option', { hasText: 'Elena' }).first().getAttribute('value');
  await tutor.selectOption(elena!);
  await page.getByLabel('Motivo').fill(reason);
  await page.getByRole('button', { name: 'Registrar' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Amonestación registrada' })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText(reason)).toBeVisible();

  const coordinator = await (await browser.newContext()).newPage();
  await loginUi(coordinator, accounts.coordinator);
  await goToMenu(coordinator, 'Amonestaciones');
  await expect(coordinator.getByText(reason)).toBeVisible({ timeout: 45_000 });
  await expect(coordinator.getByRole('button', { name: 'Nueva amonestación' })).toHaveCount(0);

  const teacher = await (await browser.newContext()).newPage();
  await loginUi(teacher, accounts.tutor);
  await expect(teacher.locator('nav').getByRole('link', { name: 'Amonestaciones', exact: true })).toHaveCount(0);
});
