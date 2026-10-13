import { SystemParameterRepository } from '@domain/repositories/SystemParameterRepository';
import {
  LoginUseCase,
  InvalidCredentialsError,
  AccountLockedError,
  AccountInactiveError,
  MAX_FAILED_ATTEMPTS,
} from '@application/use-cases/auth/LoginUseCase';
import { User } from '@domain/entities/User';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { hashRefreshToken } from '@application/use-cases/auth/refreshTokenHash';
import { RefreshTokenRepository } from '@domain/repositories/RefreshTokenRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { PasswordHasher } from '@application/ports/PasswordHasher';
import { TokenService } from '@application/ports/TokenService';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'tutor@untrm.edu.pe',
    passwordHash: 'hashed-password',
    firstName: 'Juan',
    lastName: 'Pérez',
    phone: null,
    photoUrl: null,
    roleId: 'role-1',
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    mustChangePassword: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function buildMocks() {
  const users: jest.Mocked<UserRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const roles: jest.Mocked<RoleRepository> = {
    findById: jest.fn().mockResolvedValue({
      id: 'role-1',
      name: 'Docente Tutor',
      description: '',
      createdAt: new Date(),
    }),
    findByName: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  };
  const refreshTokens: jest.Mocked<RefreshTokenRepository> = {
    create: jest.fn().mockResolvedValue({
      id: 'rt-1',
      tokenHash: 'hash',
      revokedAt: null,
      userId: 'user-1',
      expiresAt: new Date(),
      createdAt: new Date(),
    }),
    findByHash: jest.fn(),
    revoke: jest.fn(),
    deleteAllForUser: jest.fn(),
  };
  const auditLogs: jest.Mocked<AuditLogRepository> = {
    create: jest.fn().mockResolvedValue({
      id: 'log-1',
      userId: 'user-1',
      action: 'LOGIN',
      entity: 'User',
      entityId: 'user-1',
      details: null,
      ipAddress: null,
      createdAt: new Date(),
    }),
    findAll: jest.fn(),
  };
  const hasher: jest.Mocked<PasswordHasher> = {
    hash: jest.fn(),
    compare: jest.fn(),
  };
  const tokens: jest.Mocked<TokenService> = {
    generateAccessToken: jest.fn().mockReturnValue('access-token'),
    generateRefreshToken: jest.fn().mockReturnValue('refresh-token'),
    verifyAccessToken: jest.fn(),
  };

  const parameters = { findByKey: jest.fn(), findAll: jest.fn().mockResolvedValue([]), create: jest.fn(), update: jest.fn() } as unknown as jest.Mocked<SystemParameterRepository>;
  const useCase = new LoginUseCase(users, roles, refreshTokens, auditLogs, hasher, tokens, parameters);

  return { useCase, users, roles, refreshTokens, auditLogs, hasher, tokens, parameters };
}

