import { QueryClient } from '@tanstack/react-query';

// Al volver a una página ya visitada (cambiar de pestaña del sidebar), los
// datos en caché se muestran de inmediato sin una nueva petición mientras
// sigan "frescos" (staleTime). Pasado ese tiempo, se sirven del caché igual
// pero se revalidan en segundo plano (stale-while-revalidate).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
