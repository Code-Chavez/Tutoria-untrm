import { deflateSync, inflateSync } from 'node:zlib';
import { expect, test, type Page } from '@playwright/test';
import { accounts, type Account } from '../support/accounts';
import { api, apiLogin, apiPublic } from '../support/api';
import { expectNoSeriousViolations } from '../support/a11y';
import { loginUi } from '../support/ui';

// E2E-29 (issue #261: imágenes configurables del certificado): la administración guarda en «Diseño del certificado» el logo de la
// universidad, el de la facultad, la marca de agua gráfica y su firma visual; los PDF que se generan después las incorporan y los que
// ya estaban generados no cambian. Una cuenta de la escuela sin permiso de marca solo puede guardar su firma, y esa firma no la usa otra
// cuenta. Los archivos dañados o demasiado grandes se rechazan sin guardar nada. La sección se usa en pantalla ancha y en 375 px sin
// desbordar. Todo con docentes, cuentas e imágenes de datos ficticios (los PNG se construyen aquí mismo).
// Además (issue #267), la ciudad de la fecha es la de la sede de la escuela, se configura en Sedes y no cambia los PDF ya generados.
// Necesita la bandeja de correo de pruebas (Mailpit) para el enlace de aceptación del docente.
test.describe.configure({ mode: 'serial' });

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000/api';
const MAILPIT = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025';
const stamp = Date.now().toString(36);
const PASSWORD = 'Prueba2026!x';

interface Named {
  id: string;
  name: string;
}
interface Asset {
  kind: string;
  configured: boolean;
  editable: boolean;
}

const s = {
  adminToken: '',
  issuerToken: '',
  outsiderToken: '',
  issuer: undefined as unknown as Account,
  periodId: '',
  school: { id: '', name: '' },
  otherSchool: { id: '', name: '' },
  baselineId: '',
  configuredId: '',
  issuerPdfId: '',
};

const list = <T>(body: unknown, key: string): T[] => (Array.isArray(body) ? (body as T[]) : ((body as Record<string, T[]>)[key] ?? []));
const admin = (method: string, path: string, body?: unknown) => api(s.adminToken, method, path, body);

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (data: Buffer) => {
  let c = 0xffffffff;
  for (const byte of data) c = (CRC[(c ^ byte) & 0xff] as number) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
};
/** PNG RGB de 8 bits, sin entrelazar, de un solo color: una imagen ficticia válida. */
function png(width: number, height: number, [r, g, b]: [number, number, number]): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: width }, () => [r, g, b]).flat())]);
  const pixels = deflateSync(Buffer.concat(Array.from({ length: height }, () => row)));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', pixels), chunk('IEND', Buffer.alloc(0))]);
}

const IMAGES = {
  universityLogo: png(250, 62, [20, 40, 120]),
  facultyLogo: png(70, 62, [120, 40, 20]),
  watermark: png(200, 200, [200, 200, 200]),
  signature: png(165, 53, [10, 10, 10]),
} as const;
type Kind = keyof typeof IMAGES;
const LABELS: Record<Kind, string> = { universityLogo: 'Logo de la universidad', facultyLogo: 'Logo de la facultad', watermark: 'Marca de agua gráfica', signature: 'Mi firma visual' };

async function upload(token: string, schoolId: string, kind: string, bytes: Buffer, name = 'imagen.png') {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes)], { type: 'image/png' }), name);
  const res = await fetch(`${API_URL}/certificates/visual-settings/${schoolId}/${kind}`, { method: 'PUT', headers: { authorization: `Bearer ${token}` }, body: form });
  return { status: res.status, body: (await res.json().catch(() => null)) as { error?: string } | null };
}
const assets = async (token: string, schoolId: string) => {
  const res = await api<{ assets: Asset[] }>(token, 'GET', `/certificates/visual-settings/${schoolId}`);
  return { status: res.status, assets: res.body?.assets ?? [] };
};
const imageCount = async (token: string, id: string) => {
  const res = await fetch(`${API_URL}/certificates/${id}/pdf`, { headers: { authorization: `Bearer ${token}` } });
  expect(res.status).toBe(200);
  const raw = Buffer.from(await res.arrayBuffer()).toString('latin1');
  expect(raw.startsWith('%PDF-')).toBe(true);
  return (raw.match(/\/Subtype \/Image/g) ?? []).length;
};

