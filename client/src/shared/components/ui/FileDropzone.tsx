import React, { useId, useRef, useState } from 'react';
import { UploadIcon } from '@shared/components/icons';
import styles from './FileDropzone.module.css';

interface FileDropzoneProps {
  /** Tipos permitidos, con el mismo formato del atributo `accept` (extensiones o tipos MIME). */
  accept: string;
  onFile: (file: File) => void;
  /** Nombre accesible del campo de archivo. */
  ariaLabel: string;
  /** Texto principal; por omisión «Arrastra un archivo aquí o elígelo». */
  title?: string;
  /** Aclaración bajo el texto: formatos y tamaño máximo. */
  hint?: string;
  busy?: boolean;
  disabled?: boolean;
}

function matchesAccept(file: File, accept: string): boolean {
  const name = file.name.toLowerCase();
  return accept.split(',').some((raw) => {
    const token = raw.trim().toLowerCase();
    if (!token) return false;
    if (token.startsWith('.')) return name.endsWith(token);
    if (token.endsWith('/*')) return file.type.toLowerCase().startsWith(token.slice(0, -1));
    return file.type.toLowerCase() === token;
  });
}

/**
 * Zona para subir un archivo arrastrándolo o eligiéndolo con el selector del sistema. Es la única forma de subir archivos en el
 * sistema. Valida el tipo al soltar; el servidor vuelve a validar tipo, tamaño y contenido.
 */
export const FileDropzone: React.FC<FileDropzoneProps> = ({ accept, onFile, ariaLabel, title, hint, busy = false, disabled = false }) => {
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const inactive = disabled || busy;

  const take = (file: File | undefined, dropped: boolean) => {
    if (!file) return;
    // El selector ya filtra con `accept`; al soltar hay que comprobarlo a mano.
    if (dropped && !matchesAccept(file, accept)) {
      setRejected('Ese tipo de archivo no está permitido.');
      return;
    }
    setRejected('');
    onFile(file);
  };

  return (
    <div>
      <label
        className={`${styles.zone} ${dragging ? styles.dragging : ''} ${inactive ? styles.disabled : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!inactive) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!inactive) take(e.dataTransfer.files?.[0], true);
        }}
      >
        <UploadIcon size={22} />
        <span>
          {busy ? (
            'Subiendo…'
          ) : (
            <>
              {title ?? 'Arrastra un archivo aquí o'} <strong>elígelo</strong>
            </>
          )}
          {hint && <small className={styles.hint}>{hint}</small>}
        </span>
        <input
          ref={inputRef}
          type="file"
          className={styles.input}
          accept={accept}
          aria-label={ariaLabel}
          aria-describedby={rejected ? errorId : undefined}
          disabled={inactive}
          onChange={(e) => {
            take(e.target.files?.[0], false);
            // Permite volver a elegir el mismo archivo después de un error.
            e.target.value = '';
          }}
        />
      </label>
      {rejected && (
        <p id={errorId} role="alert" className={styles.error}>
          {rejected}
        </p>
      )}
    </div>
  );
};
