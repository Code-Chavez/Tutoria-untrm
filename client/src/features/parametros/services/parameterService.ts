import { apiClient } from '@shared/services/apiClient';

// Parámetros del sistema (HU-49).
export interface SystemParameter {
  key: string;
  label: string;
  description: string;
  unit: string;
  min: number;
  max: number;
  defaultValue: number;
  group: string;
  value: number;
  /** true cuando no hay un valor guardado y rige el predeterminado. */
  isDefault: boolean;
}

export const parameterService = {
  async list(): Promise<SystemParameter[]> {
    const response = await apiClient.get<{ parameters: SystemParameter[] }>('/system-parameters');
    return response.data.parameters;
  },

  async update(key: string, value: number): Promise<SystemParameter> {
    const response = await apiClient.put<{ parameter: SystemParameter }>(`/system-parameters/${key}`, { value });
    return response.data.parameter;
  },
};
