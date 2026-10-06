import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader, Card, Button, SelectField, EmptyState, TableSkeleton } from '@shared/components/ui';
import { PieChartIcon } from '@shared/components/icons';
import { ExportButtons } from '@shared/components/ExportButtons';
import { downloadFile } from '@shared/services/downloadFile';
import { schoolService } from '@features/tutorados/services/schoolService';
import { facultyService } from '../services/facultyService';
import { useEvaluationStatistics } from '../hooks/useEvaluationStatistics';
import styles from './EvaluationStatisticsPage.module.css';

// Resultados estadísticos de la evaluación de tutoría (HU-39): promedios por
// tutor e ítem del periodo activo, filtrables por escuela/facultad.
export function EvaluationStatisticsPage() {
  const [schoolId, setSchoolId] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [expandedTutorId, setExpandedTutorId] = useState<string | null>(null);

  const { data: schools = [] } = useQuery({
    queryKey: ['schools'],
    queryFn: () => schoolService.getSchools(),
  });
  const { data: faculties = [] } = useQuery({
    queryKey: ['faculties'],
    queryFn: () => facultyService.getFaculties(),
  });

  const { report, loading, error, refresh } = useEvaluationStatistics({
    schoolId: schoolId || undefined,
    facultyId: facultyId || undefined,
  });

  const handleExport = (format: 'pdf' | 'excel') =>
    downloadFile(
      `/evaluations/statistics/${format}`,
      `evaluacion-tutoria.${format === 'pdf' ? 'pdf' : 'xlsx'}`,
      { schoolId: schoolId || undefined, facultyId: facultyId || undefined },
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

      <Card padded className={styles.filters}>
        <div className={styles.field}>
          <label>Facultad</label>
          <SelectField value={facultyId} onChange={(e) => setFacultyId(e.target.value)}>
            <option value="">Todas las facultades</option>
            {faculties.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </SelectField>
        </div>
        <div className={styles.field}>
          <label>Escuela Profesional</label>
          <SelectField value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
            <option value="">Todas las escuelas</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>
        </div>
      </Card>

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
