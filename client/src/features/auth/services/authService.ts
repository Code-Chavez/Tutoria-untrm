import { apiClient } from '@shared/services/apiClient';
import type { ApiSuccess } from '@shared/types/api.types';
import type { LoginCredentials, LoginResult } from '../types/auth.types';

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    const { data } = await apiClient.post<ApiSuccess<LoginResult>>(
      '/auth/login',
      credentials,
    );
    return data.data;
  },

  /** Revoca el refresh token en el servidor; es de mejor esfuerzo, la sesión local se cierra igual. */
  async logout(refreshToken: string): Promise<void> {
    await apiClient.post('/auth/logout', { refreshToken });
  },

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/reset-password', { token, newPassword });
  },
};
