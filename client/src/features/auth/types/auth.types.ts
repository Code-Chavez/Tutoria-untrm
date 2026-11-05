export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  service?: string | null;
  /** Permisos que concede su rol (para armar el menú; el servidor autoriza cada llamada). Ausente en sesiones anteriores a este campo. */
  permissions?: string[];
  /** Clave temporal pendiente de cambio: hasta entonces solo puede usar su perfil. */
  mustChangePassword?: boolean;
  /** Cierre por inactividad fijado por la DBU al iniciar sesión (RF-07). */
  idleTimeoutMinutes?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  sessionPolicy?: { idleTimeoutMinutes: number };
  user: AuthUser;
}
