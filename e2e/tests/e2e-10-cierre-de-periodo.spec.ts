import { expect, test } from '@playwright/test';
import { accounts } from '../support/accounts';
import { api, apiLogin } from '../support/api';
import { goToMenu, loginUi } from '../support/ui';

// E2E-10 (fase 1, tutoría por ciclo): la DBU cierra el periodo vigente; desde ese momento la tutoría queda en solo lectura
// para todos (estudiante y tutor) y, al reabrirlo, vuelve a operar. Este recorrido cambia el estado global del sistema, así
// que siempre deja el periodo vigente como lo encontró (aunque la prueba falle).
test.describe.configure({ mode: 'serial' });

let adminToken = '';
let periodId = '';
let periodName = '';

test.beforeAll(async () => {
  adminToken = await apiLogin(accounts.admin);
  const current = await api<{ open: boolean; period: { id: string; name: string } | null }>(adminToken, 'GET', '/periods/current');
  expect(current.body.open, 'debe haber un periodo vigente para probar el cierre').toBe(true);
  periodId = current.body.period!.id;
  periodName = current.body.period!.name;
});

test.afterAll(async () => {
  // Pase lo que pase, el periodo queda vigente para el resto de la suite.
  const current = await api<{ open: boolean }>(adminToken, 'GET', '/periods/current');
  if (!current.body.open) await api(adminToken, 'POST', `/periods/${periodId}/reopen`);
});

test('la DBU cierra el periodo vigente con su nombre como confirmación', async ({ page }) => {
  await loginUi(page, accounts.admin);
  await goToMenu(page, 'Cierre de periodo');

  await expect(page.getByRole('heading', { name: periodName })).toBeVisible();
  await expect(page.getByText('Vigente', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar periodo' }).click();

  const dialog = page.getByRole('dialog');
  const confirm = dialog.getByRole('button', { name: 'Cerrar periodo' });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel('Nombre del periodo').fill(periodName);
  await confirm.click();

  await expect(page.getByText('Cerrado', { exact: true })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText(/Resumen guardado al momento del cierre/)).toBeVisible();
});

test('con el periodo cerrado el estudiante ve el aviso y no puede solicitar tutoría', async ({ page }) => {
  await loginUi(page, accounts.student);
  await expect(page.getByRole('status').filter({ hasText: /Tutoría en solo lectura/ })).toBeVisible();

  await goToMenu(page, 'Solicitar tutoría');
  await expect(page.getByText(/No hay un periodo académico abierto, así que por ahora no puedes registrar solicitudes/)).toBeVisible();
  await expect(page.getByLabel('Descripción del motivo')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Registrar solicitud' })).toBeDisabled();
});

test('el servidor rechaza los registros de la tutoría (tutor y estudiante) pero deja consultar', async () => {
  const tutor = await apiLogin(accounts.tutor);
  const refused = await api<{ code?: string }>(tutor, 'POST', '/sessions', { topic: 'No debe registrarse', studentIds: [] });
  expect(refused.status).toBe(409);
  expect(refused.body.code).toBe('PERIOD_CLOSED');

  const student = await apiLogin(accounts.student);
  const request = await api<{ code?: string }>(student, 'POST', '/tutoring-requests/me', { caseType: 'ACADEMIC', reason: 'No debe registrarse' });
  expect(request.status).toBe(409);
  expect(request.body.code).toBe('PERIOD_CLOSED');

  // Lectura: el historial sigue disponible.
  expect((await api(tutor, 'GET', '/sessions')).status).toBe(200);
  expect((await api(student, 'GET', '/tutoring-requests/mine')).status).toBe(200);
});

test('la DBU reabre el periodo y la tutoría vuelve a operar', async ({ page, browser }) => {
  await loginUi(page, accounts.admin);
  await goToMenu(page, 'Cierre de periodo');
  await expect(page.getByText('Cerrado', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reabrir periodo' }).click();
  await page.getByRole('button', { name: 'Reabrir', exact: true }).click();
  await expect(page.getByText('Vigente', { exact: true })).toBeVisible({ timeout: 45_000 });

  const student = await (await browser.newContext()).newPage();
  await loginUi(student, accounts.student);
  await goToMenu(student, 'Solicitar tutoría');
  await expect(student.getByLabel('Descripción del motivo')).toBeEnabled();
  await expect(student.getByRole('status').filter({ hasText: /Tutoría en solo lectura/ })).toHaveCount(0);

  const tutor = await apiLogin(accounts.tutor);
  const accepted = await api(tutor, 'POST', '/sessions', { topic: 'Prueba', studentIds: [] });
  expect(accepted.status).not.toBe(409); // pasa la comprobación del periodo (la validación del cuerpo responde otra cosa)
});
