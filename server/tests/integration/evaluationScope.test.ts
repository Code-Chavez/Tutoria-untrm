import http from 'http';
import app from '../../src/app';
import { prisma } from '../../src/infrastructure/database/prisma';
import { currentPeriodId } from '../helpers/currentPeriod';

/**
 * Alcance del coordinador sobre las evaluaciones (A05) sobre HTTP real y base de datos real: una respuesta de un
 * tutorado de Ingeniería de Sistemas la ve la coordinadora de Sistemas y la DBU, pero no el coordinador de Mecánica
 * Eléctrica, aunque pida esa escuela o no envíe ningún filtro. Crea y borra su propio tutorado y su propia respuesta.
 * Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(120_000);

const ACCOUNTS = {
  admin: { email: '7183255722@untrm.edu.pe', password: 'Admin2026!' },
  sistemas: { email: 'rosa.mendoza@untrm.edu.pe', password: 'Demo2026!' }, // coordina Ingeniería de Sistemas
  mecanica: { email: 'carlos.vega@untrm.edu.pe', password: 'Demo2026!' }, // coordina Ingeniería Mecánica Eléctrica
} as const;
type Who = keyof typeof ACCOUNTS;

const MARKER = `A05-comentario-${Date.now()}`;

describe('alcance del coordinador sobre las evaluaciones (A05)', () => {
  let server: http.Server | undefined;
  let baseUrl = '';
  let dbUp = false;
  const tokens = {} as Record<Who, string>;
  let tutorId = '';
  let mecanicaSchoolId = '';
  let studentId = '';
  let evaluationId = '';

  const get = (path: string, who: Who) => fetch(`${baseUrl}${path}`, { headers: { Authorization: `Bearer ${tokens[who]}` } });

  const login = async (who: Who) => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ACCOUNTS[who]),
    });
    if (res.status !== 200) throw new Error(`Login de ${who} falló: ${res.status}`);
    return ((await res.json()) as { data: { accessToken: string } }).data.accessToken;
  };

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la prueba de alcance de evaluaciones.');
      return;
    }
    const listening = app.listen(0);
    await new Promise<void>((resolve) => listening.once('listening', () => resolve()));
    server = listening;
    const address = listening.address();
    if (!address || typeof address === 'string') throw new Error('No address');
    baseUrl = `http://localhost:${address.port}`;
    for (const who of Object.keys(ACCOUNTS) as Who[]) tokens[who] = await login(who);

    const sistemas = await prisma.school.findFirstOrThrow({ where: { name: 'Ingeniería de Sistemas' } });
    mecanicaSchoolId = (await prisma.school.findFirstOrThrow({ where: { name: 'Ingeniería Mecánica Eléctrica' } })).id;
    tutorId = (await prisma.user.findFirstOrThrow({ where: { email: 'elena.ramirez@untrm.edu.pe' } })).id;
    const periodId = await currentPeriodId(prisma);

    const student = await prisma.student.create({
      data: { studentCode: `9905${String(Date.now()).slice(-6)}`, firstName: 'Prueba', lastName: 'Alcance', cycle: 3, schoolId: sistemas.id, tutorId },
    });
    studentId = student.id;
    const evaluation = await prisma.tutorEvaluation.create({
      data: { studentId, tutorId, periodId, scores: Array(20).fill('S'), likes: MARKER },
    });
    evaluationId = evaluation.id;
  });

  afterAll(async () => {
    const running = server;
    if (running) await new Promise((resolve) => running.close(resolve));
    if (dbUp) {
      if (evaluationId) await prisma.tutorEvaluation.deleteMany({ where: { id: evaluationId } });
      if (studentId) await prisma.student.deleteMany({ where: { id: studentId } });
    }
    await prisma.$disconnect();
  });

  const suggestionsWith = async (who: Who, query = '') => {
    const res = await get(`/api/evaluations/suggestions${query}`, who);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { suggestions: { likes: string | null }[] };
    return body.suggestions.some((s) => s.likes === MARKER);
  };

  const elenaResponses = async (who: Who, query = '') => {
    const res = await get(`/api/evaluations/statistics${query}`, who);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { tutors: { tutorId: string; totalResponses: number }[] };
    return body.tutors.find((t) => t.tutorId === tutorId)?.totalResponses ?? 0;
  };

  it('la DBU y la coordinadora de Sistemas ven la respuesta de un tutorado de Sistemas', async () => {
    if (!dbUp) return;
    expect(await suggestionsWith('admin')).toBe(true);
    expect(await suggestionsWith('sistemas')).toBe(true);
    expect(await elenaResponses('admin')).toBeGreaterThanOrEqual(1);
    expect(await elenaResponses('sistemas')).toBeGreaterThanOrEqual(1);
  });

  it('el coordinador de Mecánica Eléctrica no la ve, con o sin filtros (estadísticas y sugerencias)', async () => {
    if (!dbUp) return;
    expect(await suggestionsWith('mecanica')).toBe(false);
    expect(await elenaResponses('mecanica')).toBe(0);
    // Pedir explícitamente su propia escuela o la de Sistemas no cambia el alcance.
    expect(await suggestionsWith('mecanica', `?schoolId=${mecanicaSchoolId}`)).toBe(false);
    expect(await elenaResponses('mecanica', `?tutorId=${tutorId}`)).toBe(0);
  });

  it('en los resultados de un tutor, el coordinador de otra escuela recibe cero respuestas de ese tutor', async () => {
    if (!dbUp) return;
    const own = await get(`/api/evaluations/results/${tutorId}`, 'sistemas');
    const foreign = await get(`/api/evaluations/results/${tutorId}`, 'mecanica');
    expect(own.status).toBe(200);
    expect(foreign.status).toBe(200);
    expect(((await own.json()) as { totalResponses: number }).totalResponses).toBeGreaterThanOrEqual(1);
    expect(((await foreign.json()) as { totalResponses: number }).totalResponses).toBe(0);
  });
});
