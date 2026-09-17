import { TutorInterview } from '@domain/entities/TutorInterview';
import { TutorInterviewRepository } from '@domain/repositories/TutorInterviewRepository';

/** Lista las entrevistas de un estudiante, para el expediente (HU-16). */
export class ListInterviewsByStudentUseCase {
  constructor(private readonly interviews: TutorInterviewRepository) {}

  execute(studentId: string): Promise<TutorInterview[]> {
    return this.interviews.findByStudent(studentId);
  }
}
