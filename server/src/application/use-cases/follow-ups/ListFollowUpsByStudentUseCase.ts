import { TutorFollowUp } from '@domain/entities/TutorFollowUp';
import { TutorFollowUpRepository } from '@domain/repositories/TutorFollowUpRepository';

/** Lista las fichas de seguimiento de un estudiante, para el expediente (HU-16). */
export class ListFollowUpsByStudentUseCase {
  constructor(private readonly followUps: TutorFollowUpRepository) {}

  execute(studentId: string): Promise<TutorFollowUp[]> {
    return this.followUps.findByStudent(studentId);
  }
}
