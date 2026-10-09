export interface PasswordResetToken {
  id: string;
  /** Hash SHA-256 del token enviado por correo; el valor original no se guarda. */
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}
