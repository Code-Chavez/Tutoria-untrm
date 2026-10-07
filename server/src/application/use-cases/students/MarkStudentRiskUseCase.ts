import { Student } from '@domain/entities/Student';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { MarkStudentRiskInput } from '@application/dtos/student.dto';
import { RiskReasonRequiredError } from './StudentErrors';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';

/**
 * Marca o quita la condición de "riesgo académico" de un estudiante (HU-11).
 * Al marcar se exige un motivo y se registra la fecha; al quitar la marca se
 * limpian el motivo y la fecha.
 */
export class MarkStudentRiskUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly guard: StudentAccessGuard,
  ) {}

  async execute(id: string, input: MarkStudentRiskInput, requesterId: string): Promise<Student> {
    await this.guard.assertAccess(requesterId, id);

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
