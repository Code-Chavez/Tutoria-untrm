import { apiClient } from '@shared/services/apiClient';

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

export interface WorkPlan extends WorkPlanContent {
  id: string;
  periodId: string;
  schoolId: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkPlansOverview {
  periodName: string;
  schools: { schoolId: string; schoolName: string; hasPlan: boolean }[];
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
};
