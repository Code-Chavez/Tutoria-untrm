import { useState } from 'react';
import { isAxiosError } from 'axios';
import { PageHeader, Card, CardHeader, CardBody, Button, Badge, SelectField, EmptyState, NextSteps, TableSkeleton } from '@shared/components/ui';
import { UserPlusIcon } from '@shared/components/icons';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { useAuth } from '@features/auth/hooks/useAuth';
import { useRequestSchools } from '@features/pedidos/hooks/useDataRequests';
import { DAY_LABEL } from '../services/tutorAcceptanceService';
import type { CycleRow } from '../services/cycleTutorService';
import { useCycleTutors, useRemoveCycleTutor, useResendAcceptance, useSetCycleTutor, useTutorOptions } from '../hooks/useCycleTutors';
import styles from './CycleTutorsPage.module.css';

const STATUS_LABEL = { SIN_SOLICITAR: 'Sin solicitar', PENDIENTE: 'Pendiente', ACEPTADA: 'Aceptó', RECHAZADA: 'Rechazó' } as const;
const STATUS_TONE = { SIN_SOLICITAR: 'neutral', PENDIENTE: 'warning', ACEPTADA: 'success', RECHAZADA: 'danger' } as const;

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
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // Solo los docentes de la escuela pueden ser tutores de sus ciclos.
  const tutors = (tutorsQuery.data ?? []).filter((t) => t.schoolId === school?.id);
  const tutorName = (id: string) => tutors.find((t) => t.tutorId === id)?.fullName ?? 'Docente';

  const save = async (cycle: number, tutorId: string, exception?: { note: string }) => {
    setFeedback(null);
    try {
      const result = await setTutor.mutateAsync({ cycle, tutorId, ...(exception && { isException: true, note: exception.note }) });
      setPending(null);
      setNote('');
      const mail = result.acceptanceEmailSent === true ? ' Se envió al docente el correo para que acepte.' : result.acceptanceEmailSent === false ? ' No se pudo enviar el correo al docente: use «Reenviar».' : '';
      setFeedback({ ok: true, text: `Ciclo ${cycle}: ${result.assigned} estudiante(s) asignados${result.moved ? ` y ${result.moved} movidos` : ''}.${mail}` });
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.code === 'TUTOR_HAS_CYCLE') {
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
    } catch (error) {
      setFeedback({ ok: false, text: getApiErrorMessage(error) });
    }
  };

  return (
    <div>
      <PageHeader
        title="Asignación por ciclo"
        subtitle="Se asigna por ciclo, no estudiante por estudiante: elige el tutor de cada ciclo de la escuela y todos sus estudiantes matriculados (y los que se carguen después) pasan a él."
        icon={<UserPlusIcon size={24} />}
      />

      {schoolsQuery.isLoading ? (
        <TableSkeleton rows={4} columns={3} />
      ) : schools.length === 0 ? (
        <EmptyState icon={<UserPlusIcon size={26} />} title="No tienes escuelas a cargo" description="Pide a la DBU que te asigne como coordinador de una escuela." />
      ) : (
        <>
          <div className={styles.picker}>
            <label htmlFor="cycle-school">Escuela</label>
            <SelectField id="cycle-school" value={school?.id ?? ''} onChange={(e) => { setChosen(e.target.value); setPending(null); setFeedback(null); }}>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </SelectField>
          </div>

          {feedback && (
            <p role={feedback.ok ? 'status' : 'alert'} className={feedback.ok ? styles.ok : styles.error}>
              {feedback.text}
            </p>
          )}

          {view.isLoading ? (
            <TableSkeleton rows={5} columns={4} />
          ) : view.isError ? (
            <EmptyState icon={<UserPlusIcon size={26} />} title="No se pudo cargar" description={getApiErrorMessage(view.error)} />
          ) : view.data ? (
            <Card>
              <CardHeader title={`Periodo ${view.data.periodName}`} description={tutors.length === 0 ? 'Esta escuela aún no tiene docentes tutores: créalos en Usuarios y roles indicando su escuela.' : `${tutors.length} docente(s) tutor(es) de la escuela`} />
              <CardBody>
                <ul className={styles.list}>
                  {[...view.data.cycles].sort(byUrgency).map((row) => (
                    <li key={row.cycle} className={styles.row}>
                      <span className={styles.cycle}>Ciclo {row.cycle}</span>
                      <span className={styles.count}>
                        {row.enrolled} matriculado(s)
                        {row.assignment && row.withoutTutor > 0 ? ` · ${row.withoutTutor} sin tutor` : ''}
                      </span>
                      <SelectField
                        aria-label={`Tutor del ciclo ${row.cycle}`}
                        value={row.assignment?.tutorId ?? ''}
                        onChange={(e) => e.target.value && save(row.cycle, e.target.value)}
                      >
                        {!row.assignment && <option value="">Sin tutor…</option>}
                        {tutors.map((t) => (
                          <option key={t.tutorId} value={t.tutorId}>
                            {t.fullName}
                          </option>
                        ))}
                      </SelectField>
                      {!row.assignment && row.enrolled > 0 && (
                        <span className={styles.status}>
                          <Badge tone="danger">Sin tutor</Badge>
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
                      {row.assignment && row.assignment.acceptanceStatus !== 'ACEPTADA' && (
                        <Button variant="ghost" size="sm" aria-label={`Reenviar correo del ciclo ${row.cycle}`} onClick={() => resendMail(row.cycle)}>
                          Reenviar
                        </Button>
                      )}
                      {row.assignment?.acceptanceStatus === 'ACEPTADA' && row.assignment.availability && (
                        <span className={styles.detail}>
                          {row.assignment.availability.map((s) => `${DAY_LABEL[s.day]} ${s.start}–${s.end}${s.place ? ` (${s.place})` : ''}`).join(' · ')}
                        </span>
                      )}
                      {row.assignment?.acceptanceStatus === 'RECHAZADA' && row.assignment.declineReason && <span className={styles.detail}>Motivo: {row.assignment.declineReason}</span>}
                      {row.assignment && (
                        <Button variant="ghost" size="sm" aria-label={`Quitar tutor del ciclo ${row.cycle}`} onClick={() => remove(row.cycle)}>
                          Quitar
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}

          {school && tutors.length === 0 && !view.isLoading && (
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
          {school && tutors.length === 0 && !view.isLoading && user?.role !== 'Administrador DBU' && (
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
            <div role="dialog" aria-label="Registrar excepción" className={styles.exception}>
              <p>{pending.message}</p>
              <label htmlFor="exception-note">Motivo de la excepción</label>
              <textarea id="exception-note" className={styles.note} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder={`${tutorName(pending.tutorId)} aceptó por correo asumir el ciclo ${pending.cycle}…`} />
              <div className={styles.actions}>
                <Button variant="secondary" size="sm" onClick={() => setPending(null)}>
                  Cancelar
                </Button>
                <Button size="sm" disabled={note.trim().length < 5} loading={setTutor.isPending} onClick={() => save(pending.cycle, pending.tutorId, { note })}>
                  Registrar excepción
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
