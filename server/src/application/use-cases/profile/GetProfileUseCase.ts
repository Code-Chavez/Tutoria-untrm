import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { ProfileOutput } from '@application/dtos/profile.dto';
import { ProfileUserNotFoundError } from './ProfileErrors';

export class GetProfileUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
  ) {}

  async execute(userId: string): Promise<ProfileOutput> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new ProfileUserNotFoundError();
    }

    const role = await this.roles.findById(user.roleId);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? null,
      photoUrl: user.photoUrl ?? null,
      role: role?.name ?? 'Desconocido',
    };
  }
}
