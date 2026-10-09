import { PrismaClient, Prisma } from '@prisma/client';
import {
  Session,
  SessionAttendance,
  SessionChangeHistory,
  SessionEvidence,
  SessionWithParticipants,
} from '@domain/entities/Session';
import { SessionRepository, SessionFilters, AttendanceScope } from '@domain/repositories/SessionRepository';
import {
  AttendanceAlreadyRegisteredError,
  AttendanceNumberTakenError,
} from '@application/use-cases/sessions/SessionErrors';

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
    attendedStudentIds: row.participants.filter((p) => p.attended === true).map((p) => p.studentId),
    absentStudentIds: row.participants.filter((p) => p.attended === false).map((p) => p.studentId),
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

  async countAttendanceByTutorAndStudent(tutorId: string, studentId: string, periodId: string): Promise<number> {
    return this.prisma.sessionAttendance.count({ where: { tutorId, studentId, periodId } });
  }

  async createAttendance(
    sessionId: string,
    sequenceNumber: number,
    confirmedAt: Date,
    scope: AttendanceScope,
  ): Promise<SessionAttendance> {
    // Confirmar la asistencia de una sesión individual (Anexo N°4) es también marcar
    // al tutorado como asistido: una sola operación, para que ambas cosas no diverjan.
    const row = await this.prisma.$transaction(async (tx) => {
      const attendance = await tx.sessionAttendance.create({ data: { sessionId, sequenceNumber, confirmedAt, ...scope } });
      await tx.sessionParticipant.updateMany({ where: { sessionId }, data: { attended: true } });
      return attendance;
    }).catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = String(error.meta?.target ?? '');
        // La restricción de session_id: la sesión ya tenía asistencia; la otra: número tomado en simultáneo.
        throw target.includes('session_id') || target.includes('sessionId')
          ? new AttendanceAlreadyRegisteredError()
          : new AttendanceNumberTakenError();
      }
      throw error;
    });
    return {
      id: row.id,
      sessionId: row.sessionId,
      sequenceNumber: row.sequenceNumber,
      confirmedAt: row.confirmedAt,
      createdAt: row.createdAt,
    };
  }

  async recordParticipantAttendance(
    sessionId: string,
    attendedStudentIds: string[],
    absentStudentIds: string[],
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.sessionParticipant.updateMany({
        where: { sessionId, studentId: { in: attendedStudentIds } },
        data: { attended: true },
      }),
      this.prisma.sessionParticipant.updateMany({
        where: { sessionId, studentId: { in: absentStudentIds } },
        data: { attended: false },
      }),
    ]);
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

  async createEvidence(data: Omit<SessionEvidence, 'id' | 'createdAt'>): Promise<SessionEvidence> {
    return this.prisma.sessionEvidence.create({ data });
  }

  listEvidenceBySession(sessionId: string): Promise<SessionEvidence[]> {
    return this.prisma.sessionEvidence.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findEvidenceById(id: string): Promise<SessionEvidence | null> {
    return this.prisma.sessionEvidence.findUnique({ where: { id } });
  }
}
