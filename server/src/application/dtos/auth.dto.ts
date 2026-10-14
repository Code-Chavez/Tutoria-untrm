export interface LoginInput {
  email: string;
  password: string;
  ipAddress?: string;
}

export interface LoginOutput {
  accessToken: string;
  refreshToken: string;
  sessionPolicy: { idleTimeoutMinutes: number };
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    service?: string | null;
    mustChangePassword: boolean;
  };
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}
