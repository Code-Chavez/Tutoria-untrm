export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  photoUrl: string | null;
  /** Hay una foto subida desde el sistema (se pide con profileService.photo). */
  hasPhoto: boolean;
  role: string;
  service?: string | null;
  /** Permisos que concede su rol hoy. */
  permissions?: string[];
}

export interface UpdateProfilePayload {
  phone?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
