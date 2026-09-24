import { SupportContact } from '@domain/entities/SupportContact';
import { SupportContactRepository } from '@domain/repositories/SupportContactRepository';
import { StudentRepository } from '@domain/repositories/StudentRepository';
import { UpsertSupportContactInput } from '@application/dtos/supportContact.dto';
import { StudentNotFoundError } from '@application/use-cases/students/StudentErrors';

/**
 * Registra o actualiza la persona de red de apoyo de un estudiante
 * (HU-15, Anexo N° 3 sección II). Un contacto por estudiante.
 */
export class UpsertSupportContactUseCase {
  constructor(
    private readonly contacts: SupportContactRepository,
    private readonly students: StudentRepository,
  ) {}

  async execute(studentId: string, input: UpsertSupportContactInput): Promise<SupportContact> {
    const student = await this.students.findById(studentId);
    if (!student) {
      throw new StudentNotFoundError(studentId);
    }

    return this.contacts.upsert(studentId, {
      fullName: input.fullName.trim(),
      relationship: input.relationship.trim(),
      age: input.age ?? null,
      occupation: input.occupation?.trim() || null,
      phone: input.phone.trim(),
    });
  }
}
