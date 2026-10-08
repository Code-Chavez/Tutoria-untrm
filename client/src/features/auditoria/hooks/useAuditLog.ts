import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { auditService, type AuditFilters } from '../services/auditService';

export function useAuditLog(filters: AuditFilters) {
  const query = useQuery({
    queryKey: ['audit', filters],
    queryFn: () => auditService.list(filters),
    placeholderData: keepPreviousData,
  });
  return { data: query.data, loading: query.isLoading, error: query.isError, refresh: query.refetch };
}

export function useAuditOptions() {
  const query = useQuery({ queryKey: ['audit-options'], queryFn: () => auditService.options() });
  return query.data ?? { entities: [], actions: [] };
}
