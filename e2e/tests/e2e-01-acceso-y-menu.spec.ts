import { expect, test } from '@playwright/test';
import { AccountKey, accounts } from '../support/accounts';
import { loginUi, sidebar } from '../support/ui';

// E2E-01 (HU-01, HU-04, HU-49): cada rol entra, ve su menú y su panel de inicio sin bloques vacíos.
const MENU: Record<AccountKey, string[]> = {
  student: ['Panel de inicio', 'Solicitar tutoría', 'Mis sesiones', 'Evaluar tutoría'],
  tutor: ['Panel de inicio', 'Tutorados', 'Expediente', 'Entrevista inicial', 'Sesiones', 'Seguimiento', 'Derivar caso', 'Solicitudes de tutoría', 'Casos derivados', 'Horarios y asistencia', 'Informe semestral'],
  coordinator: ['Panel de inicio', 'Tutorados', 'Expediente', 'Solicitudes de tutoría', 'Pedir listas', 'Carga masiva', 'Tutores por ciclo', 'Asignación', 'Plan semestral', 'Resultados de evaluación', 'Sugerencias de estudiantes', 'Horarios y asistencia', 'Indicadores', 'Amonestaciones'],
  psychology: ['Panel de inicio', 'Casos derivados'],
  vice: ['Panel de inicio', 'Informe consolidado', 'Indicadores', 'Sedes'],
  dean: ['Panel de inicio', 'Amonestaciones'],
  admin: ['Panel de inicio', 'Tutorados', 'Expediente', 'Solicitudes de tutoría', 'Casos derivados', 'Seguimiento DBU', 'Pedir listas', 'Carga masiva', 'Tutores por ciclo', 'Asignación', 'Cierre de periodo', 'Plan semestral', 'Evaluación de tutoría', 'Resultados de evaluación', 'Sugerencias de estudiantes', 'Horarios y asistencia', 'Informe consolidado', 'Indicadores', 'Amonestaciones', 'Sedes', 'Usuarios y roles', 'Catálogos', 'Parámetros', 'Identidad visual', 'Bitácora de auditoría'],
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
