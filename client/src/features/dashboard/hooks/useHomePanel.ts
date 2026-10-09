import { useQuery } from '@tanstack/react-query';
import { homePanelService } from '../services/homePanelService';

/** Indicadores del panel de inicio según el rol del usuario (HU-49). */
export function useHomePanel() {
  const query = useQuery({ queryKey: ['homePanel'], queryFn: () => homePanelService.getPanel() });
  return { panel: query.data, loading: query.isLoading, error: query.isError, refresh: query.refetch };
}
