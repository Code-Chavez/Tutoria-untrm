export interface ProfileOutput {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  photoUrl: string | null;
  /** Hay una foto subida desde el sistema (se pide con GET /profile/photo). */
  hasPhoto: boolean;
  role: string;
  service?: string | null;
  /** Permisos que concede su rol hoy (para el menú del cliente). */
  permissions?: string[];
}

export interface UpdateProfileInput {
  phone?: string | null;
  photoUrl?: string | null;
}

export interface ChangePasswordInput {
  userId: string;
  currentPassword: string;
  newPassword: string;
}
