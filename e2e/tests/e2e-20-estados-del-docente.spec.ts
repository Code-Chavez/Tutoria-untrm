import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { accounts } from '../support/accounts';
import { api, apiLogin } from '../support/api';
import { createPortalStudent, ensureAnaWithElena, releaseCycles, userId } from '../support/setup';
import { goToMenu, loginUi } from '../support/ui';

// E2E-20: los tres estados en que una designación de docente deja un ciclo sin tutor efectivo — RECHAZO, SIN RESPUESTA y CORREO NO
// ENVIADO — recorridos en la aplicación real: cómo se ve en «Pendientes» de la coordinación y qué pasa con la solicitud de un
// estudiante del ciclo. Documenta el comportamiento ACTUAL; no resuelve las decisiones institucionales (ver
// docs/DECISIONES_DBU_COBERTURA_Y_PLAN_2026-10-18.md, temas 1 y 2): las pruebas marcadas «comportamiento actual» cambiarán cuando la
// DBU decida.
test.describe.configure({ mode: 'serial' });

const MAILPIT = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025';
const CYCLE = 10;
const SCHOOL = 'Ingeniería de Sistemas';
const DECLINE_REASON = `Licencia por salud ${Date.now().toString(36)}`;

let schoolId = '';
let elenaId = '';
let student: Awaited<ReturnType<typeof createPortalStudent>>;

const clear = () => releaseCycles(SCHOOL, accounts.tutor.email, [CYCLE]);
const docker = (...args: string[]) => execFileSync('docker', args, { encoding: 'utf8', timeout: 60_000 });

async function coordinatorToken() {
  return apiLogin(accounts.coordinator);
}

/** La coordinación designa a Elena para el ciclo; devuelve si salió el correo de aceptación. */
async function designate(): Promise<boolean | null | undefined> {
  const token = await coordinatorToken();
  const res = await api<{ acceptanceEmailSent?: boolean | null }>(token, 'PUT', `/schools/${schoolId}/cycle-tutors/${CYCLE}`, { tutorId: elenaId });
  expect(res.status).toBe(200);
  return res.body.acceptanceEmailSent;
}

