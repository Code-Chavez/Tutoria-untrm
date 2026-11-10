#!/usr/bin/env node
/**
 * Datos de DEMOSTRACIÓN para una presentación (issue #265). Todo es ficticio y se crea solo por la API pública, con las mismas reglas
 * que usa la aplicación: docentes tutores en tres escuelas de dos facultades, designaciones en todos los estados de aceptación,
 * trámites de certificación en todos los estados, resolución de decanato por escuela e imágenes del certificado (logos, marca de agua y firma
 * visual de la cuenta que emite). Se puede ejecutar varias veces: lo que ya existe no se duplica.
 *
 *   DEMO_ADMIN_EMAIL=… DEMO_ADMIN_PASSWORD=… node scripts/seed-demo.js
 *
 * Variables: DEMO_REFRESH_IMAGES=1 (vuelve a subir las imágenes), API_URL (http://localhost:3000/api), MAILPIT_URL (http://localhost:8025; el correo de aceptación del docente llega allí y de él se
 * toma el enlace de un solo uso), DEMO_ADMIN_EMAIL y DEMO_ADMIN_PASSWORD (la cuenta del Administrador DBU).
 */
const { deflateSync } = require('node:zlib');

const API = (process.env.API_URL || 'http://localhost:3000/api').replace(/\/+$/, '');
const MAILPIT = (process.env.MAILPIT_URL || 'http://localhost:8025').replace(/\/+$/, '');
const ADMIN = { email: process.env.DEMO_ADMIN_EMAIL, password: process.env.DEMO_ADMIN_PASSWORD };
const DOMAIN = 'untrm.edu.pe';

// ───────────────────────────── Imágenes ficticias (PNG RGBA de 8 bits, sin entrelazar) ─────────────────────────────
const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
};

class Canvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.px = Buffer.alloc(width * height * 4); // transparente
  }
  set(x, y, [r, g, b, a = 255]) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const i = (y * this.width + x) * 4;
    // mezcla simple sobre lo ya dibujado
    const back = this.px[i + 3] / 255;
    const fore = a / 255;
    const out = fore + back * (1 - fore);
    if (out === 0) return;
    this.px[i] = Math.round((r * fore + this.px[i] * back * (1 - fore)) / out);
    this.px[i + 1] = Math.round((g * fore + this.px[i + 1] * back * (1 - fore)) / out);
    this.px[i + 2] = Math.round((b * fore + this.px[i + 2] * back * (1 - fore)) / out);
    this.px[i + 3] = Math.round(out * 255);
  }
  rect(x, y, w, h, color) {
    for (let j = y; j < y + h; j += 1) for (let i = x; i < x + w; i += 1) this.set(i, j, color);
  }
  circle(cx, cy, radius, color, ring = 0) {
    for (let j = Math.floor(cy - radius); j <= Math.ceil(cy + radius); j += 1) {
      for (let i = Math.floor(cx - radius); i <= Math.ceil(cx + radius); i += 1) {
        const d = Math.hypot(i - cx, j - cy);
        if (d <= radius && (ring === 0 || d >= radius - ring)) this.set(i, j, color);
      }
    }
  }
  line(x0, y0, x1, y1, thickness, color) {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) * 2;
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps;
      this.circle(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, thickness / 2, color);
    }
  }
  png() {
    const header = Buffer.alloc(13);
    header.writeUInt32BE(this.width, 0);
    header.writeUInt32BE(this.height, 4);
    header.set([8, 6, 0, 0, 0], 8); // 8 bits, RGBA, sin entrelazar
    const rows = [];
    for (let y = 0; y < this.height; y += 1) rows.push(Buffer.from([0]), this.px.subarray(y * this.width * 4, (y + 1) * this.width * 4));
    return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))]);
  }
}

