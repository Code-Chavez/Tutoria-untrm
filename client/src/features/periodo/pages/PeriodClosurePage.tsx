import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Card, CardHeader, CardBody, Button, Badge, ConfirmDialog, SelectField, EmptyState, TableSkeleton } from '@shared/components/ui';
import { ClockIcon } from '@shared/components/icons';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { useClosePeriod, usePeriodClosure, usePeriodList, useReopenPeriod } from '../hooks/usePeriods';
import type { PeriodState, PeriodSummary } from '../services/periodService';
import styles from './PeriodClosurePage.module.css';

const STATE_LABEL: Record<PeriodState, string> = { VIGENTE: 'Vigente', CERRADO: 'Cerrado', SIN_ABRIR: 'Sin abrir' };
const STATE_TONE: Record<PeriodState, 'success' | 'neutral' | 'warning'> = { VIGENTE: 'success', CERRADO: 'neutral', SIN_ABRIR: 'warning' };

const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-PE', { dateStyle: 'medium' });

function SummaryList({ summary }: { summary: PeriodSummary }) {
  const rows: [string, string][] = [
    ['Estudiantes en el periodo', `${summary.students.total} (${summary.students.active} activos, ${summary.students.atRisk} en riesgo académico)`],
    ['Docentes tutores con estudiantes', String(summary.tutors)],
    ['Sesiones', `${summary.sessions.total} (${summary.sessions.individual} individuales, ${summary.sessions.group} grupales, ${summary.sessions.cancelled} canceladas, ${summary.sessions.withAttendance} con asistencia)`],
    ['Solicitudes de tutoría', String(summary.tutoringRequests.total)],
    ['Derivaciones', String(summary.referrals.total)],
    ['Respuestas de evaluación al tutor', String(summary.evaluations.responses)],
    ['Informes semestrales presentados', String(summary.semesterReports.submitted)],
  ];
  return (
    <dl className={styles.summary}>
      {rows.map(([label, value]) => (
        <div key={label} className={styles.summaryRow}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

// Cierre del periodo (solo la DBU): resumen de lo ocurrido, matrícula congelada y la tutoría en solo lectura.
// Los registros no se borran: quedan como historial del periodo.
export function PeriodClosurePage() {
  const periods = usePeriodList();
  const [chosen, setChosen] = useState('');
  // Del más reciente al más antiguo: sin periodo vigente, el primero es el que se cerró último (el que se querría reabrir).
  const list = [...(periods.data ?? [])].sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));
  // Por defecto, el periodo vigente (o el más reciente si no hay).
  const selectedId = chosen || list.find((p) => p.isActive)?.id || list[0]?.id;
  const closure = usePeriodClosure(selectedId);
  const closePeriod = useClosePeriod();
  const reopenPeriod = useReopenPeriod();

  const [closing, setClosing] = useState(false);
  const [typed, setTyped] = useState('');
  const [reopening, setReopening] = useState(false);
  const [error, setError] = useState('');

  const view = closure.data;
  const anotherOpen = list.some((p) => p.isActive && p.id !== selectedId);
  const pendingTotal = view ? view.summary.pending.openRequests + view.summary.pending.openReferrals + view.summary.pending.upcomingSessions : 0;

  const confirmClose = async () => {
    if (!view) return;
    setError('');
    try {
      await closePeriod.mutateAsync({ id: view.period.id, confirmName: typed });
      setClosing(false);
      setTyped('');
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const confirmReopen = async () => {
    if (!view) return;
    setError('');
    try {
      await reopenPeriod.mutateAsync(view.period.id);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setReopening(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Cierre de periodo"
        subtitle="Al cerrar el periodo se guarda su resumen y la tutoría pasa a solo lectura: el historial se conserva y no se registra nada nuevo."
        icon={<ClockIcon size={24} />}
      />

      {periods.isLoading ? (
        <TableSkeleton rows={4} columns={2} />
      ) : list.length === 0 ? (
        <EmptyState icon={<ClockIcon size={26} />} title="No hay periodos académicos" description="Cree el primero en Catálogos." />
      ) : (
        <>
          <div className={styles.picker}>
            <label htmlFor="period-select">Periodo</label>
            <SelectField id="period-select" value={selectedId ?? ''} onChange={(e) => setChosen(e.target.value)}>
              {list.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectField>
          </div>

          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}

          {closure.isLoading || !view ? (
            <TableSkeleton rows={5} columns={2} />
          ) : (
            <Card>
              <CardHeader
                title={view.period.name}
                description={`${fmt(view.period.startDate)} – ${fmt(view.period.endDate)}`}
                actions={<Badge tone={STATE_TONE[view.state]}>{STATE_LABEL[view.state]}</Badge>}
              />
              <CardBody>
                {view.state === 'CERRADO' && view.closedAt && <p className={styles.note}>Cerrado el {fmt(view.closedAt)}. Resumen guardado al momento del cierre.</p>}
                {view.isPreview && <p className={styles.note}>Vista previa calculada ahora; el resumen definitivo se guarda al cerrar.</p>}

                <div className={styles.closureLayout}><section aria-label="Resumen del periodo"><h3 className={styles.sectionTitle}>Resumen del periodo</h3><SummaryList summary={view.summary} /></section><section className={styles.review} aria-label="Revisión del cierre"><h3 className={styles.sectionTitle}>Revisión del cierre</h3>

                {view.state === 'VIGENTE' && pendingTotal > 0 && (
                  <p role="status" className={styles.warn}>
                    Al cerrar quedarán en solo lectura: <strong>{view.summary.pending.openRequests}</strong> solicitudes abiertas,{' '}
                    <strong>{view.summary.pending.openReferrals}</strong> derivaciones abiertas y <strong>{view.summary.pending.upcomingSessions}</strong> sesiones
                    próximas. Atiéndalas antes si es posible.
                  </p>
                )}

                <p className={styles.reports}>
                  Reporte completo del periodo: <Link to="/informes/consolidado">Informe consolidado</Link>, <Link to="/indicadores">Indicadores</Link> y{' '}
                  <Link to="/evaluacion/resultados">Resultados de evaluación</Link>, eligiendo el periodo «{view.period.name}».
                </p>

                <div className={styles.actions}>
                  {view.state === 'VIGENTE' && (
                    <Button variant="primary" onClick={() => setClosing(true)}>
                      Cerrar periodo
                    </Button>
                  )}
                  {view.state === 'CERRADO' && (
                    <>
                      <Button variant="secondary" onClick={() => setReopening(true)} disabled={anotherOpen}>
                        Reabrir periodo
                      </Button>
                      {anotherOpen && <span className={styles.note}>Hay otro periodo vigente: ciérrelo antes de reabrir este.</span>}
                    </>
                  )}
                </div>
                </section></div>
              </CardBody>
            </Card>
          )}
        </>
      )}

      {closing && view && (
        <div className={styles.overlay}>
          <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="close-title">
            <h2 id="close-title">Cerrar el periodo {view.period.name}</h2>
            <p>
              La tutoría pasará a <strong>solo lectura</strong> y los estudiantes solo verán su historial hasta que se abra otro periodo y vuelvan a
              estar cargados. Nada se borra. Para confirmar, escriba el nombre del periodo.
            </p>
            <label htmlFor="confirm-name">Nombre del periodo</label>
            <input id="confirm-name" className={styles.input} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" placeholder={view.period.name} />
            <div className={styles.dialogActions}>
              <Button variant="secondary" onClick={() => { setClosing(false); setTyped(''); }}>
                Cancelar
              </Button>
              <Button variant="primary" loading={closePeriod.isPending} disabled={typed.trim() !== view.period.name} onClick={confirmClose}>
                Cerrar periodo
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={reopening}
        title="Reabrir el periodo"
        message="Úselo para corregir un cierre hecho por error. El periodo vuelve a estar vigente y la tutoría a operar."
        confirmLabel="Reabrir"
        loading={reopenPeriod.isPending}
        onConfirm={confirmReopen}
        onCancel={() => setReopening(false)}
      />
    </div>
  );
}
