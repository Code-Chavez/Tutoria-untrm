import { expect, test } from '@playwright/test';
import { accounts } from '../support/accounts';
import { goToMenu, loginUi } from '../support/ui';

// E2E-11 (fase 2, tutoría por ciclo): la coordinación pide por correo la lista de estudiantes de su escuela. El correo de
// destino se configura en la misma pantalla; el pedido sale con la plantilla adjunta, a nombre de quien pide (copia y
// respuesta a su correo) y queda en el historial hasta marcarlo como recibido. Los correos de desarrollo van a Mailpit.
const MAILPIT = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025';
const destination = `listas-${Date.now().toString(36)}@untrm.edu.pe`;

test.describe.configure({ mode: 'serial' });

test('la coordinadora configura el correo, pide las listas y el correo sale con la plantilla adjunta', async ({ page }) => {
  await loginUi(page, accounts.coordinator);
  await goToMenu(page, 'Pedir listas');
  await expect(page.getByRole('heading', { name: 'Pedir listas de estudiantes' })).toBeVisible();

  // Siempre se prueba el cambio de correo: así sirve tanto con la escuela sin correo como con uno ya configurado.
  const change = page.getByRole('button', { name: 'Cambiar correo' });
  if (await change.isVisible().catch(() => false)) await change.click();
  await page.getByLabel('Correo al que se piden las listas').fill(destination);
  await page.getByRole('button', { name: 'Guardar correo' }).click();
  await expect(page.getByText('Correo guardado.')).toBeVisible();
  await expect(page.getByText(destination)).toBeVisible();

  await page.getByLabel('3', { exact: true }).check();
  await page.getByLabel(/Observaciones/).fill('Prueba E2E del pedido');
  await page.getByRole('button', { name: 'Enviar pedido' }).click();
  await expect(page.getByRole('alert').filter({ hasText: `Pedido enviado a ${destination}` })).toBeVisible({ timeout: 45_000 });

  // El correo salió de verdad (a la bandeja de pruebas) con la plantilla adjunta y respuesta a quien pidió.
  let message: { ID: string; Subject: string; ReplyTo: { Address: string }[]; Attachments: number; To: { Address: string }[] } | undefined;
  for (let i = 0; i < 20 && !message; i += 1) {
    const list = (await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${destination}`)}`)).json()) as { messages: typeof message[] };
    message = list.messages?.[0];
    if (!message) await new Promise((r) => setTimeout(r, 500));
  }
  expect(message, 'el correo del pedido debe llegar a la bandeja de pruebas').toBeTruthy();
  const full = (await (await fetch(`${MAILPIT}/api/v1/message/${message!.ID}`)).json()) as { Subject: string; ReplyTo: { Address: string }[]; Attachments: { FileName: string }[]; Text: string };
  expect(full.Subject).toMatch(/Solicitud de lista de estudiantes — .* — periodo /);
  expect(full.ReplyTo[0].Address).toBe(accounts.coordinator.email);
  expect(full.Attachments.map((a) => a.FileName)).toContain('plantilla-estudiantes.xlsx');
  expect(full.Text).toContain('Prueba E2E del pedido');
  expect(full.Text).toContain('ciclos 3');
});

test('el pedido queda en el historial y se marca como recibido', async ({ page }) => {
  await loginUi(page, accounts.coordinator);
  await goToMenu(page, 'Pedir listas');

  const item = page.getByRole('listitem').filter({ hasText: destination }).first();
  await expect(item).toBeVisible();
  await expect(item.getByText('Enviado', { exact: true })).toBeVisible();
  await item.getByRole('button', { name: 'Marcar como recibido' }).click();
  await expect(item.getByText(/Recibido el/)).toBeVisible();
});

test('la DBU también ve el pedido, y un tutor no tiene la opción', async ({ page, browser }) => {
  await loginUi(page, accounts.admin);
  await goToMenu(page, 'Pedir listas');
  await expect(page.getByRole('listitem').filter({ hasText: destination }).first()).toBeVisible();

  const tutor = await (await browser.newContext()).newPage();
  await loginUi(tutor, accounts.tutor);
  await expect(tutor.locator('nav').getByRole('link', { name: 'Pedir listas', exact: true })).toHaveCount(0);
});
