import { expect, test } from '@playwright/test';
import { accounts, type Account } from '../support/accounts';
import { api, apiLogin, apiPublic } from '../support/api';

// E2E-24 (certificación del docente tutor, corte 3: trámite): un docente con designación ACEPTADA (el enlace le llega por correo y
// acepta sin iniciar sesión) entra a un trámite que la dirección de la escuela inicia, envía a revisión, observa, devuelve, rechaza,
// aprueba y la administración anula. Comprueba permisos por acción, alcance por escuela, que el sistema no aprueba con evidencias
// pendientes y que varias aprobaciones simultáneas dejan una sola. Todo con cuentas, roles y docentes ficticios creados aquí.
// Es una prueba de la API con el navegador de Playwright (la pantalla del trámite es el corte 5). Necesita la bandeja de correo de
// pruebas (Mailpit) para el enlace de aceptación.
test.describe.configure({ mode: 'serial' });

const MAILPIT = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025';
const stamp = Date.now().toString(36);
const PASSWORD = 'Prueba2026!x';
const REASON = 'Motivo ficticio de la prueba E2E del trámite';

interface Named {
  id: string;
  name: string;
}
interface Evidence {
  id: string;
  kind: string;
  result: string;
}
interface Certificate {
  id: string;
  status: string;
  isDemo: boolean;
  number: string | null;
  reviewNote: string | null;
  approvedAt: string | null;
  evidences: Evidence[];
}
type Who = 'director' | 'registrar' | 'outsider';

const s = {
  adminToken: '',
  periodId: '',
  school: { id: '', name: '' },
  otherSchool: { id: '', name: '' },
  tutorRoleId: '',
  tutorId: '',
  pendingTutorId: '',
  tokens: {} as Record<Who, string>,
  certificateId: '',
};

const list = <T>(body: unknown, key: string): T[] => (Array.isArray(body) ? (body as T[]) : ((body as Record<string, T[]>)[key] ?? []));
const accountFor = (tag: string): Account => ({ email: `tram.${tag}.${stamp}@untrm.edu.pe`, password: PASSWORD, role: tag, greeting: 'Cuenta' });
const cert = (body: unknown) => (body as { certificate: Certificate }).certificate;
const act = (who: Who | 'admin', id: string, action: string, body: unknown = {}) => api(who === 'admin' ? s.adminToken : s.tokens[who], 'POST', `/certificates/${id}/${action}`, body);
const review = (id: string, evidenceId: string, result: string, comment?: string) => api(s.tokens.director, 'PUT', `/certificates/${id}/evidences/${evidenceId}`, { result, comment });
const start = (who: Who, tutorId: string) => api(s.tokens[who], 'POST', '/certificates', { tutorId, periodId: s.periodId, schoolId: s.school.id });
const current = async (id: string) => cert((await api(s.adminToken, 'GET', `/certificates/${id}`)).body);

async function createRole(name: string, permissions: string[]): Promise<string> {
  const res = await api<{ role: Named }>(s.adminToken, 'POST', '/roles', { name, description: 'Rol ficticio (E2E)', permissions });
  expect(res.status).toBe(201);
  return res.body.role.id;
}

async function createAccount(account: Account, roleId: string, schoolId: string): Promise<string> {
  const created = await api<{ user: { id: string }; invitation: { link: string } }>(s.adminToken, 'POST', '/users', { email: account.email, firstName: 'Cuenta', lastName: 'Ficticia', roleId });
  expect(created.status).toBe(201);
  const token = created.body.invitation.link.split('/').pop() as string;
  expect((await apiPublic('POST', '/auth/reset-password', { token, newPassword: PASSWORD })).status).toBe(200);
  expect((await api(s.adminToken, 'PUT', `/users/${created.body.user.id}/access`, { kind: 'SCHOOLS', schoolIds: [schoolId] })).status).toBe(200);
  return created.body.user.id;
}

/** El enlace de aceptación llega al correo del docente (bandeja de pruebas); se espera a que la cola lo entregue. */
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

async function teacher(tag: string, cycle: number): Promise<string> {
  const email = `tram.docente.${tag}.${stamp}@untrm.edu.pe`;
  const created = await api<{ user: { id: string } }>(s.adminToken, 'POST', '/users', { email, firstName: 'Docente', lastName: `Ficticio ${tag}`, roleId: s.tutorRoleId, schoolId: s.school.id });
  expect(created.status).toBe(201);
  expect((await api(s.adminToken, 'PUT', `/schools/${s.school.id}/cycle-tutors/${cycle}`, { tutorId: created.body.user.id })).status).toBe(200);
  return created.body.user.id;
}

