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
};
