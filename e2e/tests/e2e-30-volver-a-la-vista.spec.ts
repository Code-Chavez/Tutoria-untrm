import { expect, test, type Page } from '@playwright/test';
import { accounts, type Account } from '../support/accounts';
import { loginUi } from '../support/ui';

// E2E-30 (volver a la vista tras iniciar sesión de nuevo, issue #274): cuando la sesión termina sola (inactividad o sesión vencida) y la
// misma persona vuelve a entrar, regresa a la URL en que trabajaba (con su consulta y su ancla); otra cuenta entra al inicio; «Cerrar
// sesión» por decisión propia no guarda nada; y un destino externo guardado no se usa. Sin datos propios: solo lee pantallas.
test.describe.configure({ mode: 'serial' });

const VIEW = '/sedes?prueba=volver#ancla';

async function signIn(page: Page, account: Account) {
  await page.getByPlaceholder('usuario@untrm.edu.pe').fill(account.email);
  await page.getByPlaceholder('••••••••').fill(account.password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
}

const hereIs = (page: Page) => page.evaluate(() => `${location.pathname}${location.search}${location.hash}`);

test('1. por inactividad se llega al ingreso y, al entrar de nuevo la misma persona, vuelve a la misma vista', async ({ page }) => {
  await page.clock.install();
  await loginUi(page, accounts.admin);
  await page.goto(VIEW);
  await expect(page.getByRole('heading', { level: 1, name: 'Sedes' })).toBeVisible();

  await page.clock.runFor('01:10:00');
  await expect(page).toHaveURL(/\/login$/, { timeout: 20_000 });
  await page.clock.resume();

  await signIn(page, accounts.admin);
  await expect(page.getByRole('heading', { level: 1, name: 'Sedes' })).toBeVisible({ timeout: 45_000 });
  expect(await hereIs(page)).toBe(VIEW);
});

test('2. otra cuenta que entra después no aterriza en la vista de la persona anterior', async ({ page }) => {
  await page.clock.install();
  await loginUi(page, accounts.admin);
  await page.goto(VIEW);
  await expect(page.getByRole('heading', { level: 1, name: 'Sedes' })).toBeVisible();

  await page.clock.runFor('01:10:00');
  await expect(page).toHaveURL(/\/login$/, { timeout: 20_000 });
  await page.clock.resume();

  await signIn(page, accounts.dean);
  await expect(page.getByRole('heading', { level: 1, name: new RegExp(`Bienvenid[oa], ${accounts.dean.greeting}`) })).toBeVisible({ timeout: 45_000 });
  expect(new URL(page.url()).pathname).toBe('/');
});

test('3. «Cerrar sesión» por decisión propia no guarda la vista: al volver a entrar se abre el inicio', async ({ page }) => {
  await loginUi(page, accounts.admin);
  await page.goto(VIEW);
  await expect(page.getByRole('heading', { level: 1, name: 'Sedes' })).toBeVisible();
  await page.getByRole('button', { name: /cerrar sesión/i }).first().click();
  await expect(page).toHaveURL(/\/login$/);

  await signIn(page, accounts.admin);
  await expect(page.getByRole('heading', { level: 1, name: new RegExp(`Bienvenid[oa], ${accounts.admin.greeting}`) })).toBeVisible({ timeout: 45_000 });
  expect(new URL(page.url()).pathname).toBe('/');
});

test('4. una sesión que el servidor ya no renueva (401) también regresa a la misma vista al entrar de nuevo', async ({ page }) => {
  await loginUi(page, accounts.admin);
  // Todo lo autenticado responde 401 (y la renovación también): así ninguna consulta en vuelo puede renovar ni reescribir la sesión.
  const dead = (route: import('@playwright/test').Route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"Sesión vencida"}' });
  const unauthenticated = (url: URL) => url.pathname.startsWith('/api/') && !/\/api\/(auth\/login|branding)/.test(url.pathname);
  await page.route(unauthenticated, dead);
  await page.goto(VIEW);
  await expect(page).toHaveURL(/\/login$/, { timeout: 30_000 });
  await expect(page.getByPlaceholder('usuario@untrm.edu.pe')).toBeVisible({ timeout: 30_000 });
  await page.unroute(unauthenticated, dead);

  await signIn(page, accounts.admin);
  await expect(page.getByRole('heading', { level: 1, name: 'Sedes' })).toBeVisible({ timeout: 45_000 });
  expect(await hereIs(page)).toBe(VIEW);
});

test('5. un destino externo guardado se ignora', async ({ page }) => {
  await page.goto('/login');
  await page.evaluate(() => sessionStorage.setItem('sit:return-to', JSON.stringify({ path: 'https://example.com/robo', savedAt: Date.now() })));
  await signIn(page, accounts.admin);
  await expect(page.getByRole('heading', { level: 1, name: new RegExp(`Bienvenid[oa], ${accounts.admin.greeting}`) })).toBeVisible({ timeout: 45_000 });
  expect(page.url()).not.toContain('example.com');
});
