import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { TutorInterviewRepository } from '@domain/repositories/TutorInterviewRepository';
import { TutorAssignmentHistoryRepository } from '@domain/repositories/TutorAssignmentHistoryRepository';
import { SupportContactRepository } from '@domain/repositories/SupportContactRepository';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { TutorFollowUpRepository } from '@domain/repositories/TutorFollowUpRepository';
import { StudentRecord, StudentRecordEvent } from '@application/dtos/studentRecord.dto';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';

const MOTIVE_LABELS: { key: 'motiveAcademic' | 'motivePersonalEmotional' | 'motiveVocational'; label: string }[] = [
  { key: 'motiveAcademic', label: 'Académica' },
  { key: 'motivePersonalEmotional', label: 'Personal-emocional' },
  { key: 'motiveVocational', label: 'Vocacional-profesional' },
];

/**
 * Consolida el expediente del tutorado (HU-16): entrevista(s), historial de
 * asignación de tutor, asistencia a sesiones individuales (HU-22), fichas de
 * seguimiento (HU-24) y el estado actual, en orden cronológico. Las
 * derivaciones (Sprint 3 en adelante) todavía no existen en el sistema; el
 * tipo StudentRecordEvent queda preparado para incorporarlas sin rediseñar
 * la línea de tiempo.
 */
export class GetStudentRecordUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly schools: SchoolRepository,
    private readonly users: UserRepository,
    private readonly interviews: TutorInterviewRepository,
    private readonly assignmentHistory: TutorAssignmentHistoryRepository,
    private readonly supportContacts: SupportContactRepository,
    private readonly sessions: SessionRepository,
    private readonly followUps: TutorFollowUpRepository,
  ) {}

  async execute(studentId: string, includeSupportContact: boolean): Promise<StudentRecord> {
    const student = await this.students.findById(studentId);
    if (!student) {
      throw new StudentNotFoundError(studentId);
    }

    const school = await this.schools.findById(student.schoolId);
    const [interviews, history, sessions, followUps] = await Promise.all([
      this.interviews.findByStudent(studentId),
      this.assignmentHistory.findByStudent(studentId),
      this.sessions.findByStudent(studentId),
      this.followUps.findByStudent(studentId),
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

    const timeline = [
      ...interviewEvents,
      ...assignmentEvents,
      ...attendanceEvents,
      ...followUpEvents,
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
}
