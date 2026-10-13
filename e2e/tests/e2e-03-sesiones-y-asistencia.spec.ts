import { expect, test } from '@playwright/test';
import { accounts } from '../support/accounts';
import { api, apiLogin, unique } from '../support/api';
import { createStudentForElena, dateInput, ensureAnaWithElena, todayAt } from '../support/setup';
import { goToMenu, loginUi } from '../support/ui';

// E2E-03 (HU-18, HU-20–23): la tutora programa una sesión, la tutorada la ve, la cancela con motivo y
// registra la asistencia de otra sesión que ya empezó.
test.describe.configure({ mode: 'serial' });

const topic = unique('Seguimiento');
const place = unique('Aula');
const cancelReason = unique('Feriado');
const pastTopic = unique('Asistencia');

let adminToken = '';
let elenaId = '';

test.beforeAll(async () => {
  const setup = await ensureAnaWithElena();
  adminToken = setup.adminToken;
  elenaId = setup.elenaId;
});

test('la tutora programa una sesión individual presencial para Ana', async ({ page }) => {
  await loginUi(page, accounts.tutor);
  await goToMenu(page, 'Tutorados');
  // La lista está paginada y crece con cada corrida de pruebas: se busca a Ana en vez de depender de su posición.
  await page.getByLabel('Buscar tutorado').fill('20191234');
  await page.getByRole('row', { name: /20191234/ }).getByRole('button', { name: 'Programar sesión' }).click();

  const dialog = page.getByRole('dialog', { name: 'Programar sesión de tutoría' });
  await dialog.getByLabel('Fecha').fill(dateInput(todayAt(23, 30)));
  await dialog.getByLabel('Hora').fill('23:30');
  await dialog.getByLabel('Tema de la sesión').fill(topic);
  await dialog.getByLabel('Lugar').fill(place);
  await dialog.getByRole('button', { name: 'Programar sesión' }).click();
  await expect(dialog).toBeHidden();

  await goToMenu(page, 'Sesiones');
  await expect(page.getByRole('button', { name: new RegExp(topic) })).toBeVisible();
});

test('la tutorada ve la sesión con su lugar', async ({ page }) => {
  await loginUi(page, accounts.student);
  await goToMenu(page, 'Mis sesiones');
  const item = page.getByText(topic).first();
  await expect(item).toBeVisible();
  await expect(page.getByText(place).first()).toBeVisible();
});

test('la tutora cancela la sesión con un motivo y la tutorada ve Cancelada', async ({ page, browser }) => {
  await loginUi(page, accounts.tutor);
  await goToMenu(page, 'Sesiones');
  await page.getByRole('button', { name: new RegExp(topic) }).click();
  await page.getByRole('dialog', { name: 'Detalle de la sesión' }).getByRole('button', { name: 'Cancelar sesión' }).click();

  const cancel = page.getByRole('dialog', { name: 'Cancelar sesión' });
  await cancel.getByLabel('Motivo de la cancelación').fill(cancelReason);
  await cancel.getByRole('button', { name: 'Cancelar sesión' }).click();
  await expect(cancel).toBeHidden();

  // Otro contexto: el navegador de la tutora conserva su sesión.
  const student = await (await browser.newContext()).newPage();
  await loginUi(student, accounts.student);
  await goToMenu(student, 'Mis sesiones');
  await expect(student.getByText(cancelReason).first()).toBeVisible();
});

test('la tutora registra la asistencia de una sesión que ya empezó', async ({ page }) => {
  const { id, fullName } = await createStudentForElena(adminToken, elenaId);
  const elena = await apiLogin(accounts.tutor);
  const when = todayAt(0, 10);
  const scheduled = await api<{ session: { id: string } }>(elena, 'POST', '/sessions', {
    studentIds: [id],
    topic: pastTopic,
    scheduledAt: when.toISOString(),
    modality: 'PRESENCIAL',
    location: 'Oficina de tutoría',
  });
  expect(scheduled.status, 'se puede programar una sesión que ya empezó').toBe(201);

  await loginUi(page, accounts.tutor);
  await goToMenu(page, 'Sesiones');
  await page.getByRole('button', { name: new RegExp(pastTopic) }).click();
  const detail = page.getByRole('dialog', { name: 'Detalle de la sesión' });
  await expect(detail).toContainText(fullName.split(' ')[0]);
  await detail.getByRole('button', { name: 'Registrar asistencia' }).click();
  await expect(detail.getByRole('button', { name: 'Registrar asistencia' })).toBeHidden();
  await expect(detail).toContainText(/Sesión N° 1|1 de 8|confirmada/i);
});
