import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { SessionRepository } from '@domain/repositories/SessionRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';
import { FacultyRepository } from '@domain/repositories/FacultyRepository';
import { TutorFollowUpRepository } from '@domain/repositories/TutorFollowUpRepository';
import { TutorSemesterReportRepository } from '@domain/repositories/TutorSemesterReportRepository';
import {
  TutorSemesterReport,
  TutorSemesterReportContent,
} from '@domain/entities/TutorSemesterReport';
import { assertActiveTutor } from '@application/use-cases/assignments/TutorValidation';
import { NoActivePeriodError } from '@application/use-cases/evaluation/EvaluationErrors';
import { buildSemesterReportDraft } from './buildSemesterReportDraft';
import { isHeldSession } from '@application/use-cases/sessions/sessionOutcome';

export interface MySemesterReportView {
  periodName: string;
  tutorName: string;
  /** Informe ya guardado por el tutor, o null si aún no lo guardó. */
  report: TutorSemesterReport | null;
  /** Borrador autollenado con lo registrado en el periodo activo. */
  draft: TutorSemesterReportContent;
}

/** Informe semestral del tutor (Anexo N°9): lo guardado más un borrador autollenado (HU-43). */
export class GetMySemesterReportUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly sessions: SessionRepository,
    private readonly students: StudentRepository,
    private readonly schools: SchoolRepository,
    private readonly faculties: FacultyRepository,
    private readonly followUps: TutorFollowUpRepository,
    private readonly reports: TutorSemesterReportRepository,
  ) {}

  async execute(tutorId: string): Promise<MySemesterReportView> {
    const tutor = await assertActiveTutor(this.users, this.roles, tutorId);

    const period = await this.periods.findActive();
    if (!period) throw new NoActivePeriodError();

    const now = new Date();
    const allSessions = await this.sessions.findAll({ tutorId });
    // Solo sesiones realizadas dentro del periodo: con asistentes registrados (A07); las canceladas,
    // las sin asistencia y las que aún no se registraron no cuentan.
    const sessions = allSessions.filter(
      (s) => isHeldSession(s, now) && s.scheduledAt >= period.startDate && s.scheduledAt <= period.endDate,
    );

    const [followUps, students, schools, faculties, report] = await Promise.all([
      this.followUps.findByTutorBetween(tutorId, period.startDate, period.endDate),
      this.students.findAll({ tutorId, isActive: true }),
      this.schools.findAll(),
      this.faculties.findAll(),
      this.reports.findByPeriodAndTutor(period.id, tutorId),
    ]);

    const schoolIds = new Set(students.map((s) => s.schoolId));
    const mySchools = schools.filter((s) => schoolIds.has(s.id));
    const facultyIds = new Set(mySchools.map((s) => s.facultyId));

    const draft = buildSemesterReportDraft({
      sessions,
      followUps,
      programNames: mySchools.map((s) => s.name),
      facultyNames: faculties.filter((f) => facultyIds.has(f.id)).map((f) => f.name),
      cycles: students.map((s) => s.cycle),
      phone: tutor.phone ?? null,
    });

    return {
      periodName: period.name,
      tutorName: `${tutor.firstName} ${tutor.lastName}`,
      report,
      draft,
    };
  }
}