/** Texto impreso en un PDF de PDFKit: se inflan sus flujos y se leen las cadenas hexadecimales (el interletrado las parte en trozos). */
async function pdfText(token: string, id: string): Promise<string> {
  const res = await fetch(`${API_URL}/certificates/${id}/pdf`, { headers: { authorization: `Bearer ${token}` } });
  expect(res.status).toBe(200);
  const raw = Buffer.from(await res.arrayBuffer());
  const source = raw.toString('latin1');
  let content = '';
  for (const start of source.matchAll(/stream\r?\n/g)) {
    const from = start.index + start[0].length;
    try {
      content += inflateSync(raw.subarray(from, source.indexOf('endstream', from))).toString('latin1') + '\n';
    } catch {
      // flujos que no son texto comprimido (imágenes): no interesan
    }
  }
  return [...content.matchAll(/<([0-9a-fA-F]{2,})>/g)].map((m) => Buffer.from(m[1] as string, 'hex').toString('latin1')).join('');
}

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

/** Un docente ficticio con designación aceptada en el ciclo indicado y su trámite ya aprobado por una persona. */
async function approvedCertificate(cycle: number, tag: string): Promise<string> {
  const roles = list<Named>((await admin('GET', '/roles')).body, 'roles');
  const email = `img.${tag}.${stamp}@untrm.edu.pe`;
  const created = await api<{ user: { id: string } }>(s.adminToken, 'POST', '/users', { email, firstName: 'Docente', lastName: `Ficticio Imagen ${tag} ${stamp}`, roleId: roles.find((r) => r.name === 'Docente Tutor')!.id, schoolId: s.school.id });
  expect(created.status).toBe(201);
  const tutorId = created.body.user.id;
  expect((await admin('PUT', `/schools/${s.school.id}/cycle-tutors/${cycle}`, { tutorId })).status).toBe(200);
  expect((await admin('POST', `/schools/${s.school.id}/cycle-tutors/${cycle}/acceptance-request`, {})).status).toBe(200);
  const token = await acceptanceToken(email);
  expect((await apiPublic('POST', `/tutor-acceptance/${token}`, { accept: true, availability: [{ day: 3, start: '09:00', end: '11:00', place: 'Aula E2E' }] })).status).toBe(200);
  const started = await admin('POST', '/certificates', { tutorId, periodId: s.periodId, schoolId: s.school.id });
  expect(started.status).toBe(201);
  const c = (started.body as { certificate: { id: string; evidences: { id: string }[] } }).certificate;
  expect((await admin('POST', `/certificates/${c.id}/submit`, {})).status).toBe(200);
  for (const e of c.evidences) expect((await admin('PUT', `/certificates/${c.id}/evidences/${e.id}`, { result: 'CONFORME' })).status).toBe(200);
  expect((await admin('POST', `/certificates/${c.id}/approve`, {})).status).toBe(200);
  return c.id;
}

async function openDesign(page: Page) {
  await page.goto(`/certificados?escuela=${s.school.id}`);
  await page.getByText('Diseño del certificado', { exact: true }).click();
  await expect(page.getByText(/Cargando configuración/)).toHaveCount(0);
}
const form = (page: Page, kind: Kind) => page.locator('form', { has: page.getByLabel(LABELS[kind], { exact: true }) });

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

