import { SupportContact } from '../entities/SupportContact';

export interface SupportContactRepository {
  findByStudent(studentId: string): Promise<SupportContact | null>;
  /** Crea el contacto del estudiante o actualiza el existente (un registro por estudiante). */
  upsert(
    studentId: string,
    data: Omit<SupportContact, 'id' | 'studentId' | 'createdAt' | 'updatedAt'>,
  ): Promise<SupportContact>;
}
