import { expect, test } from '@playwright/test';
import { accounts } from '../support/accounts';
import { api, apiLogin, unique } from '../support/api';
import { goToMenu, loginUi } from '../support/ui';

// E2E-02 (HU-17, HU-33): el estudiante solicita tutoría, el tutor la atiende y el estudiante ve la respuesta.
test.describe.configure({ mode: 'serial' });

const reason = unique('Apoyo en Cálculo');
const answer = unique('Te espero el jueves');

test.beforeAll(async () => {
  // Deja a Ana con Elena como tutora, sin depender de lo que hayan hecho otras corridas.
  const admin = await apiLogin(accounts.admin);
  const students = await api<{ students: { id: string; studentCode: string; tutorId: string | null }[] }>(admin, 'GET', '/students');
  const ana = students.body.students.find((s) => s.studentCode === '20191234');
  const users = await api<{ users: { id: string; email: string }[] } | { id: string; email: string }[]>(admin, 'GET', '/users');
  const list = Array.isArray(users.body) ? users.body : users.body.users;
  const elena = list.find((u) => u.email === accounts.tutor.email);
  expect(ana && elena).toBeTruthy();
  if (ana!.tutorId !== elena!.id) {
    const res = await api(admin, 'PATCH', `/students/${ana!.id}/reassign`, { newTutorId: elena!.id, reason: 'Preparación de prueba E2E' });
    expect(res.status).toBe(200);
  }
});

test('el estudiante registra la solicitud y queda Pendiente', async ({ page }) => {
  await loginUi(page, accounts.student);
  await goToMenu(page, 'Solicitar tutoría');
  await page.getByLabel('Motivo (Art. 20)').selectOption({ label: 'Académico' });
  await page.getByLabel('Descripción del motivo').fill(reason);
  await page.getByRole('button', { name: 'Registrar solicitud' }).click();

  await expect(page.getByText('Solicitud registrada y enrutada a tu tutor.')).toBeVisible();
  const row = page.getByText(reason).first();
  await expect(row).toBeVisible();
  await expect(page.getByText('Pendiente').first()).toBeVisible();
});

test('la tutora recibe el aviso y exige una respuesta antes de marcarla atendida', async ({ page }) => {
  await loginUi(page, accounts.tutor);
  await page.getByRole('button', { name: 'Notificaciones' }).click();
  await page.getByRole('menu').getByRole('button', { name: /Nueva solicitud de tutoría/ }).first().click();

  await expect(page).toHaveURL(/\/solicitudes\?solicitud=/);
  const dialog = page.getByRole('dialog', { name: 'Atender solicitud de tutoría' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(reason);

  await dialog.getByRole('button', { name: 'Pasar a en atención' }).click();
  await expect(page.getByRole('row', { name: new RegExp(reason) }).getByText('En atención')).toBeVisible();

  await page.getByRole('row', { name: new RegExp(reason) }).getByRole('button', { name: 'Atender' }).click();
  await dialog.getByRole('button', { name: 'Marcar atendida' }).click();
  await expect(dialog.getByText(/Escribe la respuesta/)).toBeVisible();

  await dialog.getByLabel('Respuesta para el estudiante').fill(answer);
  await dialog.getByRole('button', { name: 'Marcar atendida' }).click();
  await expect(page.getByRole('row', { name: new RegExp(reason) }).getByText('Atendida')).toBeVisible();
});

test('el estudiante ve el estado Atendida y la respuesta', async ({ page }) => {
  await loginUi(page, accounts.student);
  await goToMenu(page, 'Solicitar tutoría');
  const item = page.locator('li, tr, div').filter({ hasText: reason }).last();
  await expect(item).toContainText('Atendida');
  await expect(page.getByText(answer)).toBeVisible();
});

test('la coordinadora de la escuela ve la solicitud', async ({ page }) => {
  await loginUi(page, accounts.coordinator);
  await goToMenu(page, 'Solicitudes de tutoría');
  await expect(page.getByText(reason)).toBeVisible();
});

test('un tutor que no es el de Ana no la ve', async ({ page }) => {
  const jorge = { email: 'jorge.salazar@untrm.edu.pe', password: 'Demo2026!', role: 'Docente Tutor', greeting: 'Jorge' };
  await loginUi(page, jorge);
  await goToMenu(page, 'Solicitudes de tutoría');
  await expect(page.getByRole('heading', { level: 1, name: 'Solicitudes de tutoría' }).first()).toBeVisible();
  await expect(page.getByText(reason)).toHaveCount(0);
});
