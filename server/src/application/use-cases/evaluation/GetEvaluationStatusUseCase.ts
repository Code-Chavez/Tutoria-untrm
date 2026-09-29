import { StudentRepository } from '@domain/repositories/StudentRepository';
import { AcademicPeriodRepository } from '@domain/repositories/AcademicPeriodRepository';
import { TutorEvaluationRepository } from '@domain/repositories/TutorEvaluationRepository';
import { EvaluationStatus } from '@application/dtos/evaluation.dto';
import { StudentProfileNotLinkedError } from '@application/use-cases/tutoring-requests/TutoringRequestErrors';

/**
 * Permite al cliente saber, antes de mostrar el formulario, si el tutorado
 * ya respondió el cuestionario de este periodo o si aún no hay un periodo
 * habilitado (HU-38) o un tutor asignado.
 */
export class GetEvaluationStatusUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly periods: AcademicPeriodRepository,
    private readonly evaluations: TutorEvaluationRepository,
  ) {}

  async execute(userId: string): Promise<EvaluationStatus> {
    const student = await this.students.findByUserId(userId);
    if (!student) {
      throw new StudentProfileNotLinkedError();
    }

    const period = await this.periods.findActive();
    if (!period || !student.tutorId) {
      return { canRespond: false, alreadyResponded: false, periodName: period?.name ?? null };
    }

    const existing = await this.evaluations.findByStudentAndPeriod(student.id, period.id);

    return {
      canRespond: !existing,
      alreadyResponded: Boolean(existing),
      periodName: period.name,
    };
  }
}
