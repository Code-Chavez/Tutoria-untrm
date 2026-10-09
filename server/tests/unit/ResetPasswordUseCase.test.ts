import { ResetPasswordUseCase, InvalidTokenError } from '@application/use-cases/auth/ResetPasswordUseCase';
import { hashSecretToken } from '@application/use-cases/auth/secretToken';
import { PasswordResetTokenRepository } from '@domain/repositories/PasswordResetTokenRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { PasswordHasher } from '@application/ports/PasswordHasher';

describe('ResetPasswordUseCase (A09)', () => {
  let tokens: jest.Mocked<PasswordResetTokenRepository>;
  let hasher: jest.Mocked<PasswordHasher>;
  let auditLogs: jest.Mocked<AuditLogRepository>;
  let useCase: ResetPasswordUseCase;

  beforeEach(() => {
    tokens = {
      create: jest.fn(),
      invalidatePendingForUser: jest.fn(),
      countCreatedSince: jest.fn(),
      redeem: jest.fn().mockResolvedValue('user-123'),
    };
    hasher = { hash: jest.fn().mockResolvedValue('nuevo-hash'), compare: jest.fn() };
    auditLogs = { create: jest.fn(), findAll: jest.fn() } as unknown as jest.Mocked<AuditLogRepository>;
    useCase = new ResetPasswordUseCase(tokens, hasher, auditLogs);
  });

  it('canjea el hash del token (no el token) con la contraseña ya hasheada y lo deja en la bitácora', async () => {
    await useCase.execute({ token: 'abc123', newPassword: 'Nueva2026!' }, '10.0.0.9');

    expect(hasher.hash).toHaveBeenCalledWith('Nueva2026!');
    expect(tokens.redeem).toHaveBeenCalledWith(hashSecretToken('abc123'), 'nuevo-hash', expect.any(Date));
    expect(JSON.stringify(tokens.redeem.mock.calls)).not.toContain('"abc123"');
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-123', action: 'PASSWORD_RESET', ipAddress: '10.0.0.9' }),
    );
  });

  it('un token inexistente, usado o vencido se rechaza sin tocar la bitácora', async () => {
    tokens.redeem.mockResolvedValue(null);
    await expect(useCase.execute({ token: 'malo', newPassword: 'Nueva2026!' })).rejects.toBeInstanceOf(InvalidTokenError);
    expect(auditLogs.create).not.toHaveBeenCalled();
  });

  it('el segundo uso del mismo enlace se rechaza (un solo uso)', async () => {
    tokens.redeem.mockResolvedValueOnce('user-123').mockResolvedValueOnce(null);
    await useCase.execute({ token: 'abc123', newPassword: 'Nueva2026!' });
    await expect(useCase.execute({ token: 'abc123', newPassword: 'Otra2026!' })).rejects.toBeInstanceOf(InvalidTokenError);
  });
});
