import { Student } from '@domain/entities/Student';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { MarkStudentRiskInput } from '@application/dtos/student.dto';
import { StudentNotFoundError, RiskReasonRequiredError } from './StudentErrors';

/**
 * Marca o quita la condición de "riesgo académico" de un estudiante (HU-11).
 * Al marcar se exige un motivo y se registra la fecha; al quitar la marca se
 * limpian el motivo y la fecha.
 */
export class MarkStudentRiskUseCase {
  constructor(private readonly students: StudentRepository) {}

  async execute(id: string, input: MarkStudentRiskInput): Promise<Student> {
    const student = await this.students.findById(id);
    if (!student) {
      throw new StudentNotFoundError(id);
    }

    if (input.isAtRisk) {
      const reason = input.reason?.trim();
      if (!reason) {
        throw new RiskReasonRequiredError();
      }
      return this.students.update(id, {
        isAtRisk: true,
        riskReason: reason,
        riskMarkedAt: new Date(),
      });
    }

    return this.students.update(id, {
      isAtRisk: false,
      riskReason: null,
      riskMarkedAt: null,
    });
  }
}
