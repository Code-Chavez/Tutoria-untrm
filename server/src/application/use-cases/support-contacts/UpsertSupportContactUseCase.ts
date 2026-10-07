import { SupportContact } from '@domain/entities/SupportContact';
import { SupportContactRepository } from '@domain/repositories/SupportContactRepository';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';
import { UpsertSupportContactInput } from '@application/dtos/supportContact.dto';

/**
 * Registra o actualiza la persona de red de apoyo de un estudiante
 * (HU-15, Anexo N° 3 sección II). Un contacto por estudiante.
 */
export class UpsertSupportContactUseCase {
  constructor(
    private readonly contacts: SupportContactRepository,
    private readonly guard: StudentAccessGuard,
  ) {}

  async execute(
    studentId: string,
    input: UpsertSupportContactInput,
    requesterId: string,
  ): Promise<SupportContact> {
    await this.guard.assertAccess(requesterId, studentId);

    return this.contacts.upsert(studentId, {
      fullName: input.fullName.trim(),
      relationship: input.relationship.trim(),
      age: input.age ?? null,
      occupation: input.occupation?.trim() || null,
      phone: input.phone.trim(),
    });
  }
}