test('1. se preparan una cuenta de la escuela sin permiso de marca, otra de otra escuela y un certificado generado sin imágenes', async () => {
  // Una corrida anterior sobre la misma base pudo dejar imágenes guardadas: se parte sin ninguna.
  for (const kind of Object.keys(IMAGES)) expect([204, 404]).toContain((await admin('DELETE', `/certificates/visual-settings/${s.school.id}/${kind}`)).status);
  const mk = async (suffix: string, permissions: string[], schoolId: string) => {
    const role = await admin('POST', '/roles', { name: `Imagen ${suffix} E2E ${stamp}`, description: 'Ficticio (E2E)', permissions });
    expect(role.status).toBe(201);
    const account: Account = { email: `img.${suffix}.${stamp}@untrm.edu.pe`, password: PASSWORD, role: suffix, greeting: 'Cuenta' };
    const user = await api<{ user: { id: string }; invitation: { link: string } }>(s.adminToken, 'POST', '/users', { email: account.email, firstName: 'Cuenta', lastName: `Imagen ${suffix}`, roleId: (role.body as { role: Named }).role.id });
    expect(user.status).toBe(201);
    expect((await apiPublic('POST', '/auth/reset-password', { token: user.body.invitation.link.split('/').pop(), newPassword: PASSWORD })).status).toBe(200);
    expect((await admin('PUT', `/users/${user.body.user.id}/access`, { kind: 'SCHOOLS', schoolIds: [schoolId] })).status).toBe(200);
    return account;
  };
  s.issuer = await mk('emisora', ['certificados:consultar', 'certificados:emitir', 'certificados:descargar'], s.school.id);
  s.issuerToken = await apiLogin(s.issuer);
  s.outsiderToken = await apiLogin(await mk('ajena', ['certificados:consultar', 'certificados:emitir', 'certificados:descargar'], s.otherSchool.id));

  // La resolución de decanato es una por escuela y periodo; si otra prueba ya la dejó, se reutiliza.
  const existing = list<{ number: string }>((await admin('GET', `/committee-resolutions?periodId=${s.periodId}&schoolId=${s.school.id}`)).body, 'resolutions');
  if (existing.length === 0) expect((await admin('PUT', '/committee-resolutions', { periodId: s.periodId, schoolId: s.school.id, number: `031-2026-E2E-${stamp}`, issuedOn: '2026-03-01' })).status).toBe(200);

  s.baselineId = await approvedCertificate(4, 'base');
  expect((await admin('POST', `/certificates/${s.baselineId}/generate`, {})).status).toBe(200);
  expect(await imageCount(s.adminToken, s.baselineId)).toBe(0);
});

test('2. los permisos de edición dependen de la cuenta: la administración edita las cuatro, la emisora solo su firma', async () => {
  const adminView = await assets(s.adminToken, s.school.id);
  expect(adminView.assets.map((a) => a.kind).sort()).toEqual(['facultyLogo', 'signature', 'universityLogo', 'watermark']);
  expect(adminView.assets.every((a) => a.editable)).toBe(true);
  expect(adminView.assets.some((a) => a.configured)).toBe(false);

  const issuerView = await assets(s.issuerToken, s.school.id);
  expect(Object.fromEntries(issuerView.assets.map((a) => [a.kind, a.editable]))).toEqual({ universityLogo: false, facultyLogo: false, watermark: false, signature: true });
  expect((await upload(s.issuerToken, s.school.id, 'universityLogo', IMAGES.universityLogo)).status).toBe(403);
  expect((await upload(s.issuerToken, s.school.id, 'watermark', IMAGES.watermark)).status).toBe(403);

  // Una escuela fuera del alcance no se consulta ni se edita, ni siquiera la firma propia.
  expect((await assets(s.outsiderToken, s.school.id)).status).toBe(403);
  expect((await upload(s.outsiderToken, s.school.id, 'signature', IMAGES.signature)).status).toBe(403);
  expect((await fetch(`${API_URL}/certificates/visual-settings/${s.school.id}`)).status).toBe(401);
  expect((await assets(s.adminToken, 'no-es-un-uuid')).status).not.toBe(200);
});

