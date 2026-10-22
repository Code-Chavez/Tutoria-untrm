import { useRef, useState } from 'react';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { PageHeader, Card, Button, EmptyState, TableSkeleton } from '@shared/components/ui';
import { SettingsIcon, CheckCircleIcon, BanIcon } from '@shared/components/icons';
import { useDialog } from '@shared/hooks/useDialog';
import { useEvaluationWindows, useSetEvaluationWindow } from '../hooks/useEvaluationWindows';
import type { EvaluationWindowSchoolState } from '../services/evaluationService';
import styles from './EvaluationWindowsPage.module.css';

function WindowConfirmation({ school, periodName, busy, error, onCancel, onConfirm }: {
  school: EvaluationWindowSchoolState; periodName: string; busy: boolean; error: string;
  onCancel: () => void; onConfirm: () => void;
}) {
  const ref = useDialog(() => { if (!busy) onCancel(); });
  return (
    <div className={styles.overlay}>
      <div ref={ref} role="alertdialog" aria-modal="true" aria-labelledby="window-confirm-title" aria-describedby="window-confirm-impact" tabIndex={-1} className={styles.dialog}>
        <h2 id="window-confirm-title">{school.isOpen ? 'Cerrar evaluación' : 'Habilitar evaluación'}</h2>
        <p><strong>{school.schoolName}</strong> · Periodo {periodName}</p>
        <div id="window-confirm-impact">
          {school.isOpen ? <>
            <p>Los estudiantes de esta escuela ya no podrán enviar el cuestionario de evaluación de tutoría, incluso si lo tienen abierto sin enviar.</p>
            <p>Las respuestas enviadas se conservan y los resultados siguen disponibles para los roles autorizados. Puedes habilitar la evaluación nuevamente durante el periodo vigente.</p>
          </> : <>
            <p>Los estudiantes de esta escuela con tutor asignado podrán enviar el cuestionario del periodo vigente si aún no lo han respondido.</p>
            <p>Las respuestas anteriores se conservan. Cada estudiante puede responder una sola vez por periodo.</p>
          </>}
          <p>Este cambio solo afecta a la evaluación: no desactiva la escuela ni bloquea las solicitudes, sesiones o derivaciones de tutoría.</p>
        </div>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <div className={styles.dialogActions}>
          <Button variant="secondary" disabled={busy} onClick={onCancel}>Cancelar</Button>
          <Button variant={school.isOpen ? 'danger' : 'primary'} loading={busy} disabled={busy} onClick={onConfirm}>
            {school.isOpen ? 'Confirmar cierre de evaluación' : 'Confirmar habilitación de evaluación'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function EvaluationWindowsPage() {
  const { overview, loading, error, refresh } = useEvaluationWindows();
  const setWindow = useSetEvaluationWindow();
  const [decision, setDecision] = useState<EvaluationWindowSchoolState | null>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [actionError, setActionError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const schools = overview?.schools ?? [];
  const visibleSchools = schools.filter((school) => school.schoolName.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')) && (filter === 'all' || (filter === 'open' ? school.isOpen : !school.isOpen)));

  const confirmChange = async () => {
    if (!decision || saving.current) return;
    saving.current = true;
    setBusy(true);
    setActionError('');
    try {
      await setWindow(decision.schoolId, !decision.isOpen);
      setFeedback(`Evaluación ${decision.isOpen ? 'cerrada' : 'habilitada'} para ${decision.schoolName}.`);
      setDecision(null);
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Configuración de la evaluación" subtitle="Controla cuándo pueden responder los estudiantes de cada escuela profesional." icon={<SettingsIcon size={22} />} />
      <div className={styles.guide}>
        <strong>¿Qué significa cerrar la evaluación?</strong>
        <p>Solo se cierra el envío del cuestionario de evaluación de tutoría para la escuela seleccionada. La escuela y las demás actividades de tutoría continúan funcionando.</p>
      </div>
      {loading ? <TableSkeleton rows={5} columns={2} /> : error || !overview ? (
        <EmptyState variant="error" icon={<SettingsIcon size={26} />} title="No se pudo cargar la configuración" description="Ocurrió un error al consultar la información. Vuelve a intentarlo." action={<Button variant="secondary" onClick={() => refresh()}>Reintentar</Button>} />
      ) : <>
        <div className={styles.summary} aria-label="Resumen de evaluación">
          <div><span>Periodo académico</span><strong>{overview.periodName}</strong></div>
          <div><span>Escuelas con evaluación habilitada</span><strong>{schools.filter((school) => school.isOpen).length}</strong></div>
          <div><span>Escuelas con evaluación cerrada</span><strong>{schools.filter((school) => !school.isOpen).length}</strong></div>
        </div>
        {feedback && <p role="status" className={styles.success}>{feedback}</p>}
        <Card>
          <div className={styles.toolbar}>
            <label>Buscar escuela<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre de la escuela" /></label>
            <label>Estado de evaluación<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Todos los estados</option><option value="open">Habilitada</option><option value="closed">Cerrada</option></select></label>
            <span>{visibleSchools.length} de {schools.length} escuelas</span>
          </div>
          {visibleSchools.length === 0 ? <EmptyState icon={<SettingsIcon size={26} />} title="No hay escuelas en esta vista" description="Prueba otro nombre o cambia el filtro de estado." /> : (
            <ul className={styles.list}>
              {visibleSchools.map((school) => <li key={school.schoolId} className={styles.row}>
                <div className={styles.school}><h2>{school.schoolName}</h2><p>{school.isOpen ? 'Permite enviar nuevas evaluaciones.' : 'No permite enviar nuevas evaluaciones. Las respuestas anteriores se conservan.'}</p></div>
                <span className={school.isOpen ? styles.badgeOpen : styles.badgeClosed}>{school.isOpen ? 'Habilitada' : 'Cerrada'}</span>
                <Button variant={school.isOpen ? 'secondary' : 'primary'} icon={school.isOpen ? <BanIcon size={15} /> : <CheckCircleIcon size={15} />} disabled={busy} aria-label={`${school.isOpen ? 'Cerrar' : 'Habilitar'} evaluación de ${school.schoolName}`} onClick={() => { setDecision(school); setActionError(''); setFeedback(''); }}>{school.isOpen ? 'Cerrar evaluación' : 'Habilitar evaluación'}</Button>
              </li>)}
            </ul>
          )}
        </Card>
        {decision && <WindowConfirmation school={decision} periodName={overview.periodName} busy={busy} error={actionError} onCancel={() => setDecision(null)} onConfirm={confirmChange} />}
      </>}
    </div>
  );
}
