import { apiClient } from '@shared/services/apiClient';
import type { ApiSuccess } from '@shared/types/api.types';
import type {
  UserProfile,
  UpdateProfilePayload,
  ChangePasswordPayload,
} from '../types/profile.types';

export const profileService = {
  async get(): Promise<UserProfile> {
    const { data } = await apiClient.get<ApiSuccess<UserProfile>>('/profile');
    return data.data;
  },

  async update(payload: UpdateProfilePayload): Promise<UserProfile> {
    const { data } = await apiClient.put<ApiSuccess<UserProfile>>('/profile', payload);
    return data.data;
  },

  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    await apiClient.post('/profile/change-password', payload);
  },
};
