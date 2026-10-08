import { PasswordResetToken } from '../entities/PasswordResetToken';

export interface PasswordResetTokenRepository {
  create(data: Pick<PasswordResetToken, 'tokenHash' | 'userId' | 'expiresAt'>): Promise<PasswordResetToken>;
  /** Invalida los enlaces de recuperación aún pendientes del usuario (al pedir uno nuevo). */
  invalidatePendingForUser(userId: string): Promise<void>;
  /** Cuántos enlaces se generaron para el usuario desde `since` (límite de solicitudes). */
  countCreatedSince(userId: string, since: Date): Promise<number>;
  /**
   * Canjea el enlace de forma atómica y de un solo uso: marca el token como usado (solo si seguía
   * vigente), cambia la contraseña, desbloquea la cuenta, invalida los demás enlaces pendientes y
   * cierra todas las sesiones. Devuelve el usuario, o null si el token no existe, ya se usó o venció.
   */
  redeem(tokenHash: string, newPasswordHash: string, now: Date): Promise<string | null>;
}
