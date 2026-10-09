import { RefreshTokenRepository } from '@domain/repositories/RefreshTokenRepository';
import { hashRefreshToken } from './refreshTokenHash';

/** Cierra la sesión revocando su refresh token; es idempotente y no revela si el token existía. */
export class LogoutUseCase {
  constructor(private readonly refreshTokens: RefreshTokenRepository) {}

  async execute(refreshToken: string): Promise<void> {
    const stored = await this.refreshTokens.findByHash(hashRefreshToken(refreshToken));
    if (stored && !stored.revokedAt) await this.refreshTokens.revoke(stored.id);
  }
}
