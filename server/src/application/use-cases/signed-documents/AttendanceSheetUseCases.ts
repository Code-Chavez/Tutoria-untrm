import { SignedDocumentView } from '@domain/entities/SignedDocument';
import { SignedDocumentRepository } from '@domain/repositories/SignedDocumentRepository';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { UserRepository } from '@domain/repositories/UserRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { FacultyRepository } from '@domain/repositories/FacultyRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { EvidenceStorage } from '@application/ports/EvidenceStorage';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { AcademicPeriod } from '@domain/entities/AcademicPeriod';
import { AttendanceSheetPeriodNotFoundError } from './SignedDocumentErrors';
import { sha256Of, toSignedDocumentViews } from './signedDocumentView';
import type { SignedFileInput } from './ReferralSignedDocumentUseCases';

export interface AttendanceSheetRow {
  sequenceNumber: number;
  date: Date;
  topic: string;
  modality: string;
}

export interface AttendanceSheet {
  student: { name: string; code: string; cycle: number; email: string | null; phone: string | null };
  schoolName: string;
  facultyName: string;
  tutorName: string;
  periodName: string;
  /** Sesiones individuales con asistencia confirmada del tutor con este tutorado en el semestre, por número. */
  rows: AttendanceSheetRow[];
  generatedAt: Date;
}

const DAY_MS = 24 * 60 * 60_000;

async function resolvePeriod(periods: AcademicPeriodRepository, periodId?: string): Promise<AcademicPeriod> {
  const period = periodId ? await periods.findById(periodId) : await periods.findActive();
  if (!period) throw new AttendanceSheetPeriodNotFoundError();
  return period;
}

/** Datos de la hoja de asistencia del Anexo N°4 de un tutorado en un semestre (para imprimirla y firmarla). */
export class GetAttendanceSheetUseCase {
  constructor(
    private readonly guard: StudentAccessGuard,
    private readonly sessions: SessionRepository,
    private readonly users: UserRepository,
    private readonly schools: SchoolRepository,
    private readonly faculties: FacultyRepository,
    private readonly periods: AcademicPeriodRepository,
  ) {}

  async execute(requesterId: string, studentId: string, periodId?: string): Promise<AttendanceSheet> {
    const student = await this.guard.assertAccess(requesterId, studentId);
    const period = await resolvePeriod(this.periods, periodId);
    const tutor = student.tutorId ? await this.users.findById(student.tutorId) : null;
    const school = await this.schools.findById(student.schoolId);
    const faculty = school ? (await this.faculties.findAll()).find((f) => f.id === school.facultyId) : undefined;

    const from = period.startDate.getTime();
    const to = period.endDate.getTime() + DAY_MS; // el último día del periodo entra completo
    const rows = (await this.sessions.findByStudent(studentId))
      .filter(
        (s) =>
          !s.cancelledAt &&
          s.attendance &&
          s.studentIds.length === 1 &&
          (!student.tutorId || s.tutorId === student.tutorId) &&
          s.scheduledAt.getTime() >= from &&
          s.scheduledAt.getTime() < to,
      )
      .sort((a, b) => (a.attendance?.sequenceNumber ?? 0) - (b.attendance?.sequenceNumber ?? 0))
      .map((s) => ({
        sequenceNumber: s.attendance?.sequenceNumber ?? 0,
        date: s.scheduledAt,
        topic: s.topic,
        modality: s.modality,
      }));

    return {
      student: {
        name: `${student.firstName} ${student.lastName}`,
        code: student.studentCode,
        cycle: student.cycle,
        email: student.email ?? null,
        phone: student.phone ?? null,
      },
      schoolName: school?.name ?? 'Sin escuela',
      facultyName: faculty?.name ?? '—',
      tutorName: tutor ? `${tutor.firstName} ${tutor.lastName}` : 'Sin tutor asignado',
      periodName: period.name,
      rows,
      generatedAt: new Date(),
    };
  }
}

/** Adjunta la hoja de asistencia impresa, firmada por tutor y tutorado, y escaneada (A14). */
export class AttachAttendanceSheetSignedDocumentUseCase {
  constructor(
    private readonly guard: StudentAccessGuard,
    private readonly periods: AcademicPeriodRepository,
    private readonly documents: SignedDocumentRepository,
    private readonly users: UserRepository,
    private readonly storage: EvidenceStorage,
    private readonly auditLogs: AuditLogRepository,
  ) {}

  async execute(requesterId: string, studentId: string, file: SignedFileInput, periodId?: string, ipAddress?: string) {
    await this.guard.assertAccess(requesterId, studentId);
    const period = await resolvePeriod(this.periods, periodId);

    const storageKey = await this.storage.save(file.fileBuffer, file.fileName);
    const created = await this.documents.create({
      kind: 'ATTENDANCE_SHEET',
      referralId: null,
      studentId,
      periodId: period.id,
      fileName: file.fileName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      storageKey,
      sha256: sha256Of(file.fileBuffer),
      uploadedById: requesterId,
    });
    await this.auditLogs.create({
      userId: requesterId,
      action: 'SIGNED_DOCUMENT_ATTACHED',
      entity: 'Student',
      entityId: studentId,
      details: `Hoja de asistencia firmada (${period.name}) adjunta (${created.sha256.slice(0, 12)}…)`,
      ipAddress: ipAddress ?? null,
    });
    return (await toSignedDocumentViews([created], this.users))[0];
  }
}

export class ListAttendanceSheetSignedDocumentsUseCase {
  constructor(
    private readonly guard: StudentAccessGuard,
    private readonly periods: AcademicPeriodRepository,
    private readonly documents: SignedDocumentRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(requesterId: string, studentId: string, periodId?: string): Promise<{ period: { id: string; name: string }; documents: SignedDocumentView[] }> {
    await this.guard.assertAccess(requesterId, studentId);
    const period = await resolvePeriod(this.periods, periodId);
    const documents = await toSignedDocumentViews(await this.documents.listByStudentPeriod(studentId, period.id), this.users);
    return { period: { id: period.id, name: period.name }, documents };
  }
}