test('3. los archivos dañados, de otro tipo o demasiado grandes se rechazan y no dejan nada guardado', async () => {
  const truncated = IMAGES.universityLogo.subarray(0, IMAGES.universityLogo.length - 20);
  const cases: [string, Buffer, number][] = [
    ['texto con extensión .png', Buffer.from('esto no es una imagen'), 400],
    ['PNG truncado', truncated, 400],
    ['PNG sin los bytes de cierre', IMAGES.universityLogo.subarray(0, 40), 400],
    ['más de 1 MB', Buffer.concat([IMAGES.universityLogo.subarray(0, 8), Buffer.alloc(1024 * 1024 + 10, 1)]), 413],
    ['más de 2000 px', png(2001, 4, [1, 2, 3]), 400],
  ];
  for (const [label, bytes, status] of cases) {
    const res = await upload(s.adminToken, s.school.id, 'universityLogo', bytes);
    expect(res.status, label).toBe(status);
    expect(res.body?.error, label).toMatch(/PNG|JPG/);
  }
  expect((await upload(s.adminToken, s.school.id, 'logoInventado', IMAGES.universityLogo)).status).toBeGreaterThanOrEqual(400);
  expect((await assets(s.adminToken, s.school.id)).assets.some((a) => a.configured)).toBe(false);
});

