import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { TutorSemesterReportRepository } from '@domain/repositories/TutorSemesterReportRepository';
import { TutorSemesterReport } from '@domain/entities/TutorSemesterReport';
import { assertActiveTutor } from '@application/use-cases/assignments/TutorValidation';
import { NoActivePeriodError } from '@application/use-cases/evaluation/EvaluationErrors';
import { SemesterReportNotFoundError } from './SemesterReportErrors';

export interface SemesterReportExport {
  periodName: string;
  tutorName: string;
  report: TutorSemesterReport;
}

/** Informe guardado del tutor, listo para exportarse a PDF (HU-43). */
export class GetSemesterReportForExportUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly reports: TutorSemesterReportRepository,
  ) {}

  async execute(tutorId: string): Promise<SemesterReportExport> {
    const tutor = await assertActiveTutor(this.users, this.roles, tutorId);

    const period = await this.periods.findActive();
    if (!period) throw new NoActivePeriodError();

    const report = await this.reports.findByPeriodAndTutor(period.id, tutorId);
    if (!report) throw new SemesterReportNotFoundError();

    return { periodName: period.name, tutorName: `${tutor.firstName} ${tutor.lastName}`, report };
  }
}
