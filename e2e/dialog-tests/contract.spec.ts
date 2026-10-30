import { test, expect } from '@playwright/test';

test('diálogo real: teclado, operación única, rechazo y móvil sin API ni datos', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const opener = page.getByRole('button', { name: 'Abrir confirmación', exact: true });
  const dialog = page.getByRole('alertdialog');
  const cancel = dialog.getByRole('button', { name: 'Cancelar', exact: true });
  const confirm = dialog.getByRole('button', { name: 'Confirmar prueba', exact: true });

  await opener.press('Enter');
  await expect(cancel).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(confirm).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(cancel).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();

  await opener.press('Enter');
  await confirm.press('Enter');
  await expect(confirm).toBeDisabled();
  const spinner = confirm.locator('span[aria-hidden="true"]');
  await expect(spinner).toHaveCSS('animation-iteration-count', 'infinite');
  const initialTransform = await spinner.evaluate((el) => getComputedStyle(el).transform);
  await expect.poll(() => spinner.evaluate((el) => getComputedStyle(el).transform)).not.toBe(initialTransform);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Enter');
  await expect(dialog).toHaveCount(1);
  await expect(page.getByLabel('Operaciones', { exact: true })).toHaveText('1');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect(page.getByRole('status').filter({ hasText: 'Prueba completada' })).toContainText('Prueba completada');

  await page.getByRole('checkbox', { name: 'Simular un error' }).check();
  await opener.press('Enter');
  await confirm.press('Enter');
  await expect(confirm).toBeDisabled();
  await expect(dialog).toContainText('Error de prueba');
  await expect(confirm).toBeEnabled();
  await expect(page.getByLabel('Operaciones', { exact: true })).toHaveText('2');
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();

  await page.setViewportSize({ width: 375, height: 812 });
  await opener.press('Enter');
  await expect(cancel).toBeFocused();
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.keyboard.press('Escape');
});

test('respeta movimiento reducido sin perder el estado de carga ni bloquear el resultado', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByText(/Tu dispositivo solicita reducir el movimiento/)).toBeVisible();
  await page.getByRole('button', { name: 'Abrir confirmación', exact: true }).press('Enter');
  const dialog = page.getByRole('alertdialog');
  const confirm = dialog.getByRole('button', { name: 'Confirmar prueba', exact: true });
  await confirm.press('Enter');
  await expect(confirm).toBeDisabled();
  await expect(dialog).toHaveAttribute('aria-busy', 'true');
  await expect(confirm.locator('span[aria-hidden="true"]')).toHaveCSS('animation-iteration-count', '1');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'Prueba completada' })).toBeVisible();
});
