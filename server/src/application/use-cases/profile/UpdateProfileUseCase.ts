import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { ProfileOutput, UpdateProfileInput } from '@application/dtos/profile.dto';
import { ProfileUserNotFoundError } from './ProfileErrors';

export class UpdateProfileUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
  ) {}

  async execute(userId: string, input: UpdateProfileInput): Promise<ProfileOutput> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new ProfileUserNotFoundError();
    }

    // El perfil propio solo permite editar datos de contacto, nunca el rol
    // ni el estado: esas operaciones viven en la gestión de usuarios (HU-03).
    const updated = await this.users.update(userId, {
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.photoUrl !== undefined && { photoUrl: input.photoUrl }),
    });

    const role = await this.roles.findById(updated.roleId);

    return {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone ?? null,
      photoUrl: updated.photoUrl ?? null,
      role: role?.name ?? 'Desconocido',
    };
  }
}
