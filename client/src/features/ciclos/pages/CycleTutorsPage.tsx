import { useState } from 'react';
import { isAxiosError } from 'axios';
import { PageHeader, Card, CardBody, Button, Badge, SelectField, EmptyState, NextSteps, TableSkeleton } from '@shared/components/ui';
import { UserPlusIcon } from '@shared/components/icons';
import { useDialog } from '@shared/hooks/useDialog';
import type { ReactNode } from 'react';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { useAuth } from '@features/auth/hooks/useAuth';
import { useRequestSchools } from '@features/pedidos/hooks/useDataRequests';
import { DAY_LABEL } from '../services/tutorAcceptanceService';
import type { CycleRow } from '../services/cycleTutorService';
import { useCycleTutors, useRemoveCycleTutor, useResendAcceptance, useSetCycleTutor, useTutorOptions } from '../hooks/useCycleTutors';
import styles from './CycleTutorsPage.module.css';

const STATUS_LABEL = { SIN_SOLICITAR: 'Aceptación sin solicitar', PENDIENTE: 'Esperando respuesta', ACEPTADA: 'Aceptó', RECHAZADA: 'Rechazó' } as const;
const STATUS_TONE = { SIN_SOLICITAR: 'neutral', PENDIENTE: 'warning', ACEPTADA: 'success', RECHAZADA: 'danger' } as const;
const EXCEPTION_REASONS = [
  'No hay suficientes docentes disponibles en la escuela.',
  'Se necesita cubrir temporalmente la ausencia de otro docente.',
  'Se requiere mantener la continuidad de la atención de los estudiantes.',
] as const;

/**
 * Lo que pide acción va primero: ciclos con estudiantes y sin tutor, luego los que el docente rechazó, los que tienen estudiantes
 * sin tutor, los ciclos vacíos sin tutor, los pendientes de respuesta y, al final, los que ya están resueltos.
 */
export function cyclePriority(row: CycleRow): number {
  if (!row.assignment) return row.enrolled > 0 ? 0 : 3;
  if (row.assignment.acceptanceStatus === 'RECHAZADA') return 1;
  if (row.withoutTutor > 0) return 2;
  if (row.assignment.acceptanceStatus === 'PENDIENTE' || row.assignment.acceptanceStatus === 'SIN_SOLICITAR') return 4;
  return 5;
}

const byUrgency = (a: CycleRow, b: CycleRow) => cyclePriority(a) - cyclePriority(b) || a.cycle - b.cycle;

interface PendingException {
  cycle: number;
  tutorId: string;
  message: string;
}

function DecisionDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useDialog(onClose);
  return <div className={styles.overlay}>
    <div ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className={styles.exception}>
      <h2>{title}</h2>{children}
    </div>
  </div>;
}

