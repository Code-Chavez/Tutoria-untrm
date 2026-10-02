import { useRef, useState } from 'react';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { Badge, Button, Card } from '@shared/components/ui';
import { DownloadIcon, UploadIcon } from '@shared/components/icons';
import { useUploadWorkPlanResolution } from '../hooks/useWorkPlans';
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
        <Badge tone={plan.inForce ? 'success' : 'warning'}>
          {plan.inForce ? 'Plan vigente' : 'Plan no vigente'}
        </Badge>
      </div>

      {plan.resolution ? (
        <p className={styles.file}>
          {plan.resolution.fileName} · {formatSize(plan.resolution.fileSize)} · cargada el{' '}
          {new Date(plan.resolution.uploadedAt).toLocaleDateString('es-PE')}
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

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </Card>
  );
}
