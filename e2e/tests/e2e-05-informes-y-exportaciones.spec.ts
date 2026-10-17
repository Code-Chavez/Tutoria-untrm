import { expect, Page, test } from '@playwright/test';
import { accounts } from '../support/accounts';
import { api, apiLogin } from '../support/api';
import { goToMenu, loginUi } from '../support/ui';

// E2E-05 (HU-27, HU-43–47): la tutora ve y exporta su consolidado y guarda su informe semestral;
// Vicerrectorado ve el consolidado y los indicadores, exporta, y las cifras coinciden entre sí.

async function exportAs(page: Page, format: 'PDF' | 'Excel', extension: RegExp): Promise<void> {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: format, exact: true }).click()]);
  expect(download.suggestedFilename()).toMatch(extension);
  const path = await download.path();
  expect(path, 'el archivo se descargó').toBeTruthy();
}

test('la tutora ve su consolidado de horarios y exporta PDF y Excel', async ({ page }) => {
  await loginUi(page, accounts.tutor);
  await goToMenu(page, 'Horarios y asistencia');
  await expect(page.getByText(/Sesiones de Elena Ramírez/i).first()).toBeVisible({ timeout: 45_000 });
  await exportAs(page, 'PDF', /\.pdf$/);
  await exportAs(page, 'Excel', /\.xlsx$/);
});

test('la tutora guarda su informe semestral y exporta el PDF', async ({ page }) => {
  await loginUi(page, accounts.tutor);
  await goToMenu(page, 'Informe semestral');
  await expect(page.getByRole('heading', { level: 3, name: /I\. Datos generales/ })).toBeVisible();
  // Dato de prueba en un campo editable: debe seguir ahí tras guardar y volver a abrir el informe
  const phone = `9${Date.now().toString().slice(-8)}`;
  await page.getByLabel('Celular').fill(phone);
  await page.getByRole('button', { name: 'Guardar informe' }).click();
  await expect(page.getByText('Informe guardado correctamente.')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { level: 3, name: /I\. Datos generales/ })).toBeVisible();
  await expect(page.getByLabel('Celular')).toHaveValue(phone);

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar PDF' }).click()]);
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
});

test('Vicerrectorado ve el consolidado e indicadores y exporta', async ({ page }) => {
  await loginUi(page, accounts.vice);

  await goToMenu(page, 'Informe consolidado');
  await expect(page.getByText('Escuela / facultad', { exact: true })).toBeVisible();
  await exportAs(page, 'PDF', /\.pdf$/);
  await exportAs(page, 'Excel', /\.xlsx$/);

  await goToMenu(page, 'Indicadores');
  await expect(page.getByText('Tutorados activos').first()).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Derivaciones por servicio' })).toBeVisible();
  await exportAs(page, 'PDF', /\.pdf$/);
  await exportAs(page, 'Excel', /\.xlsx$/);
});

test('el consolidado y los indicadores muestran las mismas cifras', async () => {
  const vice = await apiLogin(accounts.vice);
  const consolidated = await api<{ report: { totals: { activeStudents: number; studentsWithTutor: number; sessionsTotal: number } } }>(vice, 'GET', '/consolidated-reports');
  const indicators = await api<{ report: { students: { active: number; withTutor: number }; sessions: { total: number } } }>(vice, 'GET', '/indicators');
  expect(consolidated.status).toBe(200);
  expect(indicators.status).toBe(200);
  expect(indicators.body.report.students.active).toBe(consolidated.body.report.totals.activeStudents);
  expect(indicators.body.report.students.withTutor).toBe(consolidated.body.report.totals.studentsWithTutor);
  expect(indicators.body.report.sessions.total).toBe(consolidated.body.report.totals.sessionsTotal);
});