async function latestAcceptanceLink(): Promise<string> {
  for (let i = 0; i < 40; i += 1) {
    const list = (await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${accounts.tutor.email} subject:"ciclo ${CYCLE}"`)}`)).json()) as { messages: { ID: string }[] };
    if (list.messages?.[0]) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${list.messages[0].ID}`)).json()) as { Text: string };
      const match = /(https?:\/\/\S+\/aceptar-tutoria\/[0-9a-f]{64})/.exec(full.Text);
      if (match) return match[1];
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('no llegó el correo de aceptación a la bandeja de pruebas');
}

const clearMailbox = () => fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${accounts.tutor.email}`)}`, { method: 'DELETE' });

async function pendingItems(): Promise<{ kind: string; title: string; detail: string }[]> {
  const res = await api<{ items: { kind: string; title: string; detail: string; cycle: number | null }[] }>(await coordinatorToken(), 'GET', '/institutional-pending');
  expect(res.status).toBe(200);
  return res.body.items.filter((i) => i.cycle === CYCLE && /Sistemas/.test(i.title));
}

test.beforeAll(async () => {
  const setup = await ensureAnaWithElena();
  elenaId = setup.elenaId;
  await clear();
  const admin = await apiLogin(accounts.admin);
  const schools = await api<{ schools: { id: string; name: string }[] }>(admin, 'GET', '/schools');
  schoolId = schools.body.schools.find((s) => s.name === SCHOOL)!.id;
  // Una estudiante del ciclo 10 sin tutor, con cuenta de portal: es a quien le llegan (o no) las solicitudes
  student = await createPortalStudent(setup.adminToken, elenaId, { cycle: CYCLE, assignToElena: false });
});

test.afterAll(async () => {
  try {
    docker('start', 'sit-mailpit'); // por si una prueba lo dejó detenido
  } catch {
    /* ya estaba levantado */
  }
  await clear();
});

test('RECHAZO: el docente dice que no puede; la coordinación lo ve con el motivo y el ciclo queda sin tutor efectivo', async ({ page, browser }) => {
  await clearMailbox();
  expect(await designate()).toBe(true);
  const link = await latestAcceptanceLink();

  const teacher = await (await browser.newContext()).newPage();
  await teacher.goto(link);
  await expect(teacher.getByRole('heading', { name: `Tutoría — ciclo ${CYCLE}` })).toBeVisible({ timeout: 45_000 });
  await teacher.getByRole('radio', { name: 'No puedo asumirlo' }).click();
  await teacher.getByLabel('Motivo').fill(DECLINE_REASON);
  await teacher.getByRole('button', { name: 'Enviar respuesta' }).click();
  await expect(teacher.getByRole('status')).toBeVisible({ timeout: 45_000 });

  // La coordinación lo ve en «Pendientes», con el motivo
  await loginUi(page, accounts.coordinator);
  await goToMenu(page, 'Pendientes');
  const item = page.getByRole('listitem').filter({ hasText: DECLINE_REASON });
  await expect(item).toContainText(`rechazó la tutoría del ciclo ${CYCLE}`);
  await expect(item).toContainText('Docente rechazó');
  await expect(item.getByRole('link', { name: /Asignación por ciclo/ })).toBeVisible();
});

test('RECHAZO (comportamiento actual, pendiente de decisión de la DBU): la estudiante conserva a la docente que rechazó y su solicitud sigue yendo a ella', async () => {
  // Decisión institucional 1 y 2 (DECISIONES_DBU…): hoy la designación se aplica a los estudiantes al designar y el rechazo no
  // los libera. Esta prueba DOCUMENTA ese comportamiento; cuando la DBU decida, se reemplaza por la regla nueva.
  const token = await apiLogin({ email: student.email, password: student.password, role: 'Tutorado', greeting: 'Prueba' });
  const recipient = await api<{ recipient: { kind: string; name: string } | null }>(token, 'GET', '/tutoring-requests/recipient');
  expect(recipient.status).toBe(200);
  expect(recipient.body.recipient?.kind).toBe('tutor');
  expect(recipient.body.recipient?.name).toContain('Elena');
  test.info().annotations.push({ type: 'decisión pendiente', description: 'La solicitud sigue yendo al docente que rechazó (temas 1 y 2 del documento de decisiones).' });
});

test('SIN RESPUESTA: el enlace vence sin que el docente responda; aparece como pendiente y el enlace ya no sirve', async ({ page, browser }) => {
  await clear();
  await clearMailbox();
  expect(await designate()).toBe(true);
  const link = await latestAcceptanceLink();

  // Se hace vencer el enlace de ESTA designación (datos de prueba del ciclo 10 de Sistemas, en la base de desarrollo)
  docker(
    'exec', 'sit-postgres', 'psql', '-U', 'sit_user', '-d', 'sit_db', '-c',
    `UPDATE cycle_tutor_assignments SET acceptance_expires_at = now() - interval '1 hour' WHERE cycle = ${CYCLE} AND acceptance_status = 'PENDIENTE' AND school_id = '${schoolId}'`,
  );

  const items = await pendingItems();
  expect(items.map((i) => i.kind)).toContain('DESIGNATION_NO_RESPONSE');

  await loginUi(page, accounts.coordinator);
  await goToMenu(page, 'Pendientes');
  const item = page.getByRole('listitem').filter({ hasText: `no respondió a la designación del ciclo ${CYCLE}` });
  await expect(item).toContainText('Sin respuesta');
  await expect(item).toContainText('venció sin respuesta');

  // Para el docente, el enlace vencido ya no sirve
  const teacher = await (await browser.newContext()).newPage();
  await teacher.goto(link);
  await expect(teacher.getByRole('heading', { name: 'Enlace no válido' })).toBeVisible({ timeout: 45_000 });
});

test('CORREO NO ENVIADO: si el servidor de correo no responde, se avisa a quien designó y queda como pendiente; al reenviar desaparece', async ({ page }) => {
  await clear();
  await clearMailbox();
  docker('stop', 'sit-mailpit');
  try {
    expect(await designate()).toBe(false); // el correo no salió, y la API lo dice

    const items = await pendingItems();
    expect(items.map((i) => i.kind)).toContain('ACCEPTANCE_EMAIL_FAILED');
    expect(items.map((i) => i.kind)).not.toContain('DESIGNATION_NO_RESPONSE'); // la causa es el correo, no el silencio del docente

    await loginUi(page, accounts.coordinator);
    await goToMenu(page, 'Pendientes');
    const item = page.getByRole('listitem').filter({ hasText: `No salió el correo de aceptación` }).filter({ hasText: `ciclo ${CYCLE}` });
    await expect(item).toContainText('Correo no enviado');
    await expect(item).toContainText('no recibió el enlace');
  } finally {
    docker('start', 'sit-mailpit');
  }

  // Con el correo otra vez disponible, la coordinación reenvía y el pendiente desaparece
  await expect.poll(async () => (await fetch(`${MAILPIT}/api/v1/info`).catch(() => ({ ok: false }))).ok, { timeout: 60_000 }).toBe(true);
  const resend = await api<{ emailSent?: boolean }>(await coordinatorToken(), 'POST', `/schools/${schoolId}/cycle-tutors/${CYCLE}/acceptance-request`);
  expect(resend.status).toBe(200);
  expect(resend.body.emailSent).toBe(true);
  expect((await pendingItems()).map((i) => i.kind)).not.toContain('ACCEPTANCE_EMAIL_FAILED');
});

test('la lista de pendientes del ciclo queda limpia al liberar la designación', async () => {
  await clear();
  // Liberada la designación ya no hay rechazo, silencio ni correo fallido (sí puede haber estudiantes del ciclo sin tutor: otro pendiente)
  expect((await pendingItems()).filter((i) => i.kind !== 'CYCLE_WITHOUT_TUTOR')).toEqual([]);
  expect(await userId(await apiLogin(accounts.admin), accounts.tutor.email)).toBe(elenaId);
});
