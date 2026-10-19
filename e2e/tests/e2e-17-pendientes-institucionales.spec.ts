import { expect, test } from '@playwright/test';
import { accounts } from '../support/accounts';
import { api, apiLogin, unique } from '../support/api';
import { dateInput, ensureAnaWithElena } from '../support/setup';
import { goToMenu, loginUi } from '../support/ui';

// E2E-17: «Pendientes» (pestaña de Periodo académico). Una cita cancelada de una solicitud que sigue sin atender aparece para la
// coordinación de la escuela y para la DBU, con el motivo de la cancelación; el docente tutor no tiene esa pestaña.
test.describe.configure({ mode: 'serial' });

const reason = unique('Apoyo en Física para pendientes');
const cancelReason = unique('Paro de transporte');

test.beforeAll(async () => {
  const { anaId } = await ensureAnaWithElena();
  const student = await apiLogin(accounts.student);
  const created = await api<{ request: { id: string } }>(student, 'POST', '/tutoring-requests/me', { caseType: 'ACADEMIC', reason });
  expect(created.status).toBe(201);

  const tutor = await apiLogin(accounts.tutor);
  // Una cita futura lejana (no choca con otras corridas), vinculada a la solicitud y luego cancelada.
  const when = new Date(Date.UTC(2037, 5, 1, 15, 0) + (Date.now() % 1_000_000) * 60_000).toISOString();
  const session = await api<{ session: { id: string } }>(tutor, 'POST', '/sessions', {
    studentIds: [anaId],
    topic: reason,
    scheduledAt: when,
    modality: 'PRESENCIAL',
    location: 'Aula 301',
    tutoringRequestId: created.body.request.id,
  });
  expect(session.status).toBe(201);
  const cancelled = await api(tutor, 'PATCH', `/sessions/${session.body.session.id}/cancel`, { reason: cancelReason });
  expect(cancelled.status).toBe(200);
});

test.afterAll(async () => {
  // La solicitud de la prueba se da por atendida para no dejar pendientes ajenos en el entorno de desarrollo
  const tutor = await apiLogin(accounts.tutor);
  const inbox = await api<{ requests: { id: string; reason: string }[] }>(tutor, 'GET', '/tutoring-requests?mine=true');
  const sessions = await api<{ sessions: { id: string; topic: string; cancelledAt?: string | null }[] }>(tutor, 'GET', '/sessions?mine=true');
  for (const x of sessions.body.sessions.filter((x) => x.topic === reason && !x.cancelledAt)) {
    await api(tutor, 'PATCH', `/sessions/${x.id}/cancel`, { reason: 'Limpieza de prueba E2E' });
  }
  for (const r of inbox.body.requests.filter((x) => x.reason === reason)) {
    await api(tutor, 'PATCH', `/tutoring-requests/${r.id}/status`, { status: 'ATENDIDA', note: 'Limpieza de prueba E2E' });
  }
});

test('la coordinación de la escuela ve la cita cancelada de la solicitud, con el motivo', async ({ page }) => {
  await loginUi(page, accounts.coordinator);
  await goToMenu(page, 'Pendientes');
  await expect(page.getByRole('heading', { name: 'Pendientes' }).first()).toBeVisible();
  const item = page.getByRole('listitem').filter({ hasText: cancelReason });
  await expect(item).toHaveCount(1);
  await expect(item).toContainText('Se canceló la cita de la solicitud de Ana');
  await expect(item).toContainText('Cita cancelada');
  await item.getByRole('link', { name: 'Abrir la solicitud' }).click();
  await expect(page).toHaveURL(/\/solicitudes\?solicitud=/);
});

test('la DBU también lo ve, y se puede filtrar por tipo', async ({ page }) => {
  await loginUi(page, accounts.admin);
  await goToMenu(page, 'Pendientes');
  await page.getByLabel('Tipo de pendiente').selectOption('CANCELLED_SESSION_NO_FOLLOWUP');
  await expect(page.getByRole('listitem').filter({ hasText: cancelReason })).toHaveCount(1);
});

test('la tutora reemplaza la cita cancelada desde la solicitud y el pendiente desaparece', async ({ page }) => {
  await loginUi(page, accounts.tutor);
  await goToMenu(page, 'Solicitudes de tutoría');
  await page.getByRole('row', { name: new RegExp(reason) }).getByRole('button', { name: 'Atender' }).click();
  const detail = page.getByRole('dialog', { name: 'Atender solicitud de tutoría' });
  await expect(detail.getByRole('status')).toContainText('La cita de esta solicitud se canceló');
  await detail.getByRole('button', { name: 'Programar sesión' }).click();

  const form = page.getByRole('dialog', { name: 'Programar sesión de tutoría' });
  await form.getByLabel('Fecha').fill(dateInput(new Date(2037, 6, 15)));
  await form.getByLabel('Hora').fill('10:00');
  await form.getByLabel('Lugar').fill('Aula 302');
  await form.getByRole('button', { name: 'Programar sesión' }).click();
  await expect(page.getByText(/Quedó vinculada a su solicitud/)).toBeVisible();

  // Ya tiene cita vigente: la coordinación no lo ve como pendiente
  const coordinator = await apiLogin(accounts.coordinator);
  const pending = await api<{ items: { detail: string }[] }>(coordinator, 'GET', '/institutional-pending');
  expect(pending.body.items.filter((i) => i.detail.includes(cancelReason))).toHaveLength(0);
});

test('el docente tutor no tiene la pestaña ni accede a los datos', async ({ page }) => {
  const tutor = await apiLogin(accounts.tutor);
  expect((await api(tutor, 'GET', '/institutional-pending')).status).toBe(403);
  await loginUi(page, accounts.tutor);
  await expect(page.getByRole('link', { name: 'Periodo académico', exact: true })).toHaveCount(0);
});