// Un tutor por ciclo de cada escuela en el periodo vigente. Un docente atiende un solo ciclo; si la facultad no tiene más
// docentes, el segundo ciclo se registra como excepción con su motivo (p. ej. el docente aceptó por correo).
export function CycleTutorsPage() {
  const { user } = useAuth();
  const schoolsQuery = useRequestSchools();
  const tutorsQuery = useTutorOptions();
  const [chosen, setChosen] = useState('');
  const schools = (schoolsQuery.data ?? []).filter((s) => user?.role === 'Administrador DBU' || s.coordinatorId === user?.id);
  const school = schools.find((s) => s.id === chosen) ?? schools[0];
  const view = useCycleTutors(school?.id);
  const setTutor = useSetCycleTutor(school?.id ?? '');
  const removeTutor = useRemoveCycleTutor(school?.id ?? '');
  const resend = useResendAcceptance(school?.id ?? '');
  const [pending, setPending] = useState<PendingException | null>(null);
  const [note, setNote] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [exceptionReason, setExceptionReason] = useState('');
  const exceptionNote = exceptionReason === 'OTHER' ? note.trim() : exceptionReason;
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [selection, setSelection] = useState<Record<number, string>>({});
  const [filter, setFilter] = useState<'students' | 'review' | 'accepted' | 'all'>('students');
  const [removing, setRemoving] = useState<number | null>(null);
  const busy = setTutor.isPending || removeTutor.isPending || resend.isPending;
  const rows = view.data?.cycles ?? [];
  const needsReview = (row: CycleRow) => row.enrolled > 0 && (!row.assignment || row.assignment.acceptanceStatus !== 'ACEPTADA' || row.withoutTutor > 0);
  const visibleRows = rows.filter((row) => filter === 'all' || (filter === 'students' && row.enrolled > 0) || (filter === 'review' && needsReview(row)) || (filter === 'accepted' && row.assignment?.acceptanceStatus === 'ACEPTADA')).sort(byUrgency);

  // Solo los docentes de la escuela pueden ser tutores de sus ciclos.
  const tutors = (tutorsQuery.data ?? []).filter((t) => t.schoolId === school?.id);
  const tutorName = (id: string) => tutors.find((t) => t.tutorId === id)?.fullName ?? 'Docente';

  const save = async (cycle: number, tutorId: string, exception?: { note: string }) => {
    setFeedback(null);
    try {
      const result = await setTutor.mutateAsync({ cycle, tutorId, ...(exception && { isException: true, note: exception.note }) });
      setPending(null);
      setNote('');
      setExceptionReason('');
      setSelection((current) => { const next = { ...current }; delete next[cycle]; return next; });
      const mail = result.acceptanceEmailSent === true ? ' Se envió al docente el correo para que acepte.' : result.acceptanceEmailSent === false ? ' No se pudo enviar el correo al docente: use «Solicitar respuesta por correo».' : '';
      setFeedback({ ok: true, text: `Ciclo ${cycle}: ${result.assigned} estudiante(s) asignados${result.moved ? ` y ${result.moved} movidos` : ''}.${mail}` });
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.code === 'TUTOR_HAS_CYCLE') {
        setExceptionReason('');
        setNote('');
        setPending({ cycle, tutorId, message: error.response.data.error });
      } else {
        setPending(null);
        setFeedback({ ok: false, text: getApiErrorMessage(error) });
      }
    }
  };

  const resendMail = async (cycle: number) => {
    setFeedback(null);
    try {
      const sent = await resend.mutateAsync(cycle);
      setFeedback({ ok: sent, text: sent ? `Ciclo ${cycle}: correo enviado al docente.` : `Ciclo ${cycle}: no se pudo enviar el correo (revise la configuración de correo).` });
    } catch (error) {
      setFeedback({ ok: false, text: getApiErrorMessage(error) });
    }
  };

  const remove = async (cycle: number) => {
    setFeedback(null);
    try {
      await removeTutor.mutateAsync(cycle);
      setRemoving(null);
      setSelection((current) => { const next = { ...current }; delete next[cycle]; return next; });
      setFeedback({ ok: true, text: `Se quitó la asignación del ciclo ${cycle}. Los estudiantes conservan su tutor actual; cualquier cambio individual se realiza en Estudiantes.` });
    } catch (error) {
      setFeedback({ ok: false, text: getApiErrorMessage(error) });
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Asignación por ciclo"
        subtitle="Elige una escuela, revisa sus ciclos y guarda el docente que atenderá a cada uno."
        icon={<UserPlusIcon size={24} />}
        actions={schools.length > 0 && !schoolsQuery.isLoading && !schoolsQuery.isError ? (
          <div className={styles.controls}>
          <div className={styles.picker}>
            <div className={styles.pickerMeta}><label htmlFor="cycle-school">Escuela profesional</label>{view.data && <span>Periodo {view.data.periodName} · {tutors.length} docente{tutors.length !== 1 ? 's' : ''}</span>}</div>
            <SelectField id="cycle-school" value={school?.id ?? ''} disabled={busy} onChange={(e) => { setChosen(e.target.value); setPending(null); setFeedback(null); setSelection({}); setRemoving(null); }}>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </SelectField>
          </div>

          <Button variant="secondary" size="sm" onClick={() => setShowGuide(true)} aria-haspopup="dialog">Cómo asignar un docente</Button>
          {showGuide && <DecisionDialog title="Cómo asignar un docente" onClose={() => setShowGuide(false)}>
            <ol><li>Revisa los ciclos con estudiantes.</li><li>Elige al docente y pulsa «Guardar asignación».</li><li>Comprueba su respuesta y horario de atención.</li></ol>
            <p>Guardar aplica la asignación a los estudiantes del ciclo; no equivale a que el docente haya aceptado. Las asignaciones individuales se conservan según las reglas actuales.</p>
            <div className={styles.actions}><Button size="sm" onClick={() => setShowGuide(false)}>Entendido</Button></div>
          </DecisionDialog>}
          </div>

        ) : undefined}
      />

      {schoolsQuery.isLoading ? (
        <TableSkeleton rows={4} columns={3} />
      ) : schoolsQuery.isError ? (
        <EmptyState icon={<UserPlusIcon size={26} />} variant="error" title="No se pudieron cargar las escuelas" description={getApiErrorMessage(schoolsQuery.error)} action={<Button onClick={() => schoolsQuery.refetch()}>Reintentar</Button>} />
      ) : schools.length === 0 ? (
        <EmptyState icon={<UserPlusIcon size={26} />} title="No tienes escuelas a cargo" description="Pide a la DBU que te asigne como coordinador de una escuela." />
      ) : (
        <>

          {feedback && (
            <p role={feedback.ok ? 'status' : 'alert'} className={feedback.ok ? styles.ok : styles.error}>
              {feedback.text}
            </p>
          )}

          {view.isLoading || tutorsQuery.isLoading ? (
            <TableSkeleton rows={5} columns={4} />
          ) : view.isError ? (
            <EmptyState icon={<UserPlusIcon size={26} />} title="No se pudo cargar" description={getApiErrorMessage(view.error)} action={<Button onClick={() => view.refetch()}>Reintentar</Button>} />
          ) : tutorsQuery.isError ? (
            <EmptyState icon={<UserPlusIcon size={26} />} variant="error" title="No se pudieron cargar los docentes" description={getApiErrorMessage(tutorsQuery.error)} action={<Button onClick={() => tutorsQuery.refetch()}>Reintentar</Button>} />
          ) : view.data ? (
            <Card>
              <CardBody>
                <div className={styles.summary} aria-label="Resumen de asignaciones">
                  <div><strong>{rows.reduce((sum, row) => sum + row.enrolled, 0)}</strong><span>Estudiantes</span></div>
                  <div><strong>{rows.filter((row) => row.enrolled > 0 && !row.assignment).length}</strong><span>Ciclos sin docente</span></div>
                  <div><strong>{rows.filter((row) => row.assignment?.acceptanceStatus === 'PENDIENTE' || row.assignment?.acceptanceStatus === 'SIN_SOLICITAR').length}</strong><span>Por responder</span></div>
                  <div><strong>{rows.filter((row) => row.assignment?.acceptanceStatus === 'ACEPTADA').length}</strong><span>Con aceptación</span></div>
                </div>
                <div className={styles.toolbar}><div className={styles.filters} role="group" aria-label="Mostrar ciclos">
                  {([['students', 'Con estudiantes'], ['review', 'Necesitan revisión'], ['accepted', 'Con aceptación'], ['all', 'Todos los ciclos']] as const).map(([key, label]) => <button type="button" key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}
                </div>
                <p className={styles.resultCount}>{visibleRows.length} / {rows.length} ciclos</p>
                </div>
                {visibleRows.length === 0 && <EmptyState icon={<UserPlusIcon size={26} />} title="No hay ciclos en esta vista" description="Prueba otro filtro. En «Todos los ciclos» también puedes preparar los que aún no tienen estudiantes." />}
                <p className={styles.saveHint}>Elige un docente y confirma con «Guardar asignación».</p>
                <ul className={styles.list}>
                  {visibleRows.map((row) => {
                    const selectedId = selection[row.cycle] ?? row.assignment?.tutorId ?? '';
                    const changed = !!selectedId && selectedId !== (row.assignment?.tutorId ?? '');
                    const selectedTutor = tutors.find((t) => t.tutorId === selectedId);
                    const otherCycles = rows.filter((other) => other.cycle !== row.cycle && other.assignment?.tutorId === selectedId).map((other) => other.cycle);
                    return (
                    <li key={row.cycle} className={styles.row} aria-label={`Asignación del ciclo ${row.cycle}`}>
                      <div className={styles.rowHeading}><h3 className={styles.cycle}>Ciclo {row.cycle}</h3>
                      <span className={styles.count}>
                        {row.enrolled} estudiante{row.enrolled !== 1 ? 's' : ''}
                      </span></div>
                      <div className={styles.tutorCell}><label className={styles.selectLabel} htmlFor={`cycle-tutor-${row.cycle}`}>Docente para este ciclo</label>
                      <SelectField
                        id={`cycle-tutor-${row.cycle}`}
                        aria-label={`Tutor del ciclo ${row.cycle}`}
                        value={selectedId}
                        disabled={busy || tutors.length === 0}
                        onChange={(e) => setSelection((current) => ({ ...current, [row.cycle]: e.target.value }))}
                      >
                        {!row.assignment && <option value="">Elige un docente…</option>}
                        {row.assignment && !tutors.some((t) => t.tutorId === row.assignment?.tutorId) && <option value={row.assignment.tutorId}>Docente asignado no disponible en la lista</option>}
                        {tutors.map((t) => (
                          <option key={t.tutorId} value={t.tutorId}>
                            {t.fullName} · {t.assignedCount} estudiantes asignados
                          </option>
                        ))}
                      </SelectField>
                      {selectedTutor && <p className={styles.detail}>{selectedTutor.assignedCount} estudiantes a cargo{otherCycles.length > 0 ? ` · También en ciclo ${otherCycles.join(', ')}` : ''}</p>}
                      </div>
                      {changed && <div className={styles.preview}><p><strong>Cambio sin guardar.</strong> Se aplicará a {row.enrolled} estudiante{row.enrolled !== 1 ? 's' : ''} del ciclo {row.cycle}.</p><div className={styles.actions}><Button variant="secondary" size="sm" disabled={busy} onClick={() => setSelection((current) => { const next = { ...current }; delete next[row.cycle]; return next; })}>Descartar selección</Button><Button size="sm" disabled={busy} onClick={() => save(row.cycle, selectedId)}>Guardar asignación del ciclo {row.cycle}</Button></div></div>}
                      <div className={styles.statusCell}><div className={styles.statuses}>
                      {!row.assignment && row.enrolled > 0 && (
                        <span className={styles.status}>
                          <Badge tone="danger">Sin docente de ciclo</Badge>
                        </span>
                      )}
                      {row.assignment?.isException && (
                        <span title={row.assignment.note ?? ''}>
                          <Badge tone="warning">Excepción</Badge>
                        </span>
                      )}
                      {row.assignment && (
                        <span className={styles.status}>
                          <Badge tone={STATUS_TONE[row.assignment.acceptanceStatus]}>{STATUS_LABEL[row.assignment.acceptanceStatus]}</Badge>
                        </span>
                      )}
                      </div>
                      {row.assignment && row.withoutTutor > 0 && <p className={styles.detail}>{row.withoutTutor} estudiantes aún sin tutor individual: revisa sus asignaciones.</p>}
                      <div className={styles.rowActions}>{row.assignment && row.assignment.acceptanceStatus !== 'ACEPTADA' && (
                        <Button variant="secondary" size="sm" disabled={busy} aria-label={`Reenviar correo del ciclo ${row.cycle}`} onClick={() => resendMail(row.cycle)}>
                          Solicitar respuesta
                        </Button>
                      )}
                      {row.assignment && (
                        <Button variant="ghost" size="sm" disabled={busy} aria-label={`Quitar tutor del ciclo ${row.cycle}`} onClick={() => setRemoving(row.cycle)}>
                          Quitar asignación
                        </Button>
                      )}
                      </div>
                      {row.assignment?.acceptanceStatus === 'ACEPTADA' && row.assignment.availability && (
                        <span className={styles.detail}>
                          {row.assignment.availability.map((s) => `${DAY_LABEL[s.day]} ${s.start}–${s.end}${s.place ? ` (${s.place})` : ''}`).join(' · ')}
                        </span>
                      )}
                      {row.assignment?.acceptanceStatus === 'RECHAZADA' && row.assignment.declineReason && <span className={styles.detail}>Motivo: {row.assignment.declineReason}</span>}
                      </div>
                    </li>
                  );})}
                </ul>
              </CardBody>
            </Card>
          ) : null}

          {school && tutors.length === 0 && tutorsQuery.isSuccess && view.isSuccess && (
            <NextSteps
              title="Esta escuela aún no tiene docentes tutores"
              steps={
                user?.role === 'Administrador DBU'
                  ? [
                      { to: '/users', label: 'Crear o importar docentes', description: 'Con su escuela; reciben un enlace para crear su contraseña' },
                      { to: '/catalogos', label: 'Revisar las escuelas', description: 'Si la escuela no aparece o no es la correcta' },
                    ]
                  : []
              }
            />
          )}
          {school && tutors.length === 0 && tutorsQuery.isSuccess && view.isSuccess && user?.role !== 'Administrador DBU' && (
            <p className={styles.detail}>Pide a la DBU que registre a los docentes de tu escuela en «Usuarios y roles».</p>
          )}

          {school && (
            <NextSteps
              steps={[
                { to: '/tutorados', label: 'Ver los estudiantes', description: 'Comprobar quién tiene qué tutor; un caso puntual se reasigna ahí, con motivo' },
                { to: '/carga-masiva', label: 'Cargar más estudiantes', description: 'Los que se carguen en un ciclo con tutor pasan solos a él' },
              ]}
            />
          )}

          {pending && (
            <DecisionDialog title="Registrar excepción" onClose={() => { if (!busy) setPending(null); }}>
              <p>{pending.message}</p>
              <label htmlFor="exception-reason">Motivo de la excepción</label>
              <SelectField id="exception-reason" value={exceptionReason} disabled={busy} onChange={(e) => setExceptionReason(e.target.value)}>
                <option value="">Selecciona un motivo…</option>
                {EXCEPTION_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                <option value="OTHER">Otro motivo</option>
              </SelectField>
              {exceptionReason === 'OTHER' && <>
                <label htmlFor="exception-note">Describe el motivo</label>
                <textarea id="exception-note" className={styles.note} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} minLength={5} disabled={busy} placeholder={`Explica por qué se propone a ${tutorName(pending.tutorId)} para otro ciclo.`} aria-describedby="exception-note-help" />
                <p id="exception-note-help" className={styles.detail}>Escribe entre 5 y 500 caracteres. {note.length}/500</p>
              </>}
              <p className={styles.reasonHint}>Elige el motivo que corresponda al caso real. Registrar la excepción no equivale a que el docente haya aceptado.</p>
              <div className={styles.actions}>
                <Button variant="secondary" size="sm" disabled={busy} onClick={() => setPending(null)}>
                  Cancelar
                </Button>
                <Button size="sm" disabled={busy || exceptionNote.length < 5} loading={setTutor.isPending} onClick={() => save(pending.cycle, pending.tutorId, { note: exceptionNote })}>
                  Registrar excepción
                </Button>
              </div>
            </DecisionDialog>
          )}
          {removing !== null && <DecisionDialog title={`Quitar asignación del ciclo ${removing}`} onClose={() => { if (!busy) setRemoving(null); }}><p>Se quitará el docente configurado para este ciclo. <strong>Los estudiantes conservarán el tutor que ya tienen.</strong> Para cambiarlo, utiliza la reasignación individual con motivo en Estudiantes.</p><div className={styles.actions}><Button variant="secondary" disabled={busy} onClick={() => setRemoving(null)}>Cancelar</Button><Button variant="danger" loading={removeTutor.isPending} disabled={busy} onClick={() => remove(removing)}>Confirmar quitar asignación</Button></div></DecisionDialog>}
        </>
      )}
    </div>
  );
}
