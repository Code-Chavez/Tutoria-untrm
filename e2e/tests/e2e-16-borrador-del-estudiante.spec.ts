import { expect, test } from '@playwright/test';
import { accounts } from '../support/accounts';
import { goToMenu, loginUi } from '../support/ui';

// E2E-16 (U07): lo que la persona escribe no se pierde al cambiar de pantalla, y no sobrevive a cerrar la sesión.
const draft = `Tengo dificultades con el curso ${Date.now().toString(36)}`;

test('lo escrito en la solicitud se recupera al volver de otra pantalla y se puede descartar', async ({ page }) => {
  await loginUi(page, accounts.student);
  await goToMenu(page, 'Solicitar tutoría');
  await page.getByLabel('Descripción del motivo').fill(draft);

  // Se va a «Mis sesiones» sin enviar y vuelve
  await goToMenu(page, 'Mis sesiones');
  await goToMenu(page, 'Solicitar tutoría');
  await expect(page.getByLabel('Descripción del motivo')).toHaveValue(draft);
  await expect(page.getByText(/Recuperamos lo que habías escrito/)).toBeVisible();

  // Recargar tampoco lo pierde
  await page.reload();
  await expect(page.getByLabel('Descripción del motivo')).toHaveValue(draft);

  await page.getByRole('button', { name: 'Descartar borrador' }).click();
  await expect(page.getByLabel('Descripción del motivo')).toHaveValue('');
});

test('al cerrar sesión no queda lo escrito: otra persona en el mismo equipo no lo ve', async ({ page }) => {
  await loginUi(page, accounts.student);
  await goToMenu(page, 'Solicitar tutoría');
  await page.getByLabel('Descripción del motivo').fill(draft);
  await expect(page.getByLabel('Descripción del motivo')).toHaveValue(draft);

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login/);

  // Nada de la solicitud quedó en el almacenamiento de la pestaña
  const leftovers = await page.evaluate(() => Object.keys(window.sessionStorage).filter((k) => k.startsWith('sit.draft.')));
  expect(leftovers).toEqual([]);

  // Ni siquiera la misma persona, al volver a entrar, encuentra el texto
  await loginUi(page, accounts.student);
  await goToMenu(page, 'Solicitar tutoría');
  await expect(page.getByLabel('Descripción del motivo')).toHaveValue('');
});
