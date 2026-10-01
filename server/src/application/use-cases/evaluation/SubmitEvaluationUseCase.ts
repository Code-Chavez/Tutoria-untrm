import { TutorEvaluation } from '@domain/entities/TutorEvaluation';
import { TutorEvaluationRepository } from '@domain/repositories/TutorEvaluationRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { EvaluationWindowRepository } from '@domain/repositories/EvaluationWindowRepository';
import { SubmitEvaluationInput } from '@application/dtos/evaluation.dto';
import { StudentProfileNotLinkedError } from '@application/use-cases/tutoring-requests/TutoringRequestErrors';
import {
  NoActivePeriodError,
  EvaluationAlreadySubmittedError,
  TutorNotAssignedError,
  EvaluationNotOpenForSchoolError,
} from './EvaluationErrors';

/**
 * Cuestionario de evaluación de la función tutorial (HU-36, Anexo N°7): el
 * propio tutorado responde sobre su tutor asignado, una sola vez por
 * periodo académico habilitado (control de unicidad reforzado también por
 * la restricción @@unique([studentId, periodId]) en la base de datos), y
 * solo si la DBU abrió la evaluación para su escuela (HU-38, Art. 17.d).
 */
export class SubmitEvaluationUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly evaluations: TutorEvaluationRepository,
    private readonly windows: EvaluationWindowRepository,
  ) {}

  async execute(userId: string, input: SubmitEvaluationInput): Promise<TutorEvaluation> {
    const student = await this.students.findByUserId(userId);
    if (!student) {
      throw new StudentProfileNotLinkedError();
    }

    if (!student.tutorId) {
      throw new TutorNotAssignedError();
    }

    const period = await this.periods.findActive();
    if (!period) {
      throw new NoActivePeriodError();
    }

    const window = await this.windows.findByPeriodAndSchool(period.id, student.schoolId);
    if (!window?.isOpen) {
      throw new EvaluationNotOpenForSchoolError();
    }

    const existing = await this.evaluations.findByStudentAndPeriod(student.id, period.id);
    if (existing) {
      throw new EvaluationAlreadySubmittedError();
    }

    return this.evaluations.create({
      studentId: student.id,
      tutorId: student.tutorId,
      periodId: period.id,
      scores: input.scores,
      likes: input.likes?.trim() || null,
      dislikes: input.dislikes?.trim() || null,
    });
  }
}
