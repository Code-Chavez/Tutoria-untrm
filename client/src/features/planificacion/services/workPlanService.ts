import { apiClient } from '@shared/services/apiClient';

// Dispara la descarga de un blob en el navegador.
function saveBlob(data: Blob, filename: string): void {
  const url = window.URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// Plan de trabajo semestral (HU-41, Anexo N°8 del Protocolo de Tutoría).
export interface PlanningRow {
  activity: string;
  startDate: string;
  endDate: string;
}
export interface ProgrammingRow {
  date: string;
  activity: string;
  time: string;
  place: string;
  responsible: string;
}
export interface ResourceRow {
  quantity: number;
  resource: string;
  characteristics: string;
}
export interface BudgetRow {
  quantity: number;
  type: string;
  resource: string;
  characteristics: string;
  unitCost: number;
}
export interface OperationalActivity {
  activity: string;
  date: string;
}

export interface WorkPlanContent {
  introduction: string;
  denomination: string;
  eventType: string;
  executionDate: string;
  schedule: string;
  place: string;
  modality: string;
  organizers: string;
  supportUnit: string;
  foundation: string;
  generalObjective: string;
  specificObjectives: string[];
  targetAudience: string;
  methodology: string;
  planning: PlanningRow[];
  programming: ProgrammingRow[];
  physicalResources: ResourceRow[];
  humanResources: ResourceRow[];
  budget: BudgetRow[];
  operationalActivities: OperationalActivity[];
}

/** BORRADOR: nunca aprobado · APROBADO: con la resolución de su contenido · EN_REVISION: cambios pendientes de resolución. */
export type WorkPlanStatus = 'BORRADOR' | 'APROBADO' | 'EN_REVISION';

export const WORK_PLAN_STATUS_LABEL: Record<WorkPlanStatus, string> = {
  BORRADOR: 'sin resolución',
  APROBADO: 'vigente',
  EN_REVISION: 'en revisión',
};

export interface WorkPlanVersionSummary {
  revision: number;
  approvedAt: string;
  resolution: { fileName: string; fileSize: number };
}

export interface WorkPlan extends WorkPlanContent {
  id: string;
  periodId: string;
  schoolId: string;
  authorId: string;
  /** Resolución de aprobación adjunta (HU-42); sin ella el plan no es vigente. */
  resolution: { fileName: string; fileSize: number; uploadedAt: string } | null;
  status: WorkPlanStatus;
  revision: number;
  inForce: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkPlansOverview {
  periodName: string;
  schools: { schoolId: string; schoolName: string; hasPlan: boolean; inForce: boolean; status: WorkPlanStatus | null }[];
}

export interface WorkPlanView {
  periodName: string;
  schoolName: string;
  plan: WorkPlan | null;
}

// Las 7 actividades operativas de la sección X del Anexo N°8.
export const DEFAULT_OPERATIONAL_ACTIVITIES = [
  'Reunión de coordinación',
  'Elaboración de la propuesta',
  'Presentación de la propuesta',
  'Evaluación y aprobación mediante acto resolutivo',
  'Difusión',
  'Ejecución',
  'Presentación del informe final',
];

export const workPlanService = {
  async getOverview(): Promise<WorkPlansOverview> {
    const response = await apiClient.get<WorkPlansOverview>('/work-plans');
    return response.data;
  },

  async getBySchool(schoolId: string): Promise<WorkPlanView> {
    const response = await apiClient.get<WorkPlanView>(`/work-plans/${schoolId}`);
    return response.data;
  },

  async save(schoolId: string, content: WorkPlanContent): Promise<WorkPlan> {
    const response = await apiClient.put<{ message: string; plan: WorkPlan }>(
      `/work-plans/${schoolId}`,
      content,
    );
    return response.data.plan;
  },

  async uploadResolution(schoolId: string, file: File): Promise<WorkPlan> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ message: string; plan: WorkPlan }>(
      `/work-plans/${schoolId}/resolution`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.plan;
  },

  async getVersions(schoolId: string): Promise<WorkPlanVersionSummary[]> {
    const response = await apiClient.get<WorkPlanVersionSummary[]>(`/work-plans/${schoolId}/versions`);
    return response.data;
  },

  async downloadVersionResolution(schoolId: string, revision: number, fileName: string): Promise<void> {
    const response = await apiClient.get(`/work-plans/${schoolId}/versions/${revision}/resolution/file`, {
      responseType: 'blob',
    });
    saveBlob(response.data as Blob, fileName);
  },

  async downloadResolution(schoolId: string, fileName: string): Promise<void> {
    const response = await apiClient.get(`/work-plans/${schoolId}/resolution/file`, {
      responseType: 'blob',
    });
    saveBlob(response.data as Blob, fileName);
  },
};