// Letras dibujadas con trazos (cada trazo es una poligonal en un cuadro de 0 a 1) para rotular los logotipos ficticios.
const STROKES = {
  U: [[[0, 0], [0, 0.72], [0.25, 1], [0.75, 1], [1, 0.72], [1, 0]]],
  N: [[[0, 1], [0, 0], [1, 1], [1, 0]]],
  T: [[[0, 0], [1, 0]], [[0.5, 0], [0.5, 1]]],
  R: [[[0, 1], [0, 0], [0.8, 0], [1, 0.18], [1, 0.38], [0.8, 0.56], [0, 0.56]], [[0.45, 0.56], [1, 1]]],
  M: [[[0, 1], [0, 0], [0.5, 0.62], [1, 0], [1, 1]]],
  F: [[[1, 0], [0, 0], [0, 1]], [[0, 0.5], [0.72, 0.5]]],
  I: [[[0.5, 0], [0.5, 1]], [[0.15, 0], [0.85, 0]], [[0.15, 1], [0.85, 1]]],
  S: [[[1, 0.16], [0.8, 0], [0.2, 0], [0, 0.2], [0, 0.36], [0.2, 0.5], [0.8, 0.5], [1, 0.64], [1, 0.8], [0.8, 1], [0.2, 1], [0, 0.84]]],
  E: [[[1, 0], [0, 0], [0, 1], [1, 1]], [[0, 0.5], [0.8, 0.5]]],
  C: [[[1, 0.16], [0.8, 0], [0.2, 0], [0, 0.2], [0, 0.8], [0.2, 1], [0.8, 1], [1, 0.84]]],
  A: [[[0, 1], [0.5, 0], [1, 1]], [[0.2, 0.66], [0.8, 0.66]]],
};
/** Rotula `word` con su esquina superior izquierda en (x, y); cada letra mide `w` × `h` y el trazo `thickness`. Devuelve el ancho usado. */
function text(canvas, word, x, y, w, h, thickness, color) {
  let cx = x;
  for (const letter of word) {
    for (const stroke of STROKES[letter] || []) {
      for (let i = 1; i < stroke.length; i += 1) {
        canvas.line(cx + stroke[i - 1][0] * w, y + stroke[i - 1][1] * h, cx + stroke[i][0] * w, y + stroke[i][1] * h, thickness, color);
      }
    }
    cx += w + thickness * 2.2;
  }
  return cx - x;
}

const NAVY = [20, 48, 110];
const GOLD = [196, 150, 42];
const INK = [18, 24, 48];

// El renderizador coloca el logotipo de la universidad en 250 × 62 y el de la facultad en 70 × 62; se dibujan al doble para que se vean
// nítidos y se deja aire abajo, porque el título del certificado empieza justo debajo de esos recuadros.
function universityLogo() {
  const c = new Canvas(500, 124);
  c.circle(54, 54, 48, NAVY);
  c.circle(54, 54, 37, [255, 255, 255], 4);
  c.rect(34, 44, 40, 7, GOLD);
  c.rect(34, 58, 40, 7, GOLD);
  c.rect(50, 28, 8, 52, NAVY);
  text(c, 'UNTRM', 128, 10, 54, 84, 11, NAVY);
  c.rect(128, 100, 366, 5, GOLD);
  return c.png();
}
function facultyLogo(letters, color) {
  const c = new Canvas(140, 124);
  c.rect(6, 4, 128, 104, color);
  c.rect(12, 10, 116, 92, [255, 255, 255]);
  c.rect(18, 16, 104, 80, color);
  const w = letters.length > 4 ? 14 : 18;
  const thickness = 5;
  const used = letters.length * (w + thickness * 2.2) - thickness * 2.2;
  text(c, letters, 70 - used / 2, 34, w, 34, thickness, [255, 255, 255]);
  c.rect(34, 78, 72, 5, GOLD);
  return c.png();
}
function watermark() {
  const c = new Canvas(400, 400);
  const tone = [150, 160, 185];
  c.circle(200, 200, 190, tone, 14);
  c.circle(200, 200, 150, tone, 6);
  c.rect(176, 90, 48, 220, tone);
  c.rect(90, 176, 220, 48, tone);
  return c.png();
}
function signature() {
  const c = new Canvas(330, 106);
  const pts = [[8, 70], [30, 24], [48, 88], [66, 20], [86, 80], [112, 38], [132, 74], [160, 30], [190, 66], [226, 46], [262, 62], [318, 30]];
  for (let i = 1; i < pts.length; i += 1) c.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 4, INK);
  c.line(20, 94, 300, 86, 3, INK);
  return c.png();
}

