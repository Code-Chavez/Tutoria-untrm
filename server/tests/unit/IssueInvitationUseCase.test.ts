import { IssueInvitationUseCase } from '@application/use-cases/users/IssueInvitationUseCase';
import { UserNotFoundError } from '@application/use-cases/users/UpdateUserUseCase';
import { buildInvitationEmail } from '@application/services/invitationEmail';
import { hashSecretToken } from '@application/use-cases/auth/secretToken';
import { UserRepository } from '@domain/repositories/UserRepository';
import { PasswordResetTokenRepository } from '@domain/repositories/PasswordResetTokenRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { Mailer } from '@application/ports/Mailer';
import { User } from '@domain/entities/User';

const config = { publicUrl: 'https://sit.example.test/', ttlHours: 72 };

describe('IssueInvitationUseCase (acceso único, A01)', () => {
  let users: jest.Mocked<UserRepository>;
  let tokens: jest.Mocked<PasswordResetTokenRepository>;
  let mailer: jest.Mocked<Mailer>;
  let audit: jest.Mocked<AuditLogRepository>;
  let useCase: IssueInvitationUseCase;

  beforeEach(() => {
    users = { findById: jest.fn().mockResolvedValue({ id: 'u1', email: 'ana@untrm.edu.pe', firstName: 'Ana', lastName: 'Ruiz' } as User) } as unknown as jest.Mocked<UserRepository>;
    tokens = { create: jest.fn().mockResolvedValue({}), invalidatePendingForUser: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<PasswordResetTokenRepository>;
    mailer = { send: jest.fn().mockResolvedValue(undefined) };
    audit = { create: jest.fn().mockResolvedValue({}) } as unknown as jest.Mocked<AuditLogRepository>;
    useCase = new IssueInvitationUseCase(users, tokens, mailer, audit, config);
  });

  it('genera un enlace de activación con un token largo y aleatorio, y envía el correo', async () => {
    const result = await useCase.execute('admin-1', 'u1');

    expect(result.link).toMatch(/^https:\/\/sit\.example\.test\/activar-cuenta\/[0-9a-f]{64}$/);
    expect(result.emailSent).toBe(true);
    expect(mailer.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'ana@untrm.edu.pe' }));
  });

  it('en la base solo queda la huella del token y su vencimiento, nunca el token', async () => {
    const result = await useCase.execute('admin-1', 'u1');
    const token = result.link.split('/').pop() as string;

    const saved = tokens.create.mock.calls[0][0];
    expect(saved.tokenHash).toBe(hashSecretToken(token));
    expect(saved.tokenHash).not.toBe(token);
    expect(saved.userId).toBe('u1');
    const hours = (saved.expiresAt.getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(71.9);
    expect(hours).toBeLessThanOrEqual(72);
  });

  it('invalida las invitaciones anteriores (reemitir deja un solo enlace vigente)', async () => {
    await useCase.execute('admin-1', 'u1');

    expect(tokens.invalidatePendingForUser).toHaveBeenCalledWith('u1');
    expect(tokens.invalidatePendingForUser.mock.invocationCallOrder[0]).toBeLessThan(tokens.create.mock.invocationCallOrder[0]);
  });

  it('dos invitaciones no comparten enlace', async () => {
    const a = await useCase.execute('admin-1', 'u1');
    const b = await useCase.execute('admin-1', 'u1');

    expect(a.link).not.toBe(b.link);
  });

  it('si el correo falla, la invitación existe y el enlace se entrega a quien administra; el error no incluye el enlace', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mailer.send.mockRejectedValue(new Error('SMTP caído'));

    const result = await useCase.execute('admin-1', 'u1');

    expect(result.emailSent).toBe(false);
    expect(result.link).toContain('/activar-cuenta/');
    expect(JSON.stringify(error.mock.calls)).not.toContain(result.link.split('/').pop() as string);
    error.mockRestore();
  });

  it('deja constancia en la bitácora sin el enlace ni el token', async () => {
    const result = await useCase.execute('admin-1', 'u1', '10.0.0.9');

    const entry = audit.create.mock.calls[0][0];
    expect(entry).toMatchObject({ userId: 'admin-1', action: 'INVITATION_ISSUED', entity: 'User', entityId: 'u1', ipAddress: '10.0.0.9' });
    expect(JSON.stringify(entry)).not.toContain(result.link.split('/').pop() as string);
  });

  it('una cuenta que no existe se rechaza sin generar nada', async () => {
    users.findById.mockResolvedValue(null);

    await expect(useCase.execute('admin-1', 'x')).rejects.toBeInstanceOf(UserNotFoundError);

    expect(tokens.create).not.toHaveBeenCalled();
    expect(mailer.send).not.toHaveBeenCalled();
  });
});

describe('buildInvitationEmail', () => {
  const mail = buildInvitationEmail({ email: 'ana@untrm.edu.pe', firstName: 'Ana', lastName: 'Ruiz' }, 'https://sit.example.test/activar-cuenta/abc', 72);

  it('no lleva ninguna clave y sí el enlace, el plazo y el aviso de un solo uso', () => {
    expect(mail.text).toContain('https://sit.example.test/activar-cuenta/abc');
    expect(mail.text).toMatch(/una sola vez y vence en 72 horas/);
    expect(mail.text).not.toMatch(/contraseña (inicial|temporal)|Tutor2026/i);
    expect(mail.html).toContain('href="https://sit.example.test/activar-cuenta/abc"');
  });

  it('es formal, avisa de no compartir el enlace y cómo pedir uno nuevo', () => {
    expect(mail.text).toContain('Estimado(a) Ana Ruiz:');
    expect(mail.text).toContain('Atentamente,');
    expect(mail.text).toMatch(/No comparta este enlace/);
    expect(mail.text).toMatch(/solicite uno nuevo/);
  });

  it('en el HTML escapa el nombre', () => {
    const html = buildInvitationEmail({ email: 'x@untrm.edu.pe', firstName: '<b>Ana</b>' }, 'https://sit.example.test/activar-cuenta/abc', 72).html as string;

    expect(html).toContain('&lt;b&gt;Ana&lt;/b&gt;');
    expect(html).not.toContain('<b>Ana</b>');
  });
});
