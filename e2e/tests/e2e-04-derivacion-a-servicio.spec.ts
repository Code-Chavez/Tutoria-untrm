import { expect, test, Page } from '@playwright/test';
import { accounts } from '../support/accounts';
import { ensureAnaWithElena } from '../support/setup';
import { goToMenu, loginUi } from '../support/ui';

// E2E-04 (HU-28–35): la tutora deriva un caso a Psicología; solo ese servicio lo ve y lo atiende
// hasta cerrarlo; la tutora descarga la constancia sin ver las notas internas.
test.describe.configure({ mode: 'serial' });

const instance = `Consultorio E2E ${Date.now().toString(36)}`;
const reason = `Ansiedad ante exámenes E2E ${Date.now().toString(36)}`;
const internalNote = `Nota interna reservada ${Date.now().toString(36)}`;
const health = { email: 'ronald.diaz@untrm.edu.pe', password: 'Demo2026!', role: 'Profesional de Servicio', greeting: 'Ronald' };

test.beforeAll(async () => {
  await ensureAnaWithElena();
});

async function openCaseFromBell(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Notificaciones' }).click();
  await page.getByRole('menu').getByRole('button', { name: /Nueva derivación recibida/ }).first().click();
  await expect(page.getByRole('dialog', { name: 'Detalle de derivación' })).toBeVisible();
}

test('la tutora deriva el caso de Ana a Psicología', async ({ page }) => {
  await loginUi(page, accounts.tutor);
  await goToMenu(page, 'Derivar caso');
  await page.getByLabel('Buscar estudiante').fill('20191234');
  await page.getByRole('button', { name: /Derivar caso: Ana Torres/ }).click();

  const form = page.getByRole('dialog', { name: 'Ficha de derivación' });
  await form.getByLabel('Está en riesgo de repetir algún curso').check();
  await form.getByLabel('Motivo de la derivación').fill(reason);
  await form.getByLabel('Servicio al que se deriva').selectOption({ label: 'Psicología' });
  await form.getByLabel(/Instancia/).fill(instance);
  await form.getByRole('button', { name: 'Derivar caso' }).click();
  await expect(form).toBeHidden();

  await goToMenu(page, 'Casos derivados');
  await expect(page.getByRole('row', { name: new RegExp(instance) })).toBeVisible();
});

test('Psicología recibe el aviso, abre el caso y lo lleva hasta cerrarlo', async ({ page }) => {
  await loginUi(page, accounts.psychology);
  await openCaseFromBell(page);
  const detail = page.getByRole('dialog', { name: 'Detalle de derivación' });
  await expect(detail).toContainText(reason);

  const status = detail.getByLabel('Nuevo estado');
  await expect(status).toHaveValue('RECIBIDO');
  await detail.getByRole('button', { name: 'Recibir caso' }).click();
  await expect(status).toHaveValue('EN_ATENCION');
  await detail.getByRole('button', { name: 'Iniciar atención' }).click();
  await expect(status).toHaveValue('ATENDIDO');
  await expect(detail.getByRole('button', { name: 'Registrar atención' })).toBeDisabled();
  await detail.getByLabel(/Observaciones/).fill(internalNote);
  await detail.getByRole('button', { name: 'Registrar atención' }).click();
  if (!(await detail.isVisible())) await reopen(page);

  await detail.getByLabel(/Observaciones/).fill('Cierre del caso E2E');
  await detail.getByRole('button', { name: 'Cerrar caso', exact: true }).click();
  // Un caso cerrado sale de «Pendientes» (la vista inicial): se cierra el detalle y se consulta en «Cerrados»
  await page.keyboard.press('Escape');
  await expect(detail).toBeHidden();
  await page.getByRole('button', { name: /^Cerrados/ }).click();
  await expect(page.getByRole('row', { name: new RegExp(instance) })).toContainText('Cerrado');
});

async function reopen(page: Page): Promise<void> {
  // Atendido ya no es «pendiente»: el caso sale de la vista inicial y se busca en «Todos»
  await page.getByRole('button', { name: /^Todos/ }).click();
  await page.getByRole('row', { name: new RegExp(instance) }).getByTitle('Ver Detalles').click();
  await expect(page.getByRole('dialog', { name: 'Detalle de derivación' })).toBeVisible();
}

test('otro servicio no ve el caso', async ({ page }) => {
  await loginUi(page, health);
  await goToMenu(page, 'Casos derivados');
  await expect(page.getByRole('heading', { level: 1, name: /Bandeja de Derivaciones/ }).first()).toBeVisible();
  await expect(page.getByText(instance)).toHaveCount(0);
});

test('la tutora descarga la constancia y no ve las notas internas', async ({ page }) => {
  await loginUi(page, accounts.tutor);
  await goToMenu(page, 'Casos derivados');
  await page.getByRole('button', { name: /^Cerrados/ }).click(); // el caso ya está cerrado: no está en «Pendientes»
  const row = page.getByRole('row', { name: new RegExp(instance) });

  const [download] = await Promise.all([page.waitForEvent('download'), row.getByTitle('Descargar Constancia').click()]);
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);

  await row.getByTitle('Ver Detalles').click();
  const detail = page.getByRole('dialog', { name: 'Detalle de derivación' });
  await expect(detail).toContainText('Cerrado');
  await expect(detail).not.toContainText(internalNote);
});

test('la DBU ve el caso en el seguimiento', async ({ page }) => {
  await loginUi(page, accounts.admin);
  await goToMenu(page, 'Seguimiento DBU');
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await expect(page.getByText('Psicología').first()).toBeVisible();
});
