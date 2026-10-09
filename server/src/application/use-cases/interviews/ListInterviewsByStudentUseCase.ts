import { TutorInterview } from '@domain/entities/TutorInterview';
import { TutorInterviewRepository } from '@domain/repositories/TutorInterviewRepository';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';

/** Lista las entrevistas de un estudiante, para el expediente (HU-16), si el solicitante tiene alcance sobre él. */
export class ListInterviewsByStudentUseCase {
  constructor(
    private readonly interviews: TutorInterviewRepository,
    private readonly guard: StudentAccessGuard,
  ) {}

  async execute(studentId: string, requesterId: string): Promise<TutorInterview[]> {
    await this.guard.assertAccess(requesterId, studentId);
    return this.interviews.findByStudent(studentId);
  }
}
