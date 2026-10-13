import jwt from 'jsonwebtoken';
import { createSecretKey, randomUUID } from 'node:crypto';
import { TokenService, AccessTokenPayload } from '@application/ports/TokenService';
import { env } from '@infrastructure/config/env';

export class JwtTokenService implements TokenService {
  // Con una cadena, jsonwebtoken intenta primero leerla como clave pública PEM y recién al fallar la usa como secreto:
  // esa excepción en cada petición costaba decenas de milisegundos de CPU. Con la clave ya construida no hay intento fallido.
  private readonly key = createSecretKey(Buffer.from(env.JWT_SECRET));

  generateAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, this.key, {
      algorithm: 'HS256',
      expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions);
  }

  generateRefreshToken(): string {
    return randomUUID();
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    const decoded = jwt.verify(token, this.key, { algorithms: ['HS256'] });
    return decoded as AccessTokenPayload;
  }
}
