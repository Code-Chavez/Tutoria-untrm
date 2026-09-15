import React, { useState } from 'react';
import styles from './BulkImportPage.module.css';
import { studentService, ImportReport } from '../services/studentService';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { ImportStepper } from '../components/ImportStepper';
import { UploadDropzone } from '../components/UploadDropzone';
import { ImportResult } from '../components/ImportResult';
import { PageHeader, Button, Card } from '@shared/components/ui';
import { UploadIcon, DownloadIcon, InfoIcon } from '@shared/components/icons';

const XLSX_EXT = '.xlsx';
const MAX_SIZE_MB = 5;

export const BulkImportPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<ImportReport | null>(null);

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

  // Paso activo del stepper: 1=Archivo, 2=Validación (con archivo), 3=Importación (con reporte).
  const currentStep = report ? 3 : file ? 2 : 1;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Carga masiva de estudiantes"
        subtitle="Importa tutorados desde un archivo Excel de forma guiada"
        icon={<UploadIcon size={24} />}
        actions={
          <Button variant="secondary" icon={<DownloadIcon size={16} />} onClick={handleTemplate}>
            Descargar plantilla
          </Button>
        }
      />

      <Card padded>
        <ImportStepper current={currentStep} />

        <div className={styles.intro}>
          <span className={styles.introIcon}>
            <InfoIcon size={18} />
          </span>
          <p>
            Descarga la plantilla, completa los datos y súbela. El archivo debe incluir las columnas{' '}
            <code>codigo</code>, <code>nombres</code>, <code>apellidos</code>, <code>correo</code>,{' '}
            <code>telefono</code>, <code>ciclo</code> y <code>escuela</code>. El{' '}
            <strong>código universitario</strong> debe tener entre 8 y 12 dígitos y la{' '}
            <strong>escuela</strong> debe coincidir con una escuela registrada. Las filas con errores
            se omiten y se listan al final para su corrección.
          </p>
        </div>

        <UploadDropzone file={file} maxSizeMB={MAX_SIZE_MB} onFile={pickFile} />

        {error && (
          <div className={styles.errorMsg} role="alert">
            {error}
          </div>
        )}

        <div className={styles.actions}>
          <Button
            size="lg"
            icon={<UploadIcon size={18} />}
            onClick={handleImport}
            disabled={!file}
            loading={loading}
          >
            Importar estudiantes
          </Button>
        </div>

        {report && <ImportResult report={report} onDownload={handleDownloadReport} />}
      </Card>
    </div>
  );
};
