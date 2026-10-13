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
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil?: Date | null;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}
