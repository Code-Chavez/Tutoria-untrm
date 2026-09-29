export interface LoginInput {
  email: string;
  password: string;
  ipAddress?: string;
}

export interface LoginOutput {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    service?: string | null;
  };
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}
