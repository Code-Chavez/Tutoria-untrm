import { Role } from '@domain/entities/Role';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { RoleAlreadyExistsError } from './RoleErrors';

export class CreateRoleUseCase {
  constructor(private readonly roles: RoleRepository) {}

  async execute(data: { name: string; description: string }): Promise<Role> {
    const existing = await this.roles.findByName(data.name.trim());
    if (existing) {
      throw new RoleAlreadyExistsError(data.name);
    }
    return this.roles.create({ name: data.name.trim(), description: data.description });
  }
}
