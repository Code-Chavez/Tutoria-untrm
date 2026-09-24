import { TutorInterview } from '@domain/entities/TutorInterview';
import { TutorInterviewRepository } from '@domain/repositories/TutorInterviewRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { CreateInterviewInput } from '@application/dtos/interview.dto';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import { InterviewMotiveRequiredError } from './InterviewErrors';

/**
 * Registra la entrevista inicial tutorial (HU-14, Anexo N° 3). Exige al menos
 * un motivo marcado; la firma del Anexo se reemplaza por conductedById, el
 * usuario autenticado que confirma el registro.
 */
export class CreateInterviewUseCase {
  constructor(
    private readonly interviews: TutorInterviewRepository,
    private readonly students: StudentRepository,
  ) {}

  async execute(
    studentId: string,
    conductedById: string,
    input: CreateInterviewInput,
  ): Promise<TutorInterview> {
    const student = await this.students.findById(studentId);
    if (!student) {
      throw new StudentNotFoundError(studentId);
    }

    if (!input.motiveAcademic && !input.motivePersonalEmotional && !input.motiveVocational) {
      throw new InterviewMotiveRequiredError();
    }

    return this.interviews.create({
      studentId,
      conductedById,
      birthDate: input.birthDate ? new Date(input.birthDate) : null,
      originPlace: input.originPlace?.trim() || null,
      age: input.age ?? null,
      religion: input.religion?.trim() || null,
      maritalStatus: input.maritalStatus?.trim() || null,
      siblingsOrder: input.siblingsOrder?.trim() || null,
      address: input.address?.trim() || null,
      admissionYear: input.admissionYear ?? null,
      motiveAcademic: input.motiveAcademic,
      motivePersonalEmotional: input.motivePersonalEmotional,
      motiveVocational: input.motiveVocational,
      motiveDetail: input.motiveDetail?.trim() || null,
      aspectsDiscussed: input.aspectsDiscussed.trim(),
      agreements: input.agreements.trim(),
    });
  }
}
