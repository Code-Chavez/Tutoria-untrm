import { Faculty } from '../entities/Faculty';

export interface FacultyRepository {
  findAll(): Promise<Faculty[]>;
}
