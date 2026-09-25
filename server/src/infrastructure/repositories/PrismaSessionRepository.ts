import { PrismaClient, Prisma } from '@prisma/client';
import { Session, SessionWithParticipants } from '@domain/entities/Session';
import { SessionRepository, SessionFilters } from '@domain/repositories/SessionRepository';

type SessionRow = Prisma.SessionGetPayload<{ include: { participants: true } }>;

function toSessionWithParticipants(row: SessionRow): SessionWithParticipants {
  return {
    id: row.id,
    tutorId: row.tutorId,
    topic: row.topic,
    scheduledAt: row.scheduledAt,
    durationMinutes: row.durationMinutes,
    endsAt: row.endsAt,
    createdAt: row.createdAt,
    studentIds: row.participants.map((p) => p.studentId),
  };
}

export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    data: Omit<Session, 'id' | 'createdAt'>,
    studentIds: string[],
  ): Promise<SessionWithParticipants> {
    const row = await this.prisma.session.create({
      data: {
        ...data,
        participants: {
          create: studentIds.map((studentId) => ({ studentId })),
        },
      },
      include: { participants: true },
    });
    return toSessionWithParticipants(row);
  }

  findOverlapping(tutorId: string, start: Date, end: Date): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: {
        tutorId,
        scheduledAt: { lt: end },
        endsAt: { gt: start },
      },
    });
  }

  async findAll(filters?: SessionFilters): Promise<SessionWithParticipants[]> {
    const where: Prisma.SessionWhereInput = {
      ...(filters?.tutorId && { tutorId: filters.tutorId }),
      ...(filters?.studentId && { participants: { some: { studentId: filters.studentId } } }),
    };
    const rows = await this.prisma.session.findMany({
      where,
      include: { participants: true },
      orderBy: { scheduledAt: 'desc' },
    });
    return rows.map(toSessionWithParticipants);
  }

  findByStudent(studentId: string): Promise<SessionWithParticipants[]> {
    return this.findAll({ studentId });
  }
}
