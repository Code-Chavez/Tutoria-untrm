import { School } from '@domain/entities/School';
import { SchoolRepository } from '@domain/repositories/SchoolRepository';

export class ListSchoolsUseCase {
  constructor(private readonly schools: SchoolRepository) {}

  execute(): Promise<School[]> {
    return this.schools.findAll();
  }
}