test.beforeAll(async () => {
  s.adminToken = await apiLogin(accounts.admin);
  const schools = list<Named>((await api(s.adminToken, 'GET', '/schools')).body, 'schools');
  const own = schools.find((x) => /Sistemas/.test(x.name));
  const other = schools.find((x) => x.id !== own?.id);
  expect(own && other, 'dos escuelas sembradas').toBeTruthy();
  s.school = own!;
  s.otherSchool = other!;
  const period = await api<{ period: { id: string } }>(s.adminToken, 'GET', '/periods/current');
  expect(period.status).toBe(200);
  s.periodId = period.body.period.id;
  const roles = list<Named>((await api(s.adminToken, 'GET', '/roles')).body, 'roles');
  s.tutorRoleId = roles.find((r) => r.name === 'Docente Tutor')!.id;
});

test('1. la administración prepara roles y cuentas: una dirección de escuela que inicia y aprueba, una que solo inicia y otra de otra escuela', async () => {
  const directorRole = await createRole(`Dirección E2E ${stamp}`, ['certificados:registrar', 'certificados:aprobar', 'certificados:consultar']);
  const registrarRole = await createRole(`Iniciador E2E ${stamp}`, ['certificados:registrar', 'certificados:consultar']);
  const specs: [Who, string, string][] = [
    ['director', directorRole, s.school.id],
    ['registrar', registrarRole, s.school.id],
    ['outsider', directorRole, s.otherSchool.id],
  ];
  for (const [who, roleId, schoolId] of specs) {
    const account = accountFor(who);
    await createAccount(account, roleId, schoolId);
    s.tokens[who] = await apiLogin(account);
  }
});

test('2. un docente acepta su designación con el enlace del correo; otro, sin solicitud, queda sin designación aceptada', async () => {
  s.tutorId = await teacher('acepta', 9);
  s.pendingTutorId = await teacher('sin-solicitud', 8);

  const requested = await api<{ emailSent: boolean }>(s.adminToken, 'POST', `/schools/${s.school.id}/cycle-tutors/9/acceptance-request`, {});
  expect(requested.status).toBe(200);
  expect(requested.body.emailSent).toBe(true);
  const token = await acceptanceToken(`tram.docente.acepta.${stamp}@untrm.edu.pe`);
  const accepted = await apiPublic('POST', `/tutor-acceptance/${token}`, { accept: true, availability: [{ day: 2, start: '08:00', end: '10:00', place: 'Aula E2E' }] });
  expect(accepted.status).toBe(200);
});

test('3. iniciar el trámite: solo con designación aceptada, dentro de la escuela y una vez por docente', async () => {
  // Sin designación aceptada, o desde otra escuela, no se inicia.
  const notAccepted = await start('director', s.pendingTutorId);
  expect(notAccepted.status).toBe(409);
  expect((await start('outsider', s.tutorId)).status).toBe(404);

  const created = await start('registrar', s.tutorId);
  expect(created.status).toBe(201);
  const c = cert(created.body);
  s.certificateId = c.id;
  expect(c).toMatchObject({ status: 'INICIADO', isDemo: true, number: null });
  expect(c.evidences.map((e) => [e.kind, e.result]).sort()).toEqual([['ACEPTACION', 'PENDIENTE'], ['INFORME_SEMESTRAL', 'PENDIENTE'], ['SESIONES', 'PENDIENTE']]);
  expect((await start('director', s.tutorId)).status).toBe(409);
});

test('4. el trámite pasa a revisión, no se aprueba con evidencias pendientes y cada acción pide su permiso', async () => {
  const id = s.certificateId;
  expect((await act('director', id, 'approve')).status).toBe(409); // aún no está en revisión
  expect((await act('registrar', id, 'submit')).status).toBe(200);
  expect((await act('registrar', id, 'approve')).status).toBe(403); // quien solo inicia no aprueba
  expect((await act('director', id, 'void', { reason: REASON })).status).toBe(403); // anular es de la administración
  expect((await act('outsider', id, 'approve')).status).toBe(404); // otra escuela: no existe para ella

  const blocked = await act('director', id, 'approve');
  expect(blocked.status).toBe(409);
  expect((blocked.body as { error: string }).error).toMatch(/Faltan por revisar 3 evidencia/);
  expect((await current(id)).status).toBe('EN_REVISION');
});

