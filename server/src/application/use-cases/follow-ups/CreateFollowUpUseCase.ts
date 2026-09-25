import { TutorFollowUp } from '@domain/entities/TutorFollowUp';
import { TutorFollowUpRepository } from '@domain/repositories/TutorFollowUpRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { CreateFollowUpInput } from '@application/dtos/followUp.dto';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';
import { FollowUpInstructorDetailsRequiredError } from './FollowUpErrors';

/**
 * Registra una ficha de seguimiento (HU-24, Anexo N° 5). Si el acuerdo es con
 * un docente de asignatura, exige nombre, curso y ciclo (ese rol no existe en
 * el sistema, se registra en texto libre, mismo criterio que HU-17).
 */
export class CreateFollowUpUseCase {
  constructor(
    private readonly followUps: TutorFollowUpRepository,
    private readonly students: StudentRepository,
  ) {}

  async execute(
    studentId: string,
    conductedById: string,
    input: CreateFollowUpInput,
  ): Promise<TutorFollowUp> {
    const student = await this.students.findById(studentId);
    if (!student) {
      throw new StudentNotFoundError(studentId);
    }

    if (
      input.withInstructor &&
      (!input.instructorName?.trim() || !input.courseName?.trim() || !input.courseCycle)
    ) {
      throw new FollowUpInstructorDetailsRequiredError();
    }

    return this.followUps.create({
      studentId,
      conductedById,
      reason: input.reason.trim(),
      agreements: input.agreements.trim(),
      instructorName: input.withInstructor ? input.instructorName!.trim() : null,
      courseName: input.withInstructor ? input.courseName!.trim() : null,
      courseCycle: input.withInstructor ? input.courseCycle! : null,
    });
  }
}
