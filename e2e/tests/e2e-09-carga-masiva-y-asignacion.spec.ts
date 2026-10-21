import { expect, test } from '@playwright/test';
import ExcelJS from 'exceljs';
import { accounts } from '../support/accounts';
import { releaseCycles } from '../support/setup';
import { goToMenu, loginUi } from '../support/ui';

// E2E-09 (HU-08, HU-09, HU-12, HU-13): la coordinadora carga estudiantes desde Excel (una fila con error), asigna el ciclo 3
// a una tutora (la asignación es por ciclo, no estudiante por estudiante), reasigna a uno individualmente con motivo, y cada
// tutor ve solo los suyos.
test.describe.configure({ mode: 'serial' });

const stamp = Date.now().toString(36).toUpperCase();
const base = Number(String(Date.now()).slice(-6)) * 100; // 8 dígitos; únicos por corrida
const students = [1, 2, 3].map((n) => ({ code: String(98_000_000 + (base % 1_000_000) + n), name: `Carga${n}`, last: `E2E ${stamp}` }));
const jorge = { email: 'jorge.salazar@untrm.edu.pe', password: 'Demo2026!', role: 'Docente Tutor', greeting: 'Jorge' };

/** El ciclo 3 de Sistemas (y cualquier otro ciclo de Elena) queda libre antes y después: la prueba se repite y no estorba a las demás. */
const clearCycles = () => releaseCycles('Ingeniería de Sistemas', accounts.tutor.email, [3]);

test.beforeAll(clearCycles);
test.afterAll(clearCycles);

async function buildWorkbook(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Estudiantes');
  sheet.addRow(['codigo', 'nombres', 'apellidos', 'correo', 'telefono', 'ciclo', 'escuela']);
  for (const s of students) sheet.addRow([s.code, s.name, s.last, `${s.name.toLowerCase()}.${stamp.toLowerCase()}@ejemplo.invalid`, '', 3, 'Ingeniería de Sistemas']);
  sheet.addRow([String(98_999_000 + (base % 1000)), 'Error', `E2E ${stamp}`, '', '', 3, 'Escuela que no existe']);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

test('la coordinadora importa el Excel: 3 estudiantes se registran y la fila con error se informa', async ({ page }) => {
  await loginUi(page, accounts.coordinator);
  await goToMenu(page, 'Carga de estudiantes');
  await page.locator('input[type=file]').setInputFiles({
    name: `estudiantes-e2e-${stamp}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: await buildWorkbook(),
  });
  await page.getByRole('button', { name: 'Importar estudiantes' }).click();

  await expect(page.getByRole('heading', { level: 2, name: 'Resultado de la carga' })).toBeVisible();
  await expect(page.getByText('Filas procesadas').locator('..')).toContainText('4');
  await expect(page.getByText('Nuevos', { exact: true }).locator('..')).toContainText('3');
  await expect(page.getByText('Omitidos').locator('..')).toContainText('1');
  await expect(page.getByText(/Errores de validación \(1\)/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Descargar reporte' })).toBeVisible();
});

test('la coordinadora asigna el ciclo 3 a Elena y los 3 estudiantes nuevos pasan a ella', async ({ page }) => {
  await loginUi(page, accounts.coordinator);
  await goToMenu(page, 'Asignación por ciclo');

  const select = page.getByLabel('Tutor del ciclo 3');
  await expect(select).toBeVisible({ timeout: 45_000 });
  const elena = await select.locator('option', { hasText: 'Elena' }).first().getAttribute('value');
  await select.selectOption(elena!);
  await expect(page.getByRole('status').filter({ hasText: /Ciclo 3: \d+ estudiante\(s\) asignados/ })).toBeVisible({ timeout: 45_000 });

  await goToMenu(page, 'Estudiantes');
  await page.getByLabel('Buscar estudiante').fill(stamp);
  await expect(page.getByRole('row', { name: /Carga/ })).toHaveCount(3);
  for (const student of students) await expect(page.getByRole('row', { name: new RegExp(student.code) })).toContainText('Elena');
});

test('la coordinadora reasigna a uno de ellos a Jorge con un motivo', async ({ page }) => {
  await loginUi(page, accounts.coordinator);
  await goToMenu(page, 'Estudiantes');
  await page.getByLabel('Buscar estudiante').fill(students[0].code);
  const row = page.getByRole('row', { name: new RegExp(students[0].code) });
  await expect(row).toContainText('Elena');

  await row.getByRole('button', { name: /Más/ }).click();
  await page.getByText('Reasignar tutor', { exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Reasignar estudiante' });
  const jorgeValue = await dialog.locator('select option', { hasText: 'Jorge' }).first().getAttribute('value');
  await dialog.locator('select').selectOption(jorgeValue!);
  await dialog.getByPlaceholder(/Reorganización de carga/).fill(`Reasignación de prueba ${stamp}`);
  await dialog.getByRole('button', { name: 'Reasignar', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(row).toContainText('Jorge');
});

test('cada tutor ve solo los suyos: Elena dos, Jorge uno', async ({ page, browser }) => {
  await loginUi(page, accounts.tutor);
  await goToMenu(page, 'Estudiantes');
  await page.getByLabel('Buscar estudiante').fill(stamp);
  await expect(page.getByRole('row', { name: /Carga/ })).toHaveCount(2);
  await expect(page.getByRole('row', { name: new RegExp(students[0].code) })).toHaveCount(0);

  const other = await (await browser.newContext()).newPage();
  await loginUi(other, jorge);
  await goToMenu(other, 'Estudiantes');
  await other.getByLabel('Buscar estudiante').fill(stamp);
  await expect(other.getByRole('row', { name: /Carga/ })).toHaveCount(1);
  await expect(other.getByRole('row', { name: new RegExp(students[0].code) })).toBeVisible();
});
