import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCatalogMutations } from './useCatalog';

vi.mock('../services/catalogService', () => ({ catalogService: { create: vi.fn().mockResolvedValue({}), update: vi.fn(), remove: vi.fn() } }));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { invalidate, wrapper };
}
const invalidatedKeys = (spy: ReturnType<typeof setup>['invalidate']) => spy.mock.calls.map(([filters]) => (filters as { queryKey: unknown[] }).queryKey[0]);

describe('useCatalogMutations: periodos', () => {
  it('al cambiar el catálogo de periodos refresca también las opciones de periodo de la lista de estudiantes', async () => {
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useCatalogMutations('periods'), { wrapper });

    await act(async () => {
      await result.current.create.mutateAsync({ name: '2027-I' } as never);
    });

    await waitFor(() => expect(invalidatedKeys(invalidate)).toContain('periods'));
    expect(invalidatedKeys(invalidate)).toContain('catalog');
  });

  it('otro catálogo no toca las opciones de periodo', async () => {
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useCatalogMutations('schools'), { wrapper });

    await act(async () => {
      await result.current.create.mutateAsync({ name: 'Nueva' } as never);
    });

    await waitFor(() => expect(invalidatedKeys(invalidate)).toContain('catalog'));
    expect(invalidatedKeys(invalidate)).not.toContain('periods');
  });
});
