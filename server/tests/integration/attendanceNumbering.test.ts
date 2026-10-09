import { prisma } from '../../src/infrastructure/database/prisma';
import { PrismaSessionRepository } from '../../src/infrastructure/repositories/PrismaSessionRepository';
import { PrismaSystemParameterRepository } from '../../src/infrastructure/repositories/PrismaSystemParameterRepository';
import { PrismaAcademicPeriodRepository } from '../../src/infrastructure/repositories/PrismaAcademicPeriodRepository';
import { RegisterAttendanceUseCase } from '../../src/application/use-cases/sessions/RegisterAttendanceUseCase';
import { AttendanceLimitReachedError } from '../../src/application/use-cases/sessions/SessionErrors';

/**
 * Numeración del Anexo N°4 contra la base real (A08): el tope y el número corren por
 * semestre y dos confirmaciones simultáneas no repiten número. Usa dos periodos de prueba
 * en 2001 y los limpia al terminar. Se omite sin base de datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(120_000);

const day = (iso: string) => new Date(`${iso}T15:00:00.000Z`);

describe('numeración de asistencias por semestre (A08)', () => {
  let dbUp = false;
  let tutorId = '';
  let studentId = '';
  const periodIds: string[] = [];
  const sessionIds: string[] = [];
  let useCase: RegisterAttendanceUseCase;

  const makeSession = async (scheduledAt: Date) => {
    const session = await prisma.session.create({
      data: {
        tutorId,
        topic: 'Prueba A08',
        scheduledAt,
        durationMinutes: 45,
        endsAt: new Date(scheduledAt.getTime() + 45 * 60_000),
        participants: { create: [{ studentId }] },
      },
    });
    sessionIds.push(session.id);
    return session.id;
  };

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la numeración de asistencias.');
      return;
    }
    const tutor = await prisma.user.findUniqueOrThrow({ where: { email: 'elena.ramirez@untrm.edu.pe' } });
    const student = await prisma.student.findUniqueOrThrow({ where: { studentCode: '20191234' } });
    tutorId = tutor.id;
    studentId = student.id;

    for (const [name, start, end] of [
      ['A08-2001-I', '2001-01-01', '2001-06-30'],
      ['A08-2001-II', '2001-07-01', '2001-12-31'],
    ]) {
      const period = await prisma.academicPeriod.create({
        data: { name, startDate: new Date(`${start}T00:00:00.000Z`), endDate: new Date(`${end}T00:00:00.000Z`), isActive: false },
      });
      periodIds.push(period.id);
    }

    useCase = new RegisterAttendanceUseCase(
      new PrismaSessionRepository(prisma),
      new PrismaSystemParameterRepository(prisma),
      new PrismaAcademicPeriodRepository(prisma),
    );
  });

  afterAll(async () => {
    if (dbUp) {
      await prisma.session.deleteMany({ where: { id: { in: sessionIds } } });
      await prisma.academicPeriod.deleteMany({ where: { id: { in: periodIds } } });
    }
    await prisma.$disconnect();
  });

  it('ocho asistencias del semestre A no impiden la primera del semestre B, y la novena del A sí se bloquea', async () => {
    if (!dbUp) return;
    const inA: string[] = [];
    for (let i = 0; i < 8; i++) inA.push(await makeSession(day(`2001-03-${String(i + 1).padStart(2, '0')}`)));
    for (const id of inA) await useCase.execute(id, tutorId);

    const ninthInA = await makeSession(day('2001-04-01'));
    await expect(useCase.execute(ninthInA, tutorId)).rejects.toBeInstanceOf(AttendanceLimitReachedError);

    const firstInB = await makeSession(day('2001-08-01'));
    const registered = await useCase.execute(firstInB, tutorId);
    expect(registered.attendance?.sequenceNumber).toBe(1);

    const numbersInA = (
      await prisma.sessionAttendance.findMany({ where: { sessionId: { in: inA } }, orderBy: { sequenceNumber: 'asc' } })
    ).map((a) => a.sequenceNumber);
    expect(numbersInA).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('confirmaciones simultáneas no repiten número de sesión', async () => {
    if (!dbUp) return;
    // Semestre B ya tiene la 1 del test anterior; se confirman 6 más a la vez (tope 8).
    const ids: string[] = [];
    for (let i = 0; i < 6; i++) ids.push(await makeSession(day(`2001-09-${String(i + 1).padStart(2, '0')}`)));

    const results = await Promise.allSettled(ids.map((id) => useCase.execute(id, tutorId)));

    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    const numbers = (
      await prisma.sessionAttendance.findMany({
        where: { tutorId, studentId, periodId: periodIds[1] },
        orderBy: { sequenceNumber: 'asc' },
      })
    ).map((a) => a.sequenceNumber);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});
