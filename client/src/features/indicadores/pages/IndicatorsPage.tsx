import { useState } from 'react';
import { PageHeader, Card, Button, SelectField, StatCard, EmptyState, TableSkeleton } from '@shared/components/ui';
import { PieChartIcon, UsersIcon, ActivityIcon, SendIcon, StarIcon } from '@shared/components/icons';
import { ExportButtons } from '@shared/components/ExportButtons';
import { downloadFile } from '@shared/services/downloadFile';
import { useIndicators } from '../hooks/useIndicators';
import styles from './IndicatorsPage.module.css';

// Tablero de indicadores (HU-45), orientado a ICACIT/SINEACE: cobertura de
// tutoría, riesgo, derivaciones por servicio y resultados de evaluación.
const SERVICE_LABEL: Record<string, string> = {
  ESCUELA: 'Escuela',
  PSICOPEDAGOGIA: 'Psicopedagogía',
  PSICOLOGIA: 'Psicología',
  ASISTENCIA_SOCIAL: 'Asistencia social',
  SALUD: 'Salud',
};

const STATUS_LABEL: Record<string, string> = {
  ENVIADO: 'Enviado',
  RECIBIDO: 'Recibido',
  EN_ATENCION: 'En atención',
  ATENDIDO: 'Atendido',
  CERRADO: 'Cerrado',
};

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const monthLabel = (iso: string) => MONTHS[Number(iso.slice(5, 7)) - 1] ?? iso;

interface BarRow {
  label: string;
  value: number;
  /** Segundo tramo apilado (p. ej. sesiones grupales). */
  extra?: number;
  note?: string;
}

// Barras horizontales en CSS: sin dependencias y legibles con lectores de pantalla.
function BarChart({ title, rows, legend }: { title: string; rows: BarRow[]; legend?: [string, string] }) {
  const max = Math.max(1, ...rows.map((r) => r.value + (r.extra ?? 0)));
  return (
    <Card padded className={styles.chart}>
      <h3>{title}</h3>
      {legend && (
        <p className={styles.legend}>
          <span className={styles.swatchA} /> {legend[0]} <span className={styles.swatchB} /> {legend[1]}
        </p>
      )}
      {rows.length === 0 ? (
        <p className={styles.empty}>Sin datos en el periodo.</p>
      ) : (
        <ul className={styles.bars}>
          {rows.map((r) => (
            <li key={r.label}>
              <span className={styles.barLabel}>{r.label}</span>
              <span
                className={styles.track}
                role="img"
                aria-label={`${r.label}: ${r.value}${r.extra !== undefined ? ` y ${r.extra}` : ''}`}
              >
                <span className={styles.fillA} style={{ width: `${(r.value / max) * 100}%` }} />
                {r.extra !== undefined && (
                  <span className={styles.fillB} style={{ width: `${(r.extra / max) * 100}%` }} />
                )}
              </span>
              <span className={styles.barValue}>{r.note ?? r.value + (r.extra ?? 0)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function IndicatorsPage() {
  const [facultyId, setFacultyId] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [tutorId, setTutorId] = useState('');

  const { report, loading, error, refresh } = useIndicators({
    facultyId: facultyId || undefined,
    schoolId: schoolId || undefined,
    tutorId: tutorId || undefined,
  });

  const handleExport = (format: 'pdf' | 'excel') =>
    downloadFile(`/indicators/${format}`, `indicadores-tutoria.${format === 'pdf' ? 'pdf' : 'xlsx'}`, {
      facultyId: facultyId || undefined,
      schoolId: schoolId || undefined,
      tutorId: tutorId || undefined,
    });

  const options = report?.filterOptions;
  const schoolOptions = (options?.schools ?? []).filter((s) => !facultyId || s.facultyId === facultyId);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Tablero de indicadores"
        subtitle={
          report
            ? `Indicadores de tutoría — periodo ${report.periodName}`
            : 'Indicadores de tutoría para ICACIT / SINEACE'
        }
        icon={<PieChartIcon size={22} />}
        actions={<ExportButtons onExport={handleExport} disabled={!report} />}
      />

      <Card padded className={styles.filters}>
        <div className={styles.field}>
          <label htmlFor="ind-faculty">Facultad</label>
          <SelectField
            id="ind-faculty"
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
          <label htmlFor="ind-school">Escuela Profesional</label>
          <SelectField id="ind-school" value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
            <option value="">Todas las escuelas</option>
            {schoolOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>
        </div>
        <div className={styles.field}>
          <label htmlFor="ind-tutor">Tutor</label>
          <SelectField id="ind-tutor" value={tutorId} onChange={(e) => setTutorId(e.target.value)}>
            <option value="">Todos los tutores</option>
            {(options?.tutors ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </SelectField>
        </div>
      </Card>

      {loading ? (
        <TableSkeleton rows={6} columns={3} />
      ) : error || !report ? (
        <EmptyState
          variant="error"
          icon={<PieChartIcon size={26} />}
          title="No se pudieron cargar los indicadores"
          description="Verifica que exista un periodo académico activo y vuelve a intentarlo."
          action={<Button variant="secondary" onClick={() => refresh()}>Reintentar</Button>}
        />
      ) : (
        <>
          <div className={styles.kpis}>
            <StatCard
              icon={<UsersIcon size={18} />}
              value={report.students.active}
              label="Tutorados activos"
              hint={`${report.students.assignedPct}% con tutor asignado`}
            />
            <StatCard
              icon={<ActivityIcon size={18} />}
              value={`${report.sessions.coveragePct}%`}
              label="Cobertura de sesiones"
              hint={`${report.sessions.studentsServed} tutorados atendidos · ${report.sessions.total} sesiones`}
              tone="success"
            />
            <StatCard
              icon={<UsersIcon size={18} />}
              value={`${report.risk.atRiskPct}%`}
              label="Tutorados en riesgo"
              hint={`${report.risk.atRisk} de ${report.students.active}`}
              tone="danger"
            />
            <StatCard
              icon={<SendIcon size={18} />}
              value={report.referrals.total}
              label="Derivaciones del periodo"
              tone="warning"
            />
            <StatCard
              icon={<StarIcon size={18} />}
              value={report.evaluation.averageScore === null ? '—' : `${report.evaluation.averageScore} / 5`}
              label="Evaluación de tutores"
              hint={`${report.evaluation.responses} respuestas`}
            />
          </div>

          <div className={styles.charts}>
            <BarChart
              title="Sesiones por mes"
              legend={['Individuales', 'Grupales']}
              rows={report.sessions.byMonth.map((m) => ({
                label: monthLabel(m.month),
                value: m.individual,
                extra: m.group,
              }))}
            />
            <BarChart
              title="Derivaciones por servicio"
              rows={report.referrals.byService.map((s) => ({
                label: SERVICE_LABEL[s.service] ?? s.service,
                value: s.count,
              }))}
            />
            <BarChart
              title="Derivaciones por estado"
              rows={report.referrals.byStatus.map((s) => ({
                label: STATUS_LABEL[s.status] ?? s.status,
                value: s.count,
              }))}
            />
            <BarChart
              title="Tutorados en riesgo por escuela"
              rows={report.risk.bySchool.map((s) => ({
                label: s.schoolName,
                value: s.atRisk,
                note: `${s.atRisk}/${s.active}`,
              }))}
            />
          </div>
        </>
      )}
    </div>
  );
}
