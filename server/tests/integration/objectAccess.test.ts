import http from 'http';
import app from '../../src/app';
import { prisma } from '../../src/infrastructure/database/prisma';

/**
 * Acceso por objeto sobre HTTP y base reales: la matriz de accesos (accessMatrix) prueba el permiso de la ruta; esta prueba
 * comprueba que, con el permiso, cada rol solo llega a SUS objetos. Parte de Ana (tutora Elena, escuela de Sistemas) con una
 * solicitud, una sesión y una derivación reales, y recorre cada rol por la cadena solicitud → sesión → derivación y por lo
 * que cuelga de un estudiante (expediente, entrevistas, seguimientos, red de apoyo, riesgo, reasignación, vínculo de portal).
 *
 * «Permitido» = la petición supera la autorización (200/201, o un 400/409 del propio caso de uso); «denegado» = 403 o 404 (fuera
 * de alcance no se confirma que exista); en las listas, «permitido» = el objeto aparece. Las modificaciones se prueban con
 * cuerpos válidos y sin efecto sobre los datos reales; quien puede va al final para que quien no puede no encuentre el objeto
 * ya cambiado. Cuentas del seed; todo lo que crea lo borra. Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(600_000);

const PASS = 'Demo2026!';
const ACC = {
  admin: ['7183255722@untrm.edu.pe', 'Admin2026!'],
  coordSis: ['rosa.mendoza@untrm.edu.pe', PASS], // coordina la escuela de Ana
  coordMec: ['carlos.vega@untrm.edu.pe', PASS], // coordina otra escuela
  tutor: ['elena.ramirez@untrm.edu.pe', PASS], // tutora de Ana
  tutorMismaEscuela: ['jorge.salazar@untrm.edu.pe', PASS], // misma escuela, no es su tutor
  tutorOtraEscuela: ['patricia.nunez@untrm.edu.pe', PASS],
  psico: ['lucia.flores@untrm.edu.pe', PASS], // servicio al que se deriva
  salud: ['ronald.diaz@untrm.edu.pe', PASS], // otro servicio
  vice: ['vicerrectorado.academico@untrm.edu.pe', PASS],
  ana: ['20191234@untrm.edu.pe', PASS],
  otroEstudiante: ['20195678@untrm.edu.pe', PASS],
} as const;
type Who = keyof typeof ACC;
const WHO = Object.keys(ACC) as Who[];
const MARK = `Acceso por objeto ${Date.now()}`;

type Outcome = { status: number; included?: boolean };
const classify = ({ status, included }: Outcome): 'permitido' | 'denegado' => {
  if (status === 403 || status === 404) return 'denegado';
  if (status === 200 && included === false) return 'denegado';
  return status < 400 || status === 400 || status === 409 ? 'permitido' : 'denegado';
};

describe('acceso por objeto: cada rol solo llega a lo suyo', () => {
  let server: http.Server | undefined;
  let base = '';
  let dbUp = false;
  const tok = {} as Record<Who, string>;
  let anaId = '';
  let elenaId = '';
  let ana: { cycle: number; isAtRisk: boolean; userId: string | null };
  let sid = '';
  let qid = '';
  let rid = '';
  let nid = '';

  const call = async (who: Who, method: string, path: string, body?: unknown): Promise<{ status: number; json: Record<string, unknown> | null }> => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${tok[who]}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json: Record<string, unknown> | null = null;
    try {
      json = (await res.clone().json()) as Record<string, unknown>;
    } catch {
      /* binario (PDF) */
    }
    return { status: res.status, json };
  };

  /** Ejecuta la sonda con cada rol (los que sí pueden, al final) y verifica quién queda dentro y quién fuera. */
  const verify = async (probe: (who: Who) => Promise<Outcome>, allowed: Who[]) => {
    const order = [...WHO.filter((w) => !allowed.includes(w)), ...allowed];
    const got: Partial<Record<Who, string>> = {};
    for (const who of order) {
      const outcome = await probe(who);
      got[who] = `${classify(outcome)} (${outcome.status}${outcome.included === undefined ? '' : outcome.included ? ', aparece' : ', no aparece'})`;
    }
    const wrong = WHO.filter((w) => !got[w]!.startsWith(allowed.includes(w) ? 'permitido' : 'denegado'));
    expect(wrong.map((w) => `${w}: ${got[w]}`)).toEqual([]);
  };
  const listed = (key: string, id: string) => async (who: Who, path: string): Promise<Outcome> => {
    const x = await call(who, 'GET', path);
    const body = x.json as unknown;
    const rows = (Array.isArray(body) ? body : (x.json?.[key] ?? [])) as { id: string }[]; // algunas bandejas devuelven un arreglo
    return { status: x.status, included: x.status === 200 ? rows.some((r) => r.id === id) : undefined };
  };

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite el acceso por objeto.');
      return;
    }
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    base = `http://localhost:${(listening.address() as { port: number }).port}`;
    for (const who of WHO) {
      const res = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ACC[who][0], password: ACC[who][1] }) });
      tok[who] = ((await res.json()) as { data: { accessToken: string } }).data.accessToken;
    }
    const student = await prisma.student.findUniqueOrThrow({ where: { studentCode: '20191234' } });
    anaId = student.id;
    ana = { cycle: student.cycle, isAtRisk: student.isAtRisk, userId: student.userId };
    elenaId = (await prisma.user.findUniqueOrThrow({ where: { email: ACC.tutor[0] } })).id;

    const q = await call('ana', 'POST', '/api/tutoring-requests/me', { caseType: 'ACADEMIC', reason: MARK });
    qid = (q.json as { request: { id: string } }).request.id;
    const when = new Date(Date.UTC(2033, 2, 1, 15, 0) + (Date.now() % 100_000) * 60_000).toISOString();
    const s = await call('tutor', 'POST', '/api/sessions', { studentIds: [anaId], topic: MARK, scheduledAt: when, modality: 'PRESENCIAL', location: 'Aula' });
    sid = (s.json as { session: { id: string } }).session.id;
    const f = await call('tutor', 'POST', `/api/students/${anaId}/referrals`, { checkedAspects: ['ACADEMIC_AT_RISK_OF_FAILING'], reason: MARK, service: 'PSICOLOGIA' });
    rid = (f.json as { referral: { id: string } }).referral.id;
    nid = (await prisma.notification.findFirstOrThrow({ where: { tutoringRequestId: qid, userId: elenaId } })).id;
  });

  afterAll(async () => {
    if (dbUp) {
      const requests = (await prisma.tutoringRequest.findMany({ where: { reason: MARK }, select: { id: true } })).map((r) => r.id);
      const referrals = (await prisma.studentReferral.findMany({ where: { reason: MARK }, select: { id: true } })).map((r) => r.id);
      const sessions = (await prisma.session.findMany({ where: { topic: MARK }, select: { id: true } })).map((r) => r.id);
      await prisma.notification.deleteMany({ where: { OR: [{ tutoringRequestId: { in: requests } }, { referralId: { in: referrals } }] } });
      await prisma.tutoringRequest.deleteMany({ where: { id: { in: requests } } });
      await prisma.sessionChangeHistory.deleteMany({ where: { sessionId: { in: sessions } } });
      await prisma.sessionParticipant.deleteMany({ where: { sessionId: { in: sessions } } });
      await prisma.session.deleteMany({ where: { id: { in: sessions } } });
      await prisma.referralStatusHistory.deleteMany({ where: { referralId: { in: referrals } } });
      await prisma.studentReferral.deleteMany({ where: { id: { in: referrals } } });
      await prisma.tutorInterview.deleteMany({ where: { studentId: anaId, aspectsDiscussed: MARK } });
      await prisma.tutorFollowUp.deleteMany({ where: { studentId: anaId, reason: MARK } });
      await prisma.supportContact.deleteMany({ where: { studentId: anaId, fullName: 'Prueba de acceso' } });
    }
    if (server) await new Promise((resolve) => server?.close(resolve));
    await prisma.$disconnect();
  });

  describe('lectura', () => {
    it('la agenda: la sesión aparece solo a la DBU, la coordinación de su escuela, su tutora y la estudiante', async () => {
      if (!dbUp) return;
      await verify(async (w) => listed('sessions', sid)(w, '/api/sessions'), ['admin', 'coordSis', 'tutor', 'ana']);
    });

    it('las evidencias de la sesión: DBU, coordinación de su escuela y su tutora', async () => {
      if (!dbUp) return;
      await verify(async (w) => ({ status: (await call(w, 'GET', `/api/sessions/${sid}/evidence`)).status }), ['admin', 'coordSis', 'tutor']);
    });

    it('la bandeja de solicitudes: la solicitud aparece a la DBU, la coordinación de la escuela y la tutora (ni por filtro de estudiante)', async () => {
      if (!dbUp) return;
      await verify(async (w) => listed('requests', qid)(w, '/api/tutoring-requests'), ['admin', 'coordSis', 'tutor']);
      await verify(async (w) => listed('requests', qid)(w, `/api/tutoring-requests?studentId=${anaId}`), ['admin', 'coordSis', 'tutor']);
    });

    it('la derivación (lista, detalle, constancia y documentos firmados): DBU, la tutora que la emitió y el servicio destino', async () => {
      if (!dbUp) return;
      await verify(async (w) => listed('referrals', rid)(w, '/api/referrals'), ['admin', 'tutor', 'psico']);
      for (const path of [`/api/referrals/${rid}`, `/api/referrals/${rid}/constancia`, `/api/referrals/${rid}/signed-documents`]) {
        await verify(async (w) => ({ status: (await call(w, 'GET', path)).status }), ['admin', 'tutor', 'psico']);
      }
    });

    it('lo que cuelga del estudiante (expediente, hoja de asistencia, entrevistas, seguimientos): DBU, coordinación de su escuela y su tutora', async () => {
      if (!dbUp) return;
      for (const path of [`/api/students/${anaId}/record`, `/api/students/${anaId}/attendance-sheet/pdf`, `/api/students/${anaId}/interviews`, `/api/students/${anaId}/follow-ups`]) {
        await verify(async (w) => ({ status: (await call(w, 'GET', path)).status }), ['admin', 'coordSis', 'tutor']);
      }
      // La red de apoyo es más reservada: la coordinación no la ve
      await verify(async (w) => ({ status: (await call(w, 'GET', `/api/students/${anaId}/support-contact`)).status }), ['admin', 'tutor']);
      await verify(async (w) => listed('students', anaId)(w, '/api/students'), ['admin', 'coordSis', 'tutor']);
    });
  });

  describe('creación', () => {
    it('registrar una solicitud de tutoría para Ana: DBU, la coordinación de su escuela y su tutora', async () => {
      if (!dbUp) return;
      await verify(async (w) => ({ status: (await call(w, 'POST', `/api/students/${anaId}/tutoring-requests`, { source: 'STUDENT', caseType: 'ACADEMIC', reason: MARK })).status }), ['admin', 'coordSis', 'tutor']);
    });

    it('derivar a Ana: solo la DBU y su tutora (ni el servicio de destino ni la coordinación)', async () => {
      if (!dbUp) return;
      await verify(async (w) => ({ status: (await call(w, 'POST', `/api/students/${anaId}/referrals`, { checkedAspects: ['ACADEMIC_AT_RISK_OF_FAILING'], reason: MARK, service: 'PSICOLOGIA' })).status }), ['admin', 'tutor']);
    });

    it('programar una sesión desde la solicitud de otra persona: solo quien puede programar y gestiona esa solicitud', async () => {
      if (!dbUp) return;
      let n = 0;
      await verify(
        async (w) => ({ status: (await call(w, 'POST', '/api/sessions', { studentIds: [anaId], topic: MARK, scheduledAt: new Date(Date.UTC(2034, 1, 1, 10, n++ * 3)).toISOString(), modality: 'PRESENCIAL', location: 'Aula', tutoringRequestId: qid })).status }),
        ['admin', 'tutor'],
      );
    });
  });

  describe('modificación', () => {
    it('cambiar el estado de la derivación: solo la DBU y el servicio destino (la tutora que la emitió la consulta, no la gestiona)', async () => {
      if (!dbUp) return;
      await verify(async (w) => ({ status: (await call(w, 'PATCH', `/api/referrals/${rid}/status`, { status: w === 'admin' ? 'RECIBIDO' : 'EN_ATENCION' })).status }), ['admin', 'psico']);
    });

    it('reprogramar, cancelar y registrar asistencia de una sesión: solo su tutora (ni la DBU ni la coordinación)', async () => {
      if (!dbUp) return;
      let n = 0;
      await verify(async (w) => ({ status: (await call(w, 'PATCH', `/api/sessions/${sid}/reschedule`, { scheduledAt: new Date(Date.UTC(2035, 5, 1, 9, n++ * 2)).toISOString(), reason: 'Prueba de acceso' })).status }), ['tutor']);
      await verify(async (w) => ({ status: (await call(w, 'PUT', `/api/sessions/${sid}/attendance-roll`, { attendedStudentIds: [] })).status }), ['tutor']);
      await verify(async (w) => ({ status: (await call(w, 'POST', `/api/sessions/${sid}/attendance`)).status }), ['tutor']);
      await verify(async (w) => ({ status: (await call(w, 'PATCH', `/api/sessions/${sid}/cancel`, { reason: 'Prueba de acceso' })).status }), ['tutor']);
    });

    it('cambiar el estado de la solicitud: la DBU, la coordinación de su escuela y su tutora', async () => {
      if (!dbUp) return;
      await verify(async (w) => ({ status: (await call(w, 'PATCH', `/api/tutoring-requests/${qid}/status`, { status: 'EN_ATENCION' })).status }), ['admin', 'coordSis', 'tutor']);
    });

    it('marcar un aviso como leído: solo su dueño (no se confirma que el aviso exista)', async () => {
      if (!dbUp) return;
      await verify(async (w) => ({ status: (await call(w, 'PATCH', `/api/notifications/${nid}/read`)).status }), ['tutor']);
    });

    it('entrevista, seguimiento y red de apoyo de Ana: la DBU y su tutora', async () => {
      if (!dbUp) return;
      await verify(
        async (w) => ({ status: (await call(w, 'POST', `/api/students/${anaId}/interviews`, { motiveAcademic: true, motivePersonalEmotional: false, motiveVocational: false, aspectsDiscussed: MARK, agreements: MARK })).status }),
        ['admin', 'tutor'],
      );
      await verify(async (w) => ({ status: (await call(w, 'POST', `/api/students/${anaId}/follow-ups`, { reason: MARK, agreements: MARK, withInstructor: false })).status }), ['admin', 'tutor']);
      await verify(async (w) => ({ status: (await call(w, 'PUT', `/api/students/${anaId}/support-contact`, { fullName: 'Prueba de acceso', relationship: 'Madre', phone: '987654321' })).status }), ['admin', 'tutor']);
    });

    it('editar, marcar riesgo, reasignar y vincular el portal de Ana: la DBU y la coordinación de su escuela (la tutora no)', async () => {
      if (!dbUp) return;
      const owners: Who[] = ['admin', 'coordSis'];
      await verify(async (w) => ({ status: (await call(w, 'PATCH', `/api/students/${anaId}`, { cycle: ana.cycle })).status }), owners);
      await verify(async (w) => ({ status: (await call(w, 'PATCH', `/api/students/${anaId}/risk`, { isAtRisk: ana.isAtRisk, ...(ana.isAtRisk ? { reason: 'Prueba de acceso' } : {}) })).status }), owners);
      await verify(async (w) => ({ status: (await call(w, 'PATCH', `/api/students/${anaId}/reassign`, { newTutorId: elenaId, reason: 'Prueba de acceso' })).status }), owners); // mismo tutor: 400 del caso de uso
      await verify(async (w) => ({ status: (await call(w, 'POST', '/api/students/assign', { studentIds: [anaId], tutorId: elenaId })).status }), owners); // ya asignado: 409
      await verify(async (w) => ({ status: (await call(w, 'PATCH', `/api/students/${anaId}/portal-account`, { userId: ana.userId })).status }), owners);
    });
  });
});
