import { WorkPlan } from '@domain/entities/WorkPlan';

/**
 * Estado del plan (A12): BORRADOR nunca se aprobó; APROBADO tiene la resolución
 * de su contenido actual; EN_REVISION tiene un contenido nuevo pendiente de
 * resolución mientras la versión aprobada anterior sigue vigente.
 */
export type WorkPlanStatus = 'BORRADOR' | 'APROBADO' | 'EN_REVISION';

export interface PublicWorkPlan
  extends Omit<
    WorkPlan,
    'resolutionFileName' | 'resolutionFileSize' | 'resolutionStorageKey' | 'resolutionUploadedAt'
  > {
  resolution: { fileName: string; fileSize: number; uploadedAt: Date } | null;
  status: WorkPlanStatus;
  /** El plan es vigente si su contenido actual está aprobado o, en revisión, si lo está su versión anterior. */
  inForce: boolean;
}

export function workPlanStatus(plan: Pick<WorkPlan, 'resolutionStorageKey' | 'lastApprovedRevision'>): WorkPlanStatus {
  if (plan.resolutionStorageKey) return 'APROBADO';
  return (plan.lastApprovedRevision ?? null) !== null ? 'EN_REVISION' : 'BORRADOR';
}

/** Oculta la clave de almacenamiento y expone el estado y la vigencia del plan. */
export function toPublicWorkPlan(plan: WorkPlan): PublicWorkPlan {
  const {
    resolutionFileName,
    resolutionFileSize,
    resolutionUploadedAt,
    resolutionStorageKey: _storageKey,
    ...rest
  } = plan;
  const resolution =
    resolutionFileName && resolutionFileSize !== null && resolutionUploadedAt
      ? { fileName: resolutionFileName, fileSize: resolutionFileSize, uploadedAt: resolutionUploadedAt }
      : null;
  const status = workPlanStatus(plan);
  return { ...rest, resolution, status, inForce: status !== 'BORRADOR' };
}
