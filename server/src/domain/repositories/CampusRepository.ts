import { Campus } from '../entities/Campus';

export interface CampusRepository {
  findAll(): Promise<Campus[]>;
  findById(id: string): Promise<Campus | null>;
  create(name: string): Promise<Campus>;
  rename(id: string, name: string): Promise<Campus>;
  setActive(id: string, isActive: boolean): Promise<Campus>;
  /** Cambia la sede de una escuela. */
  setSchoolCampus(schoolId: string, campusId: string): Promise<void>;
}
