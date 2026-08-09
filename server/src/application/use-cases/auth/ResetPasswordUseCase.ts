import { UserRepository, PasswordResetTokenRepository } from '../../../domain/repositories';
import { PasswordHasher } from '../../ports/PasswordHasher';
import { ResetPasswordInput } from '../../dtos/auth.dto';

export class InvalidTokenError extends Error {
  constructor() {
    super('El enlace de recuperación es inválido o ha expirado.');
    this.name = 'InvalidTokenError';
  }
}

export class ResetPasswordUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenRepository: PasswordResetTokenRepository,
    private readonly hasher: PasswordHasher
  ) {}

  async execute(input: ResetPasswordInput): Promise<void> {
    const record = await this.tokenRepository.findByToken(input.token);

    if (!record || record.used || record.expiresAt < new Date()) {
      throw new InvalidTokenError();
    }

    const passwordHash = await this.hasher.hash(input.newPassword);

    await this.userRepository.update(record.userId, {
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    await this.tokenRepository.markAsUsed(record.id);
  }
}
