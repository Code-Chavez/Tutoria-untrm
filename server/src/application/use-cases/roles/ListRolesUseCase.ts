import { RoleRepository } from '@domain/repositories/RoleRepository';
import { Role } from '@domain/entities/Role';

export class ListRolesUseCase {
  constructor(private readonly roleRepository: RoleRepository) {}

  async execute(): Promise<Role[]> {
    return this.roleRepository.findAll();
  }
}
