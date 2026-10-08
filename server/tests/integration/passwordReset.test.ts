import { SMTPServer } from 'smtp-server';
import type { AddressInfo } from 'net';
import bcrypt from 'bcryptjs';
import { prisma } from '../../src/infrastructure/database/prisma';
import { PrismaUserRepository } from '../../src/infrastructure/repositories/PrismaUserRepository';
import { PrismaPasswordResetTokenRepository } from '../../src/infrastructure/repositories/PrismaPasswordResetTokenRepository';
import { PrismaAuditLogRepository } from '../../src/infrastructure/repositories/PrismaAuditLogRepository';
import { SmtpMailer } from '../../src/infrastructure/services/SmtpMailer';
import { BcryptPasswordHasher } from '../../src/infrastructure/services/BcryptPasswordHasher';
import {
  RequestPasswordResetUseCase,
  DEFAULT_PASSWORD_RESET_CONFIG,
} from '../../src/application/use-cases/auth/RequestPasswordResetUseCase';
import { ResetPasswordUseCase, InvalidTokenError } from '../../src/application/use-cases/auth/ResetPasswordUseCase';
import { hashSecretToken } from '../../src/application/use-cases/auth/secretToken';

/**
 * Recuperación de contraseña de punta a punta (A09): entrega real por SMTP a un buzón de prueba
 * (servidor SMTP en proceso), enlace correcto, segundo uso rechazado, sesiones cerradas y el
 * secreto ausente de los registros. Usa una cuenta propia de la prueba. Se omite sin base de
 * datos, salvo REQUIRE_DB_TESTS=1.
 */
const REQUIRE_DB = process.env.REQUIRE_DB_TESTS === '1';
jest.setTimeout(120_000);

const EMAIL = 'a09-prueba@untrm.edu.pe';
const PUBLIC_URL = 'https://sit.example.test';

