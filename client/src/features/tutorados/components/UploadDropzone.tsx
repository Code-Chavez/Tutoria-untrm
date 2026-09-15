import React, { useRef, useState } from 'react';
import { UploadIcon, FileSpreadsheetIcon, CloseIcon } from '@shared/components/icons';
import styles from './UploadDropzone.module.css';

interface UploadDropzoneProps {
  file: File | null;
  maxSizeMB: number;
  onFile: (file: File | null) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({ file, maxSizeMB, onFile }) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    onFile(e.dataTransfer.files?.[0] ?? null);
  };

  const clear = () => {
    onFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  if (file) {
    return (
      <div className={styles.selected}>
        <span className={styles.fileIcon}>
          <FileSpreadsheetIcon size={26} />
        </span>
        <div className={styles.fileInfo}>
          <b>{file.name}</b>
          <small>{formatSize(file.size)} · Listo para importar</small>
        </div>
        <button className={styles.remove} onClick={clear} aria-label="Quitar archivo">
          <CloseIcon size={18} />
        </button>
        {/* Se mantiene el input en el DOM para conservar la referencia y el valor. */}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className={styles.hiddenInput}
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </div>
    );
  }

  return (
    <div
      className={`${styles.dropzone} ${dragging ? styles.dragging : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <label className={styles.label}>
        <span className={styles.arrow}>
          <UploadIcon size={30} />
        </span>
        <span className={styles.big}>
          Arrastra tu archivo Excel aquí o <strong>selecciona un archivo</strong>
        </span>
        <span className={styles.meta}>Formato permitido: .xlsx · Tamaño máximo: {maxSizeMB} MB</span>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className={styles.hiddenInput}
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
};
