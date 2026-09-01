import { UserRepository } from '@domain/repositories/UserRepository';
import { RefreshTokenRepository } from '@domain/repositories/RefreshTokenRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { PasswordHasher } from '@application/ports/PasswordHasher';
import { ChangePasswordInput } from '@application/dtos/profile.dto';
import {
  ProfileUserNotFoundError,
  IncorrectCurrentPasswordError,
  SamePasswordError,
} from './ProfileErrors';

export class ChangePasswordUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly auditLogs: AuditLogRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: ChangePasswordInput): Promise<void> {
    const user = await this.users.findById(input.userId);
    if (!user) {
      throw new ProfileUserNotFoundError();
    }

    const currentOk = await this.hasher.compare(input.currentPassword, user.passwordHash);
    if (!currentOk) {
      throw new IncorrectCurrentPasswordError();
    }

    const reused = await this.hasher.compare(input.newPassword, user.passwordHash);
    if (reused) {
      throw new SamePasswordError();
    }

    const passwordHash = await this.hasher.hash(input.newPassword);
    await this.users.update(user.id, { passwordHash });

    // Cambiar la clave cierra las demás sesiones: los refresh tokens dejan de
    // ser válidos, así que al expirar el access token habrá que reingresar.
    await this.refreshTokens.deleteAllForUser(user.id);

    await this.auditLogs.create({
      userId: user.id,
      action: 'CHANGE_PASSWORD',
      entity: 'User',
      entityId: user.id,
      details: null,
      ipAddress: null,
    });
  }
}