// ───────────────────────────── API ─────────────────────────────
let token = '';
async function call(method, path, body, { auth = true, raw = false } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { ...(body instanceof FormData ? {} : { 'content-type': 'application/json' }), ...(auth ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
  if (raw) return res;
  return { status: res.status, body: await res.json().catch(() => null) };
}
const must = (res, ok, what) => {
  if (!ok.includes(res.status)) throw new Error(`${what}: HTTP ${res.status} ${JSON.stringify(res.body)?.slice(0, 300)}`);
  return res.body;
};
const list = (body, key) => (Array.isArray(body) ? body : body?.[key] ?? []);
const log = (message) => console.log(`  ${message}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function login() {
  if (!ADMIN.email || !ADMIN.password) throw new Error('Defina DEMO_ADMIN_EMAIL y DEMO_ADMIN_PASSWORD (la cuenta del Administrador DBU).');
  const res = await call('POST', '/auth/login', ADMIN, { auth: false });
  const body = must(res, [200], 'inicio de sesión');
  token = body.data?.accessToken ?? body.accessToken;
}

async function acceptanceToken(email) {
  for (let i = 0; i < 80; i += 1) {
    const found = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email} subject:"docente tutor"`)}`)).json().catch(() => ({}));
    for (const message of found.messages ?? []) {
      const full = await (await fetch(`${MAILPIT}/api/v1/message/${message.ID}`)).json();
      const match = /\/aceptar-tutoria\/([0-9a-f]{64})/.exec(full.Text ?? '');
      if (match) return match[1];
    }
    await sleep(500);
  }
  throw new Error(`No llegó el correo de aceptación a ${email}. ¿Está el correo de pruebas en ${MAILPIT}?`);
}

// ───────────────────────────── Datos ─────────────────────────────
const AVAILABILITY = [
  [{ day: 1, start: '08:00', end: '10:00', place: 'Aula 204' }, { day: 3, start: '10:00', end: '12:00', place: 'Aula 204' }],
  [{ day: 2, start: '09:00', end: '11:00', place: 'Sala de tutoría' }, { day: 4, start: '15:00', end: '17:00', place: 'Sala de tutoría' }],
  [{ day: 5, start: '08:00', end: '10:00', place: 'Laboratorio 3' }],
];

/**
 * Cada fila: [nombres, apellidos, ciclo (null = sin designación), designación, trámite].
 * Designación: ACEPTADA | PENDIENTE | RECHAZADA (designar a un docente ya le envía la solicitud de aceptación, por eso no hay «sin solicitar»). Trámite: null | INICIADO | EN_REVISION | OBSERVADO | RECHAZADO | APROBADO | GENERADO.
 */
const SCHOOLS = [
  {
    match: /Sistemas/,
    resolution: '012-2026-D-FISME',
    tutors: [
      ['Mario', 'Quispe Llamocca', 1, 'ACEPTADA', 'GENERADO'],
      ['Carmen', 'Rojas Tafur', 2, 'ACEPTADA', 'APROBADO'],
      ['Luis', 'Villanueva Culqui', 3, 'ACEPTADA', 'EN_REVISION'],
      ['Patricia', 'Chávez Mego', 4, 'ACEPTADA', 'OBSERVADO'],
      ['Jorge', 'Zavaleta Huamán', 5, 'ACEPTADA', null],
      ['Rosa', 'Tuesta Pinedo', 6, 'PENDIENTE', null],
      ['Ernesto', 'Bustamante Vela', 7, 'RECHAZADA', null],
      ['Silvia', 'Alva Torrejón', 8, 'PENDIENTE', null],
      ['Fabián', 'Collantes Rimarachín', null, null, null],
    ],
  },
  {
    match: /Mecánica/,
    resolution: '013-2026-D-FISME',
    tutors: [
      ['Walter', 'Díaz Ocampo', 1, 'ACEPTADA', 'RECHAZADO'],
      ['Elsa', 'Mori Paredes', 2, 'ACEPTADA', null],
      ['Raúl', 'Santillán Gómez', 3, 'PENDIENTE', null],
      ['Marlene', 'Cubas Rimarachín', 4, 'PENDIENTE', null],
      ['Teófilo', 'Bardales Nuñez', null, null, null],
    ],
  },
  {
    match: /Administración/,
    resolution: '007-2026-D-FCEA',
    tutors: [
      ['Gladys', 'Herrera Sánchez', 1, 'ACEPTADA', 'GENERADO'],
      ['Víctor', 'Núñez Alegría', 2, 'ACEPTADA', 'INICIADO'],
      ['Doris', 'Pérez Vásquez', 3, 'PENDIENTE', null],
      ['Hugo', 'Terrones Bardales', 4, 'PENDIENTE', null],
      ['Nelly', 'Zumaeta Fernández', null, null, null],
    ],
  },
];

const slug = (value) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');
const emailOf = (first, last) => `${slug(first)}.${slug(last.split(' ')[0])}.demo@${DOMAIN}`;

async function upload(schoolId, kind, bytes) {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: 'image/png' }), `${kind}.png`);
  must(await call('PUT', `/certificates/visual-settings/${schoolId}/${kind}`, form), [204], `imagen ${kind}`);
}

async function main() {
  console.log(`Datos de demostración sobre ${API}`);
  await login();

  const roles = list((await call('GET', '/roles')).body, 'roles');
  const tutorRole = roles.find((r) => r.name === 'Docente Tutor');
  if (!tutorRole) throw new Error('No existe el rol «Docente Tutor».');
  const schools = list((await call('GET', '/schools')).body, 'schools');
  const period = must(await call('GET', '/periods/current'), [200], 'periodo vigente').period;
  const existingUsers = new Map(list((await call('GET', '/users')).body, 'users').map((u) => [String(u.email).toLowerCase(), u]));

  // Imágenes del certificado: logo de la universidad, logo y marca de agua por facultad y la firma visual de quien emite (por escuela).
  console.log('Imágenes del certificado');
  const facultyColor = new Map();
  const palette = [[20, 48, 110], [120, 40, 40], [30, 100, 70]];
  const facultyCode = (name) => (/Económicas|Administrativas/.test(name) ? 'FCEA' : 'FISME');
  const faculties = list((await call('GET', '/faculties')).body, 'faculties');
  for (const school of SCHOOLS) {
    const found = schools.find((s) => school.match.test(s.name));
    if (!found) throw new Error(`No existe la escuela ${school.match}`);
    school.row = found;
    const faculty = faculties.find((f) => f.id === found.facultyId);
    if (!facultyColor.has(found.facultyId)) facultyColor.set(found.facultyId, palette[facultyColor.size % palette.length]);
    const status = list((await call('GET', `/certificates/visual-settings/${found.id}`)).body, 'assets');
    // DEMO_REFRESH_IMAGES=1 vuelve a subir las imágenes aunque ya estén (no cambia los PDF ya generados).
    const configured = new Set(process.env.DEMO_REFRESH_IMAGES ? [] : status.filter((a) => a.configured).map((a) => a.kind));
    const code = facultyCode(faculty?.name ?? '');
    if (!configured.has('universityLogo')) await upload(found.id, 'universityLogo', universityLogo());
    if (!configured.has('facultyLogo')) await upload(found.id, 'facultyLogo', facultyLogo(code, facultyColor.get(found.facultyId)));
    if (!configured.has('watermark')) await upload(found.id, 'watermark', watermark());
    if (!configured.has('signature')) await upload(found.id, 'signature', signature());
    log(`${found.name}: logos, marca de agua y firma listos`);
  }

  for (const school of SCHOOLS) {
    const found = school.row;
    console.log(`Escuela: ${found.name}`);

    // La resolución de decanato es una por escuela y periodo; si ya existe se respeta.
    const resolutions = list((await call('GET', `/committee-resolutions?periodId=${period.id}&schoolId=${found.id}`)).body, 'resolutions');
    if (resolutions.length === 0) must(await call('PUT', '/committee-resolutions', { periodId: period.id, schoolId: found.id, number: school.resolution, issuedOn: '2026-08-28' }), [200], 'resolución');

    const designations = list((await call('GET', `/schools/${found.id}/cycle-tutors`)).body, 'assignments');
    const certificates = list((await call('GET', `/certificates?periodId=${period.id}&schoolId=${found.id}`)).body, 'certificates');

    let availabilityIndex = 0;
    for (const [first, last, cycle, designation, procedure] of school.tutors) {
      const email = emailOf(first, last);
      let user = existingUsers.get(email);
      if (!user) {
        const created = must(await call('POST', '/users', { email, firstName: first, lastName: last, roleId: tutorRole.id, schoolId: found.id }), [201], `usuario ${email}`);
        user = created.user;
        existingUsers.set(email, user);
        log(`+ ${first} ${last}`);
      }
      if (cycle === null) continue;

      // Designar ya envía el correo de aceptación (estado PENDIENTE). Quien debe figurar como aceptada o rechazada responde con el enlace del correo.
      const current = designations.find((d) => d.cycle === cycle);
      let status = current?.acceptanceStatus;
      if (!current) {
        must(await call('PUT', `/schools/${found.id}/cycle-tutors/${cycle}`, { tutorId: user.id }), [200], `designación ciclo ${cycle}`);
        status = 'PENDIENTE';
      }
      if (designation !== 'PENDIENTE' && status === 'PENDIENTE') {
        const link = await acceptanceToken(email);
        const answer = designation === 'ACEPTADA'
          ? { accept: true, availability: AVAILABILITY[availabilityIndex++ % AVAILABILITY.length] }
          : { accept: false, reason: 'Carga lectiva completa este semestre; solicita ser considerado en el siguiente periodo.' };
        must(await call('POST', `/tutor-acceptance/${link}`, answer, { auth: false }), [200], `respuesta del docente ${email}`);
      }

      if (!procedure || certificates.some((c) => (c.tutorId ?? c.tutor?.id) === user.id)) continue;
      const started = must(await call('POST', '/certificates', { tutorId: user.id, periodId: period.id, schoolId: found.id }), [201], `trámite de ${email}`);
      const cert = started.certificate;
      if (procedure === 'INICIADO') continue;
      must(await call('POST', `/certificates/${cert.id}/submit`, {}), [200], 'enviar a revisión');
      const evidences = cert.evidences;
      const review = (index, result, comment) => call('PUT', `/certificates/${cert.id}/evidences/${evidences[index].id}`, { result, comment }).then((r) => must(r, [200], 'revisar evidencia'));
      if (procedure === 'EN_REVISION') {
        await review(0, 'CONFORME');
        continue; // las otras evidencias quedan por revisar
      }
      if (procedure === 'OBSERVADO') {
        await review(0, 'CONFORME');
        await review(1, 'OBSERVADA', 'Falta el registro de asistencia de dos sesiones.');
        must(await call('POST', `/certificates/${cert.id}/observe`, { note: 'Completar el registro de asistencia y volver a enviar.' }), [200], 'observar');
        continue;
      }
      for (let i = 0; i < evidences.length; i += 1) await review(i, 'CONFORME');
      if (procedure === 'RECHAZADO') {
        must(await call('POST', `/certificates/${cert.id}/reject`, { reason: 'El docente no registró las sesiones mínimas del semestre.' }), [200], 'rechazar');
        continue;
      }
      must(await call('POST', `/certificates/${cert.id}/approve`, {}), [200], 'aprobar');
      if (procedure === 'GENERADO') must(await call('POST', `/certificates/${cert.id}/generate`, {}), [200], 'generar PDF');
      log(`  trámite ${procedure} para ${first} ${last}`);
    }
  }
  console.log('Listo. Abra Gestión → Periodo académico → Docentes tutores.');
}

main().catch((error) => {
  console.error(`Falló: ${error.message}`);
  process.exitCode = 1;
});
