import { Page, test } from '@playwright/test';
import path from 'node:path';
import { accounts } from '../support/accounts';
import { goToMenu, loginUi } from '../support/ui';

// Genera las imágenes de docs/manual/img/ que ilustran docs/MANUAL_USUARIO.md. Cada prueba es un rol.
const OUT = path.resolve(__dirname, '../../docs/manual/img');

async function shot(page: Page, name: string): Promise<void> {
  // Espera a que terminen las cargas y desaparezcan los esqueletos antes de fotografiar.
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 82 });
}

test.describe.configure({ mode: 'serial' });

test('acceso', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('usuario@untrm.edu.pe').waitFor();
  await shot(page, '01-ingreso');
  await page.goto('/forgot-password');
  await page.waitForTimeout(500);
  await shot(page, '02-recuperar-contrasena');
});

test('tutorado', async ({ page }) => {
  await loginUi(page, accounts.student);
  await shot(page, '03-inicio-tutorado');
  await goToMenu(page, 'Mis sesiones');
  await shot(page, '04-mis-sesiones');
  await goToMenu(page, 'Solicitar tutoría');
  await shot(page, '05-solicitar-tutoria');
  await goToMenu(page, 'Evaluar tutoría');
  await shot(page, '06-evaluar-tutoria');
});

test('docente tutor', async ({ page }) => {
  await loginUi(page, accounts.tutor);
  await shot(page, '07-inicio-tutor');
  await goToMenu(page, 'Estudiantes');
  await page.getByRole('row', { name: /20191234/ }).waitFor();
  await shot(page, '08-tutorados');

  await page.getByRole('row', { name: /20191234/ }).getByRole('button', { name: 'Programar sesión' }).click();
  await page.getByRole('dialog', { name: 'Programar sesión de tutoría' }).waitFor();
  await shot(page, '09-programar-sesion');
  await page.keyboard.press('Escape');

  await goToMenu(page, 'Sesiones');
  await page.getByRole('button', { name: /Reforzamiento de Cálculo I/ }).waitFor();
  await shot(page, '10-calendario-sesiones');
  await page.getByRole('button', { name: /Bienvenida y plan de trabajo/ }).click();
  await page.getByRole('dialog', { name: 'Detalle de la sesión' }).waitFor();
  await shot(page, '11-detalle-sesion');
  await page.keyboard.press('Escape');

  await goToMenu(page, 'Estudiantes');
  await page.getByRole('row', { name: /20191234/ }).getByRole('button', { name: 'Ver expediente' }).click();
  await page.getByText('Línea de tiempo del acompañamiento').waitFor();
  await shot(page, '12-expediente');

  await goToMenu(page, 'Derivar caso');
  await page.getByRole('button', { name: /Derivar caso: Ana Torres/ }).click();
  await page.getByRole('dialog', { name: 'Ficha de derivación' }).waitFor();
  await shot(page, '13-ficha-derivacion');
  await page.keyboard.press('Escape');

});

test('docente tutor (2)', async ({ page }) => {
  await loginUi(page, accounts.tutor);
  await goToMenu(page, 'Solicitudes de tutoría');
  await page.getByRole('row', { name: /Cálculo II/ }).waitFor();
  await shot(page, '14-solicitudes-bandeja');
  await page.getByRole('row', { name: /Cálculo II/ }).getByRole('button', { name: 'Atender' }).click();
  await page.getByRole('dialog', { name: 'Atender solicitud de tutoría' }).waitFor();
  await shot(page, '15-atender-solicitud');
  await page.keyboard.press('Escape');

  await goToMenu(page, 'Casos derivados');
  await page.getByRole('row').nth(1).waitFor();
  await shot(page, '16-casos-derivados-tutor');

  await goToMenu(page, 'Horarios y asistencia');
  await page.getByText(/Sesiones de Elena Ramírez/).first().waitFor();
  await shot(page, '17-horarios-asistencia');

  await goToMenu(page, 'Informe semestral');
  await page.getByRole('heading', { level: 3, name: /I\. Datos generales/ }).waitFor();
  await shot(page, '18-informe-semestral');
});

test('coordinador', async ({ page }) => {
  await loginUi(page, accounts.coordinator);
  await shot(page, '19-inicio-coordinador');
  await goToMenu(page, 'Asignación por ciclo');
  await page.getByLabel('Tutor del ciclo 1').waitFor();
  await shot(page, '20-asignacion');
  await goToMenu(page, 'Plan semestral');
  await page.getByRole('heading', { level: 3, name: 'Resolución de aprobación' }).waitFor();
  await shot(page, '21-plan-semestral');
  await goToMenu(page, 'Indicadores');
  await page.getByText('Estudiantes activos').first().waitFor();
  await shot(page, '22-indicadores');
});

test('profesional de servicio', async ({ page }) => {
  await loginUi(page, accounts.psychology);
  await shot(page, '23-inicio-servicio');
  await goToMenu(page, 'Casos derivados');
  await page.getByRole('row').nth(1).waitFor();
  await shot(page, '24-bandeja-servicio');
  await page.getByRole('row').nth(1).getByTitle('Ver Detalles').click();
  await page.getByRole('dialog', { name: 'Detalle de derivación' }).waitFor();
  await shot(page, '25-detalle-derivacion');
});

test('vicerrectorado', async ({ page }) => {
  await loginUi(page, accounts.vice);
  await goToMenu(page, 'Informe consolidado');
  await page.getByText('Escuela / facultad', { exact: true }).waitFor();
  await shot(page, '26-informe-consolidado');
});

test('administrador', async ({ page }) => {
  await loginUi(page, accounts.admin);
  await shot(page, '27-inicio-administrador');
  await goToMenu(page, 'Usuarios y roles');
  await page.getByRole('heading', { level: 1, name: 'Usuarios y roles' }).first().waitFor();
  await shot(page, '28-usuarios');
  await page.getByRole('button', { name: /Nuevo/ }).first().click();
  await page.getByRole('dialog').waitFor();
  const role = page.getByRole('dialog').getByLabel('Rol', { exact: true });
  await role.selectOption({ label: 'Profesional de Servicio' });
  await shot(page, '29-usuario-nuevo-servicio');
  await page.keyboard.press('Escape');

  await goToMenu(page, 'Catálogos');
  await page.getByRole('tab', { name: 'Facultades' }).waitFor();
  await shot(page, '30-catalogos');
  await goToMenu(page, 'Parámetros');
  await page.getByRole('heading', { level: 1, name: 'Parámetros del sistema' }).first().waitFor();
  await shot(page, '31-parametros');
  await goToMenu(page, 'Identidad visual');
  await page.getByLabel('Nombre corto').waitFor();
  await shot(page, '32-identidad-visual');
  await goToMenu(page, 'Evaluación de tutoría');
  await page.getByRole('row', { name: /Sistemas/ }).waitFor();
  await shot(page, '33-evaluacion-habilitacion');
  await goToMenu(page, 'Seguimiento DBU');
  await page.getByRole('heading', { level: 1 }).first().waitFor();
  await shot(page, '34-seguimiento-dbu');
  await goToMenu(page, 'Bitácora de auditoría');
  await page.getByRole('heading', { level: 1, name: 'Bitácora de auditoría' }).first().waitFor();
  await shot(page, '35-bitacora');
});