test('4. desde la pantalla se guardan las cuatro imágenes, persisten al recargar y se puede quitar y volver a subir una', async ({ page }, testInfo) => {
  await loginUi(page, accounts.admin);
  await openDesign(page);
  for (const kind of Object.keys(IMAGES) as Kind[]) {
    const f = form(page, kind);
    await expect(f.getByText('Sin configurar.')).toBeVisible();
    await expect(f.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    await page.getByLabel(LABELS[kind], { exact: true }).setInputFiles({ name: `${kind}.png`, mimeType: 'image/png', buffer: IMAGES[kind] });
    await f.getByRole('button', { name: 'Guardar' }).click();
    await expect(f.getByText('Imagen guardada.')).toBeVisible();
    await expect(f.getByText('Configurada.')).toBeVisible();
  }
  await expectNoSeriousViolations(page, testInfo, 'diseño del certificado (escritorio)', 'details');

  await openDesign(page);
  for (const kind of Object.keys(IMAGES) as Kind[]) await expect(form(page, kind).getByText('Configurada.')).toBeVisible();

  const marca = form(page, 'watermark');
  await marca.getByRole('button', { name: 'Quitar' }).click();
  await expect(marca.getByText('Imagen retirada.')).toBeVisible();
  await expect(marca.getByText('Sin configurar.')).toBeVisible();
  await page.getByLabel(LABELS.watermark, { exact: true }).setInputFiles({ name: 'marca.png', mimeType: 'image/png', buffer: IMAGES.watermark });
  await marca.getByRole('button', { name: 'Guardar' }).click();
  await expect(marca.getByText('Configurada.')).toBeVisible();

  // Un archivo que no es imagen se rechaza con el motivo, sin tocar lo ya guardado.
  const logo = form(page, 'universityLogo');
  await page.getByLabel(LABELS.universityLogo, { exact: true }).setInputFiles({ name: 'falso.png', mimeType: 'image/png', buffer: Buffer.from('no es una imagen') });
  await logo.getByRole('button', { name: 'Guardar' }).click();
  await expect(logo.getByRole('alert')).toContainText(/JPG|PNG/);
  await expect(logo.getByText('Configurada.')).toBeVisible();
});

test('5. la sección se usa en 375 px sin desbordar la pantalla', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await loginUi(page, accounts.admin);
  await openDesign(page);
  for (const kind of Object.keys(IMAGES) as Kind[]) await expect(form(page, kind).getByRole('button', { name: 'Guardar' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'sin desplazamiento horizontal').toBeLessThanOrEqual(0);
  await expectNoSeriousViolations(page, testInfo, 'diseño del certificado (375 px)', 'details');
});

test('6. el PDF generado después incorpora las cuatro imágenes y el generado antes no cambia', async () => {
  s.configuredId = await approvedCertificate(5, 'con');
  const generated = await admin('POST', `/certificates/${s.configuredId}/generate`, {});
  expect(generated.status).toBe(200);
  expect(await imageCount(s.adminToken, s.configuredId)).toBe(4);
  expect(await imageCount(s.adminToken, s.baselineId)).toBe(0);
});

test('7. la firma es de quien la guardó: otra cuenta genera con los logos y la marca, pero sin esa firma', async () => {
  s.issuerPdfId = await approvedCertificate(6, 'tercera');
  const generated = await api(s.issuerToken, 'POST', `/certificates/${s.issuerPdfId}/generate`, {});
  expect(generated.status).toBe(200);
  expect(await imageCount(s.adminToken, s.issuerPdfId)).toBe(3);

  // Al guardar su propia firma, la cuenta emisora ve su estado y la de la administración sigue intacta.
  expect((await upload(s.issuerToken, s.school.id, 'signature', IMAGES.signature)).status).toBe(204);
  expect((await assets(s.issuerToken, s.school.id)).assets.find((a) => a.kind === 'signature')?.configured).toBe(true);
  expect((await assets(s.adminToken, s.school.id)).assets.find((a) => a.kind === 'signature')?.configured).toBe(true);
  expect((await api(s.issuerToken, 'DELETE', `/certificates/visual-settings/${s.school.id}/signature`)).status).toBe(204);
  expect((await assets(s.issuerToken, s.school.id)).assets.find((a) => a.kind === 'signature')?.configured).toBe(false);
  expect((await assets(s.adminToken, s.school.id)).assets.find((a) => a.kind === 'signature')?.configured).toBe(true);
});

test('8. guardar y quitar imágenes queda en la bitácora', async () => {
  let actions: string[] = [];
  for (let i = 0; i < 20; i += 1) {
    const audit = await admin('GET', '/audit?entity=CertificateVisualAsset&pageSize=100');
    expect(audit.status).toBe(200);
    actions = list<{ action: string }>(audit.body, 'items').map((e) => e.action);
    if (actions.includes('CERTIFICATE_ASSET_REMOVED')) break;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  expect(actions).toContain('CERTIFICATE_ASSET_SAVED');
  expect(actions).toContain('CERTIFICATE_ASSET_REMOVED');
});

test('9. la ciudad de la fecha es la de la sede de la escuela, se configura en Sedes y no cambia los PDF ya generados', async ({ page }) => {
  const overview = async () => (await admin('GET', '/campuses')).body as { campuses: { id: string; name: string; city?: string | null; isActive: boolean }[]; schools: { id: string; campusId: string | null }[] };
  let campusId = (await overview()).schools.find((x) => x.id === s.school.id)?.campusId ?? null;
  if (!campusId) {
    campusId = (await overview()).campuses.find((c) => c.isActive)!.id;
    expect((await admin('PUT', `/schools/${s.school.id}/campus`, { campusId })).status).toBe(200);
  }
  const campus = (await overview()).campuses.find((c) => c.id === campusId)!;
  await admin('PATCH', `/campuses/${campus.id}`, { city: null });

  // Sin ciudad en la sede, la fecha usa la predeterminada; este PDF ya existe y no debe cambiar.
  expect(await pdfText(s.adminToken, s.configuredId)).toContain('Chachapoyas, ');

  try {
    await loginUi(page, accounts.admin);
    await page.goto('/sedes');
    const field = page.getByLabel(`Ciudad de ${campus.name}`, { exact: true });
    await field.fill('Bagua Grande');
    await page.locator('form', { has: field }).getByRole('button', { name: 'Guardar ciudad' }).click();
    await expect.poll(async () => (await overview()).campuses.find((c) => c.id === campus.id)?.city).toBe('Bagua Grande');
    await expect(field).toHaveValue('Bagua Grande');

    const id = await approvedCertificate(7, 'ciudad');
    expect((await admin('POST', `/certificates/${id}/generate`, {})).status).toBe(200);
    const text = await pdfText(s.adminToken, id);
    expect(text).toContain('Bagua Grande, ');
    expect(text).not.toContain('Chachapoyas, ');
    expect(text).not.toContain('[Ciudad]');

    // Cambiar la ciudad después no altera ni el PDF anterior ni este.
    expect(await pdfText(s.adminToken, s.configuredId)).toContain('Chachapoyas, ');
  } finally {
    expect((await admin('PATCH', `/campuses/${campus.id}`, { city: null })).status).toBe(200);
  }
});

test('10. el título, el departamento y la autoridad que firma se configuran desde la pantalla, se imprimen en el PDF nuevo y no cambian el anterior; la sede puede ser filial', async ({ page }) => {
  const view = async () => (await admin('GET', `/certificates/text-settings/${s.school.id}`)).body as { template: { title: string; bodyText: string }; school: { department: string | null; signatoryName: string | null } };
  const original = (await view()).template;
  const before = await approvedCertificate(8, 'firmante-antes');
  expect((await admin('POST', `/certificates/${before}/generate`, {})).status).toBe(200);

  try {
    await loginUi(page, accounts.admin);
    await page.goto(`/certificados?escuela=${s.school.id}`);
    await page.getByText('Diseño del certificado', { exact: true }).click();

    await page.getByLabel('Título del documento').fill('CONSTANCIA');
    await page.getByRole('button', { name: 'Guardar texto' }).click();
    await expect.poll(async () => (await view()).template.title).toBe('CONSTANCIA');

    await page.getByLabel('Departamento académico').fill('Sistemicas');
    await page.getByLabel('Nombre y grado de la autoridad que firma').fill('Mg. Ana Perez Rojas');
    await page.getByLabel('Cargo de la autoridad').fill('Directora de la Escuela');
    await page.getByRole('button', { name: 'Guardar datos de la escuela' }).click();
    await expect.poll(async () => (await view()).school.signatoryName).toBe('Mg. Ana Perez Rojas');

    // Persisten al recargar.
    await page.reload();
    await page.getByText('Diseño del certificado', { exact: true }).click();
    await expect(page.getByLabel('Cargo de la autoridad')).toHaveValue('Directora de la Escuela');
    await expect(page.getByLabel('Título del documento')).toHaveValue('CONSTANCIA');

    const after = await approvedCertificate(9, 'firmante-despues');
    expect((await admin('POST', `/certificates/${after}/generate`, {})).status).toBe(200);
    const text = await pdfText(s.adminToken, after);
    expect(text).toContain('CONSTANCIA');
    expect(text).toContain('Mg. Ana Perez Rojas');
    expect(text).toContain('Directora de la Escuela');
    expect(text).toContain('Sistemicas');
    expect(text).not.toContain('autoridad firmante]');

    // El generado antes conserva lo que imprimió.
    const old = await pdfText(s.adminToken, before);
    expect(old).not.toContain('Mg. Ana Perez Rojas');
    expect(old).not.toContain('CONSTANCIA');

    // Un valor inválido se rechaza con un mensaje.
    expect((await admin('PUT', `/certificates/text-settings/${s.school.id}/school`, { department: 'x'.repeat(121), signatoryName: null, signatoryRole: null })).status).toBe(400);

    // Sede o filial desde Sedes.
    const campuses = ((await admin('GET', '/campuses')).body as { campuses: { id: string; name: string; kind?: string }[] }).campuses;
    const campus = campuses[0]!;
    await page.goto('/sedes');
    await page.getByLabel(`Tipo de ${campus.name}`, { exact: true }).selectOption('FILIAL');
    await expect.poll(async () => (((await admin('GET', '/campuses')).body as { campuses: { id: string; kind?: string }[] }).campuses.find((c) => c.id === campus.id)?.kind)).toBe('FILIAL');
    expect((await admin('PATCH', `/campuses/${campus.id}`, { kind: campus.kind ?? 'SEDE' })).status).toBe(200);
  } finally {
    await admin('PUT', `/certificates/text-settings/${s.school.id}/template`, { title: original.title, bodyText: original.bodyText });
    await admin('PUT', `/certificates/text-settings/${s.school.id}/school`, { department: null, signatoryName: null, signatoryRole: null });
  }

  // Auditoría.
  let saved: string[] = [];
  for (let i = 0; i < 20 && saved.length === 0; i += 1) {
    const audit = await admin('GET', '/audit?entity=CertificateSchoolSettings&pageSize=100');
    expect(audit.status).toBe(200);
    saved = list<{ action: string }>(audit.body, 'items').map((e) => e.action);
    if (saved.length === 0) await new Promise((resolve) => setTimeout(resolve, 300));
  }
  expect(saved).toContain('CERTIFICATE_TEXT_SAVED');
});
