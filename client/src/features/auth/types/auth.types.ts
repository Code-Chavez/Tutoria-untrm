export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  service?: string | null;
  /** Clave temporal pendiente de cambio: hasta entonces solo puede usar su perfil. */
  mustChangePassword?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
