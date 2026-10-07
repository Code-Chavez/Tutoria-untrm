import { SupportContact } from '@domain/entities/SupportContact';
import { SupportContactRepository } from '@domain/repositories/SupportContactRepository';
import { StudentAccessGuard } from '@application/access/StudentAccessGuard';

/** Consulta la persona de red de apoyo de un estudiante (o null si no tiene), si el solicitante tiene alcance sobre él. */
export class GetSupportContactUseCase {
  constructor(
    private readonly contacts: SupportContactRepository,
    private readonly guard: StudentAccessGuard,
  ) {}

  async execute(studentId: string, requesterId: string): Promise<SupportContact | null> {
    await this.guard.assertAccess(requesterId, studentId);
    return this.contacts.findByStudent(studentId);
  }
}
