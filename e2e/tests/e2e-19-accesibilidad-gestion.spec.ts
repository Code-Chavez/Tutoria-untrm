import { expect, test } from '@playwright/test';
import { accounts, type AccountKey } from '../support/accounts';
import { expectNoSeriousViolations } from '../support/a11y';
import { goToMenu, loginUi } from '../support/ui';

// E2E-19: accesibilidad de las pantallas de gestión (informes, configuración, periodo, derivaciones, plan semestral, estudiantes).
// Misma regla que E2E-18: axe no debe encontrar infracciones serias o críticas ni de estructura (un <main>, regiones, títulos en
// orden); las leves se anotan. Axe NO sustituye al lector de pantalla ni al teléfono real, que siguen pendientes.
const SCREENS: { who: AccountKey; screens: string[] }[] = [
  { who: 'coordinator', screens: ['Estudiantes', 'Solicitudes de tutoría', 'Pendientes', 'Pedir listas', 'Carga de estudiantes', 'Asignación por ciclo', 'Plan semestral', 'Horarios y asistencia', 'Indicadores', 'Resultados de evaluación', 'Sugerencias de estudiantes', 'Correos de las escuelas', 'Amonestaciones'] },
  { who: 'admin', screens: ['Carga de docentes', 'Cierre de periodo', 'Casos derivados', 'Seguimiento DBU', 'Informe consolidado', 'Sedes', 'Evaluación de tutoría', 'Catálogos', 'Usuarios y roles', 'Parámetros', 'Identidad visual', 'Bitácora de auditoría'] },
  { who: 'tutor', screens: ['Estudiantes', 'Sesiones', 'Casos derivados', 'Informe semestral'] },
  { who: 'psychology', screens: ['Casos derivados'] },
];

for (const { who, screens } of SCREENS) {
  test.describe(`gestión · ${who}`, () => {
    for (const screen of screens) {
      test(`«${screen}» no tiene infracciones serias ni de estructura`, async ({ page }, testInfo) => {
        await loginUi(page, accounts[who]);
        await goToMenu(page, screen);
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
        await expect(page.getByRole('progressbar')).toHaveCount(0, { timeout: 60_000 }); // ya cargó: se revisa la pantalla final
        await expectNoSeriousViolations(page, testInfo, `${who} · ${screen}`);
      });
    }
  });
}

test('el detalle de un caso derivado (diálogo) tampoco tiene infracciones y se cierra con Escape devolviendo el foco', async ({ page }, testInfo) => {
  await loginUi(page, accounts.psychology);
  await goToMenu(page, 'Casos derivados');
  await expect(page.getByRole('progressbar')).toHaveCount(0, { timeout: 60_000 });
  const open = page.getByRole('row').getByRole('button', { name: /Ver|Abrir|Atender|Recibir|Detalle/ }).first();
  test.skip((await open.count()) === 0, 'no hay casos derivados en el entorno para abrir el detalle');
  await open.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog').first();
  await expect(dialog).toBeVisible();
  await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
  await expectNoSeriousViolations(page, testInfo, 'diálogo de caso derivado', '[role="dialog"]');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();
});
