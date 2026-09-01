export interface ProfileOutput {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  photoUrl: string | null;
  role: string;
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
