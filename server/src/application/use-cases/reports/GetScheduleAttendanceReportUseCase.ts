import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SessionWithParticipants } from '@domain/entities/Session';
import {
  GetScheduleAttendanceReportInput,
  ScheduleAttendanceReport,
  ScheduleAttendanceSessionRow,
  ScheduleAttendanceStatus,
} from '@application/dtos/report.dto';
import { assertActiveTutor } from '@application/use-cases/assignments/TutorValidation';

function deriveStatus(session: SessionWithParticipants, now: Date): ScheduleAttendanceStatus {
  if (session.cancelledAt) return 'CANCELADA';
  if (now < session.scheduledAt) return 'PROXIMA';
  if (now > session.endsAt) return 'REALIZADA';
  return 'EN_CURSO';
}

/** Una sesión pasada, individual, no cancelada y sin asistencia confirmada. */
function isPendingAttendance(session: SessionWithParticipants, now: Date): boolean {
  return (
    !session.cancelledAt &&
    session.studentIds.length === 1 &&
    !session.attendance &&
    session.scheduledAt < now
  );
}

/**
 * Consolidado de horarios y asistencia por tutor (HU-27, Art. 15.d): se
 * genera al vuelo a partir de las sesiones ya registradas — nada nuevo que
 * capturar, solo agrupar y resumir lo que el tutor ya fue registrando.
 */
export class GetScheduleAttendanceReportUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly sessions: SessionRepository,
    private readonly students: StudentRepository,
  ) {}

  async execute(input: GetScheduleAttendanceReportInput): Promise<ScheduleAttendanceReport> {
    const tutor = await assertActiveTutor(this.users, this.roles, input.tutorId);

    const allSessions = await this.sessions.findAll({ tutorId: input.tutorId });
    const inPeriod = allSessions.filter((s) => {
      if (input.from && s.scheduledAt < input.from) return false;
      if (input.to && s.scheduledAt > input.to) return false;
      return true;
    });

    const studentIds = new Set<string>();
    inPeriod.forEach((s) => s.studentIds.forEach((id) => studentIds.add(id)));
    const studentEntries = await Promise.all(
      [...studentIds].map(async (id) => [id, await this.students.findById(id)] as const),
    );
    const studentName = (id: string): string => {
      const student = studentEntries.find(([sid]) => sid === id)?.[1];
      return student ? `${student.firstName} ${student.lastName}` : 'Desconocido';
    };

    const now = new Date();
    const sessionRows: ScheduleAttendanceSessionRow[] = inPeriod
      .map((s) => ({
        id: s.id,
        topic: s.topic,
        scheduledAt: s.scheduledAt,
        durationMinutes: s.durationMinutes,
        modality: s.modality,
        studentNames: s.studentIds.map(studentName),
        status: deriveStatus(s, now),
        attendanceConfirmed: s.studentIds.length === 1 ? Boolean(s.attendance) : null,
      }))
      .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());

    return {
      tutorId: tutor.id,
      tutorName: `${tutor.firstName} ${tutor.lastName}`,
      periodFrom: input.from ?? null,
      periodTo: input.to ?? null,
      generatedAt: now,
      totalSessions: inPeriod.length,
      individualSessions: inPeriod.filter((s) => s.studentIds.length === 1).length,
      groupSessions: inPeriod.filter((s) => s.studentIds.length > 1).length,
      cancelledSessions: inPeriod.filter((s) => s.cancelledAt).length,
      attendanceConfirmed: inPeriod.filter((s) => s.studentIds.length === 1 && s.attendance).length,
      attendancePending: inPeriod.filter((s) => isPendingAttendance(s, now)).length,
      sessions: sessionRows,
    };
  }
}
