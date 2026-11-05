import { UserRepository } from '@domain/repositories/UserRepository';
import { PasswordResetTokenRepository } from '@domain/repositories/PasswordResetTokenRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { Mailer } from '@application/ports/Mailer';
import { generateSecretToken, hashSecretToken } from '@application/use-cases/auth/secretToken';
import { buildInvitationEmail } from '@application/services/invitationEmail';
import { UserNotFoundError } from './UpdateUserUseCase';

export interface InvitationConfig {
  /** URL pública del cliente, sin barra final. */
  publicUrl: string;
  /** Vigencia del enlace, en horas. */
  ttlHours: number;
}

export interface IssuedInvitation {
  /** Enlace de activación: solo se entrega a quien administra, en esta respuesta; la base guarda únicamente su huella. */
  link: string;
  expiresAt: Date;
  /** El correo salió hacia el servidor SMTP. Si es false, quien administra puede entregar el enlace por otro medio. */
  emailSent: boolean;
}

/**
 * Invitación para activar una cuenta (acceso único): genera un enlace de **un solo uso y con vencimiento**, invalida los
 * anteriores y lo envía por correo. Reemplaza a la clave inicial: ninguna clave se muestra ni se envía. Sirve igual para
 * reemitir una invitación vencida o perdida. El enlace nunca se escribe en los registros ni en la bitácora.
 */
export class IssueInvitationUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: PasswordResetTokenRepository,
    private readonly mailer: Mailer,
    private readonly auditLogs: AuditLogRepository,
    private readonly config: InvitationConfig,
  ) {}

  async execute(requesterId: string, userId: string, ipAddress?: string): Promise<IssuedInvitation> {
    const user = await this.users.findById(userId);
    if (!user) throw new UserNotFoundError(userId);

    const token = generateSecretToken();
    const expiresAt = new Date(Date.now() + this.config.ttlHours * 3_600_000);
    await this.tokens.invalidatePendingForUser(user.id);
    await this.tokens.create({ tokenHash: hashSecretToken(token), userId: user.id, expiresAt });

    const link = `${this.config.publicUrl.replace(/\/+$/, '')}/activar-cuenta/${token}`;

    let emailSent = false;
    try {
      await this.mailer.send(buildInvitationEmail(user, link, this.config.ttlHours));
      emailSent = true;
    } catch (error) {
      // Sin el enlace ni el token: el secreto no debe quedar en los registros.
      console.error('No se pudo enviar la invitación por correo', { userId: user.id, reason: error instanceof Error ? error.name : 'desconocido' });
    }

    await this.auditLogs.create({
      userId: requesterId,
      action: 'INVITATION_ISSUED',
      entity: 'User',
      entityId: user.id,
      details: `Invitación emitida (vence en ${this.config.ttlHours} h); correo ${emailSent ? 'enviado' : 'no enviado'}`,
      ipAddress: ipAddress ?? null,
    });

    return { link, expiresAt, emailSent };
  }
}
