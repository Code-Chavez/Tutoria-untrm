// Plan de trabajo semestral de tutoría (HU-41, Anexo N°8, Art. 17.a).
export interface WorkPlanPlanningRow {
  activity: string;
  startDate: string;
  endDate: string;
}

export interface WorkPlanProgrammingRow {
  date: string;
  activity: string;
  time: string;
  place: string;
  responsible: string;
}

export interface WorkPlanResourceRow {
  quantity: number;
  resource: string;
  characteristics: string;
}

export interface WorkPlanBudgetRow {
  quantity: number;
  type: string;
  resource: string;
  characteristics: string;
  unitCost: number;
}

export interface WorkPlanOperationalActivity {
  activity: string;
  date: string;
}

// Contenido editable del plan, en el orden de secciones del Anexo N°8.
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
  planning: WorkPlanPlanningRow[];
  programming: WorkPlanProgrammingRow[];
  physicalResources: WorkPlanResourceRow[];
  humanResources: WorkPlanResourceRow[];
  budget: WorkPlanBudgetRow[];
  operationalActivities: WorkPlanOperationalActivity[];
}

export interface WorkPlan extends WorkPlanContent {
  id: string;
  periodId: string;
  schoolId: string;
  authorId: string;
  resolutionFileName: string | null;
  resolutionFileSize: number | null;
  resolutionStorageKey: string | null;
  resolutionUploadedAt: Date | null;
  /** Revisión del contenido actual (empieza en 1; sube al editar un plan ya aprobado). */
  revision: number;
  /** Revisión de la última versión aprobada archivada, o null si nunca se aprobó una anterior. */
  lastApprovedRevision: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Datos del PDF de la resolución de aprobación (HU-42). */
export interface WorkPlanResolutionFile {
  fileName: string;
  fileSize: number;
  storageKey: string;
}

/** Versión aprobada de un plan, archivada al revisarlo (A12): contenido y resolución tal como se aprobaron. */
export interface WorkPlanVersion {
  id: string;
  workPlanId: string;
  revision: number;
  authorId: string;
  content: WorkPlanContent;
  resolutionFileName: string;
  resolutionFileSize: number;
  resolutionStorageKey: string;
  resolutionUploadedAt: Date;
  createdAt: Date;
}
