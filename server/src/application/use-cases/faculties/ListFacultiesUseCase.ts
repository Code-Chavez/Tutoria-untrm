import { Faculty } from '@domain/entities/Faculty';
import { FacultyRepository } from '@domain/repositories/FacultyRepository';

export class ListFacultiesUseCase {
  constructor(private readonly faculties: FacultyRepository) {}

  execute(): Promise<Faculty[]> {
    return this.faculties.findAll();
  }
}
