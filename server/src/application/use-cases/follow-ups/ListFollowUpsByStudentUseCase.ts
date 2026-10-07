import { TutorFollowUp } from '@domain/entities/TutorFollowUp';
import { TutorFollowUpRepository } from '@domain/repositories/TutorFollowUpRepository';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';

/** Lista las fichas de seguimiento de un estudiante, para el expediente (HU-16), si el solicitante tiene alcance sobre él. */
export class ListFollowUpsByStudentUseCase {
  constructor(
    private readonly followUps: TutorFollowUpRepository,
    private readonly guard: StudentAccessGuard,
  ) {}

  async execute(studentId: string, requesterId: string): Promise<TutorFollowUp[]> {
    await this.guard.assertAccess(requesterId, studentId);
    return this.followUps.findByStudent(studentId);
  }
}
