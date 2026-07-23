import axios, { AxiosError } from 'axios';
import { tokenStorage } from './tokenStorage';
import type { ApiError } from '@shared/types/api.types';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Una 401 en el propio login es "credenciales inválidas", no una sesión expirada:
// solo cerramos sesión cuando el token deja de ser válido en el resto de la API.
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    if (error.response?.status === 401 && !isLoginRequest) {
      tokenStorage.clear();
      window.location.assign('/login');
    }

    return Promise.reject(error);
  },
);

const DEFAULT_ERROR = 'No se pudo conectar con el servidor. Intenta nuevamente.';

/** Extrae el mensaje que envía la API, con un texto de respaldo legible. */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiError>(error)) {
    return error.response?.data?.message ?? DEFAULT_ERROR;
  }
  return DEFAULT_ERROR;
}
