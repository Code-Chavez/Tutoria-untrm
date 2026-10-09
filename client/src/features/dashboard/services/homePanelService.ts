import { apiClient } from '@shared/services/apiClient';

// Panel de inicio por rol (HU-49): cada rol recibe sus propios indicadores.
export type KpiTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export interface HomeKpi {
  key: string;
  label: string;
  value: string;
  hint?: string;
  tone: KpiTone;
  /** Ruta de la vista de detalle. */
  link?: string;
}

export interface HomePanel {
  role: string;
  periodName: string | null;
  kpis: HomeKpi[];
}

export const homePanelService = {
  async getPanel(): Promise<HomePanel> {
    const response = await apiClient.get<{ panel: HomePanel }>('/home-panel');
    return response.data.panel;
  },
};
