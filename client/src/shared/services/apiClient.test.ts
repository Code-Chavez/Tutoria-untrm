import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios, { AxiosError } from 'axios';
import { apiClient, getApiErrorMessage } from './apiClient';
import { tokenStorage } from './tokenStorage';

const apiError = (data: unknown) =>
  new AxiosError('fail', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 409,
    statusText: 'Conflict',
    headers: {},
    config: {} as never,
    data,
  });

describe('getApiErrorMessage', () => {
  it('lee el mensaje del manejador global (message)', () => {
    expect(getApiErrorMessage(apiError({ status: 'error', message: 'No autenticado' }))).toBe('No autenticado');
  });

  it('lee el mensaje de los controladores de módulo (error)', () => {
    expect(getApiErrorMessage(apiError({ error: 'No se puede eliminar: está en uso' }))).toBe(
      'No se puede eliminar: está en uso',
    );
  });

  it('prefiere message si vienen ambos', () => {
    expect(getApiErrorMessage(apiError({ message: 'A', error: 'B' }))).toBe('A');
  });

  it('usa el texto de respaldo sin respuesta del servidor o con un error ajeno a la API', () => {
    expect(getApiErrorMessage(new Error('x'))).toMatch(/No se pudo conectar/);
    expect(getApiErrorMessage(apiError({}))).toMatch(/No se pudo conectar/);
  });
});

describe('renovación de sesión (A16)', () => {
  const reply = (status: number, data: unknown = {}) =>
    ({ status, statusText: '', headers: {}, config: {} as never, data }) as never;

  beforeEach(() => {
    localStorage.clear();
    tokenStorage.save('old-access', 'old-refresh', { id: 'u1' });
    vi.restoreAllMocks();
  });

  it('renueva una sola vez cuando varias peticiones expiran juntas y reintenta con el token nuevo', async () => {
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { data: { accessToken: 'new-access', refreshToken: 'new-refresh' } },
    });
    const seen: string[] = [];
    apiClient.defaults.adapter = async (config) => {
      const auth = String(config.headers.Authorization);
      seen.push(auth);
      if (auth === 'Bearer old-access') return Promise.reject(new AxiosError('x', '401', config, null, reply(401)));
      return reply(200, { ok: true });
    };

    const [a, b] = await Promise.all([apiClient.get('/a'), apiClient.get('/b')]);

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(tokenStorage.getRefreshToken()).toBe('new-refresh');
    expect(seen.filter((h) => h === 'Bearer new-access')).toHaveLength(2);
  });

  it('si la renovación falla cierra la sesión y manda al login', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('401'));
    const assign = vi.fn();
    vi.stubGlobal('location', { assign });
    apiClient.defaults.adapter = async (config) =>
      Promise.reject(new AxiosError('x', '401', config, null, reply(401)));

    await expect(apiClient.get('/a')).rejects.toBeInstanceOf(AxiosError);

    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(assign).toHaveBeenCalledWith('/login');
    vi.unstubAllGlobals();
  });

  it('una 401 en el login no intenta renovar', async () => {
    const refresh = vi.spyOn(axios, 'post');
    apiClient.defaults.adapter = async (config) =>
      Promise.reject(new AxiosError('x', '401', config, null, reply(401)));

    await expect(apiClient.post('/auth/login', {})).rejects.toBeInstanceOf(AxiosError);
    expect(refresh).not.toHaveBeenCalled();
  });
});
