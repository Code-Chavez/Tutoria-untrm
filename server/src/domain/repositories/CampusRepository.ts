import { Campus, CampusKind } from '../entities/Campus';

export interface CampusRepository {
  findAll(): Promise<Campus[]>;
  findById(id: string): Promise<Campus | null>;
  create(name: string, kind?: CampusKind): Promise<Campus>;
  rename(id: string, name: string): Promise<Campus>;
  setActive(id: string, isActive: boolean): Promise<Campus>;
  setCity(id: string, city: string | null): Promise<Campus>;
  setKind(id: string, kind: CampusKind): Promise<Campus>;
  /** Cambia la sede principal de una escuela (reemplaza a la anterior). */
  setSchoolCampus(schoolId: string, campusId: string): Promise<void>;
  /** Todas las sedes donde se dicta cada escuela (la principal incluida). */
  campusIdsBySchool(): Promise<Map<string, string[]>>;
  campusIdsOf(schoolId: string): Promise<string[]>;
  /** Fija las sedes de la escuela; `mainCampusId` queda como sede principal y debe estar en la lista. */
  setSchoolCampuses(schoolId: string, campusIds: string[], mainCampusId: string): Promise<void>;
}
