import { expect, Page, test } from '@playwright/test';
import { accounts } from '../support/accounts';
import { api, apiLogin } from '../support/api';
import { goToMenu, loginUi } from '../support/ui';

// E2E-06 (HU-41, HU-42): la coordinadora deja vigente el plan de su escuela con una resolución y, al editarlo,
// se crea una nueva revisión que conserva la versión aprobada. Termina siempre con el plan vigente.
test.describe.configure({ mode: 'serial' });

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R/Size 4>>\n%%EOF\n');

const plan = {
  introduction: 'Introducción de prueba',
  denomination: 'Plan de tutoría E2E',
  eventType: 'Tutoría',
  executionDate: 'Semestre en curso',
  schedule: 'Semanal',
  place: 'Campus',
  modality: 'Presencial',
  organizers: 'Coordinación de la escuela',
  supportUnit: 'DBU',
  foundation: 'Fundamento de prueba',
  generalObjective: 'Acompañar a los estudiantes',
  specificObjectives: ['Reducir la deserción'],
  targetAudience: 'Estudiantes de la escuela',
  methodology: 'Entrevistas y seguimiento',
  planning: [{ activity: 'Diagnóstico', startDate: '2026-08-10', endDate: '2026-08-20' }],
  programming: [{ date: '2026-09-01', activity: 'Taller', time: '15:00', place: 'Aula', responsible: 'Tutor' }],
  physicalResources: [{ quantity: 1, resource: 'Proyector', characteristics: '' }],
  humanResources: [{ quantity: 2, resource: 'Tutores', characteristics: '' }],
  budget: [{ quantity: 1, type: 'Material', resource: 'Papel', characteristics: '', unitCost: 20 }],
  operationalActivities: [{ activity: 'Reunión', date: '2026-09-10' }],
};

async function attachResolution(page: Page): Promise<void> {
  await page.getByLabel('Archivo de la resolución').setInputFiles({ name: 'resolucion-e2e.pdf', mimeType: 'application/pdf', buffer: PDF });
  await expect(page.getByText('Plan vigente')).toBeVisible();
}

test.beforeAll(async () => {
  // Garantiza que el plan exista sin depender de la corrida anterior.
  const coordinator = await apiLogin(accounts.coordinator);
  const schools = await api<{ schools: { schoolId: string }[] }>(coordinator, 'GET', '/work-plans');
  const schoolId = schools.body.schools[0].schoolId;
  const current = await api<{ plan: unknown | null }>(coordinator, 'GET', `/work-plans/${schoolId}`);
  if (!current.body.plan) {
    const saved = await api(coordinator, 'PUT', `/work-plans/${schoolId}`, plan);
    expect(saved.status).toBe(200);
  }
});

test('la coordinadora deja vigente el plan con la resolución', async ({ page }) => {
  await loginUi(page, accounts.coordinator);
  await goToMenu(page, 'Plan semestral');
  await expect(page.getByRole('heading', { level: 2, name: 'Resolución de aprobación' })).toBeVisible();

  if (!(await page.getByText('Plan vigente').isVisible())) await attachResolution(page);
  await expect(page.getByText('Plan vigente')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Descargar' }).first()).toBeVisible();
});

test('al editar el plan aprobado se crea una revisión y se conserva la versión aprobada', async ({ page }) => {
  await loginUi(page, accounts.coordinator);
  await goToMenu(page, 'Plan semestral');
  await expect(page.getByText('Plan vigente')).toBeVisible();

  const denomination = `Plan de tutoría E2E ${Date.now().toString(36)}`;
  await page.getByLabel(/Denominación/).fill(denomination);
  await page.getByRole('button', { name: 'Guardar como nueva revisión' }).click();
  await expect(page.getByText('Crear una nueva revisión')).toBeVisible();
  await page.getByRole('button', { name: 'Guardar revisión' }).click();

  await expect(page.getByText('Revisión pendiente de resolución')).toBeVisible();
  await expect(page.getByRole('heading', { level: 4, name: 'Versiones aprobadas anteriores' })).toBeVisible();

  await attachResolution(page);
});
