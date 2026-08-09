import { PasswordResetToken } from '../entities/PasswordResetToken';

export interface PasswordResetTokenRepository {
  create(data: Omit<PasswordResetToken, 'id' | 'createdAt'>): Promise<PasswordResetToken>;
  findByToken(token: string): Promise<PasswordResetToken | null>;
  markAsUsed(id: string): Promise<void>;
}
