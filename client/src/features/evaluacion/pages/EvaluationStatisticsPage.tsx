import { useState } from 'react';
import { PageHeader, Card, Button, EmptyState, TableSkeleton } from '@shared/components/ui';
import { ReportFilters } from '@shared/reportFilters/ReportFilters';
import { EMPTY_REPORT_FILTERS, toFilterParams } from '@shared/reportFilters/reportFilterService';
import { PieChartIcon } from '@shared/components/icons';
import { ExportButtons } from '@shared/components/ExportButtons';
import { downloadFile } from '@shared/services/downloadFile';
import { useEvaluationStatistics } from '../hooks/useEvaluationStatistics';
import styles from './EvaluationStatisticsPage.module.css';

// Resultados estadísticos de la evaluación de tutoría (HU-39): promedios por
// tutor e ítem del periodo activo, filtrables por escuela/facultad.
export function EvaluationStatisticsPage() {
  const [values, setValues] = useState(EMPTY_REPORT_FILTERS);
  const [expandedTutorId, setExpandedTutorId] = useState<string | null>(null);

  const filters = toFilterParams(values);
  const { report, loading, error, refresh } = useEvaluationStatistics(filters);

  const handleExport = (format: 'pdf' | 'excel') =>
    downloadFile(
      `/evaluations/statistics/${format}`,
      `evaluacion-tutoria.${format === 'pdf' ? 'pdf' : 'xlsx'}`,
      { ...filters },
    );

  return (
    <div className={styles.page}>
      <PageHeader
        title="Resultados de la evaluación"
        subtitle="Promedios por tutor e ítem del periodo activo, con resultados agregados y anónimos (Anexo N°7)"
        icon={<PieChartIcon size={22} />}
        actions={
          <ExportButtons onExport={handleExport} disabled={!report || report.tutors.length === 0} />
        }
      />

      <ReportFilters value={values} onChange={setValues} />

      {loading ? (
        <TableSkeleton rows={5} columns={3} />
      ) : error || !report ? (
        <EmptyState
          variant="error"
          icon={<PieChartIcon size={26} />}
          title="No se pudo cargar las estadísticas"
          description="Ocurrió un error al consultar la información. Vuelve a intentarlo."
          action={<Button variant="secondary" onClick={() => refresh()}>Reintentar</Button>}
        />
      ) : report.tutors.length === 0 ? (
        <EmptyState
          icon={<PieChartIcon size={26} />}
          title="Sin respuestas para este filtro"
          description={`Ningún tutorado respondió el cuestionario del periodo ${report.periodName} con los filtros seleccionados.`}
        />
      ) : (
        <Card>
          <div className={styles.head}>
            <span>Periodo académico: {report.periodName}</span>
            <span className={styles.count}>{report.tutors.length} tutor(es) con respuestas</span>
          </div>
          <ul className={styles.tutorList}>
            {report.tutors.map((tutor) => {
              const expanded = expandedTutorId === tutor.tutorId;
              return (
                <li key={tutor.tutorId} className={styles.tutorRow}>
                  <button
                    type="button"
                    className={styles.tutorHead}
                    onClick={() => setExpandedTutorId(expanded ? null : tutor.tutorId)}
                  >
                    <div className={styles.tutorInfo}>
                      <b>{tutor.tutorName}</b>
                      <span className={styles.meta}>{tutor.totalResponses} respuesta(s)</span>
                    </div>
                    <div className={styles.overallBar}>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{ width: `${(tutor.overallAverage / 5) * 100}%` }}
                        />
                      </div>
                      <span className={styles.barValue}>{tutor.overallAverage.toFixed(2)} / 5</span>
                    </div>
                  </button>

                  {expanded && (
                    <div className={styles.itemsList}>
                      {tutor.items.map((item) => (
                        <div key={item.code} className={styles.itemRow}>
                          <span className={styles.itemLabel}>{item.label}</span>
                          <div className={styles.barTrack}>
                            <div
                              className={styles.barFillSmall}
                              style={{ width: `${(item.average / 5) * 100}%` }}
                            />
                          </div>
                          <span className={styles.itemValue}>{item.average.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
