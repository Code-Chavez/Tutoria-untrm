import { TutorSemesterReport, TutorSemesterReportContent } from '../entities/TutorSemesterReport';

export interface TutorSemesterReportRepository {
  findByPeriodAndTutor(periodId: string, tutorId: string): Promise<TutorSemesterReport | null>;
  /** Crea o reemplaza el informe del tutor en el periodo. */
  upsert(
    periodId: string,
    tutorId: string,
    content: TutorSemesterReportContent,
  ): Promise<TutorSemesterReport>;
}
