import { expect, test } from '@playwright/test';
import { AccountKey, accounts } from '../support/accounts';
import { goToMenu, loginUi, sidebar } from '../support/ui';

// E2E-01 (HU-01, HU-04, HU-49): cada rol entra, ve su menú y su panel de inicio sin bloques vacíos.
const MENU: Record<AccountKey, string[]> = {
  student: ['Panel de inicio', 'Solicitar tutoría', 'Mis solicitudes', 'Mis sesiones', 'Evaluar tutoría'],
  tutor: ['Panel de inicio', 'Estudiantes', 'Entrevista inicial', 'Sesiones', 'Seguimiento', 'Derivar caso', 'Solicitudes de tutoría', 'Casos derivados', 'Informes'],
  coordinator: ['Panel de inicio', 'Estudiantes', 'Solicitudes de tutoría', 'Periodo académico', 'Informes', 'Amonestaciones', 'Configuración'],
  psychology: ['Panel de inicio', 'Casos derivados'],
  vice: ['Panel de inicio', 'Informes', 'Configuración'],
  dean: ['Panel de inicio', 'Amonestaciones'],
  admin: ['Panel de inicio', 'Estudiantes', 'Solicitudes de tutoría', 'Casos derivados', 'Seguimiento DBU', 'Periodo académico', 'Informes', 'Amonestaciones', 'Configuración'],
};

