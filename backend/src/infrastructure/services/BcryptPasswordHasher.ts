import bcrypt from 'bcryptjs';
import { PasswordHasher } from '@application/ports/PasswordHasher';
import { env } from '@infrastructure/config/env';

export class BcryptPasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, env.BCRYPT_ROUNDS);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