test('5. una evidencia observada devuelve el trámite y, corregida, se aprueba con quién y cuándo', async () => {
  const id = s.certificateId;
  const evidences = (await current(id)).evidences;

  // Observar exige una evidencia observada, con comentario.
  expect((await act('director', id, 'observe', { note: 'Falta respaldo' })).status).toBe(409);
  expect((await review(id, evidences[0]!.id, 'OBSERVADA')).status).toBe(400);
  expect((await review(id, evidences[0]!.id, 'OBSERVADA', 'No consta la resolución de designación')).status).toBe(200);
  const observed = await act('director', id, 'observe', { note: 'Adjuntar la resolución' });
  expect(observed.status).toBe(200);
  expect(cert(observed.body)).toMatchObject({ status: 'OBSERVADO', reviewNote: 'Adjuntar la resolución' });
  expect((await review(id, evidences[1]!.id, 'CONFORME')).status).toBe(409); // observado: no se revisa

  // Se devuelve a revisión y se marcan todas conformes.
  const resent = await act('registrar', id, 'submit');
  expect(cert(resent.body)).toMatchObject({ status: 'EN_REVISION', reviewNote: null });
  for (const e of evidences) expect((await review(id, e.id, 'CONFORME')).status).toBe(200);

  const approved = await act('director', id, 'approve');
  expect(approved.status).toBe(200);
  const c = cert(approved.body);
  expect(c.status).toBe('APROBADO');
  expect(c.approvedAt).toEqual(expect.any(String));
  expect(c.evidences.every((e) => e.result === 'CONFORME')).toBe(true);
  // Sigue siendo de demostración: sin número ni PDF hasta el corte 4.
  expect(c).toMatchObject({ isDemo: true, number: null });
  expect((await act('director', id, 'approve')).status).toBe(409);
});

test('6. la administración anula con motivo y el docente puede iniciar un trámite nuevo', async () => {
  const id = s.certificateId;
  expect((await act('admin', id, 'void')).status).toBe(400);
  const voided = await act('admin', id, 'void', { reason: REASON });
  expect(voided.status).toBe(200);
  expect(cert(voided.body).status).toBe('ANULADO');
  for (const action of ['approve', 'submit', 'observe']) expect((await act('director', id, action)).status).toBe(409);

  const again = await start('director', s.tutorId);
  expect(again.status).toBe(201);
  s.certificateId = cert(again.body).id;
});

test('7. rechazar exige un motivo y cierra el trámite; un rechazado no se aprueba ni se anula', async () => {
  const id = s.certificateId;
  expect((await act('registrar', id, 'submit')).status).toBe(200);
  expect((await act('director', id, 'reject')).status).toBe(400);
  const rejected = await act('director', id, 'reject', { reason: REASON });
  expect(rejected.status).toBe(200);
  expect(cert(rejected.body)).toMatchObject({ status: 'RECHAZADO', reviewNote: REASON });
  expect((await act('director', id, 'approve')).status).toBe(409);
  expect((await act('admin', id, 'void', { reason: REASON })).status).toBe(409);

  const next = await start('director', s.tutorId);
  expect(next.status).toBe(201);
  s.certificateId = cert(next.body).id;
});

test('8. varias aprobaciones simultáneas dejan una sola: una recibe 200 y las demás 409', async () => {
  const id = s.certificateId;
  expect((await act('registrar', id, 'submit')).status).toBe(200);
  for (const e of (await current(id)).evidences) expect((await review(id, e.id, 'CONFORME')).status).toBe(200);
  const results = await Promise.all(Array.from({ length: 5 }, () => act('director', id, 'approve')));
  expect(results.map((r) => r.status).sort()).toEqual([200, 409, 409, 409, 409]);
  expect((await current(id)).status).toBe('APROBADO');
});

// La pantalla del trámite (lista de docentes del periodo, evidencias y acciones) llega en el corte 5.
test.fixme('9. pantalla del trámite: iniciar, revisar evidencias y aprobar desde la interfaz (corte 5)', async () => {});
