import { Role } from '@domain/entities/Role';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { RoleAlreadyExistsError } from './RoleErrors';

export class CreateRoleUseCase {
  constructor(private readonly roles: RoleRepository) {}

  /**
   * Crea el rol y deja en la bitácora quién lo creó, en una sola transacción del repositorio: si falla la bitácora no queda el
   * rol, y si falla la creación (p. ej. un nombre repetido) no queda ningún registro.
   */
  async execute(data: { name: string; description: string }, actingUserId: string, ipAddress?: string | null): Promise<Role> {
    const name = data.name.trim();
    if (await this.roles.findByName(name)) {
      throw new RoleAlreadyExistsError(data.name);
    }
    return this.roles.create({ name, description: data.description }, { userId: actingUserId, ipAddress: ipAddress ?? null });
  }
}
