import { Fragment, useState } from 'react';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { PageHeader, Card, Button, SelectField, EmptyState, TableSkeleton } from '@shared/components/ui';
import { ReportIcon, DownloadIcon } from '@shared/components/icons';
import { useConsolidatedReport } from '../hooks/useConsolidatedReport';
import { consolidatedReportService, ConsolidatedMetrics } from '../services/consolidatedReportService';
import styles from './ConsolidatedReportPage.module.css';

// Informe consolidado por escuela y facultad (HU-44) para la DBU y las
// autoridades académicas: totales y promedios del periodo activo, exportable.
const COLUMNS: { label: string; value: (m: ConsolidatedMetrics) => string }[] = [
  { label: 'Tutorados', value: (m) => String(m.activeStudents) },
  { label: 'Con tutor', value: (m) => String(m.studentsWithTutor) },
  { label: 'Cobertura', value: (m) => `${m.coveragePct}%` },
  { label: 'Tutores', value: (m) => String(m.tutors) },
  { label: 'Ses. individuales', value: (m) => String(m.sessionsIndividual) },
  { label: 'Ses. grupales', value: (m) => String(m.sessionsGroup) },
  { label: 'Participantes', value: (m) => String(m.participants) },
  { label: 'Participación', value: (m) => `${m.participationPct}%` },
  { label: 'Informes', value: (m) => `${m.reportsSubmitted}/${m.tutors}` },
  { label: 'Tutorados/tutor', value: (m) => String(m.avgStudentsPerTutor) },
  { label: 'Sesiones/tutor', value: (m) => String(m.avgSessionsPerTutor) },
];

export function ConsolidatedReportPage() {
  const [facultyId, setFacultyId] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [exportError, setExportError] = useState('');

  const filters = { facultyId: facultyId || undefined, schoolId: schoolId || undefined };
  const { report, loading, error, refresh } = useConsolidatedReport(filters);

  const options = report?.filterOptions;
  const schoolOptions = (options?.schools ?? []).filter((s) => !facultyId || s.facultyId === facultyId);

  const handleExport = async (format: 'excel' | 'pdf') => {
    setExporting(format);
    setExportError('');
    try {
      await consolidatedReportService.download(format, filters);
    } catch (err) {
      setExportError(getApiErrorMessage(err));
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Informe consolidado"
        subtitle={
          report
            ? `Tutoría por escuela y facultad — periodo ${report.periodName}`
            : 'Tutoría por escuela y facultad'
        }
        icon={<ReportIcon size={22} />}
      />

      <Card padded className={styles.filters}>
        <div className={styles.field}>
          <label htmlFor="cr-faculty">Facultad</label>
          <SelectField
            id="cr-faculty"
            value={facultyId}
            onChange={(e) => {
              setFacultyId(e.target.value);
              setSchoolId('');
            }}
          >
            <option value="">Todas las facultades</option>
            {(options?.faculties ?? []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </SelectField>
        </div>
        <div className={styles.field}>
          <label htmlFor="cr-school">Escuela Profesional</label>
          <SelectField id="cr-school" value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
            <option value="">Todas las escuelas</option>
            {schoolOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>
        </div>
        <div className={styles.exports}>
          <Button
            variant="secondary"
            icon={<DownloadIcon size={16} />}
            disabled={!report}
            loading={exporting === 'excel'}
            onClick={() => handleExport('excel')}
          >
            Excel
          </Button>
          <Button
            variant="secondary"
            icon={<DownloadIcon size={16} />}
            disabled={!report}
            loading={exporting === 'pdf'}
            onClick={() => handleExport('pdf')}
          >
            PDF
          </Button>
        </div>
      </Card>

      {exportError && (
        <p role="alert" className={styles.error}>
          {exportError}
        </p>
      )}

      {loading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : error || !report ? (
        <EmptyState
          variant="error"
          icon={<ReportIcon size={26} />}
          title="No se pudo cargar el informe consolidado"
          description="Verifica que exista un periodo académico activo y vuelve a intentarlo."
          action={<Button variant="secondary" onClick={() => refresh()}>Reintentar</Button>}
        />
      ) : report.faculties.length === 0 ? (
        <EmptyState
          icon={<ReportIcon size={26} />}
          title="Sin datos"
          description="No hay escuelas para los filtros seleccionados."
        />
      ) : (
        <Card>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Escuela / facultad</th>
                  {COLUMNS.map((c) => (
                    <th key={c.label} className={styles.num}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.faculties.map((faculty) => (
                  <Fragment key={faculty.facultyId}>
                    {faculty.schools.map((school) => (
                      <tr key={school.schoolId}>
                        <td>{school.schoolName}</td>
                        {COLUMNS.map((c) => (
                          <td key={c.label} className={styles.num}>
                            {c.value(school.metrics)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className={styles.subtotal}>
                      <td>Total {faculty.facultyName}</td>
                      {COLUMNS.map((c) => (
                        <td key={c.label} className={styles.num}>
                          {c.value(faculty.metrics)}
                        </td>
                      ))}
                    </tr>
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total general</td>
                  {COLUMNS.map((c) => (
                    <td key={c.label} className={styles.num}>
                      {c.value(report.totals)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
