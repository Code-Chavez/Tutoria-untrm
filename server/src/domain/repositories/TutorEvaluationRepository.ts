import { TutorEvaluation } from '../entities/TutorEvaluation';

export interface TutorEvaluationRepository {
  create(
    data: Omit<TutorEvaluation, 'id' | 'createdAt'>,
  ): Promise<TutorEvaluation>;
  findByStudentAndPeriod(studentId: string, periodId: string): Promise<TutorEvaluation | null>;
}