describe('LoginUseCase', () => {
  it('devuelve tokens y datos del usuario con credenciales válidas', async () => {
    const { useCase, users, hasher, refreshTokens, auditLogs } = buildMocks();
    users.findByEmail.mockResolvedValue(buildUser());
    hasher.compare.mockResolvedValue(true);

    const result = await useCase.execute({
      email: 'tutor@untrm.edu.pe',
      password: 'Password123!',
      ipAddress: '10.0.0.1',
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.sessionPolicy).toEqual({ idleTimeoutMinutes: 15 });
    expect(result.user).toEqual({
      id: 'user-1',
      email: 'tutor@untrm.edu.pe',
      firstName: 'Juan',
      lastName: 'Pérez',
      role: 'Docente Tutor',
      mustChangePassword: false,
    });
    expect(refreshTokens.create).toHaveBeenCalledWith(
      expect.objectContaining({ tokenHash: hashRefreshToken('refresh-token'), userId: 'user-1' }),
    );
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN', ipAddress: '10.0.0.1' }),
    );
  });

  it('avisa cuando la cuenta debe cambiar su clave temporal', async () => {
    const { useCase, users, hasher } = buildMocks();
    users.findByEmail.mockResolvedValue(buildUser({ mustChangePassword: true }));
    hasher.compare.mockResolvedValue(true);

    const result = await useCase.execute({ email: 'tutor@untrm.edu.pe', password: 'Temporal123' });

    expect(result.user.mustChangePassword).toBe(true);
  });

  it('normaliza el email (mayúsculas y espacios) antes de buscar', async () => {
    const { useCase, users, hasher } = buildMocks();
    users.findByEmail.mockResolvedValue(buildUser());
    hasher.compare.mockResolvedValue(true);

    await useCase.execute({
      email: '  TUTOR@untrm.edu.pe  ',
      password: 'Password123!',
    });

    expect(users.findByEmail).toHaveBeenCalledWith('tutor@untrm.edu.pe');
  });

  it('lanza InvalidCredentialsError si el usuario no existe', async () => {
    const { useCase, users } = buildMocks();
    users.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ email: 'nadie@untrm.edu.pe', password: 'Password123!' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('lanza InvalidCredentialsError e incrementa intentos si la contraseña es incorrecta', async () => {
    const { useCase, users, hasher } = buildMocks();
    users.findByEmail.mockResolvedValue(buildUser({ failedLoginAttempts: 1 }));
    hasher.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({ email: 'tutor@untrm.edu.pe', password: 'incorrecta1' }),
    ).rejects.toThrow(InvalidCredentialsError);

    expect(users.update).toHaveBeenCalledWith('user-1', {
      failedLoginAttempts: 2,
      lockedUntil: null,
    });
  });

  it('bloquea la cuenta al alcanzar el máximo de intentos fallidos', async () => {
    const { useCase, users, hasher } = buildMocks();
    users.findByEmail.mockResolvedValue(
      buildUser({ failedLoginAttempts: MAX_FAILED_ATTEMPTS - 1 }),
    );
    hasher.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({ email: 'tutor@untrm.edu.pe', password: 'incorrecta1' }),
    ).rejects.toThrow(InvalidCredentialsError);

    const updateArg = users.update.mock.calls[0][1];
    expect(updateArg.failedLoginAttempts).toBe(0);
    expect(updateArg.lockedUntil).toBeInstanceOf(Date);
    expect((updateArg.lockedUntil as Date).getTime()).toBeGreaterThan(Date.now());
  });

  it('lanza AccountLockedError si la cuenta está bloqueada y vigente', async () => {
    const { useCase, users } = buildMocks();
    const lockedUntil = new Date(Date.now() + 10 * 60_000);
    users.findByEmail.mockResolvedValue(buildUser({ lockedUntil }));

    await expect(
      useCase.execute({ email: 'tutor@untrm.edu.pe', password: 'Password123!' }),
    ).rejects.toThrow(AccountLockedError);
  });

  it('permite login si el bloqueo ya expiró y resetea los contadores', async () => {
    const { useCase, users, hasher } = buildMocks();
    const expiredLock = new Date(Date.now() - 60_000);
    users.findByEmail.mockResolvedValue(
      buildUser({ lockedUntil: expiredLock, failedLoginAttempts: 0 }),
    );
    hasher.compare.mockResolvedValue(true);

    const result = await useCase.execute({
      email: 'tutor@untrm.edu.pe',
      password: 'Password123!',
    });

    expect(result.accessToken).toBe('access-token');
    expect(users.update).toHaveBeenCalledWith('user-1', {
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  });

  it('lanza AccountInactiveError si la cuenta está desactivada y la contraseña es correcta', async () => {
    const { useCase, users, hasher } = buildMocks();
    users.findByEmail.mockResolvedValue(buildUser({ isActive: false }));
    hasher.compare.mockResolvedValue(true);

    await expect(
      useCase.execute({ email: 'tutor@untrm.edu.pe', password: 'Password123!' }),
    ).rejects.toThrow(AccountInactiveError);
  });

  it('con la contraseña incorrecta no revela que la cuenta está desactivada', async () => {
    const { useCase, users, hasher } = buildMocks();
    users.findByEmail.mockResolvedValue(buildUser({ isActive: false }));
    hasher.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({ email: 'tutor@untrm.edu.pe', password: 'incorrecta1' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('con un correo inexistente también gasta una comparación de contraseña (mismo tiempo de respuesta)', async () => {
    const { useCase, users, hasher } = buildMocks();
    users.findByEmail.mockResolvedValue(null);
    hasher.hash.mockResolvedValue('hash-falso');
    hasher.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({ email: 'nadie@untrm.edu.pe', password: 'incorrecta1' }),
    ).rejects.toThrow(InvalidCredentialsError);
    expect(hasher.compare).toHaveBeenCalledTimes(1);
  });

  it('no registra audit log ni refresh token cuando el login falla', async () => {
    const { useCase, users, hasher, auditLogs, refreshTokens } = buildMocks();
    users.findByEmail.mockResolvedValue(buildUser());
    hasher.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({ email: 'tutor@untrm.edu.pe', password: 'incorrecta1' }),
    ).rejects.toThrow(InvalidCredentialsError);

    expect(auditLogs.create).not.toHaveBeenCalled();
    expect(refreshTokens.create).not.toHaveBeenCalled();
  });

  describe('política de acceso desde los parámetros del sistema (A08)', () => {
    const stored = (entries: Record<string, string>) => Object.entries(entries).map(([key, value]) => ({ id: key, key, value, label: key }));

    it('bloquea al llegar al número de intentos configurado, no a uno fijo', async () => {
      const { useCase, users, hasher, parameters } = buildMocks();
      parameters.findAll.mockResolvedValue(stored({ login_max_attempts: '3', login_lockout_minutes: '30' }));
      users.findByEmail.mockResolvedValue(buildUser({ failedLoginAttempts: 2 }));
      hasher.compare.mockResolvedValue(false);

      await expect(useCase.execute({ email: 'tutor@untrm.edu.pe', password: 'incorrecta1' })).rejects.toThrow(InvalidCredentialsError);

      const update = users.update.mock.calls[0][1];
      expect(update.failedLoginAttempts).toBe(0);
      const minutes = ((update.lockedUntil as Date).getTime() - Date.now()) / 60_000;
      expect(minutes).toBeGreaterThan(29);
      expect(minutes).toBeLessThanOrEqual(30);
    });

    it('con un límite mayor no bloquea antes de tiempo', async () => {
      const { useCase, users, hasher, parameters } = buildMocks();
      parameters.findAll.mockResolvedValue(stored({ login_max_attempts: '8' }));
      users.findByEmail.mockResolvedValue(buildUser({ failedLoginAttempts: 5 }));
      hasher.compare.mockResolvedValue(false);

      await expect(useCase.execute({ email: 'tutor@untrm.edu.pe', password: 'incorrecta1' })).rejects.toThrow(InvalidCredentialsError);

      expect(users.update.mock.calls[0][1]).toEqual({ failedLoginAttempts: 6, lockedUntil: null });
    });

    it('un valor mal guardado (fuera de rango o no numérico) no desactiva el control: rige el predeterminado', async () => {
      const { useCase, users, hasher, parameters } = buildMocks();
      parameters.findAll.mockResolvedValue(stored({ login_max_attempts: '9999', login_lockout_minutes: 'abc' }));
      users.findByEmail.mockResolvedValue(buildUser({ failedLoginAttempts: MAX_FAILED_ATTEMPTS - 1 }));
      hasher.compare.mockResolvedValue(false);

      await expect(useCase.execute({ email: 'tutor@untrm.edu.pe', password: 'incorrecta1' })).rejects.toThrow(InvalidCredentialsError);

      const update = users.update.mock.calls[0][1];
      expect(update.failedLoginAttempts).toBe(0);
      expect((update.lockedUntil as Date).getTime()).toBeGreaterThan(Date.now());
    });

    it('entrega al cliente el plazo de inactividad configurado', async () => {
      const { useCase, users, hasher, parameters } = buildMocks();
      parameters.findAll.mockResolvedValue(stored({ inactivity_timeout_minutes: '45' }));
      users.findByEmail.mockResolvedValue(buildUser());
      hasher.compare.mockResolvedValue(true);

      const result = await useCase.execute({ email: 'tutor@untrm.edu.pe', password: 'Password123!' });

      expect(result.sessionPolicy).toEqual({ idleTimeoutMinutes: 45 });
    });
  });
});
