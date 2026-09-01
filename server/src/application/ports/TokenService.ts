export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
}

export interface TokenService {
  generateAccessToken(payload: AccessTokenPayload): string;
  generateRefreshToken(): string;
  verifyAccessToken(token: string): AccessTokenPayload;
}
