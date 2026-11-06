import http from 'http';
import { prisma } from '../../src/infrastructure/database/prisma';
import { TEST_PERIOD_CREATED_AT } from '../helpers/currentPeriod';
import { DEMO_PASSWORD, removeOwnUserTraces } from '../helpers/ownUsers';

/**
 * Trámite de certificación (corte 3) por HTTP real y base real de pruebas: iniciar, enviar a revisión, revisar evidencias, observar,
 * rechazar, aprobar y anular, con permisos por acción, alcance por escuela, bitácora y concurrencia. Datos PROPIOS (periodo, facultades,
 * escuelas, roles, cuentas, designaciones y trámites) que crea y borra; la cuenta administradora sembrada solo inicia sesión. Se omite
 * sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(240_000);

const stamp = String(Date.now());
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';
const REASON = 'Motivo ficticio de la prueba del trámite';

type Who = 'admin' | 'director' | 'registrar' | 'approver' | 'voider' | 'viewer' | 'otherSchool';

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('trámite de certificación: flujo, permisos, alcance y concurrencia (corte 3)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  const tokens = {} as Record<Who, string>;
  let periodId = '';
  let schoolA = { id: '', name: '' };
  let schoolB = { id: '', name: '' };
  let adminId = '';
  let cycle = 0;
  const tutorRoleName = 'Docente Tutor';
  let tutorRoleId = '';
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
    const role = await prisma.role.create({ data: { name: `Rol trámite ${label} ${stamp}`, description: 'Rol ficticio de prueba' } });
    roleIds.push(role.id);
    const permissions = await prisma.permission.findMany({ where: { code: { in: codes } } });
    expect(permissions).toHaveLength(codes.length);
    await prisma.rolePermission.createMany({ data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })) });
    return role.id;
  }

  async function account(label: Who, roleId: string, schoolsScope: string[]): Promise<void> {
    const hash = (await prisma.user.findFirstOrThrow({ where: { email: 'elena.ramirez@untrm.edu.pe' } })).passwordHash;
    const user = await prisma.user.create({ data: { email: `tram-${label}-${stamp}@untrm.edu.pe`, passwordHash: hash, firstName: 'Cuenta', lastName: `Trámite ${label}`, roleId } });
    userIds.push(user.id);
    accountIds[label] = user.id;
    await prisma.userAccessPolicy.create({ data: { userId: user.id, roleId, kind: 'SCHOOLS', schoolIds: schoolsScope } });
  }

  /** Un docente propio de la escuela A con su designación de un ciclo (un ciclo distinto cada vez: son únicos por periodo y escuela). */
  async function makeTutor(label: string, opts: { acceptance?: string; active?: boolean } = {}): Promise<string> {
    const hash = (await prisma.user.findFirstOrThrow({ where: { email: 'elena.ramirez@untrm.edu.pe' } })).passwordHash;
    const user = await prisma.user.create({
      data: { email: `tram-doc-${label}-${stamp}@untrm.edu.pe`, passwordHash: hash, firstName: 'Docente', lastName: `Ficticio ${label}`, roleId: tutorRoleId, schoolId: schoolA.id, isActive: opts.active ?? true },
    });
    userIds.push(user.id);
    cycle += 1;
    const assignment = await prisma.cycleTutorAssignment.create({
      data: { periodId, schoolId: schoolA.id, cycle, tutorId: user.id, assignedById: adminId, acceptanceStatus: opts.acceptance ?? 'ACEPTADA', respondedAt: new Date() },
    });
    assignmentIds.push(assignment.id);
    return user.id;
  }

  const start = async (who: Who, tutorId: string, schoolId = schoolA.id) => call('POST', '/certificates', who, { tutorId, periodId, schoolId });
  async function started(tutorId: string, who: Who = 'director'): Promise<{ id: string; evidences: { id: string; kind: string }[] }> {
    const res = await start(who, tutorId);
    expect(res.status).toBe(201);
    const c = (await json(res)).certificate;
    certificateIds.push(c.id);
    return c;
  }
  const act = (who: Who, id: string, action: string, body?: unknown) => call('POST', `/certificates/${id}/${action}`, who, body ?? {});
  const review = (who: Who, id: string, evidenceId: string, result: string, comment?: string) => call('PUT', `/certificates/${id}/evidences/${evidenceId}`, who, { result, comment });
  const state = async (id: string) => (await json(await call('GET', `/certificates/${id}`, 'admin'))).certificate;
  const underReview = async (label: string) => {
    const c = await started(await makeTutor(label));
    expect((await act('registrar', c.id, 'submit')).status).toBe(200);
    return c;
  };

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba HTTP del trámite de certificación.');
      return;
    }
    const reference = await prisma.school.findFirstOrThrow({ where: { name: 'Ingeniería de Sistemas' } });
    for (const label of ['A', 'B']) {
      const faculty = await prisma.faculty.create({ data: { name: `Facultad trámite ${label} ${stamp}` } });
      facultyIds.push(faculty.id);
      const school = await prisma.school.create({ data: { name: `Escuela trámite ${label} ${stamp}`, facultyId: faculty.id, campusId: reference.campusId } });
      schoolIds.push(school.id);
    }
    schoolA = { id: schoolIds[0]!, name: `Escuela trámite A ${stamp}` };
    schoolB = { id: schoolIds[1]!, name: `Escuela trámite B ${stamp}` };
    periodId = (await prisma.academicPeriod.create({ data: { name: `Prueba trámite ${stamp}`, startDate: new Date('2026-01-05'), endDate: new Date('2026-06-30'), isActive: true, createdAt: TEST_PERIOD_CREATED_AT } })).id;
    adminId = (await prisma.user.findFirstOrThrow({ where: { email: '7183255722@untrm.edu.pe' } })).id;
    tutorRoleId = (await prisma.role.findFirstOrThrow({ where: { name: tutorRoleName } })).id;

    await account('director', await roleWith('director', ['certificados:registrar', 'certificados:aprobar', 'certificados:consultar']), [schoolA.id]);
    await account('registrar', await roleWith('registrar', ['certificados:registrar', 'certificados:consultar']), [schoolA.id]);
    await account('approver', await roleWith('aprobador', ['certificados:aprobar', 'certificados:consultar']), [schoolA.id]);
    await account('voider', await roleWith('anulador', ['certificados:administrar', 'certificados:consultar']), [schoolA.id]);
    await account('viewer', await roleWith('consulta', ['certificados:consultar']), [schoolA.id]);
    await account('otherSchool', await roleWith('otra-escuela', ['certificados:registrar', 'certificados:aprobar', 'certificados:administrar', 'certificados:consultar']), [schoolB.id]);

    const { default: app } = await import('../../src/app');
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    const address = listening.address();
    if (!address || typeof address === 'string') throw new Error('No address');
    baseUrl = `http://localhost:${address.port}`;
    tokens.admin = await login('7183255722@untrm.edu.pe', 'Admin2026!');
    for (const who of ['director', 'registrar', 'approver', 'voider', 'viewer', 'otherSchool'] as Who[]) tokens[who] = await login(`tram-${who}-${stamp}@untrm.edu.pe`, DEMO_PASSWORD);
  });

  afterAll(async () => {
    const running = server;
    if (running) await new Promise((resolve) => running.close(resolve));
    if (dbUp) {
      await prisma.certificateEvidence.deleteMany({ where: { certificateId: { in: certificateIds } } });
      await prisma.certificate.deleteMany({ where: { id: { in: certificateIds } } });
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

  describe('iniciar', () => {
    it('crea el trámite INICIADO, de demostración, con sus tres evidencias pendientes y deja la bitácora', guard(async () => {
      const tutorId = await makeTutor('inicio');
      const res = await start('director', tutorId);
      expect(res.status).toBe(201);
      const c = (await json(res)).certificate;
      certificateIds.push(c.id);
      expect(c).toMatchObject({ status: 'INICIADO', isDemo: true, number: null, schoolId: schoolA.id, tutorId, periodId });
      expect(c.evidences.map((e: any) => [e.kind, e.result]).sort()).toEqual([['ACEPTACION', 'PENDIENTE'], ['INFORME_SEMESTRAL', 'PENDIENTE'], ['SESIONES', 'PENDIENTE']]);
      const acceptance = c.evidences.find((e: any) => e.kind === 'ACEPTACION');
      expect(acceptance.ref).toBe((await prisma.cycleTutorAssignment.findFirstOrThrow({ where: { periodId, tutorId } })).id);

      const audit = await prisma.auditLog.findMany({ where: { entityId: c.id, action: 'CERTIFICATE_STARTED' } });
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({ userId: accountIds.director, entity: 'Certificate' });
    }));

    it('no se inicia dos veces para el mismo docente, escuela y periodo', guard(async () => {
      const tutorId = await makeTutor('duplicado');
      await started(tutorId);
      const again = await start('director', tutorId);
      expect(again.status).toBe(409);
      expect((await json(again)).error).toMatch(/Ya existe un trámite vigente/);
    }));

    it('exige una designación aceptada: pendiente, rechazada o sin solicitar dan 409', guard(async () => {
      for (const acceptance of ['SIN_SOLICITAR', 'PENDIENTE', 'RECHAZADA']) {
        const tutorId = await makeTutor(`no-${acceptance.toLowerCase()}`, { acceptance });
        const res = await start('director', tutorId);
        expect(res.status).toBe(409);
        expect((await json(res)).error).toMatch(/designación aceptada/);
      }
    }));

    it('rechaza un docente inactivo, un docente o periodo inexistentes y datos mal formados con 400', guard(async () => {
      expect((await start('director', await makeTutor('inactivo', { active: false }))).status).toBe(400);
      expect((await start('director', UNKNOWN_ID)).status).toBe(400);
      expect((await call('POST', '/certificates', 'director', { tutorId: await makeTutor('sin-periodo'), periodId: UNKNOWN_ID, schoolId: schoolA.id })).status).toBe(400);
      expect((await call('POST', '/certificates', 'director', { tutorId: 'no-uuid', periodId, schoolId: schoolA.id })).status).toBe(400);
      expect((await call('POST', '/certificates', 'director', {})).status).toBe(400);
    }));

    it('solo inicia quien tiene `certificados:registrar` y solo en su escuela', guard(async () => {
      const tutorId = await makeTutor('permisos');
      expect((await call('POST', '/certificates', null, { tutorId, periodId, schoolId: schoolA.id })).status).toBe(401);
      expect((await start('approver', tutorId)).status).toBe(403); // aprueba, no inicia
      expect((await start('viewer', tutorId)).status).toBe(403);
      expect((await start('otherSchool', tutorId)).status).toBe(404); // la escuela A está fuera de su alcance
      // Nada quedó creado por los intentos rechazados.
      expect(await prisma.certificate.count({ where: { tutorId } })).toBe(0);
    }));
  });

  describe('flujo de aprobación', () => {
    it('enviar a revisión, revisar las evidencias y aprobar; el sistema no aprueba con evidencias pendientes', guard(async () => {
      const c = await started(await makeTutor('flujo'));
      expect((await act('director', c.id, 'approve')).status).toBe(409); // sigue INICIADO: no está en revisión

      const submitted = await act('registrar', c.id, 'submit');
      expect(submitted.status).toBe(200);
      expect((await json(submitted)).certificate.status).toBe('EN_REVISION');
      expect((await act('registrar', c.id, 'submit')).status).toBe(409); // ya está en revisión

      const early = await act('approver', c.id, 'approve');
      expect(early.status).toBe(409);
      expect((await json(early)).error).toMatch(/Faltan por revisar 3 evidencia/);

      // Dos de tres conformes: todavía no.
      for (const e of c.evidences.slice(0, 2)) expect((await review('approver', c.id, e.id, 'CONFORME')).status).toBe(200);
      const almost = await act('approver', c.id, 'approve');
      expect(almost.status).toBe(409);
      expect((await json(almost)).error).toMatch(/Faltan por revisar 1 evidencia/);

      expect((await review('approver', c.id, c.evidences[2]!.id, 'CONFORME')).status).toBe(200);
      const approved = await act('approver', c.id, 'approve');
      expect(approved.status).toBe(200);
      const body = (await json(approved)).certificate;
      expect(body.status).toBe('APROBADO');
      expect(body.approvedAt).toEqual(expect.any(String));
      expect(body.evidences.every((e: any) => e.result === 'CONFORME' && e.reviewedByName)).toBe(true);
      expect((await prisma.certificate.findUniqueOrThrow({ where: { id: c.id } })).approvedById).toBe(accountIds.approver);
      // Un certificado de demostración sigue sin número y sin PDF: eso llega en el corte 4.
      expect(body).toMatchObject({ isDemo: true, number: null, hasUnsignedPdf: false });

      expect((await act('approver', c.id, 'approve')).status).toBe(409); // ya aprobado
    }));

    it('cada paso queda en la bitácora con quién lo hizo, sin guardar el texto libre', guard(async () => {
      const c = await underReview('bitacora');
      await review('approver', c.id, c.evidences[0]!.id, 'OBSERVADA', 'COMENTARIO-SECRETO-123');
      await act('approver', c.id, 'reject', { reason: 'MOTIVO-SECRETO-456 del rechazo' });
      const rows = await prisma.auditLog.findMany({ where: { entityId: c.id }, orderBy: { createdAt: 'asc' } });
      expect(rows.map((r) => r.action)).toEqual(['CERTIFICATE_STARTED', 'CERTIFICATE_SUBMITTED', 'CERTIFICATE_EVIDENCE_REVIEWED', 'CERTIFICATE_REJECTED']);
      expect(rows.map((r) => r.userId)).toEqual([accountIds.director, accountIds.registrar, accountIds.approver, accountIds.approver]);
      const text = JSON.stringify(rows);
      expect(text).not.toContain('SECRETO');
    }));

    it('cada acción pide su permiso: quien solo inicia no aprueba, quien solo aprueba no inicia ni envía', guard(async () => {
      const c = await underReview('permisos-flujo');
      expect((await act('registrar', c.id, 'approve')).status).toBe(403);
      expect((await review('registrar', c.id, c.evidences[0]!.id, 'CONFORME')).status).toBe(403);
      expect((await act('registrar', c.id, 'observe')).status).toBe(403);
      expect((await act('registrar', c.id, 'reject', { reason: REASON })).status).toBe(403);
      expect((await act('approver', c.id, 'submit')).status).toBe(403);
      expect((await act('viewer', c.id, 'approve')).status).toBe(403);
      expect((await act('director', c.id, 'void', { reason: REASON })).status).toBe(403); // anular es de administrar
      expect((await state(c.id)).status).toBe('EN_REVISION');
    }));
  });

  describe('evidencias', () => {
    it('solo se revisan con el trámite en revisión, con un resultado válido y, si se observan, con comentario', guard(async () => {
      const c = await started(await makeTutor('evidencias'));
      const first = c.evidences[0]!.id;
      expect((await review('approver', c.id, first, 'CONFORME')).status).toBe(409); // aún INICIADO
      expect((await act('registrar', c.id, 'submit')).status).toBe(200);

      expect((await review('approver', c.id, first, 'CUMPLIO')).status).toBe(400);
      expect((await review('approver', c.id, first, 'OBSERVADA')).status).toBe(400); // sin comentario
      expect((await review('approver', c.id, first, 'OBSERVADA', '  ')).status).toBe(400);
      const ok = await review('approver', c.id, first, 'OBSERVADA', 'Falta la resolución de designación');
      expect(ok.status).toBe(200);
      expect((await json(ok)).certificate.evidences.find((e: any) => e.id === first)).toMatchObject({ result: 'OBSERVADA', comment: 'Falta la resolución de designación', reviewedByName: expect.any(String) });
      // Se puede volver a pendiente.
      expect((await review('approver', c.id, first, 'PENDIENTE')).status).toBe(200);
    }));

    it('una evidencia de otro trámite, o un identificador mal formado, responde 404', guard(async () => {
      const a = await underReview('evid-a');
      const b = await underReview('evid-b');
      expect((await review('approver', a.id, b.evidences[0]!.id, 'CONFORME')).status).toBe(404);
      expect((await review('approver', a.id, UNKNOWN_ID, 'CONFORME')).status).toBe(404);
      expect((await review('approver', a.id, 'no-uuid', 'CONFORME')).status).toBe(404);
      expect((await review('approver', UNKNOWN_ID, a.evidences[0]!.id, 'CONFORME')).status).toBe(404);
    }));
  });

  describe('observar, devolver y rechazar', () => {
    it('observar exige una evidencia observada; el trámite vuelve a revisión al reenviarlo', guard(async () => {
      const c = await underReview('observar');
      const early = await act('approver', c.id, 'observe', { note: 'Falta el respaldo' });
      expect(early.status).toBe(409);
      expect((await json(early)).error).toMatch(/al menos una evidencia como observada/);

      await review('approver', c.id, c.evidences[1]!.id, 'OBSERVADA', 'Sin acta de la comisión');
      const observed = await act('approver', c.id, 'observe', { note: 'Subsanar el acta' });
      expect(observed.status).toBe(200);
      expect((await json(observed)).certificate).toMatchObject({ status: 'OBSERVADO', reviewNote: 'Subsanar el acta' });

      // Observado: no se revisan evidencias ni se aprueba; se devuelve con «submit».
      expect((await review('approver', c.id, c.evidences[0]!.id, 'CONFORME')).status).toBe(409);
      expect((await act('approver', c.id, 'approve')).status).toBe(409);
      const resent = await act('registrar', c.id, 'submit');
      expect(resent.status).toBe(200);
      expect((await json(resent)).certificate).toMatchObject({ status: 'EN_REVISION', reviewNote: null });
      expect((await prisma.auditLog.findMany({ where: { entityId: c.id, action: 'CERTIFICATE_RESUBMITTED' } })).length).toBe(1);

      // Sigue siendo la misma evidencia observada: se corrige y se aprueba.
      await review('approver', c.id, c.evidences[1]!.id, 'CONFORME');
      for (const e of c.evidences) await review('approver', c.id, e.id, 'CONFORME');
      expect((await act('approver', c.id, 'approve')).status).toBe(200);
    }));

    it('rechazar exige un motivo, cierra el trámite y no admite más acciones; el docente puede iniciar otro', guard(async () => {
      const tutorId = await makeTutor('rechazo');
      const c = await started(tutorId);
      await act('registrar', c.id, 'submit');
      expect((await act('approver', c.id, 'reject')).status).toBe(400);
      expect((await act('approver', c.id, 'reject', { reason: 'corto' })).status).toBe(400);

      const rejected = await act('approver', c.id, 'reject', { reason: REASON });
      expect(rejected.status).toBe(200);
      expect((await json(rejected)).certificate).toMatchObject({ status: 'RECHAZADO', reviewNote: REASON });

      for (const action of ['approve', 'submit', 'observe']) expect((await act('director', c.id, action)).status).toBe(409);
      expect((await act('admin', c.id, 'void', { reason: REASON })).status).toBe(409); // un rechazado es final
      expect((await review('approver', c.id, c.evidences[0]!.id, 'CONFORME')).status).toBe(409);

      // Un trámite rechazado no impide iniciar otro del mismo docente.
      expect((await start('director', tutorId)).status).toBe(201);
      certificateIds.push(...(await prisma.certificate.findMany({ where: { tutorId }, select: { id: true } })).map((r) => r.id));
    }));

    it('la base de datos no deja guardar un rechazo sin motivo', guard(async () => {
      const c = await underReview('rechazo-bd');
      await expect(prisma.certificate.update({ where: { id: c.id }, data: { status: 'RECHAZADO' } })).rejects.toThrow(/certificates_reject_note_check/);
      await expect(prisma.certificate.update({ where: { id: c.id }, data: { status: 'RECHAZADO', reviewNote: '   ' } })).rejects.toThrow(/certificates_reject_note_check/);
    }));
  });

  describe('anular', () => {
    it('exige `certificados:administrar` y un motivo; guarda quién y cuándo; un anulado no se reabre', guard(async () => {
      const c = await underReview('anular');
      for (const e of c.evidences) await review('approver', c.id, e.id, 'CONFORME');
      expect((await act('approver', c.id, 'approve')).status).toBe(200);

      expect((await act('voider', c.id, 'void')).status).toBe(400);
      expect((await act('voider', c.id, 'void', { reason: 'corto' })).status).toBe(400);
      const voided = await act('voider', c.id, 'void', { reason: REASON });
      expect(voided.status).toBe(200);
      const body = (await json(voided)).certificate;
      expect(body).toMatchObject({ status: 'ANULADO', voidReason: REASON });
      expect(body.voidedAt).toEqual(expect.any(String));
      expect((await prisma.certificate.findUniqueOrThrow({ where: { id: c.id } })).voidedById).toBe(accountIds.voider);

      for (const action of ['approve', 'submit', 'observe']) expect((await act('director', c.id, action)).status).toBe(409);
      expect((await act('voider', c.id, 'void', { reason: REASON })).status).toBe(409);
    }));

    it('se puede anular un trámite recién iniciado o en revisión', guard(async () => {
      const started1 = await started(await makeTutor('anular-iniciado'));
      expect((await act('admin', started1.id, 'void', { reason: REASON })).status).toBe(200);
      const reviewing = await underReview('anular-revision');
      expect((await act('admin', reviewing.id, 'void', { reason: REASON })).status).toBe(200);
    }));
  });

  describe('alcance', () => {
    it('quien actúa desde otra escuela ve «no encontrado» en cada acción y nada cambia', guard(async () => {
      const c = await underReview('alcance');
      const before = await state(c.id);
      for (const action of ['submit', 'observe', 'approve']) expect((await act('otherSchool', c.id, action)).status).toBe(404);
      expect((await act('otherSchool', c.id, 'reject', { reason: REASON })).status).toBe(404);
      expect((await act('otherSchool', c.id, 'void', { reason: REASON })).status).toBe(404);
      expect((await review('otherSchool', c.id, c.evidences[0]!.id, 'CONFORME')).status).toBe(404);
      expect(await state(c.id)).toEqual(before);
    }));

    it('un identificador mal formado o inexistente responde 404 en cada acción', guard(async () => {
      for (const id of ['no-uuid', UNKNOWN_ID]) {
        for (const action of ['submit', 'observe', 'approve']) expect((await act('director', id, action)).status).toBe(404);
        expect((await act('director', id, 'reject', { reason: REASON })).status).toBe(404);
        expect((await act('admin', id, 'void', { reason: REASON })).status).toBe(404);
      }
    }));
  });

  describe('concurrencia', () => {
    it('varias aprobaciones simultáneas del mismo trámite: exactamente una tiene éxito y las demás reciben 409', guard(async () => {
      const c = await underReview('carrera-aprobar');
      for (const e of c.evidences) await review('approver', c.id, e.id, 'CONFORME');
      const results = await Promise.all(Array.from({ length: 6 }, () => act('approver', c.id, 'approve')));
      const statuses = results.map((r) => r.status).sort();
      expect(statuses).toEqual([200, 409, 409, 409, 409, 409]);
      expect(await prisma.auditLog.count({ where: { entityId: c.id, action: 'CERTIFICATE_APPROVED' } })).toBe(1);
      expect((await state(c.id)).status).toBe('APROBADO');
    }));

    it('aprobar y observar una evidencia a la vez nunca deja un aprobado con evidencias no conformes', guard(async () => {
      for (let round = 0; round < 4; round += 1) {
        const c = await underReview(`carrera-mixta-${round}`);
        for (const e of c.evidences) await review('approver', c.id, e.id, 'CONFORME');
        const [approve, observe] = await Promise.all([act('approver', c.id, 'approve'), review('approver', c.id, c.evidences[0]!.id, 'OBSERVADA', 'Observación simultánea')]);
        const final = await state(c.id);
        if (final.status === 'APROBADO') {
          // Ganó la aprobación: la observación llegó tarde y fue rechazada, sin tocar la evidencia.
          expect([approve.status, observe.status]).toEqual([200, 409]);
          expect(final.evidences.every((e: any) => e.result === 'CONFORME')).toBe(true);
        } else {
          // Ganó la observación: la aprobación vio una evidencia observada y no procedió.
          expect(final.status).toBe('EN_REVISION');
          expect([approve.status, observe.status]).toEqual([409, 200]);
        }
      }
    }));

    it('dos inicios simultáneos del mismo docente: uno crea el trámite y el otro recibe 409', guard(async () => {
      const tutorId = await makeTutor('carrera-inicio');
      const results = await Promise.all([start('director', tutorId), start('registrar', tutorId), start('director', tutorId)]);
      expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409]);
      certificateIds.push(...(await prisma.certificate.findMany({ where: { tutorId }, select: { id: true } })).map((r) => r.id));
      expect(await prisma.certificate.count({ where: { tutorId } })).toBe(1);
    }));
  });
});
