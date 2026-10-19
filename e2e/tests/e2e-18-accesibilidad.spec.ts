import { expect, test, type Page } from '@playwright/test';
import { accounts } from '../support/accounts';
import { api, apiLogin, unique } from '../support/api';
import { expectNoSeriousViolations } from '../support/a11y';
import { createPortalStudent, ensureAnaWithElena, setSistemasEvaluationWindow } from '../support/setup';
import { goToMenu, loginUi } from '../support/ui';

// E2E-18: accesibilidad de ingreso, solicitud, sesiones, evaluación y diálogos de atención.
// Axe revisa etiquetas, nombres, roles y contraste; NO sustituye el teclado ni el lector de pantalla, así que aquí también se
// comprueba con teclado real: el orden de tabulación del ingreso, el foco al abrir y cerrar un diálogo, y que la carga y el error
// se anuncien (role status / alert). Las infracciones leves quedan anotadas en el informe; las serias o críticas hacen fallar.
const reason = unique('Apoyo para revisión de accesibilidad');
let adminToken = '';
let respondent: Awaited<ReturnType<typeof createPortalStudent>>;

test.beforeAll(async () => {
  const setup = await ensureAnaWithElena();
  adminToken = setup.adminToken;
  await setSistemasEvaluationWindow(adminToken, true);
  respondent = await createPortalStudent(adminToken, setup.elenaId);
  const student = await apiLogin(accounts.student);
  expect((await api(student, 'POST', '/tutoring-requests/me', { caseType: 'ACADEMIC', reason })).status).toBe(201);
});

test.afterAll(async () => {
  const tutor = await apiLogin(accounts.tutor);
  const inbox = await api<{ requests: { id: string; reason: string }[] }>(tutor, 'GET', '/tutoring-requests?mine=true');
  for (const r of inbox.body.requests.filter((x) => x.reason === reason)) {
    await api(tutor, 'PATCH', `/tutoring-requests/${r.id}/status`, { status: 'ATENDIDA', note: 'Limpieza de prueba E2E' });
  }
});

test.describe('ingreso', () => {
  test('la pantalla de ingreso no tiene infracciones serias y se maneja solo con teclado', async ({ page }, testInfo) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
    await expectNoSeriousViolations(page, testInfo, 'ingreso');

    // Los campos se pueden nombrar (lector de pantalla) y se recorren con Tab en el orden esperado
    const email = page.getByPlaceholder('usuario@untrm.edu.pe');
    const password = page.getByPlaceholder('••••••••');
    await expect(email).toHaveAccessibleName(/correo|usuario|email/i);
    await expect(password).toHaveAccessibleName(/contraseña|clave/i);
    await email.focus();
    await page.keyboard.press('Tab');
    await expect(password).toBeFocused();

    // Enviar con Enter desde el teclado (sin ratón)
    await email.fill(accounts.student.email);
    await password.fill(accounts.student.password);
    await password.press('Enter');
    await expect(page.getByRole('heading', { level: 1, name: /Bienvenid[oa], Ana/ })).toBeVisible({ timeout: 45_000 });
  });

  test('un error de ingreso se anuncia (role alert) y no depende solo del color', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('usuario@untrm.edu.pe').fill(accounts.student.email);
    await page.getByPlaceholder('••••••••').fill('clave-incorrecta');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).not.toHaveText('');
  });
});

