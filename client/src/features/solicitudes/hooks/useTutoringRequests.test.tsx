import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { OWN_REQUESTS_POLL_MS, useOwnTutoringRequests } from './useTutoringRequests';
import { tutoringRequestService } from '../services/tutoringRequestService';

vi.mock('../services/tutoringRequestService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/tutoringRequestService')>();
  return { ...actual, tutoringRequestService: { getOwn: vi.fn() } };
});

const getOwn = vi.mocked(tutoringRequestService.getOwn);

describe('useOwnTutoringRequests', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getOwn.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it('vuelve a consultar sola para mostrar la respuesta del tutor sin recargar la página', async () => {
    getOwn.mockResolvedValueOnce([{ id: 'r1', status: 'PENDIENTE' }] as never);
    getOwn.mockResolvedValue([{ id: 'r1', status: 'ATENDIDA' }] as never);
    // Mismos valores por defecto que la aplicación (shared/services/queryClient.ts): el hook debe imponerse a ellos.
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

    const { result } = renderHook(() => useOwnTutoringRequests(), { wrapper });
    await waitFor(() => expect(result.current.requests[0]?.status).toBe('PENDIENTE'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(OWN_REQUESTS_POLL_MS + 100);
    });

    await waitFor(() => expect(result.current.requests[0]?.status).toBe('ATENDIDA'));
    expect(getOwn).toHaveBeenCalledTimes(2);
  });
});
