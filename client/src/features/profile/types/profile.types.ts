export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  photoUrl: string | null;
  role: string;
  service?: string | null;
  /** Permisos que concede su rol hoy. */
  permissions?: string[];
}

export interface UpdateProfilePayload {
  phone?: string;
  photoUrl?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
