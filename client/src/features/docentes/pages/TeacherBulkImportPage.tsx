import React, { useState } from 'react';
import styles from '@features/tutorados/pages/BulkImportPage.module.css';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { ImportStepper } from '@features/tutorados/components/ImportStepper';
import { UploadDropzone } from '@features/tutorados/components/UploadDropzone';
import { PageHeader, Button, Card, NextSteps } from '@shared/components/ui';
import { UsersPlusIcon, DownloadIcon, InfoIcon } from '@shared/components/icons';
import { teacherImportService, type TeacherImportReport } from '../services/teacherImportService';
import { TeacherImportResult } from '../components/TeacherImportResult';

const XLSX_EXT = '.xlsx';
const MAX_SIZE_MB = 5;

// Carga masiva de docentes tutores: igual de guiada que la de estudiantes. Cada fila crea la cuenta del docente (con su
// escuela) y le envía un enlace de un solo uso para crear su contraseña. Solo la DBU crea cuentas.
export const TeacherBulkImportPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<TeacherImportReport | null>(null);

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
      setReport(await teacherImportService.importTeachers(file));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleTemplate = async () => {
    try {
      await teacherImportService.downloadTemplate();
    } catch {
      setError('No se pudo descargar la plantilla.');
    }
  };

  // Paso activo del stepper: 1=Archivo, 2=Validación (con archivo), 3=Importación (con reporte).
  const currentStep = report ? 3 : file ? 2 : 1;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Carga masiva de docentes"
        subtitle="Crea las cuentas de los docentes tutores desde un archivo Excel de forma guiada"
        icon={<UsersPlusIcon size={24} />}
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
            Descarga la plantilla, completa los datos y súbela. El archivo debe incluir las columnas <code>nombres</code>,{' '}
            <code>apellidos</code>, <code>correo</code>, <code>telefono</code> y <code>escuela</code>. El <strong>correo</strong> debe ser
            único y la <strong>escuela</strong> debe coincidir con una escuela registrada: el docente solo podrá tutorear estudiantes de
            ella. Cada docente recibe un correo con un <strong>enlace de un solo uso</strong> para crear su contraseña (nadie recibe
            contraseñas). Las filas con errores se omiten y se listan al final para su corrección.
          </p>
        </div>

        <UploadDropzone file={file} maxSizeMB={MAX_SIZE_MB} onFile={pickFile} />

        {error && (
          <div className={styles.errorMsg} role="alert">
            {error}
          </div>
        )}

        <div className={styles.actions}>
          <Button size="lg" icon={<UsersPlusIcon size={18} />} onClick={handleImport} disabled={!file} loading={loading}>
            Importar docentes
          </Button>
        </div>

        {report && <TeacherImportResult report={report} />}
        {report && report.created > 0 && (
          <NextSteps
            steps={[
              { to: '/asignacion', label: 'Asignar el tutor de cada ciclo', description: 'Los docentes aparecen al elegir el tutor de los ciclos de su escuela' },
              { to: '/users', label: 'Ver los usuarios', description: 'Reenviar una invitación o corregir un dato' },
            ]}
          />
        )}
      </Card>
    </div>
  );
};
