import React from 'react';
import { Button } from '@shared/components/ui';
import { CheckCircleIcon, DownloadIcon, AlertTriangleIcon } from '@shared/components/icons';
import { ImportReport } from '../services/studentService';
import styles from './ImportResult.module.css';
import table from '@shared/components/ui/DataTable.module.css';

interface ImportResultProps {
  report: ImportReport;
  onDownload: () => void;
}

export const ImportResult: React.FC<ImportResultProps> = ({ report, onDownload }) => {
  const success = report.errors.length === 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div className={styles.headText}>
          <span className={`${styles.headIcon} ${success ? styles.ok : styles.warn}`}>
            {success ? <CheckCircleIcon size={20} /> : <AlertTriangleIcon size={20} />}
          </span>
          <div>
            <h3>Resultado de la carga</h3>
            <p>
              {success
                ? 'Todos los estudiantes se registraron correctamente.'
                : 'La carga finalizó con filas omitidas. Revisa el detalle y corrige el archivo.'}
            </p>
          </div>
        </div>
        <Button variant="secondary" icon={<DownloadIcon size={16} />} onClick={onDownload}>
          Descargar reporte
        </Button>
      </div>

      <div className={styles.stats}>
        <div className={`${styles.stat} ${styles.total}`}>
          <span className={styles.num}>{report.totalRows}</span>
          <span className={styles.lbl}>Filas procesadas</span>
        </div>
        <div className={`${styles.stat} ${styles.created}`}>
          <span className={styles.num}>{report.created}</span>
          <span className={styles.lbl}>Registrados</span>
        </div>
        <div className={`${styles.stat} ${styles.skipped}`}>
          <span className={styles.num}>{report.skipped}</span>
          <span className={styles.lbl}>Omitidos</span>
        </div>
      </div>

      {success ? (
        <div className={styles.successBox}>
          <CheckCircleIcon size={18} />
          Importación completada sin errores.
        </div>
      ) : (
        <div className={styles.errorsCard}>
          <div className={styles.errorsHead}>Errores de validación ({report.errors.length})</div>
          <div className={table.scroll}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th>Fila</th>
                  <th>Código</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {report.errors.map((err, i) => (
                  <tr key={`${err.row}-${i}`}>
                    <td>
                      <span className={table.primary}>{err.row}</span>
                    </td>
                    <td>{err.studentCode ?? '—'}</td>
                    <td>{err.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
