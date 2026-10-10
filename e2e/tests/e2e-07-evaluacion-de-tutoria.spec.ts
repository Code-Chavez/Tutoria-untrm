import { expect, test } from '@playwright/test';
import { accounts } from '../support/accounts';
import { unique } from '../support/api';
import { createPortalStudent, ensureAnaWithElena, setSistemasEvaluationWindow } from '../support/setup';
import { goToMenu, loginUi } from '../support/ui';

// E2E-07 (HU-36–40): la DBU habilita la evaluación, un tutorado la responde una sola vez y
// la coordinación ve resultados y sugerencias sin saber quién las escribió.
test.describe.configure({ mode: 'serial' });

const likes = unique('Explica con paciencia');
let adminToken = '';
let respondent: Awaited<ReturnType<typeof createPortalStudent>>;
let lateStudent: Awaited<ReturnType<typeof createPortalStudent>>;

test.beforeAll(async () => {
  const setup = await ensureAnaWithElena();
  adminToken = setup.adminToken;
  await setSistemasEvaluationWindow(adminToken, true);
  respondent = await createPortalStudent(adminToken, setup.elenaId);
  lateStudent = await createPortalStudent(adminToken, setup.elenaId);
});

test.afterAll(async () => {
  if (adminToken) await setSistemasEvaluationWindow(adminToken, true);
});

test('el tutorado responde los 20 ítems y no puede enviar antes de terminar', async ({ page }) => {
  await loginUi(page, { ...respondent, role: 'Tutorado' });
  await goToMenu(page, 'Evaluar tutoría');
  const submit = page.getByRole('button', { name: 'Enviar evaluación' });
  await expect(submit).toBeDisabled();

  const best = page.locator('input[type=radio][value="S"]');
  await expect(best).toHaveCount(20);
  for (let i = 0; i < 20; i++) await best.nth(i).check();
  await expect(page.getByText('20 de 20 respondidas')).toBeVisible();

  await page.getByLabel('Me gustaría').fill(likes);
  await expect(submit).toBeEnabled();
  await submit.click();
  // Al enviar, el formulario se reemplaza por el aviso de que ya respondió (no puede repetirse).
  await expect(page.getByText('Ya respondiste el cuestionario de este periodo')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Ya respondiste el cuestionario de este periodo')).toBeVisible();
});

test('la coordinadora ve resultados y sugerencias sin el nombre del estudiante', async ({ page }) => {
  await loginUi(page, accounts.coordinator);
  await goToMenu(page, 'Resultados de evaluación');
  await expect(page.getByText(/Elena Ramírez/).first()).toBeVisible();

  await goToMenu(page, 'Sugerencias de estudiantes');
  await expect(page.getByText(likes)).toBeVisible();
  await expect(page.locator('body')).not.toContainText(respondent.email);
  await expect(page.locator('body')).not.toContainText('Prueba E2E');
});

test('la DBU cierra la evaluación y otro tutorado ya no puede responder', async ({ page, browser }) => {
  await loginUi(page, accounts.admin);
  await goToMenu(page, 'Evaluación de tutoría');
  const row = page.getByRole('row', { name: /Sistemas/ });
  await expect(row).toContainText('Habilitada');
  await row.getByRole('button', { name: 'Cerrar' }).click();
  await expect(row).toContainText('Cerrada');

  const student = await (await browser.newContext()).newPage();
  await loginUi(student, { ...lateStudent, role: 'Tutorado' });
  await goToMenu(student, 'Evaluar tutoría');
  await expect(student.getByText('La evaluación no está disponible por ahora')).toBeVisible();

  await row.getByRole('button', { name: 'Habilitar' }).click();
  await expect(row).toContainText('Habilitada');
});
