export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  service?: string | null;
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
