export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  photoUrl?: string | null;
  roleId: string;
  service?: string | null;
  /** Escuela profesional del Docente Tutor (de ella salen su facultad y su sede). */
  schoolId?: string | null;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil?: Date | null;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}
