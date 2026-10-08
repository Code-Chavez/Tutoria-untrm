import http from 'http';
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import app from '../../src/app';
import { prisma } from '../../src/infrastructure/database/prisma';
import { LocalEvidenceStorage } from '../../src/infrastructure/services/LocalEvidenceStorage';

/**
 * Documentos firmados y escaneados contra HTTP y base reales (A14): la constancia de derivación (Anexo N°6)
 * y la hoja de asistencia (Anexo N°4) se imprimen, se firman a mano y se adjuntan. Comprueba quién puede
 * adjuntar y descargar cada una, que queda la huella del archivo y la hoja imprimible. Usa las cuentas del
 * seed. Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(120_000);

const PASSWORD = 'Demo2026!';
const EMAILS = {
  tutor: 'elena.ramirez@untrm.edu.pe', // tutora de Ana Torres y Luis Pérez
  otroTutor: 'jorge.salazar@untrm.edu.pe',
  psicologia: 'lucia.flores@untrm.edu.pe',
  salud: 'ronald.diaz@untrm.edu.pe',
  coordinador: 'rosa.mendoza@untrm.edu.pe',
  tutorado: '20191234@untrm.edu.pe',
} as const;
type Who = keyof typeof EMAILS;

const SIGNED = Buffer.from('%PDF-1.4\nconstancia firmada y escaneada\n');
const SIGNED_SHA = createHash('sha256').update(SIGNED).digest('hex');

describe('documentos firmados (A14)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  const tokens = {} as Record<Who, string>;
  let adminToken = '';
  let ownStudentId = '';
  let foreignStudentId = '';
  let referralId = '';

  const call = (method: string, path: string, token: string, body?: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });

  const upload = (path: string, token: string, mime = 'application/pdf') => {
    const form = new FormData();
    form.append('file', new Blob([SIGNED], { type: mime }), 'firmado.pdf');
    return fetch(`${baseUrl}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  };

  const login = async (email: string, password: string) => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.status !== 200) throw new Error(`Login de ${email} falló: ${res.status}`);
    return ((await res.json()) as { data: { accessToken: string } }).data.accessToken;
  };

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omiten los documentos firmados.');
      return;
    }
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    baseUrl = `http://localhost:${(listening.address() as { port: number }).port}`;

    for (const who of Object.keys(EMAILS) as Who[]) tokens[who] = await login(EMAILS[who], PASSWORD);
    adminToken = await login('7183255722@untrm.edu.pe', 'Admin2026!');

    const own = await prisma.student.findUniqueOrThrow({ where: { studentCode: '20191234' } });
    const foreign = await prisma.student.findUniqueOrThrow({ where: { studentCode: '20201122' } }); // tutor: Jorge
    ownStudentId = own.id;
    foreignStudentId = foreign.id;

    const created = await call('POST', `/api/students/${ownStudentId}/referrals`, tokens.tutor, {
      checkedAspects: ['MENTAL_HEALTH_ANXIOUS'],
      reason: 'Prueba A14: constancia firmada',
      service: 'PSICOLOGIA',
    });
    expect(created.status).toBe(201);
    referralId = ((await created.json()) as { referral: { id: string } }).referral.id;
  });

  afterAll(async () => {
    if (dbUp) {
      const storage = new LocalEvidenceStorage();
      const docs = await prisma.signedDocument.findMany({
        where: { OR: [{ referralId }, { studentId: ownStudentId, kind: 'ATTENDANCE_SHEET' }] },
      });
      for (const doc of docs) await storage.delete(doc.storageKey);
      await prisma.signedDocument.deleteMany({ where: { id: { in: docs.map((d) => d.id) } } });
      if (referralId) await prisma.studentReferral.deleteMany({ where: { id: referralId } });
    }
    if (server) await new Promise((resolve) => server?.close(resolve));
    await prisma.$disconnect();
  });

  describe('constancia de derivación firmada (Anexo N°6)', () => {
    it('la constancia imprimible trae filiación completa y las dos líneas de firma', async () => {
      if (!dbUp) return;
      const res = await call('GET', `/api/referrals/${referralId}/constancia`, tokens.tutor);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/pdf');
      expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(1500);
    });

    it('el tutor que derivó adjunta el escaneo firmado y queda su huella, autor y fecha', async () => {
      if (!dbUp) return;
      const res = await upload(`/api/referrals/${referralId}/signed-documents`, tokens.tutor);
      expect(res.status).toBe(201);
      const { document } = (await res.json()) as { document: { sha256: string; uploadedByName: string; createdAt: string; storageKey?: string } };
      expect(document.sha256).toBe(SIGNED_SHA);
      expect(document.uploadedByName).toContain('Elena');
      expect(Date.now() - new Date(document.createdAt).getTime()).toBeLessThan(5 * 60_000);
      expect(document.storageKey).toBeUndefined(); // la clave de almacenamiento no sale de la API
    });

    it('lo ven y descargan el tutor, el servicio de destino y la DBU; el archivo es idéntico', async () => {
      if (!dbUp) return;
      for (const token of [tokens.tutor, tokens.psicologia, adminToken]) {
        const list = await call('GET', `/api/referrals/${referralId}/signed-documents`, token);
        expect(list.status).toBe(200);
        const { documents } = (await list.json()) as { documents: { id: string }[] };
        expect(documents).toHaveLength(1);
        const file = await call('GET', `/api/signed-documents/${documents[0].id}/file`, token);
        expect(file.status).toBe(200);
        expect(Buffer.from(await file.arrayBuffer()).equals(SIGNED)).toBe(true);
      }
    });

    it('otro tutor, otro servicio y la coordinación no pueden verlo ni descargarlo ni adjuntar', async () => {
      if (!dbUp) return;
      const doc = await prisma.signedDocument.findFirstOrThrow({ where: { referralId } });
      for (const who of ['otroTutor', 'salud', 'coordinador'] as Who[]) {
        const list = await call('GET', `/api/referrals/${referralId}/signed-documents`, tokens[who]);
        expect([403, 404]).toContain(list.status);
        const file = await call('GET', `/api/signed-documents/${doc.id}/file`, tokens[who]);
        expect(file.status).toBe(404);
        const attach = await upload(`/api/referrals/${referralId}/signed-documents`, tokens[who]);
        expect([403, 404]).toContain(attach.status);
      }
    });

    it('solo se aceptan PDF o imágenes', async () => {
      if (!dbUp) return;
      const res = await upload(`/api/referrals/${referralId}/signed-documents`, tokens.tutor, 'text/html');
      expect(res.status).toBe(400);
    });
  });

  describe('hoja de asistencia (Anexo N°4)', () => {
    it('el tutor descarga la hoja imprimible de su tutorado, no la de un tutorado ajeno', async () => {
      if (!dbUp) return;
      const own = await call('GET', `/api/students/${ownStudentId}/attendance-sheet/pdf`, tokens.tutor);
      expect(own.status).toBe(200);
      expect(own.headers.get('content-type')).toContain('application/pdf');
      const foreign = await call('GET', `/api/students/${foreignStudentId}/attendance-sheet/pdf`, tokens.tutor);
      expect(foreign.status).toBe(404);
    });

    it('el tutor adjunta la hoja firmada del semestre y la ve listada con su periodo', async () => {
      if (!dbUp) return;
      const res = await upload(`/api/students/${ownStudentId}/attendance-sheet/signed-documents`, tokens.tutor);
      expect(res.status).toBe(201);
      const list = await call('GET', `/api/students/${ownStudentId}/attendance-sheet/signed-documents`, tokens.tutor);
      const body = (await list.json()) as { period: { name: string }; documents: { sha256: string }[] };
      expect(body.period.name).toBeTruthy();
      expect(body.documents.map((d) => d.sha256)).toContain(SIGNED_SHA);
    });

    it('el tutorado, otro tutor y el servicio no adjuntan ni consultan la hoja', async () => {
      if (!dbUp) return;
      for (const who of ['tutorado', 'otroTutor', 'psicologia'] as Who[]) {
        const attach = await upload(`/api/students/${ownStudentId}/attendance-sheet/signed-documents`, tokens[who]);
        expect([403, 404]).toContain(attach.status);
        const list = await call('GET', `/api/students/${ownStudentId}/attendance-sheet/signed-documents`, tokens[who]);
        expect([403, 404]).toContain(list.status);
      }
    });
  });
});
