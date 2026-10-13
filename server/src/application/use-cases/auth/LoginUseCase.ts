import { UserRepository } from '@domain/repositories/UserRepository';
import { normalizeEmail } from '@application/use-cases/users/normalizeEmail';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { RefreshTokenRepository } from '@domain/repositories/RefreshTokenRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { PasswordHasher } from '@application/ports/PasswordHasher';
import { TokenService } from '@application/ports/TokenService';
import { hashRefreshToken } from './refreshTokenHash';
import { LoginInput, LoginOutput } from '@application/dtos/auth.dto';

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Credenciales inválidas');
    this.name = 'InvalidCredentialsError';
  }
}

export class AccountLockedError extends Error {
  constructor(public readonly lockedUntil: Date) {
    super('Cuenta bloqueada temporalmente por intentos fallidos');
    this.name = 'AccountLockedError';
  }
}

export class AccountInactiveError extends Error {
  constructor() {
    super('La cuenta está desactivada');
    this.name = 'AccountInactiveError';
  }
}

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_DURATION_MINUTES = 15;
export const REFRESH_TOKEN_DAYS = 7;

export class LoginUseCase {
  // Hash falso con el mismo costo que los reales: permite gastar el mismo tiempo cuando el correo no existe.
  private dummyHash: Promise<string> | undefined;

  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly auditLogs: AuditLogRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const user = await this.users.findByEmail(normalizeEmail(input.email));

    if (!user) {
      // Sin esto, responder en milisegundos delata que el correo no está registrado (A07).
      this.dummyHash ??= this.hasher.hash('clave-que-nadie-usa');
      await this.hasher.compare(input.password, await this.dummyHash);
      throw new InvalidCredentialsError();
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AccountLockedError(user.lockedUntil);
    }

    const passwordOk = await this.hasher.compare(input.password, user.passwordHash);

    if (!passwordOk) {
      const attempts = user.failedLoginAttempts + 1;
      const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;

      await this.users.update(user.id, {
        failedLoginAttempts: shouldLock ? 0 : attempts,
        lockedUntil: shouldLock
          ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60_000)
          : null,
      });

      throw new InvalidCredentialsError();
    }

    // El estado de la cuenta solo se revela a quien conoce su contraseña: antes bastaba con el correo.
    if (!user.isActive) {
      throw new AccountInactiveError();
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.users.update(user.id, {
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
    }

    const role = await this.roles.findById(user.roleId);
    const roleName = role?.name ?? 'Desconocido';

    const accessToken = this.tokens.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: roleName,
    });

    const refreshToken = this.tokens.generateRefreshToken();
    await this.refreshTokens.create({
      tokenHash: hashRefreshToken(refreshToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60_000),
    });

    await this.auditLogs.create({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      details: null,
      ipAddress: input.ipAddress ?? null,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: roleName,
        service: user.service,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }
}
