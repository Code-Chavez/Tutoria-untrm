import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { accounts, type Account } from '../support/accounts';
import { api, apiLogin, apiPublic } from '../support/api';

// E2E-25 (certificación del docente tutor, corte 4: PDF de demostración): con un trámite aprobado, la administración registra la
// resolución de decanato, genera el PDF sin firma (con su número DEMO-) y lo descarga; la huella coincide con los bytes entregados,
// cada descarga —también la rechazada— queda en la bitácora, y desde otra escuela o sin permiso no se entrega. Es una prueba de la API
// con el navegador de Playwright; la pantalla y la descarga desde la interfaz las cubre E2E-26. Necesita la bandeja de correo de pruebas (Mailpit) para el enlace de
// aceptación del docente. Todo con un docente, una cuenta y una escuela de datos ficticios.
test.describe.configure({ mode: 'serial' });

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000/api';
const MAILPIT = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025';
const stamp = Date.now().toString(36);
const PASSWORD = 'Prueba2026!x';
const NUMBER_FORMAT = /^DEMO-\d{3,}-\d{4}\/UNTRM\/[A-Z0-9]+-[A-Z0-9]+$/;

interface Named {
  id: string;
  name: string;
}
interface Certificate {
  id: string;
  status: string;
  isDemo: boolean;
  number: string | null;
  hasUnsignedPdf: boolean;
  pdfSha256: string | null;
  evidences: { id: string }[];
}

const s = {
  adminToken: '',
  periodId: '',
  school: { id: '', name: '' },
  otherSchool: { id: '', name: '' },
  tutorId: '',
  outsiderToken: '',
  certificateId: '',
  number: '',
  sha: '',
};

const list = <T>(body: unknown, key: string): T[] => (Array.isArray(body) ? (body as T[]) : ((body as Record<string, T[]>)[key] ?? []));
const cert = (body: unknown) => (body as { certificate: Certificate }).certificate;
const admin = (method: string, path: string, body?: unknown) => api(s.adminToken, method, path, body);
const pdf = (token: string | null, id: string) => fetch(`${API_URL}/certificates/${id}/pdf`, { headers: token ? { authorization: `Bearer ${token}` } : {} });

async function acceptanceToken(email: string): Promise<string> {
  for (let i = 0; i < 60; i += 1) {
    const found = (await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email} subject:"docente tutor"`)}`)).json()) as { messages?: { ID: string }[] };
    const message = found.messages?.[0];
    if (message) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${message.ID}`)).json()) as { Text: string };
      const match = /\/aceptar-tutoria\/([0-9a-f]{64})/.exec(full.Text);
      if (match) return match[1] as string;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No llegó el correo de aceptación a ${email}`);
}

test.beforeAll(async () => {
  s.adminToken = await apiLogin(accounts.admin);
  const schools = list<Named>((await admin('GET', '/schools')).body, 'schools');
  const own = schools.find((x) => /Sistemas/.test(x.name));
  const other = schools.find((x) => x.id !== own?.id);
  expect(own && other, 'dos escuelas sembradas').toBeTruthy();
  s.school = own!;
  s.otherSchool = other!;
  const period = await admin('GET', '/periods/current');
  expect(period.status).toBe(200);
  s.periodId = (period.body as { period: { id: string } }).period.id;
});

