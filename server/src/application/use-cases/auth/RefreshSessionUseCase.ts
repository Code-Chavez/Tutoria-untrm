import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { RefreshTokenRepository } from '@domain/repositories/RefreshTokenRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { TokenService } from '@application/ports/TokenService';
import { REFRESH_TOKEN_DAYS } from './LoginUseCase';
import { hashRefreshToken } from './refreshTokenHash';
import { SystemParameterRepository } from '@domain/repositories/SystemParameterRepository';
import { loadSecurityPolicy } from '@application/use-cases/system-parameters/securityPolicy';

export class InvalidRefreshTokenError extends Error {
  constructor() {
    super('La sesión expiró. Inicia sesión nuevamente.');
    this.name = 'InvalidRefreshTokenError';
  }
}

/**
 * Dos pestañas pueden renovar a la vez con el mismo token; dentro de esta
 * ventana un token ya rotado se rechaza sin tratarlo como robo.
 */
export const ROTATION_GRACE_MS = 10_000;

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Renueva la sesión con rotación de refresh token (A16): cada token sirve una
 * sola vez. Presentar uno ya rotado fuera de la ventana de gracia indica que se
 * copió, así que se cierran todas las sesiones de la persona.
 */
export class RefreshSessionUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly auditLogs: AuditLogRepository,
    private readonly tokens: TokenService,
    private readonly parameters: SystemParameterRepository,
    /** Vida del access token: una persona activa renueva como mucho cada tanto, así que ese margen no es inactividad. */
    private readonly accessTokenMinutes: number,
  ) {}

  async execute(refreshToken: string, ipAddress?: string): Promise<SessionTokens> {
    const stored = await this.refreshTokens.findByHash(hashRefreshToken(refreshToken));
    if (!stored) throw new InvalidRefreshTokenError();

    if (stored.revokedAt) {
      if (Date.now() - stored.revokedAt.getTime() > ROTATION_GRACE_MS) {
        await this.refreshTokens.deleteAllForUser(stored.userId);
        await this.auditLogs.create({
          userId: stored.userId,
          action: 'REFRESH_TOKEN_REUSE',
          entity: 'User',
          entityId: stored.userId,
          details: 'Se presentó un refresh token ya rotado; se cerraron todas las sesiones.',
          ipAddress: ipAddress ?? null,
        });
      }
      throw new InvalidRefreshTokenError();
    }

    if (stored.expiresAt <= new Date()) throw new InvalidRefreshTokenError();

    // Inactividad hecha valer en el servidor (RF-07, A08): cada renovación entrega un token nuevo, así que la edad de este
    // es el tiempo desde la última actividad renovada. Si pasó más que el plazo configurado (más la vida del access token),
    // la sesión terminó aunque el cliente no la haya cerrado.
    const policy = await loadSecurityPolicy(this.parameters);
    const idleLimitMs = (policy.idleTimeoutMinutes + this.accessTokenMinutes) * 60_000;
    if (Date.now() - stored.createdAt.getTime() > idleLimitMs) {
      await this.refreshTokens.deleteAllForUser(stored.userId);
      throw new InvalidRefreshTokenError();
    }

    const user = await this.users.findById(stored.userId);
    if (!user || !user.isActive) {
      await this.refreshTokens.deleteAllForUser(stored.userId);
      throw new InvalidRefreshTokenError();
    }

    if (!(await this.refreshTokens.revoke(stored.id))) throw new InvalidRefreshTokenError();

    const role = await this.roles.findById(user.roleId);
    const nextRefreshToken = this.tokens.generateRefreshToken();
    await this.refreshTokens.create({
      tokenHash: hashRefreshToken(nextRefreshToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60_000),
    });

    return {
      accessToken: this.tokens.generateAccessToken({
        sub: user.id,
        email: user.email,
        role: role?.name ?? 'Desconocido',
      }),
      refreshToken: nextRefreshToken,
    };
  }
}
