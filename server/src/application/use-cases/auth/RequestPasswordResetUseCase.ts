import { UserRepository } from '@domain/repositories/UserRepository';
import { PasswordResetTokenRepository } from '@domain/repositories/PasswordResetTokenRepository';
import { AuditLogRepository } from '@domain/repositories/AuditLogRepository';
import { Mailer } from '@application/ports/Mailer';
import { generateSecretToken, hashSecretToken } from './secretToken';

export interface PasswordResetConfig {
  /** URL pública del cliente, sin barra final (el enlace del correo se arma con ella). */
  publicUrl: string;
  /** Vigencia del enlace. */
  ttlMinutes: number;
  /** Máximo de enlaces que se generan por usuario en la última hora. */
  maxRequestsPerHour: number;
}

export const DEFAULT_PASSWORD_RESET_CONFIG: PasswordResetConfig = {
  publicUrl: 'http://localhost:5173',
  ttlMinutes: 60,
  maxRequestsPerHour: 3,
};

/**
 * Recuperación de contraseña (A09): genera un enlace de un solo uso, lo guarda solo como hash,
 * invalida los anteriores y lo envía por correo. Nunca revela si el correo existe, y el token
 * jamás se escribe en los registros del servidor.
 */
export class RequestPasswordResetUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: PasswordResetTokenRepository,
    private readonly mailer: Mailer,
    private readonly auditLogs: AuditLogRepository,
    private readonly config: PasswordResetConfig = DEFAULT_PASSWORD_RESET_CONFIG,
  ) {}

  async execute(email: string, ipAddress?: string): Promise<void> {
    const user = await this.users.findByEmail(email.toLowerCase().trim());
    // Mismo resultado visible exista o no la cuenta (sin enumeración de usuarios).
    if (!user || !user.isActive) return;

    const hourAgo = new Date(Date.now() - 60 * 60_000);
    if ((await this.tokens.countCreatedSince(user.id, hourAgo)) >= this.config.maxRequestsPerHour) return;

    const token = generateSecretToken();
    await this.tokens.invalidatePendingForUser(user.id);
    await this.tokens.create({
      tokenHash: hashSecretToken(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + this.config.ttlMinutes * 60_000),
    });

    const link = `${this.config.publicUrl.replace(/\/+$/, '')}/reset-password/${token}`;
    try {
      await this.mailer.send({
        to: user.email,
        subject: 'Recuperación de contraseña — SIT UNTRM',
        text:
          `Hola ${user.firstName},\n\n` +
          `Recibimos una solicitud para restablecer tu contraseña del Sistema Integral de Tutoría.\n` +
          `Abre este enlace para elegir una nueva (vale ${this.config.ttlMinutes} minutos y sirve una sola vez):\n\n${link}\n\n` +
          `Si no lo solicitaste, ignora este mensaje: tu contraseña no cambiará.`,
        html:
          `<p>Hola ${escapeHtml(user.firstName)},</p>` +
          `<p>Recibimos una solicitud para restablecer tu contraseña del Sistema Integral de Tutoría.</p>` +
          `<p><a href="${link}">Elegir una nueva contraseña</a><br>El enlace vale ${this.config.ttlMinutes} minutos y sirve una sola vez.</p>` +
          `<p>Si no lo solicitaste, ignora este mensaje: tu contraseña no cambiará.</p>`,
      });
    } catch (error) {
      // Se informa el fallo sin el enlace ni el token: el secreto no debe quedar en los registros.
      console.error('No se pudo enviar el correo de recuperación', {
        userId: user.id,
        reason: error instanceof Error ? error.name : 'desconocido',
      });
    }

    await this.auditLogs.create({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUEST',
      entity: 'User',
      entityId: user.id,
      details: null,
      ipAddress: ipAddress ?? null,
    });
  }
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
