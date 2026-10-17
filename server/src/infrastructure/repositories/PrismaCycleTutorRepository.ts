import { Prisma, PrismaClient } from '@prisma/client';
import { AvailabilitySlot, AcceptanceStatus, CycleStudent, CycleTutorAssignment, CycleTutorRepository, NewCycleTutorAssignment } from '@domain/repositories/CycleTutorRepository';

export class PrismaCycleTutorRepository implements CycleTutorRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listBySchool(periodId: string, schoolId: string): Promise<CycleTutorAssignment[]> {
    return (await this.prisma.cycleTutorAssignment.findMany({ where: { periodId, schoolId }, orderBy: { cycle: 'asc' } })).map(toAssignment);
  }

  async find(periodId: string, schoolId: string, cycle: number): Promise<CycleTutorAssignment | null> {
    const row = await this.prisma.cycleTutorAssignment.findUnique({ where: { periodId_schoolId_cycle: { periodId, schoolId, cycle } } });
    return row && toAssignment(row);
  }

  async listByTutor(periodId: string, tutorId: string): Promise<CycleTutorAssignment[]> {
    return (await this.prisma.cycleTutorAssignment.findMany({ where: { periodId, tutorId } })).map(toAssignment);
  }

  async upsert(input: NewCycleTutorAssignment): Promise<CycleTutorAssignment> {
    const { periodId, schoolId, cycle, ...data } = input;
    const where = { periodId_schoolId_cycle: { periodId, schoolId, cycle } };
    const existing = await this.prisma.cycleTutorAssignment.findUnique({ where });
    // Mismo docente: se conserva su aceptación. Otro docente: la aceptación empieza de nuevo y el enlace anterior deja de servir.
    const restart =
      existing && existing.tutorId !== input.tutorId
        ? { acceptanceStatus: 'SIN_SOLICITAR', acceptanceTokenHash: null, acceptanceExpiresAt: null, requestedAt: null, respondedAt: null, declineReason: null, availability: Prisma.DbNull }
        : {};
    return toAssignment(await this.prisma.cycleTutorAssignment.upsert({ where, update: { ...data, ...restart }, create: input }));
  }

  async requestAcceptance(id: string, tokenHash: string, expiresAt: Date, requestedAt: Date): Promise<void> {
    await this.prisma.cycleTutorAssignment.update({
      where: { id },
      data: { acceptanceStatus: 'PENDIENTE', acceptanceTokenHash: tokenHash, acceptanceExpiresAt: expiresAt, requestedAt, respondedAt: null, declineReason: null },
    });
  }

  async findByAcceptanceToken(tokenHash: string): Promise<CycleTutorAssignment | null> {
    const row = await this.prisma.cycleTutorAssignment.findUnique({ where: { acceptanceTokenHash: tokenHash } });
    return row && toAssignment(row);
  }

  async recordResponse(id: string, response: { accepted: boolean; availability?: AvailabilitySlot[]; declineReason?: string }, respondedAt: Date): Promise<void> {
    await this.prisma.cycleTutorAssignment.update({
      where: { id },
      data: {
        acceptanceStatus: response.accepted ? 'ACEPTADA' : 'RECHAZADA',
        respondedAt,
        acceptanceTokenHash: null,
        acceptanceExpiresAt: null,
        declineReason: response.accepted ? null : (response.declineReason ?? null),
        availability: response.accepted && response.availability ? (response.availability as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });
  }

  async remove(periodId: string, schoolId: string, cycle: number): Promise<boolean> {
    const { count } = await this.prisma.cycleTutorAssignment.deleteMany({ where: { periodId, schoolId, cycle } });
    return count > 0;
  }

  async studentsOfCycle(periodId: string, schoolId: string, cycle: number): Promise<CycleStudent[]> {
    const rows = await this.prisma.periodEnrollment.findMany({
      where: { periodId, schoolId, cycle, student: { isActive: true } },
      select: { studentId: true, student: { select: { tutorId: true } } },
    });
    return rows.map((r) => ({ studentId: r.studentId, tutorId: r.student.tutorId }));
  }

  async enrolledByCycle(periodId: string, schoolId: string): Promise<Map<number, { total: number; withoutTutor: number }>> {
    const rows = await this.prisma.periodEnrollment.findMany({
      where: { periodId, schoolId, student: { isActive: true } },
      select: { cycle: true, student: { select: { tutorId: true } } },
    });
    const byCycle = new Map<number, { total: number; withoutTutor: number }>();
    for (const row of rows) {
      const entry = byCycle.get(row.cycle) ?? { total: 0, withoutTutor: 0 };
      entry.total += 1;
      if (!row.student.tutorId) entry.withoutTutor += 1;
      byCycle.set(row.cycle, entry);
    }
    return byCycle;
  }
}

function toAssignment(row: Prisma.CycleTutorAssignmentGetPayload<object>): CycleTutorAssignment {
  const { acceptanceTokenHash: _hash, acceptanceStatus, availability, ...rest } = row;
  return { ...rest, acceptanceStatus: acceptanceStatus as AcceptanceStatus, availability: availability as unknown as AvailabilitySlot[] | null };
}
