import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { catalogService, CatalogInput, CatalogKind } from '../services/catalogService';

const catalogKey = (kind: CatalogKind) => ['catalog', kind] as const;

/** Elementos de un catálogo maestro con su uso actual (HU-48). */
export function useCatalog(kind: CatalogKind) {
  const query = useQuery({ queryKey: catalogKey(kind), queryFn: () => catalogService.list(kind) });
  return { entries: query.data ?? [], loading: query.isLoading, error: query.isError, refresh: query.refetch };
}

/** Altas, ediciones y bajas; al terminar refrescan el catálogo y las listas que dependen de él. */
export function useCatalogMutations(kind: CatalogKind) {
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: catalogKey(kind) }),
      // Los filtros de reportes y otros selectores se alimentan de estos catálogos.
      queryClient.invalidateQueries({ queryKey: ['reportFilterOptions'] }),
      queryClient.invalidateQueries({ queryKey: ['schools'] }),
      queryClient.invalidateQueries({ queryKey: ['faculties'] }),
    ]);

  return {
    create: useMutation({
      mutationFn: (input: CatalogInput) => catalogService.create(kind, input),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: CatalogInput }) => catalogService.update(kind, id, input),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (id: string) => catalogService.remove(kind, id),
      onSuccess: refresh,
    }),
  };
}
