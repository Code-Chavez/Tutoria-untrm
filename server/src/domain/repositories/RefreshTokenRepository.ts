import { RefreshToken } from '../entities/RefreshToken';

export interface RefreshTokenRepository {
  create(data: Pick<RefreshToken, 'tokenHash' | 'userId' | 'expiresAt'>): Promise<RefreshToken>;
  findByHash(tokenHash: string): Promise<RefreshToken | null>;
  /** Revoca el token solo si seguía vigente; false si otra petición ya lo había revocado. */
  revoke(id: string): Promise<boolean>;
  deleteAllForUser(userId: string): Promise<void>;
}
