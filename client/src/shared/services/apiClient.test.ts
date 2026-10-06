import { describe, it, expect } from 'vitest';
import { AxiosError } from 'axios';
import { getApiErrorMessage } from './apiClient';

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
