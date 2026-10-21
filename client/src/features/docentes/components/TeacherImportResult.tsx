import React from 'react';
import { CheckCircleIcon, AlertTriangleIcon } from '@shared/components/icons';
import styles from '@features/tutorados/components/ImportResult.module.css';
import table from '@shared/components/ui/DataTable.module.css';
import type { TeacherImportReport } from '../services/teacherImportService';

interface TeacherImportResultProps {
  report: TeacherImportReport;
}

export const TeacherImportResult: React.FC<TeacherImportResultProps> = ({ report }) => {
  const success = report.errors.length === 0;
  const unsent = report.createdRows.filter((r) => !r.emailSent);

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div className={styles.headText}>
          <span className={`${styles.headIcon} ${success ? styles.ok : styles.warn}`}>
            {success ? <CheckCircleIcon size={20} /> : <AlertTriangleIcon size={20} />}
          </span>
          <div>
            <h2>Resultado de la carga</h2>
            <p>
              {success
                ? 'Todos los docentes quedaron registrados con su escuela y recibieron su invitación.'
                : 'La carga finalizó con filas omitidas. Revisa el detalle y corrige el archivo.'}
            </p>
          </div>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={`${styles.stat} ${styles.total}`}>
          <span className={styles.num}>{report.totalRows}</span>
          <span className={styles.lbl}>Filas procesadas</span>
        </div>
        <div className={`${styles.stat} ${styles.created}`}>
          <span className={styles.num}>{report.created}</span>
          <span className={styles.lbl}>Docentes creados</span>
        </div>
        <div className={`${styles.stat} ${styles.skipped}`}>
          <span className={styles.num}>{report.skipped}</span>
          <span className={styles.lbl}>Omitidos</span>
        </div>
      </div>

      {unsent.length > 0 && (
        <div className={styles.errorsCard} role="alert">
          <div className={styles.errorsHead}>No se pudo enviar el correo a {unsent.length} docente(s)</div>
          <p style={{ margin: '0 16px 12px' }}>Entrega a cada uno su enlace por un medio privado; no se vuelve a mostrar.</p>
          <div className={table.scroll}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th>Docente</th>
                  <th>Correo</th>
                  <th>Enlace de activación</th>
                </tr>
              </thead>
              <tbody>
                {unsent.map((row) => (
                  <tr key={row.email}>
                    <td>{row.fullName}</td>
                    <td>{row.email}</td>
                    <td>
                      <code style={{ wordBreak: 'break-all' }}>{row.invitationLink}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!success && (
        <div className={styles.errorsCard}>
          <div className={styles.errorsHead}>Errores de validación ({report.errors.length})</div>
          <div className={table.scroll}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th>Fila</th>
                  <th>Correo</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {report.errors.map((err, i) => (
                  <tr key={`${err.row}-${i}`}>
                    <td>
                      <span className={table.primary}>{err.row}</span>
                    </td>
                    <td>{err.email ?? '—'}</td>
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
