import { useRef, useState } from 'react';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { Badge, Button, Card } from '@shared/components/ui';
import { DownloadIcon, UploadIcon } from '@shared/components/icons';
import { useUploadWorkPlanResolution, useWorkPlanVersions } from '../hooks/useWorkPlans';
import { downloadFile } from '@shared/services/downloadFile';
import { WorkPlan, workPlanService } from '../services/workPlanService';
import styles from './WorkPlanResolutionCard.module.css';

const MAX_BYTES = 10 * 1024 * 1024;

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;

// Resolución que aprueba el plan (HU-42, Art. 17.a): sin el PDF adjunto el
// plan no es vigente.
export function WorkPlanResolutionCard({ schoolId, plan }: { schoolId: string; plan: WorkPlan }) {
  const upload = useUploadWorkPlanResolution(schoolId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const { versions } = useWorkPlanVersions(schoolId, plan.revision > 1);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    if (file.type !== 'application/pdf') {
      setError('La resolución debe ser un archivo PDF.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('El archivo supera el máximo de 10 MB.');
      return;
    }
    try {
      await upload.mutateAsync(file);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const downloadVersion = async (revision: number, fileName: string) => {
    setError('');
    try {
      await workPlanService.downloadVersionResolution(schoolId, revision, fileName);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleDownload = async () => {
    if (!plan.resolution) return;
    setError('');
    try {
      await workPlanService.downloadResolution(schoolId, plan.resolution.fileName);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <Card padded className={styles.card}>
      <div className={styles.head}>
        <h3>Resolución de aprobación</h3>
        <Badge tone={plan.status === 'APROBADO' ? 'success' : 'warning'}>
          {plan.status === 'APROBADO'
            ? 'Plan vigente'
            : plan.status === 'EN_REVISION'
              ? 'Revisión pendiente de resolución'
              : 'Plan no vigente'}
        </Badge>
      </div>

      {plan.resolution ? (
        <p className={styles.file}>
          {plan.resolution.fileName} · {formatSize(plan.resolution.fileSize)} · cargada el{' '}
          {new Date(plan.resolution.uploadedAt).toLocaleDateString('es-PE')}
        </p>
      ) : plan.status === 'EN_REVISION' ? (
        <p className={styles.hint}>
          Los cambios guardados son la revisión {plan.revision} y aún no tienen resolución. Mientras tanto
          sigue vigente la versión aprobada anterior; adjunta la resolución que apruebe esta revisión.
        </p>
      ) : (
        <p className={styles.hint}>
          El plan solo es vigente cuando se adjunta la resolución que lo aprueba (PDF, máx. 10 MB).
        </p>
      )}

      <div className={styles.actions}>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          hidden
          aria-label="Archivo de la resolución"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Button
          variant="secondary"
          icon={<UploadIcon size={16} />}
          loading={upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
          {plan.resolution ? 'Reemplazar resolución' : 'Adjuntar resolución'}
        </Button>
        {plan.resolution && (
          <Button variant="ghost" icon={<DownloadIcon size={16} />} onClick={handleDownload}>
            Descargar
          </Button>
        )}
      </div>

      {versions.length > 0 && (
        <div className={styles.versions}>
          <h4>Versiones aprobadas anteriores</h4>
          <ul>
            {versions.map((v) => (
              <li key={v.revision}>
                <span>
                  Revisión {v.revision} · aprobada el {new Date(v.approvedAt).toLocaleDateString('es-PE')}
                </span>
                <Button variant="ghost" onClick={() => downloadVersion(v.revision, v.resolution.fileName)}>
                  Resolución
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    downloadFile(`/work-plans/${schoolId}/pdf?revision=${v.revision}`, `plan-trabajo-revision-${v.revision}.pdf`)
                  }
                >
                  Plan en PDF
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </Card>
  );
}
