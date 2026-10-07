import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from './tokenStorage';
import type { ApiError } from '@shared/types/api.types';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Una renovación en vuelo se comparte: varias peticiones que expiran a la vez
// usarían el mismo refresh token, y como cada uno sirve una sola vez, solo la
// primera tendría éxito.
let renewal: Promise<string> | null = null;

async function renewAccessToken(): Promise<string> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) throw new Error('Sin refresh token');
  try {
    // Axios sin interceptores: una 401 aquí no debe volver a intentar renovar.
    const { data } = await axios.post<{ data: { accessToken: string; refreshToken: string } }>(
      `${BASE_URL}/auth/refresh`,
      { refreshToken },
    );
    tokenStorage.saveTokens(data.data.accessToken, data.data.refreshToken);
    return data.data.accessToken;
  } catch (error) {
    // Otra pestaña pudo renovar con el mismo token un instante antes: se usa su resultado.
    const current = tokenStorage.getRefreshToken();
    const access = tokenStorage.getAccessToken();
    if (current && current !== refreshToken && access) return access;
    throw error;
  }
}

type RetriableConfig = InternalAxiosRequestConfig & { _renewed?: boolean };

const isAuthRequest = (url?: string) => /\/auth\/(login|refresh|logout)/.test(url ?? '');

// Una 401 en el login es "credenciales inválidas", no una sesión expirada. En el
// resto de la API se intenta renovar la sesión una vez; solo si eso falla se cierra.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;

    if (error.response?.status === 401 && config && !config._renewed && !isAuthRequest(config.url)) {
      config._renewed = true;
      try {
        renewal ??= renewAccessToken().finally(() => {
          renewal = null;
        });
        const accessToken = await renewal;
        config.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(config);
      } catch {
        // La renovación falló: la sesión ya no es recuperable.
      }
    }

    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
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
    const data = error.response?.data;
    return data?.message ?? data?.error ?? DEFAULT_ERROR;
  }
  return DEFAULT_ERROR;
}