describe('recuperación de contraseña con correo real (A09)', () => {
  let dbUp = false;
  let smtp: SMTPServer;
  let inbox: string[] = [];
  let userId = '';
  let request: RequestPasswordResetUseCase;
  let reset: ResetPasswordUseCase;
  const tokensRepo = new PrismaPasswordResetTokenRepository(prisma);

  const lastToken = () => {
    const raw = inbox[inbox.length - 1] ?? '';
    // El cuerpo SMTP puede venir con saltos "quoted-printable": se normaliza antes de buscar el enlace.
    const body = raw.replace(/=\r?\n/g, '').replace(/=3D/g, '=');
    return body.match(new RegExp(`${PUBLIC_URL}/reset-password/([0-9a-f]{64})`))?.[1] ?? null;
  };

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch (error) {
      if (REQUIRE_DB) throw new Error(`REQUIRE_DB_TESTS=1 pero no hay base de datos: ${String(error)}`);
      console.warn('Sin base de datos: se omite la recuperación de contraseña.');
      return;
    }

    smtp = new SMTPServer({
      authOptional: true,
      disabledCommands: ['STARTTLS'],
      onData(stream, _session, callback) {
        const chunks: Buffer[] = [];
        stream.on('data', (c: Buffer) => chunks.push(c));
        stream.on('end', () => {
          inbox.push(Buffer.concat(chunks).toString('utf8'));
          callback();
        });
      },
    });
    await new Promise<void>((resolve) => smtp.listen(0, '127.0.0.1', resolve));
    const port = (smtp.server.address() as AddressInfo).port;

    const role = await prisma.role.findUniqueOrThrow({ where: { name: 'Docente Tutor' } });
    const user = await prisma.user.upsert({
      where: { email: EMAIL },
      update: { isActive: true, lockedUntil: null, failedLoginAttempts: 0 },
      create: {
        email: EMAIL,
        passwordHash: await bcrypt.hash('ClaveVieja2026!', 4),
        firstName: 'Prueba',
        lastName: 'A09',
        roleId: role.id,
      },
    });
    userId = user.id;
    await prisma.passwordResetToken.deleteMany({ where: { userId } });
    await prisma.refreshToken.deleteMany({ where: { userId } });

    const mailer = new SmtpMailer({ host: '127.0.0.1', port, secure: false, from: 'SIT <no-reply@untrm.edu.pe>' });
    request = new RequestPasswordResetUseCase(
      new PrismaUserRepository(prisma),
      tokensRepo,
      mailer,
      new PrismaAuditLogRepository(prisma),
      { ...DEFAULT_PASSWORD_RESET_CONFIG, publicUrl: PUBLIC_URL },
    );
    reset = new ResetPasswordUseCase(tokensRepo, new BcryptPasswordHasher(), new PrismaAuditLogRepository(prisma));
  });

  afterAll(async () => {
    if (dbUp) {
      // La cuenta de prueba queda desactivada: la bitácora referencia al usuario y no se puede borrar.
      await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
      await prisma.passwordResetToken.deleteMany({ where: { userId } });
      await new Promise((resolve) => smtp.close(() => resolve(undefined)));
    }
    await prisma.$disconnect();
  });

  it('entrega el correo por SMTP con un enlace que funciona una sola vez, cierra sesiones y no deja el secreto en los registros ni en la base', async () => {
    if (!dbUp) return;
    const logged: string[] = [];
    const spies = (['log', 'info', 'warn', 'error'] as const).map((level) =>
      jest.spyOn(console, level).mockImplementation((...args) => {
        logged.push(args.map(String).join(' '));
      }),
    );

    await prisma.refreshToken.create({
      data: { tokenHash: hashSecretToken(`sesion-${Date.now()}`), userId, expiresAt: new Date(Date.now() + 3_600_000) },
    });

    await request.execute(EMAIL, '10.0.0.7');

    const token = lastToken();
    expect(token).not.toBeNull();
    expect(inbox[inbox.length - 1]).toContain(`To: ${EMAIL}`);

    // En la base solo está el hash.
    expect(await prisma.passwordResetToken.count({ where: { tokenHash: token as string } })).toBe(0);
    expect(await prisma.passwordResetToken.count({ where: { tokenHash: hashSecretToken(token as string), used: false } })).toBe(1);

    await reset.execute({ token: token as string, newPassword: 'ClaveNueva2026!' }, '10.0.0.7');

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(await bcrypt.compare('ClaveNueva2026!', updated.passwordHash)).toBe(true);
    expect(await prisma.refreshToken.count({ where: { userId } })).toBe(0); // sesiones cerradas

    // Segundo uso del mismo enlace: rechazado, y la contraseña no cambia.
    await expect(reset.execute({ token: token as string, newPassword: 'Otra2026!' })).rejects.toBeInstanceOf(InvalidTokenError);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(after.passwordHash).toBe(updated.passwordHash);

    // El secreto no aparece en ningún registro de consola ni en la bitácora de auditoría.
    spies.forEach((s) => s.mockRestore());
    expect(logged.join('\n')).not.toContain(token as string);
    const audit = await prisma.auditLog.findMany({ where: { userId, action: { in: ['PASSWORD_RESET_REQUEST', 'PASSWORD_RESET'] } } });
    expect(audit.map((a) => a.action).sort()).toEqual(expect.arrayContaining(['PASSWORD_RESET', 'PASSWORD_RESET_REQUEST']));
    expect(JSON.stringify(audit)).not.toContain(token as string);
  });

  it('un enlace nuevo invalida el anterior y dos canjes simultáneos del mismo enlace solo dejan ganar a uno', async () => {
    if (!dbUp) return;
    inbox = [];
    await request.execute(EMAIL);
    const first = lastToken() as string;
    // Se salta el límite por hora de la solicitud anterior borrando su rastro para poder pedir otro.
    await prisma.passwordResetToken.updateMany({ where: { userId }, data: { createdAt: new Date(Date.now() - 2 * 3_600_000) } });
    await request.execute(EMAIL);
    const second = lastToken() as string;
    expect(second).not.toBe(first);

    await expect(reset.execute({ token: first, newPassword: 'Vieja2026!' })).rejects.toBeInstanceOf(InvalidTokenError);

    const results = await Promise.allSettled([
      reset.execute({ token: second, newPassword: 'Carrera1-2026!' }),
      reset.execute({ token: second, newPassword: 'Carrera2-2026!' }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
  });
});
