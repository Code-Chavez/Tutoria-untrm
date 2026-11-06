import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import http from 'http';
import { prisma } from '../../src/infrastructure/database/prisma';
import { LocalEvidenceStorage } from '../../src/infrastructure/services/LocalEvidenceStorage';
import { TEST_PERIOD_CREATED_AT } from '../helpers/currentPeriod';
import { DEMO_PASSWORD, removeOwnUserTraces } from '../helpers/ownUsers';

/**
 * Generación del PDF de demostración y su descarga (corte 4) por HTTP real y base real de pruebas: resolución de decanato, número
 * transaccional, huella, descarga auditada (también los intentos rechazados), alcance por escuela, integridad del archivo y
 * concurrencia. Datos PROPIOS (periodo, facultades, escuelas, roles, cuentas, designaciones, trámites y archivos) que crea y borra; la
 * cuenta administradora sembrada solo inicia sesión. Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(240_000);

const stamp = String(Date.now());
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';
const NUMBER_FORMAT = /^DEMO-\d{3,}-\d{4}\/UNTRM\/[A-Z0-9]+-[A-Z0-9]+$/;

type Who = 'admin' | 'issuer' | 'downloader' | 'viewer' | 'otherSchool';

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('certificado de demostración: generación y descarga (corte 4)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  const tokens = {} as Record<Who, string>;
  let periodId = '';
  let schoolA = { id: '', name: '' };
  let schoolB = { id: '', name: '' };
  let adminId = '';
  let cycle = 0;
  let tutorRoleId = '';
  const storage = new LocalEvidenceStorage();
  const roleIds: string[] = [];
  const userIds: string[] = [];
  const schoolIds: string[] = [];
  const facultyIds: string[] = [];
  const assignmentIds: string[] = [];
  const certificateIds: string[] = [];
  const accountIds = {} as Record<Who, string>;

  const call = (method: string, path: string, who: Who | null, body?: unknown) =>
    fetch(`${baseUrl}/api${path}`, {
      method,
      headers: { ...(who ? { Authorization: `Bearer ${tokens[who]}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const json = async (res: Response) => (await res.json()) as Record<string, any>;
  const login = async (email: string, password: string) =>
    ((await json(await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }))).data as { accessToken: string }).accessToken;

  async function roleWith(label: string, codes: string[]): Promise<string> {
    const role = await prisma.role.create({ data: { name: `Rol emisión ${label} ${stamp}`, description: 'Rol ficticio de prueba' } });
    roleIds.push(role.id);
    const permissions = await prisma.permission.findMany({ where: { code: { in: codes } } });
    expect(permissions).toHaveLength(codes.length);
    await prisma.rolePermission.createMany({ data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })) });
    return role.id;
  }

  async function account(label: Who, roleId: string, schoolsScope: string[]): Promise<void> {
    const hash = (await prisma.user.findFirstOrThrow({ where: { email: 'elena.ramirez@untrm.edu.pe' } })).passwordHash;
    const user = await prisma.user.create({ data: { email: `emi-${label}-${stamp}@untrm.edu.pe`, passwordHash: hash, firstName: 'Cuenta', lastName: `Emisión ${label}`, roleId } });
    userIds.push(user.id);
    accountIds[label] = user.id;
    await prisma.userAccessPolicy.create({ data: { userId: user.id, roleId, kind: 'SCHOOLS', schoolIds: schoolsScope } });
  }

  async function makeTutor(label: string): Promise<string> {
    const hash = (await prisma.user.findFirstOrThrow({ where: { email: 'elena.ramirez@untrm.edu.pe' } })).passwordHash;
    const user = await prisma.user.create({
      data: { email: `emi-doc-${label}-${stamp}@untrm.edu.pe`, passwordHash: hash, firstName: 'Docente', lastName: `Ficticio ${label}`, roleId: tutorRoleId, schoolId: schoolA.id },
    });
    userIds.push(user.id);
    cycle += 1;
    const assignment = await prisma.cycleTutorAssignment.create({ data: { periodId, schoolId: schoolA.id, cycle, tutorId: user.id, assignedById: adminId, acceptanceStatus: 'ACEPTADA', respondedAt: new Date() } });
    assignmentIds.push(assignment.id);
    return user.id;
  }

  const act = (who: Who, id: string, action: string, body?: unknown) => call('POST', `/certificates/${id}/${action}`, who, body ?? {});
  const state = async (id: string) => (await json(await call('GET', `/certificates/${id}`, 'admin'))).certificate;
  const generate = (who: Who, id: string) => act(who, id, 'generate');

  /** Un trámite APROBADO de un docente propio, listo para generar. */
  async function approved(label: string): Promise<string> {
    const created = await call('POST', '/certificates', 'issuer', { tutorId: await makeTutor(label), periodId, schoolId: schoolA.id });
    expect(created.status).toBe(201);
    const c = (await json(created)).certificate;
    certificateIds.push(c.id);
    expect((await act('issuer', c.id, 'submit')).status).toBe(200);
    for (const e of c.evidences) expect((await call('PUT', `/certificates/${c.id}/evidences/${e.id}`, 'issuer', { result: 'CONFORME' })).status).toBe(200);
    expect((await act('issuer', c.id, 'approve')).status).toBe(200);
    return c.id;
  }

  const saveResolution = (who: Who, over: Record<string, unknown> = {}) =>
    call('PUT', '/committee-resolutions', who, { periodId, schoolId: schoolA.id, number: `030-2026-${stamp}-DEMO`, issuedOn: '2026-03-01', ...over });

  const storedFile = async (id: string) => {
    const row = await prisma.certificate.findUniqueOrThrow({ where: { id }, select: { unsignedStorageKey: true, unsignedSha256: true } });
    return { key: row.unsignedStorageKey as string, sha: row.unsignedSha256 as string, path: storage.resolvePath(row.unsignedStorageKey as string) };
  };

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba HTTP de generación de certificados.');
      return;
    }
    const reference = await prisma.school.findFirstOrThrow({ where: { name: 'Ingeniería de Sistemas' } });
    for (const label of ['A', 'B']) {
      const faculty = await prisma.faculty.create({ data: { name: `Facultad de Emisión ${label} ${stamp}` } });
      facultyIds.push(faculty.id);
      const school = await prisma.school.create({ data: { name: `Escuela de Emisión ${label} ${stamp}`, facultyId: faculty.id, campusId: reference.campusId } });
      schoolIds.push(school.id);
    }
    schoolA = { id: schoolIds[0]!, name: `Escuela de Emisión A ${stamp}` };
    schoolB = { id: schoolIds[1]!, name: `Escuela de Emisión B ${stamp}` };
    periodId = (await prisma.academicPeriod.create({ data: { name: `Prueba emisión ${stamp}`, startDate: new Date('2026-01-05'), endDate: new Date('2026-06-30'), isActive: true, createdAt: TEST_PERIOD_CREATED_AT } })).id;
    adminId = (await prisma.user.findFirstOrThrow({ where: { email: '7183255722@untrm.edu.pe' } })).id;
    tutorRoleId = (await prisma.role.findFirstOrThrow({ where: { name: 'Docente Tutor' } })).id;

    await account('issuer', await roleWith('emisor', ['certificados:registrar', 'certificados:aprobar', 'certificados:emitir', 'certificados:descargar', 'certificados:consultar']), [schoolA.id]);
    await account('downloader', await roleWith('descarga', ['certificados:descargar', 'certificados:consultar']), [schoolA.id]);
    await account('viewer', await roleWith('consulta', ['certificados:consultar']), [schoolA.id]);
    await account('otherSchool', await roleWith('otra-escuela', ['certificados:registrar', 'certificados:aprobar', 'certificados:emitir', 'certificados:descargar', 'certificados:administrar', 'certificados:consultar']), [schoolB.id]);

    const { default: app } = await import('../../src/app');
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    const address = listening.address();
    if (!address || typeof address === 'string') throw new Error('No address');
    baseUrl = `http://localhost:${address.port}`;
    tokens.admin = await login('7183255722@untrm.edu.pe', 'Admin2026!');
    for (const who of ['issuer', 'downloader', 'viewer', 'otherSchool'] as Who[]) tokens[who] = await login(`emi-${who}-${stamp}@untrm.edu.pe`, DEMO_PASSWORD);
  });

  afterAll(async () => {
    const running = server;
    if (running) await new Promise((resolve) => running.close(resolve));
    if (dbUp) {
      // Los PDF guardados se borran del disco antes de borrar el trámite que los referencia.
      const files = await prisma.certificate.findMany({ where: { id: { in: certificateIds }, unsignedStorageKey: { not: null } }, select: { unsignedStorageKey: true } });
      for (const f of files) await storage.delete(f.unsignedStorageKey as string);
      await prisma.certificateEvidence.deleteMany({ where: { certificateId: { in: certificateIds } } });
      await prisma.certificate.deleteMany({ where: { id: { in: certificateIds } } });
      // El contador `DEMO` no tiene columna `id`: el registro de origen de las pruebas no lo ve, así que se borra aquí (en la base de
      // pruebas ningún otro trámite lleva un número DEMO-, y dejarlo haría que la siguiente corrida viera un valor cambiado).
      await prisma.certificateSequence.deleteMany({ where: { scope: 'DEMO' } });
      await prisma.committeeResolution.deleteMany({ where: { periodId } });
      await prisma.cycleTutorAssignment.deleteMany({ where: { id: { in: assignmentIds } } });
      await prisma.userAccessPolicy.deleteMany({ where: { userId: { in: userIds } } });
      await removeOwnUserTraces(prisma, userIds, certificateIds);
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await prisma.rolePermission.deleteMany({ where: { roleId: { in: roleIds } } });
      await prisma.role.deleteMany({ where: { id: { in: roleIds } } });
      await prisma.academicPeriod.deleteMany({ where: { id: periodId } });
      await prisma.school.deleteMany({ where: { id: { in: schoolIds } } });
      await prisma.faculty.deleteMany({ where: { id: { in: facultyIds } } });
    }
    await prisma.$disconnect();
  });

  const guard = (fn: () => Promise<void>) => async () => {
    if (!dbUp) return;
    await fn();
  };

  describe('resolución de decanato', () => {
    it('solo la administra quien tiene `certificados:administrar`, dentro de su escuela', guard(async () => {
      expect((await call('PUT', '/committee-resolutions', null, {})).status).toBe(401);
      expect((await saveResolution('issuer')).status).toBe(403);
      expect((await saveResolution('viewer')).status).toBe(403);
      expect((await saveResolution('otherSchool')).status).toBe(404); // la escuela A está fuera de su alcance
      const saved = await saveResolution('admin');
      expect(saved.status).toBe(200);
      const first = (await json(saved)).resolution;
      expect(first).toMatchObject({ periodId, schoolId: schoolA.id, number: `030-2026-${stamp}-DEMO` });
      expect(first.issuedOn).toMatch(/^2026-03-01/);
      expect((await prisma.auditLog.findMany({ where: { entityId: first.id, action: 'COMMITTEE_RESOLUTION_SAVED' } })).length).toBe(1);
    }));

    it('guardar de nuevo reemplaza la resolución (una por escuela y periodo)', guard(async () => {
      const again = await saveResolution('admin', { number: `040-2026-${stamp}-DEMO`, issuedOn: '2026-04-02' });
      expect(again.status).toBe(200);
      expect(await prisma.committeeResolution.count({ where: { periodId, schoolId: schoolA.id } })).toBe(1);
      expect((await json(again)).resolution.number).toBe(`040-2026-${stamp}-DEMO`);
      await saveResolution('admin'); // se deja la original para las demás pruebas
    }));

    it('rechaza número corto, fecha mal formada o futura, y periodo o escuela inexistentes', guard(async () => {
      expect((await saveResolution('admin', { number: 'ab' })).status).toBe(400);
      expect((await saveResolution('admin', { issuedOn: '01/03/2026' })).status).toBe(400);
      expect((await saveResolution('admin', { issuedOn: '2099-01-01' })).status).toBe(400);
      expect((await saveResolution('admin', { periodId: UNKNOWN_ID })).status).toBe(400);
      expect((await saveResolution('admin', { schoolId: UNKNOWN_ID })).status).toBe(404);
      expect((await saveResolution('admin', { periodId: 'no-uuid' })).status).toBe(400);
    }));

    it('la lista se limita al alcance de quien consulta', guard(async () => {
      await call('PUT', '/committee-resolutions', 'otherSchool', { periodId, schoolId: schoolB.id, number: `B-2026-${stamp}`, issuedOn: '2026-03-02' });
      const own = (await json(await call('GET', `/committee-resolutions?periodId=${periodId}`, 'viewer'))).resolutions as { schoolId: string }[];
      expect(own.map((r) => r.schoolId)).toEqual([schoolA.id]);
      const other = (await json(await call('GET', `/committee-resolutions?periodId=${periodId}`, 'otherSchool'))).resolutions as { schoolId: string }[];
      expect(other.map((r) => r.schoolId)).toEqual([schoolB.id]);
      // Pedir la escuela ajena por filtro no la abre.
      expect((await json(await call('GET', `/committee-resolutions?schoolId=${schoolB.id}`, 'viewer'))).resolutions).toEqual([]);
      expect((await call('GET', '/committee-resolutions', null)).status).toBe(401);
    }));
  });

  describe('generar', () => {
    it('antes de aprobar, sin permiso, desde otra escuela o con un identificador inválido no se genera', guard(async () => {
      const created = await call('POST', '/certificates', 'issuer', { tutorId: await makeTutor('previo'), periodId, schoolId: schoolA.id });
      const c = (await json(created)).certificate;
      certificateIds.push(c.id);
      expect((await generate('issuer', c.id)).status).toBe(409); // INICIADO
      expect((await generate('viewer', c.id)).status).toBe(403);
      expect((await generate('downloader', c.id)).status).toBe(403);
      expect((await generate('otherSchool', c.id)).status).toBe(404);
      expect((await generate('issuer', UNKNOWN_ID)).status).toBe(404);
      expect((await generate('issuer', 'no-uuid')).status).toBe(404);
      expect((await state(c.id)).status).toBe('INICIADO');
    }));

    it('sin resolución de decanato registrada responde 409 con un mensaje claro y no consume número', guard(async () => {
      const id = await approved('sin-resolucion');
      await prisma.committeeResolution.deleteMany({ where: { periodId, schoolId: schoolA.id } });
      const before = await prisma.certificateSequence.findUnique({ where: { scope_year: { scope: 'DEMO', year: new Date().getUTCFullYear() } } });
      const res = await generate('issuer', id);
      expect(res.status).toBe(409);
      expect((await json(res)).error).toMatch(/resolución de decanato/);
      const after = await prisma.certificateSequence.findUnique({ where: { scope_year: { scope: 'DEMO', year: new Date().getUTCFullYear() } } });
      expect(after?.last ?? 0).toBe(before?.last ?? 0);
      expect((await state(id)).status).toBe('APROBADO');
      expect((await saveResolution('admin')).status).toBe(200);
    }));

    it('genera el PDF sin firma: número DEMO-, huella, instantánea, plantilla de demostración, archivo y bitácora', guard(async () => {
      const id = await approved('genera');
      const res = await generate('issuer', id);
      expect(res.status).toBe(200);
      const c = (await json(res)).certificate;
      expect(c).toMatchObject({ status: 'GENERADO_SIN_FIRMA', isDemo: true, hasUnsignedPdf: true });
      expect(c.number).toMatch(NUMBER_FORMAT);
      expect(c.pdfSha256).toMatch(/^[0-9a-f]{64}$/);

      const row = await prisma.certificate.findUniqueOrThrow({ where: { id }, include: { template: true } });
      expect(row.number).toBe(c.number);
      expect(row.template).toMatchObject({ name: 'Demostración', isDemo: true });
      expect(row.snapshot).toMatchObject({ number: c.number, schoolName: schoolA.name, periodName: `Prueba emisión ${stamp}`, resolutionNumber: `030-2026-${stamp}-DEMO`, departmentIsPlaceholder: true, demo: true });

      const file = await storedFile(id);
      const bytes = await fs.readFile(file.path);
      expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(c.pdfSha256);
      expect((await prisma.auditLog.findMany({ where: { entityId: id, action: 'CERTIFICATE_GENERATED' } })).length).toBe(1);

      // Generado: no se vuelve a generar ni a aprobar; solo anular. La firma y la entrega siguen sin acción.
      expect((await generate('issuer', id)).status).toBe(409);
      expect((await act('issuer', id, 'approve')).status).toBe(409);
      expect((await act('issuer', id, 'submit')).status).toBe(409);
    }));

    it('los números de distintos trámites no se repiten y siguen la secuencia', guard(async () => {
      const a = await approved('num-a');
      const b = await approved('num-b');
      const numberOf = async (id: string) => (await json(await generate('issuer', id))).certificate.number as string;
      const first = await numberOf(a);
      const second = await numberOf(b);
      const seq = (n: string) => Number(/^DEMO-(\d+)-/.exec(n)![1]);
      expect(first).not.toBe(second);
      expect(seq(second)).toBeGreaterThan(seq(first));
    }));

    it('un trámite anulado después de generarse conserva su número y no lo reutiliza otro', guard(async () => {
      const id = await approved('anulado-generado');
      const number = (await json(await generate('issuer', id))).certificate.number as string;
      expect((await call('POST', `/certificates/${id}/void`, 'admin', { reason: 'Anulación ficticia de prueba' })).status).toBe(200);
      const voided = await state(id);
      expect(voided).toMatchObject({ status: 'ANULADO', number });
      const other = await approved('tras-anulado');
      const next = (await json(await generate('issuer', other))).certificate.number as string;
      expect(next).not.toBe(number);
    }));
  });

  describe('concurrencia', () => {
    it('varias generaciones simultáneas del mismo trámite dejan un solo PDF y un solo número', guard(async () => {
      const id = await approved('carrera-misma');
      const results = await Promise.all(Array.from({ length: 5 }, () => generate('issuer', id)));
      expect(results.map((r) => r.status).sort()).toEqual([200, 409, 409, 409, 409]);
      const c = await state(id);
      expect(c.status).toBe('GENERADO_SIN_FIRMA');
      expect(c.number).toMatch(NUMBER_FORMAT);
      expect(await prisma.auditLog.count({ where: { entityId: id, action: 'CERTIFICATE_GENERATED' } })).toBe(1);
    }));

    it('generaciones simultáneas de trámites distintos reciben números distintos', guard(async () => {
      const ids = [await approved('carrera-1'), await approved('carrera-2'), await approved('carrera-3'), await approved('carrera-4')];
      const results = await Promise.all(ids.map((id) => generate('issuer', id)));
      expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200]);
      const numbers = (await Promise.all(results.map(async (r) => (await json(r)).certificate.number))) as string[];
      expect(new Set(numbers).size).toBe(4);
    }));
  });

  describe('descargar', () => {
    let id = '';
    let sha = '';

    it('antes de generar responde 409; sin sesión 401; sin permiso 403; desde otra escuela 404', guard(async () => {
      id = await approved('descarga');
      expect((await call('GET', `/certificates/${id}/pdf`, 'issuer')).status).toBe(409);
      expect((await call('GET', `/certificates/${id}/pdf`, null)).status).toBe(401);
      sha = (await json(await generate('issuer', id))).certificate.pdfSha256;
      expect((await call('GET', `/certificates/${id}/pdf`, 'viewer')).status).toBe(403);
      expect((await call('GET', `/certificates/${id}/pdf`, 'otherSchool')).status).toBe(404);
      expect((await call('GET', `/certificates/${UNKNOWN_ID}/pdf`, 'issuer')).status).toBe(404);
      expect((await call('GET', '/certificates/no-uuid/pdf', 'issuer')).status).toBe(404);
    }));

    it('entrega el PDF con sesión, con cabeceras seguras, y los bytes coinciden con la huella', guard(async () => {
      const res = await call('GET', `/certificates/${id}/pdf`, 'downloader');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/pdf');
      expect(res.headers.get('content-disposition')).toMatch(/^attachment; filename="certificado-DEMO-\d+-\d{4}-UNTRM-[A-Z0-9-]+\.pdf"$/);
      expect(res.headers.get('cache-control')).toBe('no-store');
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
      const bytes = Buffer.from(await res.arrayBuffer());
      expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(sha);
    }));

    it('cada descarga queda en la bitácora, también el intento rechazado, sin guardar el contenido', guard(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400)); // la bitácora de acceso se escribe al terminar la respuesta
      const rows = await prisma.auditLog.findMany({ where: { entity: 'Certificate', entityId: id, action: 'DOWNLOAD' }, orderBy: { createdAt: 'asc' } });
      const byUser = (userId: string) => rows.filter((r) => r.userId === userId);
      expect(byUser(accountIds.downloader).map((r) => r.details)).toEqual(['Descarga concedida']);
      expect(byUser(accountIds.viewer).length).toBe(1); // el rechazado por permiso
      expect(byUser(accountIds.viewer)[0]!.details).toMatch(/denegada/);
      expect(JSON.stringify(rows)).not.toContain('%PDF');
    }));

    it('si el archivo guardado cambió o desapareció, no se entrega (la huella no coincide)', guard(async () => {
      const file = await storedFile(id);
      const original = await fs.readFile(file.path);
      try {
        await fs.writeFile(file.path, Buffer.concat([original, Buffer.from('%contenido-agregado')]));
        const tampered = await call('GET', `/certificates/${id}/pdf`, 'issuer');
        expect(tampered.status).toBe(500);
        expect((await json(tampered)).error).toMatch(/no coincide con su huella/);
        await fs.rm(file.path);
        expect((await call('GET', `/certificates/${id}/pdf`, 'issuer')).status).toBe(500);
      } finally {
        await fs.writeFile(file.path, original);
      }
      expect((await call('GET', `/certificates/${id}/pdf`, 'issuer')).status).toBe(200); // restaurado: vuelve a servirse
    }));
  });
});
