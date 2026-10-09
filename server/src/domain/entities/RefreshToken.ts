export interface RefreshToken {
  id: string;
  /** Hash SHA-256 del token entregado al cliente; el valor original no se guarda. */
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}
