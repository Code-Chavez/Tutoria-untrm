import { PasswordResetTokenRepository } from '@domain/repositories/PasswordResetTokenRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { PasswordHasher } from '../../ports/PasswordHasher';
import { ResetPasswordInput } from '../../dtos/auth.dto';
import { hashSecretToken } from './secretToken';

export class InvalidTokenError extends Error {
  constructor() {
    super('El enlace de recuperación es inválido o ha expirado.');
    this.name = 'InvalidTokenError';
  }
}

/**
 * Restablece la contraseña con el enlace del correo (A09). El canje es atómico y de un solo uso:
 * dos peticiones con el mismo enlace no pueden ganar a la vez, y al cambiar la contraseña se
 * invalidan los demás enlaces pendientes y se cierran todas las sesiones de la persona.
 */
export class ResetPasswordUseCase {
  constructor(
    private readonly tokens: PasswordResetTokenRepository,
    private readonly hasher: PasswordHasher,
    private readonly auditLogs: AuditLogRepository,
  ) {}

  async execute(input: ResetPasswordInput, ipAddress?: string): Promise<void> {
    const passwordHash = await this.hasher.hash(input.newPassword);
    const userId = await this.tokens.redeem(hashSecretToken(input.token), passwordHash, new Date());
    if (!userId) throw new InvalidTokenError();

    await this.auditLogs.create({
      userId,
      action: 'PASSWORD_RESET',
      entity: 'User',
      entityId: userId,
      details: 'Contraseña restablecida con enlace de recuperación; se cerraron todas las sesiones.',
      ipAddress: ipAddress ?? null,
    });
  }
}
