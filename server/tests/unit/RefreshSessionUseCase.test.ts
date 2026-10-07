import {
  RefreshSessionUseCase,
  InvalidRefreshTokenError,
  ROTATION_GRACE_MS,
} from '@application/use-cases/auth/RefreshSessionUseCase';
import { LogoutUseCase } from '@application/use-cases/auth/LogoutUseCase';
import { hashRefreshToken } from '@application/use-cases/auth/refreshTokenHash';
import { UserRepository } from '@domain/repositories/UserRepository';
import { RoleRepository } from '@domain/repositories/RoleRepository';
import { RefreshTokenRepository } from '@domain/repositories/RefreshTokenRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { TokenService } from '@application/ports/TokenService';
import { RefreshToken } from '@domain/entities/RefreshToken';

const stored = (extra: Partial<RefreshToken> = {}): RefreshToken => ({
  id: 'rt-1',
  tokenHash: hashRefreshToken('old-token'),
  userId: 'u1',
  expiresAt: new Date(Date.now() + 60_000),
  revokedAt: null,
  createdAt: new Date(),
  ...extra,
});

function build(token: RefreshToken | null, userExtra: Record<string, unknown> = {}) {
  const users = {
    findById: jest.fn().mockResolvedValue({ id: 'u1', email: 'a@untrm.edu.pe', roleId: 'r1', isActive: true, ...userExtra }),
  } as unknown as jest.Mocked<UserRepository>;
  const roles = { findById: jest.fn().mockResolvedValue({ id: 'r1', name: 'Docente Tutor' }) } as unknown as jest.Mocked<RoleRepository>;
  const refreshTokens = {
    findByHash: jest.fn().mockResolvedValue(token),
    create: jest.fn().mockResolvedValue({}),
    revoke: jest.fn().mockResolvedValue(true),
    deleteAllForUser: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<RefreshTokenRepository>;
  const auditLogs = { create: jest.fn() } as unknown as jest.Mocked<AuditLogRepository>;
  const tokens = {
    generateAccessToken: jest.fn().mockReturnValue('new-access'),
    generateRefreshToken: jest.fn().mockReturnValue('new-refresh'),
  } as unknown as jest.Mocked<TokenService>;
  const useCase = new RefreshSessionUseCase(users, roles, refreshTokens, auditLogs, tokens);
  return { useCase, refreshTokens, auditLogs, tokens };
}

describe('RefreshSessionUseCase (A16)', () => {
  it('rota el token: revoca el usado y entrega un par nuevo guardado solo como hash', async () => {
    const { useCase, refreshTokens, tokens } = build(stored());

    const res = await useCase.execute('old-token');

    expect(res).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh' });
    expect(refreshTokens.findByHash).toHaveBeenCalledWith(hashRefreshToken('old-token'));
    expect(refreshTokens.revoke).toHaveBeenCalledWith('rt-1');
    expect(refreshTokens.create).toHaveBeenCalledWith(
      expect.objectContaining({ tokenHash: hashRefreshToken('new-refresh'), userId: 'u1' }),
    );
    expect(tokens.generateAccessToken).toHaveBeenCalledWith({ sub: 'u1', email: 'a@untrm.edu.pe', role: 'Docente Tutor' });
  });

  it('rechaza un token desconocido o vencido', async () => {
    await expect(build(null).useCase.execute('x')).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    const expired = build(stored({ expiresAt: new Date(Date.now() - 1) }));
    await expect(expired.useCase.execute('old-token')).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    expect(expired.refreshTokens.create).not.toHaveBeenCalled();
  });

  it('un token ya rotado fuera de la ventana de gracia cierra todas las sesiones y queda auditado', async () => {
    const { useCase, refreshTokens, auditLogs } = build(stored({ revokedAt: new Date(Date.now() - ROTATION_GRACE_MS - 1000) }));

    await expect(useCase.execute('old-token')).rejects.toBeInstanceOf(InvalidRefreshTokenError);

    expect(refreshTokens.deleteAllForUser).toHaveBeenCalledWith('u1');
    expect(auditLogs.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'REFRESH_TOKEN_REUSE', userId: 'u1' }));
    expect(refreshTokens.create).not.toHaveBeenCalled();
  });

  it('dentro de la ventana de gracia (dos pestañas a la vez) rechaza sin cerrar las demás sesiones', async () => {
    const { useCase, refreshTokens } = build(stored({ revokedAt: new Date(Date.now() - 1000) }));

    await expect(useCase.execute('old-token')).rejects.toBeInstanceOf(InvalidRefreshTokenError);

    expect(refreshTokens.deleteAllForUser).not.toHaveBeenCalled();
  });

  it('si otra petición ganó la rotación, esta no emite tokens', async () => {
    const { useCase, refreshTokens } = build(stored());
    refreshTokens.revoke.mockResolvedValue(false);

    await expect(useCase.execute('old-token')).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    expect(refreshTokens.create).not.toHaveBeenCalled();
  });

  it('una cuenta desactivada no renueva y pierde todas sus sesiones', async () => {
    const { useCase, refreshTokens } = build(stored(), { isActive: false });

    await expect(useCase.execute('old-token')).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    expect(refreshTokens.deleteAllForUser).toHaveBeenCalledWith('u1');
    expect(refreshTokens.create).not.toHaveBeenCalled();
  });
});

describe('LogoutUseCase (A16)', () => {
  const repo = (token: RefreshToken | null) =>
    ({
      findByHash: jest.fn().mockResolvedValue(token),
      revoke: jest.fn().mockResolvedValue(true),
    }) as unknown as jest.Mocked<RefreshTokenRepository>;

  it('revoca el refresh token de la sesión', async () => {
    const refreshTokens = repo(stored());
    await new LogoutUseCase(refreshTokens).execute('old-token');
    expect(refreshTokens.revoke).toHaveBeenCalledWith('rt-1');
  });

  it('es idempotente: token desconocido o ya revocado no falla ni revoca', async () => {
    const unknown = repo(null);
    await expect(new LogoutUseCase(unknown).execute('x')).resolves.toBeUndefined();
    const revoked = repo(stored({ revokedAt: new Date() }));
    await new LogoutUseCase(revoked).execute('old-token');
    expect(unknown.revoke).not.toHaveBeenCalled();
    expect(revoked.revoke).not.toHaveBeenCalled();
  });
});
