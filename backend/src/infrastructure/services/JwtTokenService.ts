import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { TokenService, AccessTokenPayload } from '@application/ports/TokenService';
import { env } from '@infrastructure/config/env';

export class JwtTokenService implements TokenService {
  generateAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions);
  }

  generateRefreshToken(): string {
    return randomUUID();
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    return decoded as AccessTokenPayload;
  }
}
