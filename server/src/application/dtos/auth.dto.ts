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
  };
}
