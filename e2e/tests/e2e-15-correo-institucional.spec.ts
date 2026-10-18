import { expect, test } from '@playwright/test';
import { accounts } from '../support/accounts';
import { api, apiLogin } from '../support/api';
import { goToMenu, loginUi } from '../support/ui';

// E2E-15 (RF-01, A02): las cuentas de usuario son del dominio institucional, el correo se guarda en una sola forma y no se repite,
// y el ingreso acepta el correo escrito con espacios o mayúsculas.
test.describe.configure({ mode: 'serial' });

const stamp = Date.now().toString(36);
const mail = `e2e.correo.${stamp}@untrm.edu.pe`;

test.afterAll(async () => {
  // Las cuentas no se borran: la prueba deja desactivada la que creó
  const adminToken = await apiLogin(accounts.admin);
  const users = await api<{ users: { id: string; email: string; isActive: boolean }[] }>(adminToken, 'GET', '/users');
  const created = users.body.users.find((u) => u.email === mail);
  if (created?.isActive) await api(adminToken, 'PATCH', `/users/${created.id}/status`);
});

async function openNewUser(page: import('@playwright/test').Page) {
  await goToMenu(page, 'Usuarios y roles');
  await page.getByRole('button', { name: 'Nuevo usuario' }).click();
  const form = page.getByRole('dialog', { name: 'Nuevo Usuario' });
  await expect(form.getByText('Correo institucional (@untrm.edu.pe)')).toBeVisible(); // el formulario dice qué dominio se espera
  await form.getByLabel('Nombre').fill('Prueba');
  await form.getByLabel('Apellido').fill(`Correo ${stamp}`);
  await form.getByLabel('Rol').selectOption({ label: 'Estudiante' });
  return form;
}

test('la DBU no puede crear una cuenta con un correo que no es institucional', async ({ page }) => {
  await loginUi(page, accounts.admin);
  const form = await openNewUser(page);
  await form.getByLabel('Correo Electrónico').fill(`e2e.correo.${stamp}@gmail.com`);
  await form.getByRole('button', { name: 'Guardar' }).click();

  await expect(form.getByRole('alert')).toContainText('El correo debe ser institucional (@untrm.edu.pe)');
  await expect(form).toBeVisible(); // el formulario sigue abierto para corregirlo
});

test('el correo escrito con mayúsculas se guarda en minúsculas, y no se puede repetir con otra forma', async ({ page }) => {
  await loginUi(page, accounts.admin);
  let form = await openNewUser(page);
  await form.getByLabel('Correo Electrónico').fill(mail.toUpperCase());
  await form.getByRole('button', { name: 'Guardar' }).click();

  const invitation = page.getByRole('dialog', { name: 'Invitación emitida' });
  await expect(invitation).toBeVisible();
  await expect(invitation).toContainText(mail); // normalizado
  await invitation.getByRole('button', { name: 'Entendido' }).click();

  // Misma cuenta, otra forma de escribirla: duplicado
  form = await openNewUser(page);
  await form.getByLabel('Correo Electrónico').fill(`  ${mail.replace('e2e', 'E2E')} `);
  await form.getByRole('button', { name: 'Guardar' }).click();
  await expect(form.getByRole('alert')).toContainText('ya está registrado');
});

test('se ingresa aunque el correo se escriba con mayúsculas y espacios', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('usuario@untrm.edu.pe').fill(`  ${accounts.tutor.email.toUpperCase()}  `);
  await page.getByPlaceholder('••••••••').fill(accounts.tutor.password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Bienvenid[oa], Elena/ })).toBeVisible({ timeout: 45_000 });
});
