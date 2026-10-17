import { expect, test } from '@playwright/test';
import ExcelJS from 'exceljs';
import { accounts } from '../support/accounts';
import { api, apiLogin } from '../support/api';
import { goToMenu, loginUi } from '../support/ui';

// E2E-13 (fase 3, tutoría por ciclo): en cada pantalla de carga hay un bloque «pide la lista» que la pide por correo con un
// solo clic (estudiantes y docentes, cada uno con su plantilla adjunta). La DBU crea cuentas de docentes tutores desde un Excel, igual de guiado que la carga de
// estudiantes: una fila con error se informa y las demás se crean con su escuela y una invitación de un solo uso (el correo
// llega a la bandeja de pruebas). La coordinación no tiene esta carga. Las cuentas de prueba se desactivan al terminar.
const MAILPIT = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025';
const stamp = Date.now().toString(36);
const good = [1, 2].map((n) => `docente${n}-${stamp}@untrm.edu.pe`);

test.describe.configure({ mode: 'serial' });

const listEmail = `lista-bloque-${stamp}@untrm.edu.pe`;
let schoolId = '';
let originalEmail: string | null = null;

test.beforeAll(async () => {
  // Ingeniería de Sistemas con un correo de pedido propio de la prueba (se restaura al terminar)
  const token = await apiLogin(accounts.admin);
  const { body } = await api<{ schools: { id: string; name: string; requestEmail: string | null }[] }>(token, 'GET', '/schools');
  const school = body.schools.find((s) => s.name === 'Ingeniería de Sistemas')!;
  schoolId = school.id;
  originalEmail = school.requestEmail;
  await api(token, 'PUT', `/schools/${schoolId}/request-email`, { email: listEmail });
});

async function mailTo(email: string): Promise<{ Subject: string; Attachments: { FileName: string }[] }> {
  let message: { ID: string } | undefined;
  for (let i = 0; i < 40 && !message; i += 1) {
    const list = (await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json()) as { messages: { ID: string }[] };
    message = list.messages?.[0];
    if (!message) await new Promise((r) => setTimeout(r, 500));
  }
  expect(message, `correo para ${email}`).toBeTruthy();
  return (await (await fetch(`${MAILPIT}/api/v1/message/${message!.ID}`)).json()) as { Subject: string; Attachments: { FileName: string }[] };
}

test('en la carga de estudiantes, la coordinación pide la lista con un solo clic', async ({ page }) => {
  await loginUi(page, accounts.coordinator);
  await goToMenu(page, 'Carga de estudiantes');
  await expect(page.getByRole('heading', { name: /Pídela por correo/ })).toBeVisible({ timeout: 45_000 });

  await page.getByRole('button', { name: 'Pedir la lista por correo' }).click();
  await expect(page.getByRole('status').filter({ hasText: `Pedido enviado a ${listEmail}` })).toBeVisible({ timeout: 45_000 });

  const mail = await mailTo(listEmail);
  expect(mail.Subject).toMatch(/Solicitud de lista de estudiantes/);
  expect(mail.Attachments.map((a) => a.FileName)).toContain('plantilla-estudiantes.xlsx');
});

async function workbook(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Docentes');
  sheet.addRow(['nombres', 'apellidos', 'correo', 'telefono', 'escuela']);
  good.forEach((email, i) => sheet.addRow([`Docente${i + 1}`, `Prueba E2E ${stamp}`, email, '', 'Ingeniería de Sistemas']));
  sheet.addRow(['Docente', `Con Error ${stamp}`, 'sin-arroba', '', 'Ingeniería de Sistemas']);
  sheet.addRow(['Docente', `Otra Escuela ${stamp}`, `otra-${stamp}@untrm.edu.pe`, '', 'Escuela que no existe']);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

test.afterAll(async () => {
  const token = await apiLogin(accounts.admin);
  await api(token, 'PUT', `/schools/${schoolId}/request-email`, { email: originalEmail });
  const users = await api<{ users: { id: string; email: string }[] }>(token, 'GET', '/users');
  for (const user of users.body.users.filter((u) => good.includes(u.email))) await api(token, 'PATCH', `/users/${user.id}/status`);
});

test('en la carga de docentes, la DBU pide la lista de docentes de una escuela con un solo clic', async ({ page }) => {
  await loginUi(page, accounts.admin);
  await goToMenu(page, 'Carga de docentes');
  await expect(page.getByRole('heading', { name: /lista de docentes tutores\? Pídela por correo/ })).toBeVisible({ timeout: 45_000 });

  await page.getByLabel('Escuela a la que se pide').selectOption({ label: 'Ingeniería de Sistemas' });
  await page.getByRole('button', { name: 'Pedir la lista por correo' }).click();
  await expect(page.getByRole('status').filter({ hasText: `Pedido enviado a ${listEmail}` })).toBeVisible({ timeout: 45_000 });

  const mail = await mailTo(listEmail);
  expect(mail.Subject).toMatch(/Solicitud de lista de docentes tutores/);
  expect(mail.Attachments.map((a) => a.FileName)).toContain('plantilla-docentes-tutores.xlsx');
});

test('la DBU carga el Excel de docentes: 2 se crean y 2 filas con error se informan', async ({ page }) => {
  await loginUi(page, accounts.admin);
  await goToMenu(page, 'Carga de docentes');
  await expect(page.getByRole('heading', { name: 'Carga masiva de docentes' }).last()).toBeVisible();

  await page.locator('input[type=file]').setInputFiles({
    name: `docentes-e2e-${stamp}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: await workbook(),
  });
  await page.getByRole('button', { name: 'Importar docentes' }).click();

  await expect(page.getByRole('heading', { level: 3, name: 'Resultado de la carga' })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText('Filas procesadas').locator('..')).toContainText('4');
  await expect(page.getByText('Docentes creados').locator('..')).toContainText('2');
  await expect(page.getByText('Omitidos').locator('..')).toContainText('2');
  await expect(page.getByText(/Errores de validación \(2\)/)).toBeVisible();
  await expect(page.getByRole('link', { name: /Asignar el tutor de cada ciclo/ })).toBeVisible();
});

test('a cada docente le llega su invitación con un enlace de un solo uso, sin contraseñas', async () => {
  for (const email of good) {
    let message: { ID: string } | undefined;
    for (let i = 0; i < 40 && !message; i += 1) {
      const list = (await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json()) as { messages: { ID: string }[] };
      message = list.messages?.[0];
      if (!message) await new Promise((r) => setTimeout(r, 500));
    }
    expect(message, `invitación para ${email}`).toBeTruthy();
    const full = (await (await fetch(`${MAILPIT}/api/v1/message/${message!.ID}`)).json()) as { Text: string };
    expect(full.Text).toMatch(/\/activar-cuenta\/[0-9a-f]{64}/);
    expect(full.Text.toLowerCase()).not.toContain('contraseña temporal');
  }
});

test('la coordinación no tiene la carga de docentes', async ({ page }) => {
  await loginUi(page, accounts.coordinator);
  await expect(page.locator('nav').getByRole('link', { name: 'Carga de docentes', exact: true })).toHaveCount(0);
  await page.goto('/carga-docentes');
  await expect(page.getByRole('heading', { name: 'Carga masiva de docentes' })).toHaveCount(0);
});