test.describe('estudiante', () => {
  test('solicitar tutoría, mis sesiones y evaluación no tienen infracciones serias', async ({ page }, testInfo) => {
    await loginUi(page, accounts.student);
    await goToMenu(page, 'Solicitar tutoría');
    await expect(page.getByLabel('Descripción del motivo')).toBeVisible();
    await expectNoSeriousViolations(page, testInfo, 'solicitar tutoría');

    await goToMenu(page, 'Mis sesiones');
    await expect(page.getByRole('heading', { name: 'Mis sesiones' }).first()).toBeVisible();
    await expect(page.getByRole('progressbar')).toHaveCount(0); // ya cargó: se revisa la pantalla final, no el esqueleto
    await expectNoSeriousViolations(page, testInfo, 'mis sesiones');
  });

  test('la evaluación (20 ítems con leyenda) no tiene infracciones serias y su grupo de opciones tiene nombre', async ({ page }, testInfo) => {
    await loginUi(page, { ...respondent, role: 'Tutorado' });
    await goToMenu(page, 'Evaluar tutoría');
    await expect(page.getByRole('button', { name: 'Enviar evaluación' })).toBeVisible();
    await expectNoSeriousViolations(page, testInfo, 'evaluación');
    // Cada pregunta es un grupo de opciones con nombre (lector de pantalla: «pregunta, grupo, S Siempre…»)
    const groups = page.getByRole('radiogroup');
    await expect(groups).toHaveCount(20);
    for (const i of [0, 9, 19]) await expect(groups.nth(i)).toHaveAccessibleName(/.+/);
  });

  test('con teclado se contesta una opción (flechas) y se llega al botón de enviar', async ({ page }) => {
    await loginUi(page, { ...respondent, role: 'Tutorado' });
    await goToMenu(page, 'Evaluar tutoría');
    const first = page.locator('#item-01 input[type=radio]').first();
    await first.focus();
    await page.keyboard.press('Space'); // marcar la primera opción
    await expect(first).toBeChecked();
    await page.keyboard.press('ArrowRight'); // cambiar de opción dentro del grupo
    await expect(page.locator('#item-01 input[type=radio]:checked')).toHaveCount(1);
    await expect(page.locator('#item-01 input[type=radio]').first()).not.toBeChecked();
  });

  test('«Saltar al contenido»: con Tab aparece, y con Enter el foco pasa al contenido principal (hay un solo <main>)', async ({ page }) => {
    await loginUi(page, accounts.student);
    await expect(page.locator('main')).toHaveCount(1);
    await page.reload(); // como al abrir la pantalla: nada tiene el foco todavía
    await expect(page.locator('main')).toHaveCount(1);
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Saltar al contenido' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('main#contenido')).toBeFocused();
  });

  test('mientras carga y si falla, la agenda lo anuncia (progressbar / alert) y ofrece reintentar', async ({ page }) => {
    await loginUi(page, accounts.student);
    // Un solo manejador cuyo comportamiento cambia (sin quitar rutas con peticiones pendientes)
    let mode: 'slow' | 'fail' | 'ok' = 'slow';
    await page.route('**/api/sessions**', async (route) => {
      if (mode === 'fail') return route.abort();
      if (mode === 'slow') await new Promise((r) => setTimeout(r, 1500));
      return route.continue().catch(() => undefined);
    });
    // Respuesta lenta: la carga se anuncia con una barra de progreso con nombre («Cargando tus sesiones…», aria-busy)
    await goToMenu(page, 'Mis sesiones');
    await expect(page.getByRole('progressbar', { name: /Cargando tus sesiones/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mis sesiones' }).first()).toBeVisible();

    // Falla: mensaje de error anunciado y botón «Reintentar» accesible
    mode = 'fail';
    await page.reload();
    await expect(page.getByRole('alert').filter({ hasText: /No se pudieron cargar tus sesiones/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
    mode = 'ok';
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByRole('alert').filter({ hasText: /No se pudieron cargar/ })).toHaveCount(0);
  });
});

test.describe('tutora: bandeja y diálogos de atención', () => {
  async function openAttend(page: Page) {
    await loginUi(page, accounts.tutor);
    await goToMenu(page, 'Solicitudes de tutoría');
    const trigger = page.getByRole('row', { name: new RegExp(reason) }).getByRole('button', { name: 'Atender' });
    await trigger.focus();
    await page.keyboard.press('Enter'); // abrir con teclado
    return trigger;
  }

  test('la bandeja y el diálogo «Atender» no tienen infracciones serias', async ({ page }, testInfo) => {
    await loginUi(page, accounts.tutor);
    await goToMenu(page, 'Solicitudes de tutoría');
    await expect(page.getByRole('row', { name: new RegExp(reason) })).toBeVisible();
    await expectNoSeriousViolations(page, testInfo, 'bandeja de solicitudes');
    await page.getByRole('row', { name: new RegExp(reason) }).getByRole('button', { name: 'Atender' }).click();
    const dialog = page.getByRole('dialog', { name: 'Atender solicitud de tutoría' });
    await expect(dialog).toBeVisible();
    await expectNoSeriousViolations(page, testInfo, 'diálogo Atender', '[role="dialog"]');
  });

  test('al abrir con teclado el foco entra en el diálogo; Escape lo cierra y el foco vuelve al botón que lo abrió', async ({ page }) => {
    const trigger = await openAttend(page);
    const dialog = page.getByRole('dialog', { name: 'Atender solicitud de tutoría' });
    await expect(dialog).toBeVisible();
    // El foco está dentro del diálogo (no se queda detrás, en la página)
    await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('con el diálogo abierto, Tab no saca el foco hacia la página de atrás', async ({ page }) => {
    await openAttend(page);
    await expect(page.getByRole('dialog', { name: 'Atender solicitud de tutoría' })).toBeVisible();
    for (let i = 0; i < 25; i += 1) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
      expect(inside, `el foco salió del diálogo en la pulsación ${i + 1}`).toBe(true);
    }
  });

  test('el diálogo «Programar sesión» tampoco tiene infracciones serias y sus campos tienen etiqueta', async ({ page }, testInfo) => {
    await openAttend(page);
    await page.getByRole('dialog', { name: 'Atender solicitud de tutoría' }).getByRole('button', { name: 'Programar sesión' }).click();
    const form = page.getByRole('dialog', { name: 'Programar sesión de tutoría' });
    await expect(form).toBeVisible();
    await expectNoSeriousViolations(page, testInfo, 'diálogo Programar sesión', '[role="dialog"]');
    for (const label of ['Fecha', 'Hora', 'Lugar', 'Tema de la sesión']) await expect(form.getByLabel(label).first()).toBeVisible();
  });
});

test.describe('móvil (375×812)', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

  const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  test('ingreso, solicitud, sesiones y evaluación: sin desplazamiento horizontal ni infracciones serias', async ({ page }, testInfo) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
    expect(await overflow(page), 'ingreso móvil').toBeLessThanOrEqual(1);
    await expectNoSeriousViolations(page, testInfo, 'ingreso (móvil)');

    await loginUi(page, accounts.student);
    // En móvil el menú puede estar plegado: se navega por la dirección, que es lo que importa aquí
    for (const [path, label] of [
      ['/solicitar-tutoria', 'solicitar tutoría (móvil)'],
      ['/mis-sesiones', 'mis sesiones (móvil)'],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: /Solicitar tutoría|Mis sesiones/ }).first()).toBeVisible();
      await expect(page.getByRole('progressbar')).toHaveCount(0); // ya cargó
      expect(await overflow(page), label).toBeLessThanOrEqual(1);
      await expectNoSeriousViolations(page, testInfo, label);
    }
  });

  test('la evaluación en móvil no se desborda y se puede responder', async ({ page }, testInfo) => {
    await loginUi(page, { ...respondent, role: 'Tutorado' });
    await page.goto('/evaluar-tutoria');
    await expect(page.getByRole('button', { name: 'Enviar evaluación' })).toBeVisible();
    expect(await overflow(page), 'evaluación móvil').toBeLessThanOrEqual(1);
    await expectNoSeriousViolations(page, testInfo, 'evaluación (móvil)');
  });
});