test('1. un docente acepta su designación por el enlace del correo y una cuenta de otra escuela queda preparada', async () => {
  const roles = list<Named>((await admin('GET', '/roles')).body, 'roles');
  const tutorRoleId = roles.find((r) => r.name === 'Docente Tutor')!.id;
  const email = `pdf.docente.${stamp}@untrm.edu.pe`;
  const created = await api<{ user: { id: string } }>(s.adminToken, 'POST', '/users', { email, firstName: 'Docente', lastName: `Ficticio PDF ${stamp}`, roleId: tutorRoleId, schoolId: s.school.id });
  expect(created.status).toBe(201);
  s.tutorId = created.body.user.id;
  expect((await admin('PUT', `/schools/${s.school.id}/cycle-tutors/7`, { tutorId: s.tutorId })).status).toBe(200);
  const requested = await api<{ emailSent: boolean }>(s.adminToken, 'POST', `/schools/${s.school.id}/cycle-tutors/7/acceptance-request`, {});
  expect(requested.body.emailSent).toBe(true);
  const token = await acceptanceToken(email);
  expect((await apiPublic('POST', `/tutor-acceptance/${token}`, { accept: true, availability: [{ day: 3, start: '09:00', end: '11:00', place: 'Aula E2E' }] })).status).toBe(200);

  // Cuenta de otra escuela con permiso de emitir y descargar: no debe ver nada de la escuela del docente.
  const role = await api<{ role: Named }>(s.adminToken, 'POST', '/roles', { name: `Otra escuela PDF E2E ${stamp}`, description: 'Ficticio (E2E)', permissions: ['certificados:emitir', 'certificados:descargar', 'certificados:consultar'] });
  expect(role.status).toBe(201);
  const account: Account = { email: `pdf.otra.${stamp}@untrm.edu.pe`, password: PASSWORD, role: 'otra', greeting: 'Cuenta' };
  const outsider = await api<{ user: { id: string }; invitation: { link: string } }>(s.adminToken, 'POST', '/users', { email: account.email, firstName: 'Cuenta', lastName: 'Otra escuela', roleId: role.body.role.id });
  expect(outsider.status).toBe(201);
  expect((await apiPublic('POST', '/auth/reset-password', { token: outsider.body.invitation.link.split('/').pop(), newPassword: PASSWORD })).status).toBe(200);
  expect((await admin('PUT', `/users/${outsider.body.user.id}/access`, { kind: 'SCHOOLS', schoolIds: [s.otherSchool.id] })).status).toBe(200);
  s.outsiderToken = await apiLogin(account);
});

test('2. se prepara un trámite aprobado por una persona (iniciar, revisar todas las evidencias, aprobar)', async () => {
  const created = await admin('POST', '/certificates', { tutorId: s.tutorId, periodId: s.periodId, schoolId: s.school.id });
  expect(created.status).toBe(201);
  const c = cert(created.body);
  s.certificateId = c.id;
  expect((await admin('POST', `/certificates/${c.id}/submit`, {})).status).toBe(200);
  for (const e of c.evidences) expect((await admin('PUT', `/certificates/${c.id}/evidences/${e.id}`, { result: 'CONFORME' })).status).toBe(200);
  const approved = await admin('POST', `/certificates/${c.id}/approve`, {});
  expect(approved.status).toBe(200);
  expect(cert(approved.body).status).toBe('APROBADO');
});

test('3. sin resolución de decanato no se genera; con ella, sí, y queda sin firma, de demostración y con número', async ({}, testInfo) => {
  const id = s.certificateId;
  // La resolución es una por escuela y periodo y no se puede borrar por la API: en una base donde ya la dejó otra corrida, el paso
  // «sin resolución» no aplica y se anota (en el CI la base es nueva y se comprueba siempre).
  const before = list<{ number: string }>((await admin('GET', `/committee-resolutions?periodId=${s.periodId}&schoolId=${s.school.id}`)).body, 'resolutions');
  if (before.length === 0) {
    const early = await admin('POST', `/certificates/${id}/generate`, {});
    expect(early.status).toBe(409);
    expect((early.body as { error: string }).error).toMatch(/resolución de decanato/);
  } else {
    testInfo.annotations.push({ type: 'omitido', description: 'La escuela y el periodo ya tenían resolución de una corrida anterior' });
  }
  expect((await pdf(s.adminToken, id)).status).toBe(409); // todavía no hay PDF

  const saved = await admin('PUT', '/committee-resolutions', { periodId: s.periodId, schoolId: s.school.id, number: `030-2026-E2E-${stamp}`, issuedOn: '2026-03-01' });
  expect(saved.status).toBe(200);
  const listed = await admin('GET', `/committee-resolutions?periodId=${s.periodId}&schoolId=${s.school.id}`);
  // La resolución vigente es la que se acaba de guardar (guardar de nuevo reemplaza, no duplica).
  expect(list<{ number: string }>(listed.body, 'resolutions').map((r) => r.number)).toEqual([`030-2026-E2E-${stamp}`]);

  const generated = await admin('POST', `/certificates/${id}/generate`, {});
  expect(generated.status).toBe(200);
  const c = cert(generated.body);
  expect(c).toMatchObject({ status: 'GENERADO_SIN_FIRMA', isDemo: true, hasUnsignedPdf: true });
  expect(c.number).toMatch(NUMBER_FORMAT);
  expect(c.pdfSha256).toMatch(/^[0-9a-f]{64}$/);
  s.number = c.number as string;
  s.sha = c.pdfSha256 as string;

  // Una vez generado no se genera de nuevo (un solo PDF y un solo número).
  expect((await admin('POST', `/certificates/${id}/generate`, {})).status).toBe(409);
  expect((await current(id)).number).toBe(s.number);
});

