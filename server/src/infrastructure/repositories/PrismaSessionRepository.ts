import { PrismaClient, Prisma } from '@prisma/client';
import {
  Session,
  SessionAttendance,
  SessionChangeHistory,
  SessionWithParticipants,
} from '@domain/entities/Session';
import { SessionRepository, SessionFilters } from '@domain/repositories/SessionRepository';

type SessionRow = Prisma.SessionGetPayload<{ include: { participants: true; attendance: true } }>;

function toAttendance(row: SessionRow['attendance']): SessionAttendance | null {
  if (!row) return null;
  return {
    id: row.id,
    sessionId: row.sessionId,
    sequenceNumber: row.sequenceNumber,
    confirmedAt: row.confirmedAt,
    createdAt: row.createdAt,
  };
}

function toSessionWithParticipants(row: SessionRow): SessionWithParticipants {
  return {
    id: row.id,
    tutorId: row.tutorId,
    topic: row.topic,
    scheduledAt: row.scheduledAt,
    durationMinutes: row.durationMinutes,
    endsAt: row.endsAt,
    modality: row.modality as Session['modality'],
    location: row.location,
    meetingLink: row.meetingLink,
    cancelledAt: row.cancelledAt,
    cancelReason: row.cancelReason,
    createdAt: row.createdAt,
    studentIds: row.participants.map((p) => p.studentId),
    attendance: toAttendance(row.attendance),
  };
}

const WITH_DETAILS = { include: { participants: true, attendance: true } } as const;

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
      ...WITH_DETAILS,
    });
    return toSessionWithParticipants(row);
  }

  async findById(id: string): Promise<SessionWithParticipants | null> {
    const row = await this.prisma.session.findUnique({ where: { id }, ...WITH_DETAILS });
    return row ? toSessionWithParticipants(row) : null;
  }

  findOverlapping(
    tutorId: string,
    start: Date,
    end: Date,
    excludeSessionId?: string,
  ): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: {
        tutorId,
        scheduledAt: { lt: end },
        endsAt: { gt: start },
        cancelledAt: null,
        ...(excludeSessionId && { id: { not: excludeSessionId } }),
      },
    }) as Promise<Session[]>;
  }

  async findAll(filters?: SessionFilters): Promise<SessionWithParticipants[]> {
    const where: Prisma.SessionWhereInput = {
      ...(filters?.tutorId && { tutorId: filters.tutorId }),
      ...(filters?.studentId && { participants: { some: { studentId: filters.studentId } } }),
    };
    const rows = await this.prisma.session.findMany({
      where,
      ...WITH_DETAILS,
      orderBy: { scheduledAt: 'desc' },
    });
    return rows.map(toSessionWithParticipants);
  }

  findByStudent(studentId: string): Promise<SessionWithParticipants[]> {
    return this.findAll({ studentId });
  }

  async countAttendanceByTutorAndStudent(tutorId: string, studentId: string): Promise<number> {
    return this.prisma.sessionAttendance.count({
      where: { session: { tutorId, participants: { some: { studentId } } } },
    });
  }

  async createAttendance(
    sessionId: string,
    sequenceNumber: number,
    confirmedAt: Date,
  ): Promise<SessionAttendance> {
    const row = await this.prisma.sessionAttendance.create({
      data: { sessionId, sequenceNumber, confirmedAt },
    });
    return {
      id: row.id,
      sessionId: row.sessionId,
      sequenceNumber: row.sequenceNumber,
      confirmedAt: row.confirmedAt,
      createdAt: row.createdAt,
    };
  }

  async reschedule(id: string, scheduledAt: Date, endsAt: Date): Promise<SessionWithParticipants> {
    await this.prisma.session.update({ where: { id }, data: { scheduledAt, endsAt } });
    return (await this.findById(id)) as SessionWithParticipants;
  }

  async cancel(id: string, cancelledAt: Date, reason: string): Promise<SessionWithParticipants> {
    await this.prisma.session.update({
      where: { id },
      data: { cancelledAt, cancelReason: reason },
    });
    return (await this.findById(id)) as SessionWithParticipants;
  }

  async createChangeHistory(
    data: Omit<SessionChangeHistory, 'id' | 'createdAt'>,
  ): Promise<SessionChangeHistory> {
    const row = await this.prisma.sessionChangeHistory.create({ data });
    return {
      id: row.id,
      sessionId: row.sessionId,
      changeType: row.changeType as SessionChangeHistory['changeType'],
      reason: row.reason,
      previousScheduledAt: row.previousScheduledAt,
      newScheduledAt: row.newScheduledAt,
      changedById: row.changedById,
      createdAt: row.createdAt,
    };
  }
}
