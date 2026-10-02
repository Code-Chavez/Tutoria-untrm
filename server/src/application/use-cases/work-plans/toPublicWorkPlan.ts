import { WorkPlan } from '@domain/entities/WorkPlan';

export interface PublicWorkPlan
  extends Omit<
    WorkPlan,
    'resolutionFileName' | 'resolutionFileSize' | 'resolutionStorageKey' | 'resolutionUploadedAt'
  > {
  resolution: { fileName: string; fileSize: number; uploadedAt: Date } | null;
  /** El plan solo es vigente con su resolución de aprobación adjunta (HU-42). */
  inForce: boolean;
}

/** Oculta la clave de almacenamiento y expone si el plan es vigente. */
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
  return { ...rest, resolution, inForce: resolution !== null };
}
