import { SupportContact } from '@domain/entities/SupportContact';
import { SupportContactRepository } from '@domain/repositories/SupportContactRepository';

/** Consulta la persona de red de apoyo de un estudiante (o null si no tiene). */
export class GetSupportContactUseCase {
  constructor(private readonly contacts: SupportContactRepository) {}

  execute(studentId: string): Promise<SupportContact | null> {
    return this.contacts.findByStudent(studentId);
  }
}
