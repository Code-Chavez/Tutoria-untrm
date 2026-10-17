import { expect, test } from '@playwright/test';
import { AccountKey, accounts } from '../support/accounts';
import { loginUi, sidebar } from '../support/ui';

// E2E-01 (HU-01, HU-04, HU-49): cada rol entra, ve su menú y su panel de inicio sin bloques vacíos.
const MENU: Record<AccountKey, string[]> = {
  student: ['Panel de inicio', 'Solicitar tutoría', 'Mis sesiones', 'Evaluar tutoría'],
  tutor: ['Panel de inicio', 'Tutorados', 'Expediente', 'Entrevista inicial', 'Sesiones', 'Seguimiento', 'Derivar caso', 'Solicitudes de tutoría', 'Casos derivados', 'Horarios y asistencia', 'Informe semestral'],
  coordinator: ['Panel de inicio', 'Tutorados', 'Expediente', 'Solicitudes de tutoría', 'Periodo académico', 'Plan semestral', 'Amonestaciones', 'Horarios y asistencia', 'Indicadores', 'Resultados de evaluación', 'Sugerencias de estudiantes', 'Configuración'],
  psychology: ['Panel de inicio', 'Casos derivados'],
  vice: ['Panel de inicio', 'Informe consolidado', 'Indicadores', 'Configuración'],
  dean: ['Panel de inicio', 'Amonestaciones'],
  admin: ['Panel de inicio', 'Tutorados', 'Expediente', 'Solicitudes de tutoría', 'Casos derivados', 'Seguimiento DBU', 'Periodo académico', 'Plan semestral', 'Amonestaciones', 'Horarios y asistencia', 'Informe consolidado', 'Indicadores', 'Resultados de evaluación', 'Sugerencias de estudiantes', 'Configuración'],
};

for (const [key, account] of Object.entries(accounts) as [AccountKey, (typeof accounts)[AccountKey]][]) {
  test(`${account.role}: menú y panel de inicio`, async ({ page }) => {
    await loginUi(page, account);

    const { items, active } = await sidebar(page);
    expect(items).toEqual(MENU[key]);
    expect(active, 'exactamente una entrada activa').toBe(1);

    await expect(page.locator('body')).not.toContainText('Sin acceso');
    await expect(page.getByText('Acciones rápidas')).toBeVisible();
  });
}

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

test('el menú es corto: Periodo académico y Configuración son una pantalla con pestañas, y los grupos se pliegan', async ({ page }) => {
  await loginUi(page, accounts.admin);
  const nav = page.locator('nav');

  // Una sola entrada por sección; sus pestañas no están sueltas en el menú
  await expect(nav.getByRole('link', { name: 'Periodo académico', exact: true })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Parámetros', exact: true })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Pedir listas', exact: true })).toHaveCount(0);

  // Periodo académico: pestañas en el orden del trabajo, y la primera abierta
  await nav.getByRole('link', { name: 'Periodo académico', exact: true }).click();
  const tabs = page.getByRole('navigation', { name: 'Secciones de Periodo académico' });
  await expect(tabs.getByRole('link')).toHaveText(['Pedir listas', 'Carga de estudiantes', 'Carga de docentes', 'Asignación por ciclo', 'Cierre de periodo']);
  await expect(tabs.getByRole('link', { name: 'Pedir listas', exact: true })).toHaveAttribute('aria-current', 'page');
  await tabs.getByRole('link', { name: 'Asignación por ciclo' }).click();
  await expect(nav.getByRole('link', { name: 'Periodo académico', exact: true })).toHaveAttribute('aria-current', 'page');

  // Configuración: todo lo configurable en una sola pantalla
  await nav.getByRole('link', { name: 'Configuración', exact: true }).click();
  const config = page.getByRole('navigation', { name: 'Secciones de Configuración' });
  await expect(config.getByRole('link')).toHaveText(['Correos de las escuelas', 'Sedes', 'Evaluación de tutoría', 'Catálogos', 'Usuarios y roles', 'Parámetros', 'Identidad visual', 'Bitácora de auditoría']);

  // Los grupos del menú se pliegan
  await nav.getByRole('button', { name: /Informes/ }).click();
  await expect(nav.getByRole('link', { name: 'Indicadores', exact: true })).toHaveCount(0);
});
