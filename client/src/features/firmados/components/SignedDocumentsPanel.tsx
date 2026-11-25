import { useState } from 'react';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { Button, FileDropzone } from '@shared/components/ui';
import { DownloadIcon } from '@shared/components/icons';
import { SIGNED_MAX_BYTES, SIGNED_MIME_TYPES, signedDocumentService, type SignedDocument } from '../services/signedDocumentService';
import styles from './SignedDocumentsPanel.module.css';

interface SignedDocumentsPanelProps {
  title: string;
  /** Texto que explica qué se firma y quién. */
  hint: string;
  documents: SignedDocument[];
  loading?: boolean;
  /** Quien no puede adjuntar solo consulta. */
  canUpload: boolean;
  onUpload: (file: File) => Promise<unknown>;
  /** Acciones adicionales junto al botón de adjuntar (p. ej. descargar el formato para imprimir). */
  actions?: React.ReactNode;
}

const formatSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`);

// Documentos firmados a mano y escaneados (A14). Marcar algo en pantalla no sustituye la firma: aquí se
// adjunta el impreso firmado y queda registrado quién lo subió, cuándo y su huella SHA-256.
export function SignedDocumentsPanel({ title, hint, documents, loading, canUpload, onUpload, actions }: SignedDocumentsPanelProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    if (!SIGNED_MIME_TYPES.includes(file.type)) {
      setError('El documento firmado debe ser un PDF o una imagen (PNG o JPG).');
      return;
    }
    if (file.size > SIGNED_MAX_BYTES) {
      setError('El archivo supera el máximo de 10 MB.');
      return;
    }
    setBusy(true);
    try {
      await onUpload(file);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async (document: SignedDocument) => {
    setError('');
    try {
      await signedDocumentService.download(document);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <section className={styles.panel} aria-label={title}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.hint}>{hint}</p>

      <div className={styles.actions}>
        {actions}
        {canUpload && (
          <FileDropzone
            accept="application/pdf,image/png,image/jpeg"
            ariaLabel={`Archivo firmado: ${title}`}
            title="Adjunta el documento firmado: arrástralo aquí o"
            hint="PDF, PNG o JPG · máximo 10 MB"
            busy={busy}
            onFile={(file) => void handleFile(file)}
          />
        )}
      </div>

      {loading ? (
        <p className={styles.empty}>Cargando…</p>
      ) : documents.length === 0 ? (
        <p className={styles.empty}>Aún no hay un documento firmado adjunto.</p>
      ) : (
        <ul className={styles.list}>
          {documents.map((doc) => (
            <li key={doc.id} className={styles.item}>
              <div className={styles.meta}>
                <b>{doc.fileName}</b>
                <span>
                  {formatSize(doc.fileSize)} · adjuntado por {doc.uploadedByName} el {new Date(doc.createdAt).toLocaleString('es-PE')}
                </span>
                <span className={styles.hash} title={doc.sha256}>
                  Huella SHA-256: {doc.sha256.slice(0, 16)}…
                </span>
              </div>
              <Button variant="ghost" size="sm" icon={<DownloadIcon size={15} />} onClick={() => handleDownload(doc)}>
                Descargar
              </Button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </section>
  );
}
