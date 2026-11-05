import { expect, test, type Page } from '@playwright/test';
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


// El calendario mensual resume con «+N más» los días con muchas sesiones, y cada corrida deja las suyas: la vista
// semanal las muestra todas, así que la prueba no depende de cuántas haya acumuladas hoy.
async function openSessions(page: Page): Promise<void> {
  await goToMenu(page, 'Sesiones');
  await page.getByRole('button', { name: 'Semanal' }).click();
}

let adminToken = '';
let elenaId = '';

test.beforeAll(async () => {
  const setup = await ensureAnaWithElena();
  adminToken = setup.adminToken;
  elenaId = setup.elenaId;
});

test('la tutora programa una sesión individual presencial para Ana', async ({ page }) => {
  await loginUi(page, accounts.tutor);
  await goToMenu(page, 'Estudiantes');
  // La lista está paginada y crece con cada corrida de pruebas: se busca a Ana en vez de depender de su posición.
  await page.getByLabel('Buscar estudiante').fill('20191234');
  await page.getByRole('row', { name: /20191234/ }).getByRole('button', { name: 'Programar sesión' }).click();

  const dialog = page.getByRole('dialog', { name: 'Programar sesión de tutoría' });
  await dialog.getByLabel('Fecha').fill(dateInput(todayAt(23, 30)));
  await dialog.getByLabel('Hora').fill('23:30');
  await dialog.getByLabel('Tema de la sesión').fill(topic);
  await dialog.getByLabel('Lugar').fill(place);
  await dialog.getByRole('button', { name: 'Programar sesión' }).click();
  await expect(dialog).toBeHidden();
  // A la tutora se le dice lo que hizo el sistema: Ana tiene cuenta del portal, así que se le avisó
  await expect(page.getByText(/Se avisó al estudiante en el sistema\./)).toBeVisible();

  await openSessions(page);
  await expect(page.getByRole('button', { name: new RegExp(topic) })).toBeVisible();
});

test('la tutorada ve la sesión con su lugar', async ({ page }) => {
  await loginUi(page, accounts.student);
  await goToMenu(page, 'Mis sesiones');
  const item = page.getByText(topic).first();
  await expect(item).toBeVisible();
  await expect(page.getByText(place).first()).toBeVisible();

  // Y se enteró sin entrar a buscarla: tiene el aviso en la campana, con la fecha y el lugar
  await page.getByRole('button', { name: 'Notificaciones' }).click();
  await expect(page.getByRole('menu')).toContainText(`Lugar: ${place}`);
});

test('la tutora cancela la sesión con un motivo y la tutorada ve Cancelada', async ({ page, browser }) => {
  await loginUi(page, accounts.tutor);
  await openSessions(page);
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
  // También recibió el aviso de la cancelación, con el motivo
  await student.getByRole('button', { name: 'Notificaciones' }).click();
  await expect(student.getByRole('menu')).toContainText(`Motivo: ${cancelReason}`);
});

test('la tutora registra la asistencia de una sesión que ya empezó', async ({ page }) => {
  const { id, fullName } = await createStudentForElena(adminToken, elenaId);
  const elena = await apiLogin(accounts.tutor);
  // Cada corrida deja su sesión: la agenda de la tutora no admite dos a la misma hora, así que se usa el primer
  // horario ya pasado de hoy que esté libre (de madrugada, cada 70 minutos).
  let status = 0;
  for (let minutes = 10; minutes < 24 * 60 && status !== 201; minutes += 70) {
    const when = todayAt(Math.floor(minutes / 60), minutes % 60);
    if (when.getTime() > Date.now() - 60_000) break;
    const scheduled = await api<{ session: { id: string } }>(elena, 'POST', '/sessions', {
      studentIds: [id],
      topic: pastTopic,
      scheduledAt: when.toISOString(),
      modality: 'PRESENCIAL',
      location: 'Oficina de tutoría',
    });
    status = scheduled.status;
  }
  expect(status, 'se puede programar una sesión que ya empezó').toBe(201);

  await loginUi(page, accounts.tutor);
  await openSessions(page);
  await page.getByRole('button', { name: new RegExp(pastTopic) }).click();
  const detail = page.getByRole('dialog', { name: 'Detalle de la sesión' });
  await expect(detail).toContainText(fullName.split(' ')[0]);
  await detail.getByRole('button', { name: 'Registrar asistencia' }).click();
  await expect(detail.getByRole('button', { name: 'Registrar asistencia' })).toBeHidden();
  await expect(detail).toContainText(/Sesión N° 1|1 de 8|confirmada/i);
});
