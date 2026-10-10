import { expect, Page } from '@playwright/test';
import type { Account } from './accounts';

/** Inicia sesión por la pantalla de ingreso y espera al panel de inicio. */
export async function loginUi(page: Page, account: Account): Promise<void> {
  await page.goto('/login');
  await page.getByPlaceholder('usuario@untrm.edu.pe').fill(account.email);
  await page.getByPlaceholder('••••••••').fill(account.password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: new RegExp(`Bienvenid[oa], ${account.greeting}`) })).toBeVisible();
}

/** Entradas del menú lateral, en orden, y cuántas están marcadas como la página actual. */
export async function sidebar(page: Page): Promise<{ items: string[]; active: number }> {
  const items = (await page.locator('nav a').allTextContents()).map((t) => t.trim());
  const active = await page.locator('nav a[aria-current]').count();
  return { items, active };
}

/** Abre una página desde el menú lateral (el panel de inicio repite algunos accesos como tarjetas). */
export async function goToMenu(page: Page, name: string): Promise<void> {
  await page.locator('nav').getByRole('link', { name, exact: true }).click();
}
