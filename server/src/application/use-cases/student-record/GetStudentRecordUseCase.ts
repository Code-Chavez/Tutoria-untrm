import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { TutorInterviewRepository } from '@domain/repositories/TutorInterviewRepository';
import { TutorAssignmentHistoryRepository } from '@domain/repositories/TutorAssignmentHistoryRepository';
import { SupportContactRepository } from '@domain/repositories/SupportContactRepository';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { TutorFollowUpRepository } from '@domain/repositories/TutorFollowUpRepository';
import { StudentReferralRepository } from '@domain/repositories/StudentReferralRepository';
import { StudentRecord, StudentRecordEvent } from '@application/dtos/studentRecord.dto';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';

const MOTIVE_LABELS: { key: 'motiveAcademic' | 'motivePersonalEmotional' | 'motiveVocational'; label: string }[] = [
  { key: 'motiveAcademic', label: 'Académica' },
  { key: 'motivePersonalEmotional', label: 'Personal-emocional' },
  { key: 'motiveVocational', label: 'Vocacional-profesional' },
];

/**
 * Consolida el expediente del tutorado (HU-16): entrevista(s), historial de
 * asignación de tutor, asistencia a sesiones individuales (HU-22), fichas de
 * seguimiento (HU-24), derivaciones (HU-35) y el estado actual, en orden
 * cronológico.
 */
export class GetStudentRecordUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly schools: SchoolRepository,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly interviews: TutorInterviewRepository,
    private readonly assignmentHistory: TutorAssignmentHistoryRepository,
    private readonly supportContacts: SupportContactRepository,
    private readonly sessions: SessionRepository,
    private readonly followUps: TutorFollowUpRepository,
    private readonly referrals: StudentReferralRepository,
    private readonly guard: StudentAccessGuard,
  ) {}

  async execute(
    studentId: string,
    includeSupportContact: boolean,
    requesterId: string,
  ): Promise<StudentRecord> {
    // El expediente reúne entrevistas, seguimientos y asistencia: solo con alcance sobre el tutorado.
    const student = await this.guard.assertAccess(requesterId, studentId);

    const school = await this.schools.findById(student.schoolId);
    const [interviews, history, sessions, followUps, referrals] = await Promise.all([
      this.interviews.findByStudent(studentId),
      this.assignmentHistory.findByStudent(studentId),
      this.sessions.findByStudent(studentId),
      this.followUps.findByStudent(studentId),
      this.visibleReferrals(studentId, requesterId),
    ]);
    const attendedSessions = sessions.filter((s) => s.attendance);

    // Resuelve en un solo mapa los nombres de todos los usuarios involucrados
    // (tutor actual, quien condujo cada entrevista, tutores del historial).
    const userIds = new Set<string>();
    if (student.tutorId) userIds.add(student.tutorId);
    interviews.forEach((i) => userIds.add(i.conductedById));
    history.forEach((h) => {
      if (h.previousTutorId) userIds.add(h.previousTutorId);
      userIds.add(h.newTutorId);
    });
    attendedSessions.forEach((s) => userIds.add(s.tutorId));
    followUps.forEach((f) => userIds.add(f.conductedById));

    const userEntries = await Promise.all(
      [...userIds].map(async (id) => [id, await this.users.findById(id)] as const),
    );
    const userName = (id?: string | null): string | null => {
      if (!id) return null;
      const user = userEntries.find(([uid]) => uid === id)?.[1];
      return user ? `${user.firstName} ${user.lastName}` : null;
    };

    const interviewEvents: StudentRecordEvent[] = interviews.map((i) => ({
      type: 'interview',
      id: i.id,
      date: i.createdAt,
      conductedByName: userName(i.conductedById) ?? 'Desconocido',
      motives: MOTIVE_LABELS.filter((m) => i[m.key]).map((m) => m.label),
      aspectsDiscussed: i.aspectsDiscussed,
      agreements: i.agreements,
    }));

    const assignmentEvents: StudentRecordEvent[] = history.map((h) => ({
      type: 'assignment',
      id: h.id,
      date: h.createdAt,
      previousTutorName: userName(h.previousTutorId),
      newTutorName: userName(h.newTutorId) ?? 'Desconocido',
      reason: h.reason,
    }));

    const attendanceEvents: StudentRecordEvent[] = attendedSessions.map((s) => ({
      type: 'attendance',
      id: s.attendance!.id,
      date: s.attendance!.confirmedAt,
      sequenceNumber: s.attendance!.sequenceNumber,
      topic: s.topic,
      tutorName: userName(s.tutorId) ?? 'Desconocido',
      scheduledAt: s.scheduledAt,
    }));

    const followUpEvents: StudentRecordEvent[] = followUps.map((f) => ({
      type: 'followUp',
      id: f.id,
      date: f.createdAt,
      reason: f.reason,
      agreements: f.agreements,
      instructorName: f.instructorName ?? null,
      courseName: f.courseName ?? null,
      courseCycle: f.courseCycle ?? null,
      conductedByName: userName(f.conductedById) ?? 'Desconocido',
    }));

    const referralEvents: StudentRecordEvent[] = referrals.map((r) => ({
      type: 'referral',
      id: r.id,
      date: r.createdAt,
      service: r.service,
      status: r.status,
      receivingInstance: r.receivingInstance,
    }));

    const timeline = [
      ...interviewEvents,
      ...assignmentEvents,
      ...attendanceEvents,
      ...followUpEvents,
      ...referralEvents,
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    const record: StudentRecord = {
      student: {
        id: student.id,
        studentCode: student.studentCode,
        firstName: student.firstName,
        lastName: student.lastName,
        cycle: student.cycle,
        isActive: student.isActive,
        isAtRisk: student.isAtRisk,
        riskReason: student.riskReason ?? null,
      },
      schoolName: school?.name ?? 'Sin escuela',
      tutorName: userName(student.tutorId),
      timeline,
    };

    if (includeSupportContact) {
      record.supportContact = await this.supportContacts.findByStudent(studentId);
    }

    return record;
  }

  // Reutiliza la misma visibilidad restringida de HU-30: la DBU ve todo, el
  // tutor solo lo que él mismo derivó, y el resto de roles (p. ej.
  // Coordinador) no ve derivaciones en el expediente.
  private async visibleReferrals(studentId: string, requesterId: string) {
    const requester = await this.users.findById(requesterId);
    if (!requester) return [];

    const role = await this.roles.findById(requester.roleId);
    if (!role) return [];

    if (role.name === 'Administrador DBU') {
      return this.referrals.findMany({ studentId });
    }

    if (role.name === 'Docente Tutor') {
      const referrals = await this.referrals.findMany({ studentId, referredById: requesterId });
      return referrals;
    }

    return [];
  }
}
