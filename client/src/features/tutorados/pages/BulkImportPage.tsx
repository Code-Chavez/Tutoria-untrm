import React, { useRef, useState } from 'react';
import styles from './BulkImportPage.module.css';
import { studentService, ImportReport } from '../services/studentService';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { UploadIcon, ReportIcon, CloseIcon, CheckCircleIcon } from '@shared/components/icons';

const XLSX_EXT = '.xlsx';

export const BulkImportPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<ImportReport | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = (selected: File | null) => {
    setError('');
    setReport(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (!selected.name.toLowerCase().endsWith(XLSX_EXT)) {
      setError('El archivo debe tener extensión .xlsx');
      setFile(null);
      return;
    }
    setFile(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0] ?? null);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const result = await studentService.importStudents(file);
      setReport(result);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleTemplate = async () => {
    try {
      await studentService.downloadTemplate();
    } catch {
      setError('No se pudo descargar la plantilla.');
    }
  };

  const handleDownloadReport = async () => {
    if (!report) return;
    try {
      await studentService.downloadImportReport(report);
    } catch {
      setError('No se pudo descargar el reporte.');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.titleWrap}>
            <span className={styles.titleIcon}>
              <UploadIcon size={22} />
            </span>
            <h1 className={styles.title}>Carga masiva de estudiantes</h1>
          </div>
          <p className={styles.subtitle}>Importa tutorados desde un archivo Excel (.xlsx)</p>
        </div>
        <button className={styles.templateButton} onClick={handleTemplate}>
          <ReportIcon size={15} />
          Descargar plantilla
        </button>
      </div>

      <section className={styles.panel}>
        <p className={styles.instructions}>
          El archivo debe tener una fila de encabezados con las columnas{' '}
          <code>codigo</code>, <code>nombres</code>, <code>apellidos</code>, <code>correo</code>,{' '}
          <code>telefono</code>, <code>ciclo</code> y <code>escuela</code>. El{' '}
          <strong>código universitario</strong> debe tener entre 8 y 12 dígitos y la{' '}
          <strong>escuela</strong> debe coincidir con una escuela profesional registrada. Las filas
          con errores se omiten y se listan al final para su corrección.
        </p>

        <div
          className={`${styles.dropzone} ${dragging ? styles.dragging : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <label className={styles.fileLabel}>
            <UploadIcon size={28} />
            <span>
              Arrastra tu archivo aquí o <strong>haz clic para elegirlo</strong>
            </span>
            <input
              ref={inputRef}
              type="file"
              accept={XLSX_EXT}
              className={styles.hiddenInput}
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </label>

          {file && (
            <div className={styles.selectedFile}>
              <span>{file.name}</span>
              <button
                className={styles.clearFile}
                onClick={() => {
                  pickFile(null);
                  if (inputRef.current) inputRef.current.value = '';
                }}
                aria-label="Quitar archivo"
              >
                <CloseIcon size={15} />
              </button>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button className={styles.importButton} onClick={handleImport} disabled={!file || loading}>
            {loading ? 'Importando…' : 'Importar estudiantes'}
          </button>
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}

        {report && (
          <div className={styles.report}>
            <div className={styles.reportHead}>
              <h3 className={styles.reportTitle}>Resultado de la carga</h3>
              <button className={styles.reportButton} onClick={handleDownloadReport}>
                <ReportIcon size={15} />
                Descargar reporte
              </button>
            </div>
            <div className={styles.summary}>
              <div className={`${styles.stat} ${styles.statTotal}`}>
                <div className={styles.statNumber}>{report.totalRows}</div>
                <div className={styles.statLabel}>Filas procesadas</div>
              </div>
              <div className={`${styles.stat} ${styles.statOk}`}>
                <div className={styles.statNumber}>{report.created}</div>
                <div className={styles.statLabel}>Registrados</div>
              </div>
              <div className={`${styles.stat} ${styles.statSkip}`}>
                <div className={styles.statNumber}>{report.skipped}</div>
                <div className={styles.statLabel}>Omitidos</div>
              </div>
            </div>

            {report.errors.length === 0 ? (
              <div className={styles.successMsg}>
                <CheckCircleIcon size={16} /> Todos los estudiantes se registraron correctamente.
              </div>
            ) : (
              <table className={styles.errorsTable}>
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
                      <td>{err.row}</td>
                      <td>{err.studentCode ?? '—'}</td>
                      <td>{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
