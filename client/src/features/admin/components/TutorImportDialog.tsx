import { useState } from 'react';
import { useDialog } from '@shared/hooks/useDialog';
import { Button } from '@shared/components/ui';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { tutorImportService, type TutorImportReport } from '../services/userService';
import styles from './TutorImportDialog.module.css';

interface TutorImportDialogProps {
  onClose: () => void;
}

// Alta masiva de docentes tutores: cada fila crea la cuenta con su escuela y le envía la invitación de acceso único.
export function TutorImportDialog({ onClose }: TutorImportDialogProps) {
  const dialogRef = useDialog(onClose);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<TutorImportReport | null>(null);

  const submit = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      setReport(await tutorImportService.importTutors(file));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const unsent = report?.createdRows.filter((r) => !r.emailSent) ?? [];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="tutor-import-title" ref={dialogRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <h2 id="tutor-import-title">Importar docentes tutores</h2>
        {!report ? (
          <>
            <p>
              Suba el Excel con <strong>nombres, apellidos, correo, teléfono y escuela</strong>. Cada fila crea la cuenta del docente (con su escuela) y le envía un enlace de un solo uso para crear su contraseña.
            </p>
            <p>
              <button type="button" className={styles.link} onClick={() => tutorImportService.downloadTemplate()}>
                Descargar la plantilla
              </button>
            </p>
            <label htmlFor="tutor-file">Archivo Excel (.xlsx)</label>
            <input id="tutor-file" type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <div className={styles.actions}>
              <Button variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button disabled={!file} loading={loading} onClick={submit}>
                Importar
              </Button>
            </div>
          </>
        ) : (
          <>
            <p role="status">
              <strong>{report.created}</strong> docente(s) creados, <strong>{report.skipped}</strong> fila(s) con error, de {report.totalRows}.
            </p>
            {unsent.length > 0 && (
              <div role="alert" className={styles.warn}>
                <p>No se pudo enviar el correo a {unsent.length} docente(s). Entregue a cada uno su enlace por un medio privado; no se vuelve a mostrar:</p>
                <ul>
                  {unsent.map((r) => (
                    <li key={r.email}>
                      {r.fullName} ({r.email}): <code>{r.invitationLink}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {report.errors.length > 0 && (
              <ul className={styles.errors} aria-label="Filas con error">
                {report.errors.map((e) => (
                  <li key={e.row}>
                    Fila {e.row}
                    {e.email ? ` (${e.email})` : ''}: {e.message}
                  </li>
                ))}
              </ul>
            )}
            <div className={styles.actions}>
              <Button onClick={onClose}>Cerrar</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
