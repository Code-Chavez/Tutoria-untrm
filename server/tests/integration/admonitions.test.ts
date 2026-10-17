import http from 'http';
import app from '../../src/app';
import { prisma } from '../../src/infrastructure/database/prisma';
import { LocalEvidenceStorage } from '../../src/infrastructure/services/LocalEvidenceStorage';

/**
 * Rol Decano y amonestaciones (fase 5) sobre HTTP real y base de datos real: el Decano amonesta solo a los docentes de su
 * facultad, con o sin documento; la coordinación solo consulta las de sus escuelas; nadie más las ve. Usa registros propios y
 * los borra (también el archivo). Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(180_000);

const ACCOUNTS = {
  admin: { email: '7183255722@untrm.edu.pe', password: 'Admin2026!' },
  decano: { email: 'decano.fisme@untrm.edu.pe', password: 'Demo2026!' },
  sistemas: { email: 'rosa.mendoza@untrm.edu.pe', password: 'Demo2026!' }, // coordina Sistemas
  mecanica: { email: 'carlos.vega@untrm.edu.pe', password: 'Demo2026!' }, // coordina Mecánica
  tutor: { email: 'elena.ramirez@untrm.edu.pe', password: 'Demo2026!' },
} as const;
type Who = keyof typeof ACCOUNTS;

const PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');
const today = new Date().toISOString().slice(0, 10);

describe('rol Decano y amonestaciones (fase 5)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  const tokens = {} as Record<Who, string>;
  let elenaId = '';
  let miguelId = '';
  const created: string[] = [];

  const call = (method: string, path: string, who?: Who, body?: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { ...(who ? { Authorization: `Bearer ${tokens[who]}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  const issue = (who: Who, fields: Record<string, string>, file?: Buffer) => {
    const form = new FormData();
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));
    if (file) form.append('file', new Blob([file], { type: 'application/pdf' }), 'resolucion.pdf');
    return fetch(`${baseUrl}/api/admonitions`, { method: 'POST', headers: { Authorization: `Bearer ${tokens[who]}` }, body: form });
  };

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba de amonestaciones.');
      return;
    }
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    const address = listening.address();
    if (!address || typeof address === 'string') throw new Error('No address');
    baseUrl = `http://localhost:${address.port}`;
    for (const who of Object.keys(ACCOUNTS) as Who[]) {
      const res = await call('POST', '/api/auth/login', undefined, ACCOUNTS[who]);
      tokens[who] = ((await res.json()) as { data: { accessToken: string } }).data.accessToken;
    }
    elenaId = (await prisma.user.findUniqueOrThrow({ where: { email: 'elena.ramirez@untrm.edu.pe' } })).id;
    miguelId = (await prisma.user.findUniqueOrThrow({ where: { email: 'miguel.torres@untrm.edu.pe' } })).id; // Administración de Empresas (otra facultad)
  });

  afterAll(async () => {
    const running = server;
    if (running) await new Promise((resolve) => running.close(resolve));
    if (dbUp) {
      const rows = await prisma.admonition.findMany({ where: { id: { in: created } } });
      const storage = new LocalEvidenceStorage();
      for (const row of rows) if (row.storageKey) await storage.delete(row.storageKey);
      await prisma.admonition.deleteMany({ where: { id: { in: created } } });
    }
    await prisma.$disconnect();
  });

  it('el Decano solo ve como amonestables a los docentes de su facultad', async () => {
    if (!dbUp) return;
    const res = await call('GET', '/api/admonitions/tutors', 'decano');
    expect(res.status).toBe(200);
    const tutors = ((await res.json()) as { tutors: { tutorId: string }[] }).tutors.map((t) => t.tutorId);

    expect(tutors).toContain(elenaId);
    expect(tutors).not.toContain(miguelId);
  });

  it('amonesta con documento: queda registrada con fecha, motivo y huella del archivo', async () => {
    if (!dbUp) return;
    const res = await issue('decano', { tutorId: elenaId, issuedOn: today, reason: 'No registró ninguna sesión de tutoría en el periodo' }, PDF);

    expect(res.status).toBe(201);
    const id = ((await res.json()) as { admonition: { id: string } }).admonition.id;
    created.push(id);
    const row = await prisma.admonition.findUniqueOrThrow({ where: { id } });
    expect(row).toMatchObject({ tutorId: elenaId, fileName: 'resolucion.pdf' });
    expect(row.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(await prisma.auditLog.count({ where: { entityId: id, action: 'ADMONITION_ISSUED' } })).toBe(1);
  });

  it('no puede amonestar a un docente de otra facultad, con motivo corto ni con fecha futura', async () => {
    if (!dbUp) return;
    const other = await issue('decano', { tutorId: miguelId, issuedOn: today, reason: 'Motivo suficientemente largo' });
    expect(other.status).toBe(400);
    expect(((await other.json()) as { error: string }).error).toMatch(/propia facultad/);

    expect((await issue('decano', { tutorId: elenaId, issuedOn: today, reason: 'corto' })).status).toBe(400);
    expect((await issue('decano', { tutorId: elenaId, issuedOn: '2999-01-01', reason: 'Motivo suficientemente largo' })).status).toBe(400);
    expect((await issue('decano', { tutorId: elenaId, issuedOn: today, reason: 'Motivo suficientemente largo' }, Buffer.from('no es un pdf'))).status).toBe(400);
  });

  it('la coordinación de la escuela la consulta (no la de otra), el docente y el resto no', async () => {
    if (!dbUp) return;
    const list = async (who: Who) => {
      const res = await call('GET', '/api/admonitions', who);
      return { status: res.status, ids: res.status === 200 ? ((await res.json()) as { admonitions: { id: string }[] }).admonitions.map((a) => a.id) : [] };
    };

    expect((await list('decano')).ids).toContain(created[0]);
    expect((await list('admin')).ids).toContain(created[0]);
    expect((await list('sistemas')).ids).toContain(created[0]);
    expect((await list('mecanica')).ids).not.toContain(created[0]);
    expect((await list('tutor')).status).toBe(403);
  });

  it('la coordinación y el docente no pueden emitir amonestaciones', async () => {
    if (!dbUp) return;
    expect((await issue('sistemas', { tutorId: elenaId, issuedOn: today, reason: 'Motivo suficientemente largo' })).status).toBe(403);
    expect((await issue('tutor', { tutorId: elenaId, issuedOn: today, reason: 'Motivo suficientemente largo' })).status).toBe(403);
    expect((await call('GET', '/api/admonitions/tutors', 'sistemas')).status).toBe(403);
  });

  it('el documento lo descargan quienes ven la amonestación; los demás reciben «no encontrada»', async () => {
    if (!dbUp) return;
    const ok = await call('GET', `/api/admonitions/${created[0]}/file`, 'decano');
    expect(ok.status).toBe(200);
    expect(Buffer.from(await ok.arrayBuffer()).subarray(0, 5).toString()).toBe('%PDF-');

    expect((await call('GET', `/api/admonitions/${created[0]}/file`, 'sistemas')).status).toBe(200);
    expect((await call('GET', `/api/admonitions/${created[0]}/file`, 'mecanica')).status).toBe(404);
    expect((await call('GET', `/api/admonitions/${created[0]}/file`, 'tutor')).status).toBe(403);
  });

  it('un usuario Decano exige su facultad al crearlo', async () => {
    if (!dbUp) return;
    const role = await prisma.role.findUniqueOrThrow({ where: { name: 'Decano' } });
    const email = `decano-prueba-${Date.now()}@untrm.edu.pe`;
    const base = { email, firstName: 'Decano', lastName: 'Prueba', roleId: role.id };

    const without = await call('POST', '/api/users', 'admin', base);
    expect(without.status).toBe(400);
    expect(((await without.json()) as { error: string }).error).toMatch(/facultad/i);

    const faculty = await prisma.faculty.findFirstOrThrow({ where: { isActive: true } });
    const ok = await call('POST', '/api/users', 'admin', { ...base, facultyId: faculty.id });
    expect(ok.status).toBe(201);
    expect((await prisma.user.findUniqueOrThrow({ where: { email } })).facultyId).toBe(faculty.id);
    await prisma.user.updateMany({ where: { email }, data: { isActive: false } });
  });
});
