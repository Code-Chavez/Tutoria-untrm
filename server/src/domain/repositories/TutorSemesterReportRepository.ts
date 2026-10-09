import { TutorSemesterReport, TutorSemesterReportContent } from '../entities/TutorSemesterReport';

export interface TutorSemesterReportRepository {
  findByPeriodAndTutor(periodId: string, tutorId: string): Promise<TutorSemesterReport | null>;
  /** Informes guardados en el periodo (para el consolidado, HU-44). */
  findAllByPeriod(periodId: string): Promise<TutorSemesterReport[]>;
  /** Crea o reemplaza el informe del tutor en el periodo. */
  upsert(
    periodId: string,
    tutorId: string,
    content: TutorSemesterReportContent,
  ): Promise<TutorSemesterReport>;
}
