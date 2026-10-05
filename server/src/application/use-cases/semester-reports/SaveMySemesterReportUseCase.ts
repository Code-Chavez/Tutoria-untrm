import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { TutorSemesterReportRepository } from '@domain/repositories/TutorSemesterReportRepository';
import {
  TutorSemesterReport,
  TutorSemesterReportContent,
} from '@domain/entities/TutorSemesterReport';
import { assertActiveTutor } from '@application/use-cases/assignments/TutorValidation';
import { NoActivePeriodError } from '@application/use-cases/evaluation/EvaluationErrors';

/** Guarda (o actualiza) el informe semestral del tutor en el periodo activo (HU-43). */
export class SaveMySemesterReportUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly reports: TutorSemesterReportRepository,
  ) {}

  async execute(tutorId: string, content: TutorSemesterReportContent): Promise<TutorSemesterReport> {
    await assertActiveTutor(this.users, this.roles, tutorId);

    const period = await this.periods.findActive();
    if (!period) throw new NoActivePeriodError();

    return this.reports.upsert(period.id, tutorId, content);
  }
}
