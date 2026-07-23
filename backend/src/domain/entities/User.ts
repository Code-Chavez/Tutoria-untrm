export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  photoUrl?: string | null;
  roleId: string;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
