import { Role } from '../entities/Role';

export interface RoleRepository {
  findById(id: string): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  findAll(): Promise<Role[]>;
  create(data: { name: string; description: string }): Promise<Role>;
}
