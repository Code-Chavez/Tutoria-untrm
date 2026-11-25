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

  /** Sube la foto de perfil (arrastrada o elegida); reemplaza la anterior. */
  async uploadPhoto(file: File): Promise<void> {
    const form = new FormData();
    form.append('file', file);
    await apiClient.put('/profile/photo', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  async removePhoto(): Promise<void> {
    await apiClient.delete('/profile/photo');
  },

  /** La foto no tiene URL pública: se pide con la sesión y se muestra desde un objeto local. */
  async photo(): Promise<Blob> {
    const { data } = await apiClient.get<Blob>('/profile/photo', { responseType: 'blob' });
    return data;
  },

  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    await apiClient.post('/profile/change-password', payload);
  },
};
