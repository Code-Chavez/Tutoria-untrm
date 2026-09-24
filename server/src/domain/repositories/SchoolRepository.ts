import { School } from '../entities/School';

export interface SchoolRepository {
  findAll(): Promise<School[]>;
  findById(id: string): Promise<School | null>;
}
