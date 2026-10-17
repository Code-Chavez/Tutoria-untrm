import { expect, test } from '@playwright/test';
import { accounts } from '../support/accounts';
import { api, apiLogin, unique } from '../support/api';
import { dateInput, ensureAnaWithElena, todayAt } from '../support/setup';
import { goToMenu, loginUi } from '../support/ui';

// E2E-14 (U01): continuidad solicitud → sesión / derivación. La estudiante pide ayuda; la tutora la atiende desde la
// misma solicitud (estudiante y motivo ya cargados), la sesión o la derivación queda vinculada y no se duplica.
test.describe.configure({ mode: 'serial' });

const sessionReason = unique('Apoyo en Álgebra para sesion');
const referralReason = unique('Mucha presion este ciclo para derivar');
const place = unique('Aula');

async function createRequest(reason: string): Promise<void> {
  const studentToken = await apiLogin(accounts.student);
  const res = await api(studentToken, 'POST', '/tutoring-requests/me', { caseType: 'ACADEMIC', reason });
  expect(res.status).toBe(201);
}

test.beforeAll(async () => {
  await ensureAnaWithElena();
  await createRequest(sessionReason);
  await createRequest(referralReason);
});

test.afterAll(async () => {
  // La sesión de la prueba se cancela para no dejar citas que choquen con otras corridas
  const tutorToken = await apiLogin(accounts.tutor); // token propio: el de la preparación pudo caducar
  const list = await api<{ sessions: { id: string; topic: string }[] }>(tutorToken, 'GET', '/sessions?mine=true');
  for (const s of list.body.sessions.filter((x) => x.topic === sessionReason)) {
    await api(tutorToken, 'PATCH', `/sessions/${s.id}/cancel`, { reason: 'Limpieza de prueba E2E' });
  }
});

test('la tutora programa la sesión desde la solicitud: estudiante y motivo ya vienen y la solicitud queda vinculada', async ({ page }) => {
  await loginUi(page, accounts.tutor);
  await goToMenu(page, 'Solicitudes de tutoría');
  await page.getByRole('row', { name: new RegExp(sessionReason) }).getByRole('button', { name: 'Atender' }).click();
  await page.getByRole('dialog', { name: 'Atender solicitud de tutoría' }).getByRole('button', { name: 'Programar sesión' }).click();

  const form = page.getByRole('dialog', { name: 'Programar sesión de tutoría' });
  await expect(form).toContainText('20191234'); // Ana ya viene elegida: no se busca ni se escribe
  await expect(form).toContainText('Atiende la solicitud de');
  await expect(form.getByLabel('Tema de la sesión')).toHaveValue(sessionReason);
  await form.getByLabel('Fecha').fill(dateInput(todayAt(22, 30)));
  await form.getByLabel('Hora').fill('22:30');
  await form.getByLabel('Lugar').fill(place);
  await form.getByRole('button', { name: 'Programar sesión' }).click();

  await expect(page.getByText(/Quedó vinculada a su solicitud/)).toBeVisible();
  const row = page.getByRole('row', { name: new RegExp(sessionReason) });
  await expect(row).toContainText('En atención');
  await expect(row).toContainText('Con sesión programada');

  // No se ofrece crear una segunda atención para la misma solicitud
  await row.getByRole('button', { name: 'Atender' }).click();
  const detail = page.getByRole('dialog', { name: 'Atender solicitud de tutoría' });
  await expect(detail).toContainText('no hace falta crear otra atención');
  await expect(detail.getByRole('button', { name: 'Programar sesión' })).toHaveCount(0);
  await expect(detail.getByRole('button', { name: 'Derivar a un servicio' })).toHaveCount(0);
});

test('la estudiante ve la sesión en su agenda y su solicitud ya está en atención', async ({ page }) => {
  await loginUi(page, accounts.student);
  await goToMenu(page, 'Mis sesiones');
  await expect(page.getByText(sessionReason).first()).toBeVisible();
  await expect(page.getByText(place).first()).toBeVisible();

  await goToMenu(page, 'Solicitar tutoría');
  await expect(page.locator('li, tr, div').filter({ hasText: sessionReason }).last()).toContainText('En atención');
});

test('la tutora deriva desde otra solicitud: el motivo ya viene y queda vinculada sin duplicarse', async ({ page }) => {
  await loginUi(page, accounts.tutor);
  await goToMenu(page, 'Solicitudes de tutoría');
  await page.getByRole('row', { name: new RegExp(referralReason) }).getByRole('button', { name: 'Atender' }).click();
  await page.getByRole('dialog', { name: 'Atender solicitud de tutoría' }).getByRole('button', { name: 'Derivar a un servicio' }).click();

  const form = page.getByRole('dialog', { name: 'Ficha de derivación' });
  await expect(form).toContainText('20191234');
  await expect(form.getByLabel('Motivo de la derivación')).toHaveValue(referralReason);
  await form.getByRole('checkbox').first().check();
  await form.getByRole('button', { name: 'Derivar caso' }).click();

  await expect(page.getByText(/Quedó vinculado a su solicitud/)).toBeVisible();
  const row = page.getByRole('row', { name: new RegExp(referralReason) });
  await expect(row).toContainText('En atención');
  await expect(row).toContainText('Derivada a un servicio');
});

test('la coordinadora ve el vínculo pero no programa ni deriva', async ({ page }) => {
  await loginUi(page, accounts.coordinator);
  await goToMenu(page, 'Solicitudes de tutoría');
  const row = page.getByRole('row', { name: new RegExp(sessionReason) });
  await expect(row).toContainText('Con sesión programada');
  await row.getByRole('button', { name: 'Atender' }).click();
  const detail = page.getByRole('dialog', { name: 'Atender solicitud de tutoría' });
  await expect(detail.getByRole('button', { name: 'Programar sesión' })).toHaveCount(0);
  await expect(detail.getByRole('button', { name: 'Derivar a un servicio' })).toHaveCount(0);
});