for (const [key, account] of Object.entries(accounts) as [AccountKey, (typeof accounts)[AccountKey]][]) {
  test(`${account.role}: menú y panel de inicio`, async ({ page }) => {
    await loginUi(page, account);

    const { items, active } = await sidebar(page);
    expect(items).toEqual(MENU[key]);
    expect(active, 'exactamente una entrada activa').toBe(1);

    await expect(page.locator('body')).not.toContainText('Sin acceso');
    await expect(page.getByText('Acciones rápidas')).toBeVisible();
    if (key === 'student') {
      const history = page.getByRole('main').getByRole('link', { name: /^Mis solicitudes Consulta el estado/ });
      await history.click();
      await expect(page).toHaveURL(/accion=historial/);
      await expect(page.getByRole('main').getByRole('heading', { name: 'Mis solicitudes', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Registrar solicitud' })).toBeHidden();
      await page.setViewportSize({ width: 375, height: 812 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    }

    if (key === 'tutor') {
      await expect(page.getByRole('main').getByRole('link', { name: /^Entrevista inicial/ })).toBeVisible();
      await page.getByRole('main').getByRole('link', { name: /^Informe semestral/ }).click();
      await expect(page).toHaveURL(/\/informes\/semestral$/);
      await expect(page.getByRole('heading', { name: /Informe semestral/i, level: 1 })).toBeVisible();
    }
  });
}

// Cada pestaña lleva su título y, debajo, una línea de descripción: se comprueba el orden por el título con el que empieza el texto.
const startingWith = (titles: string[]) => titles.map((title) => new RegExp(`^${title}`));

test('credenciales inválidas muestran un error y no entran', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('usuario@untrm.edu.pe').fill('no.existe@untrm.edu.pe');
  await page.getByPlaceholder('••••••••').fill('incorrecta');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('alert')).toBeVisible();
});

test('una ruta protegida sin sesión redirige al ingreso', async ({ page }) => {
  await page.goto('/auditoria');
  await expect(page).toHaveURL(/\/login/);
});

test('un rol no entra a una página que no es suya', async ({ page }) => {
  await loginUi(page, accounts.student);
  await page.goto('/usuarios');
  await expect(page.getByRole('heading', { level: 1, name: /Usuarios y roles/ })).toHaveCount(0);
});

test('el menú es corto: navegación lateral y modo de solo iconos', async ({ page }) => {
  await loginUi(page, accounts.admin);
  const nav = page.locator('nav');

  // Una sola entrada por sección; sus pestañas no están sueltas en el menú, y el expediente se abre desde Tutorados
  for (const name of ['Periodo académico', 'Informes', 'Configuración']) await expect(nav.getByRole('link', { name, exact: true })).toBeVisible();
  for (const name of ['Parámetros', 'Pedir listas', 'Indicadores', 'Expediente']) await expect(nav.getByRole('link', { name, exact: true })).toHaveCount(0);

  // Periodo académico: pestañas en el orden del trabajo, y la primera abierta
  await nav.getByRole('link', { name: 'Periodo académico', exact: true }).click();
  const tabs = page.getByRole('navigation', { name: 'Secciones de Periodo académico' });
  await expect(tabs.getByRole('link')).toHaveText(startingWith(['Pedir listas', 'Carga de estudiantes', 'Carga de docentes', 'Asignación por ciclo', 'Docentes tutores', 'Pendientes', 'Certificados', 'Cierre de periodo']));
  await expect(tabs.getByRole('link', { name: /^Pedir listas/ })).toHaveAttribute('aria-current', 'page');
  await tabs.getByRole('link', { name: /^Asignación por ciclo/ }).click();
  await expect(nav.getByRole('link', { name: 'Periodo académico', exact: true })).toHaveAttribute('aria-current', 'page');

  // Informes: todo lo que se consulta y se exporta
  await nav.getByRole('link', { name: 'Informes', exact: true }).click();
  const reports = page.getByRole('navigation', { name: 'Secciones de Informes' });
  await expect(reports.getByRole('link')).toHaveText(startingWith(['Horarios y asistencia', 'Informe consolidado', 'Indicadores', 'Resultados de evaluación', 'Sugerencias de estudiantes']));

  const reportHeading = page.locator('main').getByRole('heading', { level: 1 });
  await expect(reportHeading).toBeVisible();
  const sidebarBounds = await reports.boundingBox();
  const headingBounds = await reportHeading.boundingBox();
  expect(sidebarBounds!.x + sidebarBounds!.width).toBeLessThan(headingBounds!.x);

  const compact = page.getByRole('button', { name: 'Mostrar solo iconos del menú principal' });
  const mainNavigation = page.getByRole('navigation', { name: 'Navegación principal' });
  const fullWidth = await mainNavigation.evaluate((element) => element.clientWidth);
  await compact.click();
  await expect.poll(() => mainNavigation.evaluate((element) => element.clientWidth)).toBeLessThan(fullWidth);
  await expect(nav.getByRole('link', { name: 'Informes', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(reports.getByRole('link', { name: 'Informe consolidado' })).toBeVisible();
  await page.getByRole('button', { name: 'Mostrar menú principal completo' }).click();
  await expect.poll(() => mainNavigation.evaluate((element) => element.clientWidth)).toBe(fullWidth);

  // Configuración: todo lo configurable en una sola pantalla
  await nav.getByRole('link', { name: 'Configuración', exact: true }).click();
  const config = page.getByRole('navigation', { name: 'Secciones de Configuración' });
  await expect(config.getByRole('link')).toHaveText(startingWith(['Correos para pedidos de listas', 'Evaluación de tutoría', 'Catálogos', 'Usuarios y roles', 'Roles y permisos', 'Parámetros', 'Identidad visual', 'Bitácora de auditoría']));

  await expect(nav.getByRole('link', { name: 'Plan semestral', exact: true })).toHaveCount(0);

  // Los grupos del menú se pliegan
  await nav.getByRole('button', { name: /Gestión/ }).click();
  await expect(nav.getByRole('link', { name: 'Informes', exact: true })).toHaveCount(0);

  await config.getByRole('link', { name: 'Catálogos', exact: true }).click();
  const catalogToggle = config.getByRole('button', { name: 'Categorías de Catálogos' });
  await expect(catalogToggle).toHaveAttribute('aria-expanded', 'true');
  await catalogToggle.click();
  await expect(config.getByRole('link', { name: 'Servicios', exact: true })).toBeHidden();
  await catalogToggle.click();
  const services = config.getByRole('link', { name: 'Servicios', exact: true });
  await services.click();
  await expect(page).toHaveURL(/tipo=services/);
  await expect(services).toHaveAttribute('aria-current', 'page');
  await config.getByRole('link', { name: 'Sedes', exact: true }).click();
  await expect(page).toHaveURL(/\/sedes$/);
  await expect(config.getByRole('link', { name: 'Sedes', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.goBack();
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(catalogToggle).toBeHidden();
  const mobileCatalog = page.locator('summary').filter({ hasText: /Catálogo.*Servicios/ });
  await mobileCatalog.click();
  await page.getByRole('link', { name: 'Motivos', exact: true }).click();
  await expect(page).toHaveURL(/tipo=motives/);
});

test('el expediente se abre desde Tutorados (ya no hay una entrada de menú) y vuelve a Tutorados', async ({ page }) => {
  await loginUi(page, accounts.coordinator);
  await goToMenu(page, 'Estudiantes');
  await page.getByRole('button', { name: 'Ver expediente' }).first().click();
  await expect(page).toHaveURL(/\/expediente\//);
  await expect(page.locator('nav').getByRole('link', { name: 'Estudiantes', exact: true })).toHaveAttribute('aria-current', 'page');

  await page.getByRole('button', { name: 'Volver a Estudiantes' }).click();
  await expect(page).toHaveURL(/\/tutorados/);
});
test('activar un periodo actualiza el aviso de solo lectura sin recargar', async ({ page }) => {
  const period = { id: '00000000-0000-4000-8000-000000000900', name: 'Periodo ficticio', startDate: '2026-01-01', endDate: '2026-12-31' };
  let open = false;
  await page.route('**/api/periods/current', (route) => route.fulfill({ json: { open, period: open ? period : null, enrolled: null } }));
  await page.route('**/api/catalogs/periods', (route) => route.fulfill({
    json: { entries: [{ ...period, kind: 'periods', isActive: open, usage: 0, code: null, facultyId: null }] },
  }));
  await page.route(`**/api/catalogs/periods/${period.id}`, (route) => {
    expect(route.request().method()).toBe('PUT');
    expect(route.request().postDataJSON()).toEqual({ isActive: true });
    open = true;
    return route.fulfill({ json: { entry: { ...period, isActive: true } } });
  });

  await loginUi(page, accounts.admin);
  await page.goto('/catalogos?tipo=periods');
  const banner = page.getByText('Tutoría en solo lectura:', { exact: true });
  await expect(banner).toBeVisible();
  await page.getByRole('button', { name: 'Activar Periodo ficticio' }).click();
  await expect(banner).toBeHidden();
  await expect(page.getByRole('button', { name: 'Desactivar Periodo ficticio' })).toBeVisible();
});
