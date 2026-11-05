import React, { useEffect, useState } from 'react';
import styles from './TableSkeleton.module.css';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  /** Qué se está cargando (se ve y lo anuncian los lectores de pantalla): «Cargando tus sesiones…». */
  label?: string;
  /** Pasado este tiempo se avisa de que tarda más de lo normal. */
  slowAfterMs?: number;
  /** Si se pasa, el aviso de lentitud ofrece reintentar. */
  onRetry?: () => void;
}

/**
 * Esqueleto de una lista que está cargando. Las filas grises son solo decorativas: lo que importa es el texto (visible y accesible) que
 * dice qué se carga, y el aviso si tarda; sin él, quien usa un lector de pantalla —o mira una pantalla que no termina de cargar—
 * solo ve el título y no sabe si hay datos, no hay nada o falló.
 */
export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 6, columns = 5, label = 'Cargando…', slowAfterMs = 8000, onRetry }) => {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), slowAfterMs);
    return () => window.clearTimeout(timer);
  }, [slowAfterMs]);

  return (
    <div className={styles.wrap} role="progressbar" aria-busy="true" aria-label={label}>
      <p className={styles.caption}>{label}</p>
      <div aria-hidden="true">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className={styles.row}>
            {Array.from({ length: columns }).map((_, c) => (
              <span key={c} className={styles.cell} style={{ width: `${60 + ((r + c) % 4) * 10}%` }} />
            ))}
          </div>
        ))}
      </div>
      {slow && (
        <p className={styles.slow} role="status">
          Está tardando más de lo normal.{' '}
          {onRetry ? (
            <button type="button" className={styles.retry} onClick={onRetry}>
              Reintentar
            </button>
          ) : (
            'Si no carga, vuelve a abrir la pantalla o recarga la página.'
          )}
        </p>
      )}
    </div>
  );
};
