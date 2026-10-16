import { expect, test } from '@playwright/test';
import { accounts } from '../support/accounts';
import { api, apiLogin, unique } from '../support/api';
import { createPortalStudent, ensureAnaWithElena } from '../support/setup';
import { goToMenu, loginUi } from '../support/ui';

// E2E-08 (HU-03, 06, 10, 48, 50): la DBU administra catálogos y tutorados e identidad visual;
// un tutorado cambia su propia contraseña.
test.describe.configure({ mode: 'serial' });

test('la DBU crea, desactiva y elimina una facultad del catálogo', async ({ page }) => {
  const name = unique('Facultad');
  await loginUi(page, accounts.admin);
  await goToMenu(page, 'Catálogos');
  await page.getByRole('tab', { name: 'Facultades' }).click();

  await page.getByRole('button', { name: 'Nueva facultad' }).click();
  const form = page.getByRole('dialog', { name: 'Nueva facultad' });
  await form.getByLabel('Nombre').fill(name);
  await form.getByRole('button', { name: 'Crear' }).click();
  await expect(form).toBeHidden();
  const row = page.getByRole('row', { name: new RegExp(name) });
  await expect(row).toBeVisible();

  await page.getByRole('button', { name: `Desactivar ${name}` }).click();
  await expect(page.getByRole('button', { name: `Activar ${name}` })).toBeVisible();

  await page.getByRole('button', { name: `Eliminar ${name}` }).click();
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(page.getByText(name)).toHaveCount(0);
});

test('la DBU registra un tutorado nuevo y aparece en la lista', async ({ page }) => {
  const code = String(Date.now()).slice(-8);
  await loginUi(page, accounts.admin);
  await goToMenu(page, 'Tutorados');
  await page.getByRole('button', { name: 'Nuevo tutorado' }).click();

  await page.getByLabel('Código universitario').fill(code);
  await page.getByLabel('Ciclo', { exact: true }).fill('4');
  await page.getByLabel('Nombres', { exact: true }).fill('Registro');
  await page.getByLabel('Apellidos', { exact: true }).fill(`E2E ${code}`);
  await page.getByLabel('Escuela profesional', { exact: true }).selectOption({ label: 'Ingeniería de Sistemas' });
  await page.getByRole('button', { name: 'Guardar' }).click();

  // La lista crece con cada corrida: se busca por el código en vez de depender de la posición.
  await page.getByLabel('Buscar tutorado').fill(code);
  await expect(page.getByRole('row', { name: new RegExp(code) })).toBeVisible();
});

test('una cuenta nueva solo se activa con su enlace de un solo uso, y el enlace no sirve dos veces (A01)', async ({ page, browser }) => {
  const { adminToken, elenaId } = await ensureAnaWithElena();
  const student = await createPortalStudent(adminToken, elenaId, { pending: true });
  const chosen = `Propia${Date.now().toString(36)}!`;

  // Pendiente de activación: no hay ninguna clave con la que entrar.
  await page.goto('/login');
  await page.getByPlaceholder('usuario@untrm.edu.pe').fill(student.email);
  await page.getByPlaceholder('••••••••').fill('Tutor2026!');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 45_000 });

  // El enlace de la invitación permite crear la propia contraseña.
  await page.goto(new URL(student.invitationLink).pathname);
  await expect(page.getByRole('heading', { name: 'Activa tu cuenta' })).toBeVisible();
  await page.getByLabel('Nueva contraseña').fill(chosen);
  await page.getByLabel('Confirmar contraseña').fill(chosen);
  await page.getByRole('button', { name: 'Activar mi cuenta' }).click();
  await expect(page.getByText(/Tu cuenta está activa/)).toBeVisible();

  // Entra con la contraseña que eligió.
  const logged = await (await browser.newContext()).newPage();
  await loginUi(logged, { ...student, password: chosen, role: 'Tutorado' });

  // El mismo enlace ya no sirve.
  const reuse = await (await browser.newContext()).newPage();
  await reuse.goto(new URL(student.invitationLink).pathname);
  await reuse.getByLabel('Nueva contraseña').fill('OtraClave2026!');
  await reuse.getByLabel('Confirmar contraseña').fill('OtraClave2026!');
  await reuse.getByRole('button', { name: 'Activar mi cuenta' }).click();
  await expect(reuse.getByRole('alert')).toBeVisible();
});

test('la DBU cambia el nombre corto de la identidad visual y lo restituye', async ({ page }) => {
  await loginUi(page, accounts.admin);
  await goToMenu(page, 'Identidad visual');
  const field = page.getByLabel('Nombre corto');
  await expect(field).not.toHaveValue(''); // el formulario se llena cuando llega la identidad guardada
  const original = await field.inputValue();
  const changed = `SIT-${Date.now().toString(36)}`.slice(0, 20);
  const save = page.getByRole('button', { name: 'Guardar cambios' });

  try {
    await field.fill(changed);
    await save.click();
    await expect(page.getByText('Identidad guardada: ya se aplica en todo el sistema.')).toBeVisible();
    await expect(page.getByText(changed, { exact: true }).first()).toBeVisible();
    await expect(page).toHaveTitle(changed);
  } finally {
    // Pase lo que pase, la identidad queda como estaba para no afectar las demás pruebas.
    const admin = await apiLogin(accounts.admin);
    const current = await fetch(`${process.env.E2E_API_URL ?? 'http://localhost:3000/api'}/branding`).then((r) => r.json() as Promise<{ branding: Record<string, unknown> }>);
    const { institutionName, primaryColor, accentColor } = current.branding;
    await api(admin, 'PUT', '/branding', { institutionName, shortName: original, primaryColor, accentColor });
  }
});
