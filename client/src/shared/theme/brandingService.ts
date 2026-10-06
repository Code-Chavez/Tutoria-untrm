import { apiClient } from '@shared/services/apiClient';
import { DEFAULT_ACCENT, DEFAULT_PRIMARY } from './palette';

// Identidad visual institucional configurable (HU-50).
export interface Branding {
  institutionName: string;
  shortName: string;
  primaryColor: string;
  accentColor: string;
  hasCustomLogo: boolean;
  /** Para invalidar la caché del logotipo al cambiarlo; null con la identidad por defecto. */
  updatedAt: string | null;
}

export type BrandingTexts = Pick<Branding, 'institutionName' | 'shortName' | 'primaryColor' | 'accentColor'>;

export const DEFAULT_BRANDING: Branding = {
  institutionName: 'Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas',
  shortName: 'SIT · UNTRM',
  primaryColor: DEFAULT_PRIMARY,
  accentColor: DEFAULT_ACCENT,
  hasCustomLogo: false,
  updatedAt: null,
};

/** URL del logotipo personalizado; el parámetro evita servir uno viejo desde la caché del navegador. */
export const brandingLogoUrl = (updatedAt: string | null) =>
  `${apiClient.defaults.baseURL ?? '/api'}/branding/logo${updatedAt ? `?v=${encodeURIComponent(updatedAt)}` : ''}`;

export const brandingService = {
  async get(): Promise<Branding> {
    const response = await apiClient.get<{ branding: Branding }>('/branding');
    return response.data.branding;
  },

  async update(input: BrandingTexts): Promise<Branding> {
    const response = await apiClient.put<{ branding: Branding }>('/branding', input);
    return response.data.branding;
  },

  async uploadLogo(file: File): Promise<Branding> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ branding: Branding }>('/branding/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.branding;
  },

  async removeLogo(): Promise<Branding> {
    const response = await apiClient.delete<{ branding: Branding }>('/branding/logo');
    return response.data.branding;
  },

  async reset(): Promise<Branding> {
    const response = await apiClient.post<{ branding: Branding }>('/branding/reset');
    return response.data.branding;
  },
};
