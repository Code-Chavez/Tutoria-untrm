import {
  RequestPasswordResetUseCase,
  DEFAULT_PASSWORD_RESET_CONFIG,
} from '@application/use-cases/auth/RequestPasswordResetUseCase';
import { hashSecretToken } from '@application/use-cases/auth/secretToken';
import { UserRepository } from '@domain/repositories/UserRepository';
import { PasswordResetTokenRepository } from '@domain/repositories/PasswordResetTokenRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { Mailer, MailMessage } from '@application/ports/Mailer';
import { User } from '@domain/entities/User';

describe('RequestPasswordResetUseCase (A09)', () => {
  let users: jest.Mocked<UserRepository>;
  let tokens: jest.Mocked<PasswordResetTokenRepository>;
  let mailer: jest.Mocked<Mailer>;
  let auditLogs: jest.Mocked<AuditLogRepository>;
  let useCase: RequestPasswordResetUseCase;
  let sent: MailMessage[];

  const user = {
    id: 'user-123',
    email: 'test@untrm.edu.pe',
    firstName: 'Ana',
    isActive: true,
  } as User;

  beforeEach(() => {
    sent = [];
    users = { findByEmail: jest.fn().mockResolvedValue(user) } as unknown as jest.Mocked<UserRepository>;
    tokens = {
      create: jest.fn().mockResolvedValue({}),
      invalidatePendingForUser: jest.fn().mockResolvedValue(undefined),
      countCreatedSince: jest.fn().mockResolvedValue(0),
      redeem: jest.fn(),
    };
    mailer = {
      send: jest.fn().mockImplementation(async (m: MailMessage) => {
        sent.push(m);
      }),
    };
    auditLogs = { create: jest.fn(), findAll: jest.fn() } as unknown as jest.Mocked<AuditLogRepository>;
    useCase = new RequestPasswordResetUseCase(users, tokens, mailer, auditLogs, {
      ...DEFAULT_PASSWORD_RESET_CONFIG,
      publicUrl: 'https://sit.untrm.edu.pe/',
    });
  });

  it('envía el correo con el enlace público y guarda solo el hash del token', async () => {
    await useCase.execute('Test@untrm.edu.pe');

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('test@untrm.edu.pe');
    const token = sent[0].text.match(/https:\/\/sit\.untrm\.edu\.pe\/reset-password\/([0-9a-f]{64})/)?.[1];
    expect(token).toBeDefined();
    expect(sent[0].html).toContain(`https://sit.untrm.edu.pe/reset-password/${token}`);

    const stored = tokens.create.mock.calls[0][0];
    expect(stored.tokenHash).toBe(hashSecretToken(token as string));
    expect(JSON.stringify(stored)).not.toContain(token as string);
    expect(stored.userId).toBe('user-123');
    expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now() + 55 * 60_000);
  });

  it('invalida los enlaces anteriores antes de crear el nuevo', async () => {
    await useCase.execute('test@untrm.edu.pe');
    expect(tokens.invalidatePendingForUser).toHaveBeenCalledWith('user-123');
    expect(tokens.invalidatePendingForUser.mock.invocationCallOrder[0]).toBeLessThan(tokens.create.mock.invocationCallOrder[0]);
  });

  it('no revela si la cuenta existe: ni correo ni token para un correo desconocido o una cuenta inactiva', async () => {
    users.findByEmail.mockResolvedValue(null);
    await expect(useCase.execute('nadie@untrm.edu.pe')).resolves.toBeUndefined();
    users.findByEmail.mockResolvedValue({ ...user, isActive: false });
    await expect(useCase.execute('test@untrm.edu.pe')).resolves.toBeUndefined();
    expect(mailer.send).not.toHaveBeenCalled();
    expect(tokens.create).not.toHaveBeenCalled();
  });

  it('limita las solicitudes por usuario: pasado el máximo no genera ni envía otro enlace', async () => {
    tokens.countCreatedSince.mockResolvedValue(DEFAULT_PASSWORD_RESET_CONFIG.maxRequestsPerHour);
    await expect(useCase.execute('test@untrm.edu.pe')).resolves.toBeUndefined();
    expect(tokens.create).not.toHaveBeenCalled();
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('si el correo no se puede enviar, no falla hacia afuera y el token no llega a los registros', async () => {
    const errors: unknown[][] = [];
    const spy = jest.spyOn(console, 'error').mockImplementation((...args) => {
      errors.push(args);
    });
    mailer.send.mockImplementation(async (m: MailMessage) => {
      sent.push(m);
      throw new Error('conexión rechazada');
    });

    await expect(useCase.execute('test@untrm.edu.pe')).resolves.toBeUndefined();

    const token = sent[0].text.match(/reset-password\/([0-9a-f]{64})/)?.[1] as string;
    expect(errors).toHaveLength(1);
    expect(JSON.stringify(errors)).not.toContain(token);
    spy.mockRestore();
  });

  it('deja constancia de la solicitud en la bitácora, sin el token', async () => {
    await useCase.execute('test@untrm.edu.pe', '10.0.0.9');
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-123', action: 'PASSWORD_RESET_REQUEST', ipAddress: '10.0.0.9', details: null }),
    );
  });
});
