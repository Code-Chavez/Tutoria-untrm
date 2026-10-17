import { expect, Page } from '@playwright/test';
import type { Account } from './accounts';

/** Inicia sesión por la pantalla de ingreso y espera al panel de inicio. */
export async function loginUi(page: Page, account: Account): Promise<void> {
  await page.goto('/login');
  await page.getByPlaceholder('usuario@untrm.edu.pe').fill(account.email);
  await page.getByPlaceholder('••••••••').fill(account.password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: new RegExp(`Bienvenid[oa], ${account.greeting}`) })).toBeVisible({ timeout: 45_000 });
}

/** Entradas del menú lateral, en orden, y cuántas están marcadas como la página actual. */
export async function sidebar(page: Page): Promise<{ items: string[]; active: number }> {
  await expandMenuGroups(page);
  const items = (await page.locator('nav a').allTextContents()).map((t) => t.trim());
  const active = await page.locator('nav a[aria-current]').count();
  return { items, active };
}

/** Despliega los grupos del menú que estén plegados (p. ej. «Configuración», que arranca plegado). */
export async function expandMenuGroups(page: Page): Promise<void> {
  const collapsed = page.locator('nav button[aria-expanded="false"]');
  while ((await collapsed.count()) > 0) await collapsed.first().click();
}

/** Pantallas que viven como pestaña dentro de una sección del menú («Periodo académico», «Configuración»). */
const SECTION_OF: Record<string, string> = {
  'Pedir listas': 'Periodo académico',
  'Carga de estudiantes': 'Periodo académico',
  'Carga de docentes': 'Periodo académico',
  'Asignación por ciclo': 'Periodo académico',
  'Cierre de periodo': 'Periodo académico',
  'Correos de las escuelas': 'Configuración',
  Sedes: 'Configuración',
  'Evaluación de tutoría': 'Configuración',
  Catálogos: 'Configuración',
  'Usuarios y roles': 'Configuración',
  Parámetros: 'Configuración',
  'Identidad visual': 'Configuración',
  'Bitácora de auditoría': 'Configuración',
};

/**
 * Abre una página desde el menú lateral (el panel de inicio repite algunos accesos como tarjetas). Si es una pestaña de una
 * sección («Pedir listas» está dentro de «Periodo académico»), entra primero a la sección y luego elige la pestaña.
 */
export async function goToMenu(page: Page, name: string): Promise<void> {
  const nav = page.locator('nav');
  let link = nav.getByRole('link', { name, exact: true });
  if ((await link.count()) === 0) await expandMenuGroups(page); // la entrada puede estar en un grupo plegado
  if ((await link.count()) === 0 && SECTION_OF[name]) {
    await nav.getByRole('link', { name: SECTION_OF[name], exact: true }).click();
    link = nav.getByRole('link', { name, exact: true });
    // La entrada de la sección redirige a su primera pestaña; con una sola pestaña no hay barra y esa pantalla ya está abierta
    await page.waitForFunction(() => !['/periodo', '/configuracion'].includes(window.location.pathname), undefined, { timeout: 45_000 });
    if ((await link.count()) === 0) return;
  }
  await link.click();
}