async function current(id: string): Promise<Certificate> {
  return cert((await admin('GET', `/certificates/${id}`)).body);
}

test('4. el PDF se descarga con sesión y sus bytes coinciden con la huella registrada', async ({}, testInfo) => {
  const res = await pdf(s.adminToken, s.certificateId);
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toBe('application/pdf');
  expect(res.headers.get('content-disposition')).toMatch(/^attachment; filename="certificado-DEMO-/);
  expect(res.headers.get('cache-control')).toBe('no-store');
  const bytes = Buffer.from(await res.arrayBuffer());
  expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(s.sha);
  // Una sola página A4 horizontal.
  const raw = bytes.toString('latin1');
  expect(raw.match(/\/Type \/Page(?!s)/g)).toHaveLength(1);
  expect(raw).toMatch(/\/MediaBox \[0 0 841\.89 595\.28\]/);
  // Queda en el informe local de la prueba (no se sube al repositorio) para revisarlo a ojo.
  await testInfo.attach('certificado-demostracion.pdf', { body: bytes, contentType: 'application/pdf' });
});

test('5. sin sesión, sin permiso o desde otra escuela no se entrega el PDF', async () => {
  const id = s.certificateId;
  expect((await pdf(null, id)).status).toBe(401);
  const elena = await apiLogin(accounts.tutor); // docente sembrado: no tiene permisos de certificación
  expect((await pdf(elena, id)).status).toBe(403);
  expect((await pdf(s.outsiderToken, id)).status).toBe(404); // la escuela está fuera de su alcance
  expect((await api(s.outsiderToken, 'POST', `/certificates/${id}/generate`, {})).status).toBe(404);
  expect((await pdf(s.adminToken, '00000000-0000-4000-8000-000000000000')).status).toBe(404);
  expect((await pdf(s.adminToken, 'no-es-un-uuid')).status).toBe(404);
});

test('6. cada descarga queda en la bitácora, también la rechazada por permiso, sin guardar el contenido', async () => {
  const id = s.certificateId;
  let entries: { entityId: string; action: string; details: string }[] = [];
  for (let i = 0; i < 20; i += 1) {
    const audit = await admin('GET', '/audit?entity=Certificate&action=DOWNLOAD&pageSize=100');
    expect(audit.status).toBe(200);
    entries = list<{ entityId: string; action: string; details: string }>(audit.body, 'items').filter((e) => e.entityId === id);
    if (entries.some((e) => /HTTP 403/.test(e.details))) break; // la bitácora de acceso se escribe al terminar la respuesta
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  const details = entries.map((e) => e.details);
  expect(details).toContain('Descarga concedida');
  expect(details.some((d) => /HTTP 403/.test(d))).toBe(true); // el intento sin permiso
  expect(details.some((d) => /HTTP 409/.test(d))).toBe(true); // el intento antes de generar
  expect(JSON.stringify(entries)).not.toContain('%PDF');
});

test('7. un trámite generado solo admite anular: se anula con motivo y conserva su número', async () => {
  const id = s.certificateId;
  for (const action of ['submit', 'approve', 'observe']) expect((await admin('POST', `/certificates/${id}/${action}`, {})).status).toBe(409);
  const voided = await admin('POST', `/certificates/${id}/void`, { reason: 'Anulación ficticia de la prueba E2E' });
  expect(voided.status).toBe(200);
  expect(cert(voided.body)).toMatchObject({ status: 'ANULADO', number: s.number });
});

