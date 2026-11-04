import React, { useEffect, useMemo, useState } from 'react';
import { sessionNoticeText } from '../utils/sessionNotice';
import { Card, Button, IconButton, EmptyState, TableSkeleton, PageHeader } from '@shared/components/ui';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XCircleIcon,
} from '@shared/components/icons';
import { useMySessions } from '../hooks/useMySessions';
import {
  sessionService,
  TutoringSession,
  RescheduleSessionData,
  SessionEvidence,
} from '../services/sessionService';
import { SessionDetailModal } from '../components/SessionDetailModal';
import { RescheduleSessionModal } from '../components/RescheduleSessionModal';
import { CancelSessionModal } from '../components/CancelSessionModal';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { useUrlParams } from '@shared/hooks/useUrlParams';
import {
  addDays,
  addMonths,
  formatMonthLabel,
  formatWeekLabel,
  getMonthGridDays,
  getWeekDays,
  isSameDay,
} from '../utils/calendar';
import styles from './SessionsCalendarPage.module.css';

type ViewMode = 'month' | 'week';

// La fecha que se mira viaja en la URL como AAAA-MM-DD (hora local, sin zona).
const pad = (n: number) => String(n).padStart(2, '0');
const toParam = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromParam = (value: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
};

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const WEEKDAY_LONG = new Intl.DateTimeFormat('es-PE', { weekday: 'short' });
const DAY_NUM = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short' });

function sessionsOnDay(sessions: TutoringSession[], day: Date): TutoringSession[] {
  return sessions
    .filter((s) => isSameDay(new Date(s.scheduledAt), day))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

// Calendario de sesiones del tutor (HU-21): vista mensual y semanal,
// diferenciando individuales de grupales por color, con detalle al abrir.
export const SessionsCalendarPage: React.FC = () => {
  const { sessions, students, loading, error, refresh } = useMySessions();
  // La vista (?vista=semana), la fecha (?fecha=AAAA-MM-DD), la sesión abierta (?sesion=<id>) y su ventana (?accion=reprogramar|cancelar)
  // viven en la URL: recargar o compartir el enlace vuelve al mismo lugar.
  const url = useUrlParams();
  const view: ViewMode = url.get('vista') === 'semana' ? 'week' : 'month';
  const setView = (next: ViewMode) => url.set({ vista: next === 'week' ? 'semana' : null }, { replace: true });
  const dateParam = url.get('fecha');
  const cursor = useMemo(() => fromParam(dateParam) ?? new Date(), [dateParam]);
  const moveCursor = (next: Date) => url.set({ fecha: toParam(next) }, { replace: true });
  const sessionId = url.get('sesion');
  // La sesión abierta se busca por id en la lista; la que devolvió la última acción (asistencia) manda hasta que la lista se vuelva a cargar.
  const [latest, setLatest] = useState<TutoringSession | null>(null);
  const selectedSession = (latest?.id === sessionId ? latest : null) ?? sessions.find((s) => s.id === sessionId) ?? null;
  const setSelectedSession = (s: TutoringSession | null) => {
    setLatest(s);
    url.set({ sesion: s?.id ?? null, accion: null }, { replace: s === null || s.id === sessionId });
  };
  const action = url.get('accion');
  const rescheduleOpen = action === 'reprogramar';
  const cancelOpen = action === 'cancelar';
  const setRescheduleOpen = (open: boolean) => url.set({ accion: open ? 'reprogramar' : null }, { replace: !open });
  const setCancelOpen = (open: boolean) => url.set({ accion: open ? 'cancelar' : null }, { replace: !open });
  // Un enlace a una sesión que ya no existe (o que la persona no ve) no deja una ventana fantasma: se limpia el parámetro.
  useEffect(() => {
    if (loading || error) return;
    if (sessionId && !sessions.some((s) => s.id === sessionId)) url.set({ sesion: null, accion: null }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, sessions, sessionId]);
  const [registeringAttendance, setRegisteringAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');
  const [recordingRoll, setRecordingRoll] = useState(false);
  const [rollError, setRollError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeError, setChangeError] = useState('');
  const [evidences, setEvidences] = useState<SessionEvidence[]>([]);
  const [evidencesLoading, setEvidencesLoading] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState('');

  const monthDays = useMemo(() => getMonthGridDays(cursor), [cursor]);
  const weekDays = useMemo(() => getWeekDays(cursor), [cursor]);
  const today = new Date();

  const goPrev = () => moveCursor(view === 'month' ? addMonths(cursor, -1) : addDays(cursor, -7));
  const goNext = () => moveCursor(view === 'month' ? addMonths(cursor, 1) : addDays(cursor, 7));
  const goToday = () => url.set({ fecha: null }, { replace: true });

  const handleRegisterAttendance = async () => {
    if (!selectedSession) return;
    setRegisteringAttendance(true);
    setAttendanceError('');
    try {
      const updated = await sessionService.registerAttendance(selectedSession.id);
      setSelectedSession(updated);
      refresh();
    } catch (err) {
      setAttendanceError(getApiErrorMessage(err));
    } finally {
      setRegisteringAttendance(false);
    }
  };

  // Asistencia por participante (A07): grupal, quiénes asistieron; individual, inasistencia.
  const handleRecordRoll = async (attendedStudentIds: string[]) => {
    if (!selectedSession) return;
    setRecordingRoll(true);
    setRollError('');
    try {
      const updated = await sessionService.recordAttendance(selectedSession.id, attendedStudentIds);
      setSelectedSession(updated);
      refresh();
    } catch (err) {
      setRollError(getApiErrorMessage(err));
    } finally {
      setRecordingRoll(false);
    }
  };

  const handleReschedule = async (data: RescheduleSessionData) => {
    if (!selectedSession) return;
    setChangeLoading(true);
    setChangeError('');
    try {
      const moved = await sessionService.rescheduleSession(selectedSession.id, data);
      setFeedback(`Sesión reprogramada.${sessionNoticeText(moved.notice)}`);
      setRescheduleOpen(false);
      setSelectedSession(null);
      refresh();
    } catch (err) {
      setChangeError(getApiErrorMessage(err));
    } finally {
      setChangeLoading(false);
    }
  };

  const handleCancelSession = async (reason: string) => {
    if (!selectedSession) return;
    setChangeLoading(true);
    setChangeError('');
    try {
      const cancelled = await sessionService.cancelSession(selectedSession.id, { reason });
      setFeedback(`Sesión cancelada.${sessionNoticeText(cancelled.notice)}`);
      setCancelOpen(false);
      setSelectedSession(null);
      refresh();
    } catch (err) {
      setChangeError(getApiErrorMessage(err));
    } finally {
      setChangeLoading(false);
    }
  };

  // Repositorio de evidencias (HU-25): se cargan al abrir el detalle de la
  // sesión. El estado de carga se arma al seleccionarla (ver openSession),
  // no aquí, para no disparar setState de forma síncrona dentro del efecto.
  const selectedSessionId = selectedSession?.id;
  useEffect(() => {
    if (!selectedSessionId) return;
    let ignore = false;
    sessionService
      .listEvidence(selectedSessionId)
      .then((list) => {
        if (!ignore) setEvidences(list);
      })
      .catch((err) => {
        if (!ignore) setEvidenceError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!ignore) setEvidencesLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [selectedSessionId]);

  const openSession = (s: TutoringSession) => {
    setAttendanceError('');
    setEvidences([]);
    setEvidencesLoading(true);
    setEvidenceError('');
    setSelectedSession(s);
  };

  const handleUploadEvidence = async (file: File) => {
    if (!selectedSession) return;
    setUploadingEvidence(true);
    setEvidenceError('');
    try {
      const evidence = await sessionService.uploadEvidence(selectedSession.id, file);
      setEvidences((prev) => [evidence, ...prev]);
    } catch (err) {
      setEvidenceError(getApiErrorMessage(err));
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleDownloadEvidence = async (evidence: SessionEvidence) => {
    if (!selectedSession) return;
    try {
      await sessionService.downloadEvidence(selectedSession.id, evidence);
    } catch (err) {
      setEvidenceError(getApiErrorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader
        title="Sesiones"
        subtitle="Calendario de tu agenda de tutoría (individuales y grupales)"
        icon={<CalendarIcon size={24} />}
      />

      {feedback && (
        <div className={styles.notice} role="status">
          <span>{feedback}</span>
          <button type="button" className={styles.noticeClose} onClick={() => setFeedback('')}>
            Cerrar
          </button>
        </div>
      )}

      <Card>
        <div className={styles.toolbar}>
          <div className={styles.viewToggle}>
            <button
              className={view === 'month' ? styles.active : ''}
              onClick={() => setView('month')}
            >
              Mensual
            </button>
            <button
              className={view === 'week' ? styles.active : ''}
              onClick={() => setView('week')}
            >
              Semanal
            </button>
          </div>

          <div className={styles.nav}>
            <IconButton label="Anterior" onClick={goPrev}>
              <ChevronLeftIcon size={16} />
            </IconButton>
            <span className={styles.navLabel}>
              {view === 'month' ? formatMonthLabel(cursor) : formatWeekLabel(weekDays)}
            </span>
            <IconButton label="Siguiente" onClick={goNext}>
              <ChevronRightIcon size={16} />
            </IconButton>
            <Button variant="ghost" size="sm" onClick={goToday}>
              Hoy
            </Button>
          </div>
        </div>

        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.dotIndividual} /> Individual
          </span>
          <span className={styles.legendItem}>
            <span className={styles.dotGroup} /> Grupal
          </span>
          <span className={styles.legendItem}>
            <span className={styles.dotCancelled} /> Cancelada
          </span>
        </div>

        {loading ? (
          <TableSkeleton rows={5} columns={7} />
        ) : error ? (
          <EmptyState
            variant="error"
            icon={<XCircleIcon size={26} />}
            title="No se pudo cargar tu agenda"
            description="Ocurrió un error al consultar tus sesiones. Vuelve a intentarlo."
            action={
              <Button variant="secondary" onClick={refresh}>
                Reintentar
              </Button>
            }
          />
        ) : view === 'month' ? (
          <>
            <div className={styles.monthHead}>
              {WEEKDAY_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <div className={styles.monthGrid}>
              {monthDays.map((day) => {
                const daySessions = sessionsOnDay(sessions, day);
                const outside = day.getMonth() !== cursor.getMonth();
                const isToday = isSameDay(day, today);
                const visible = daySessions.slice(0, 3);
                const overflow = daySessions.length - visible.length;
                return (
                  <div key={day.toISOString()} className={styles.dayCell}>
                    <span className={outside ? styles.dayNumOutside : styles.dayNum}>
                      {isToday ? (
                        <span className={styles.dayNumToday}>{day.getDate()}</span>
                      ) : (
                        day.getDate()
                      )}
                    </span>
                    {visible.map((s) => (
                      <button
                        key={s.id}
                        className={`${styles.chip} ${
                          s.cancelledAt
                            ? styles.chipCancelled
                            : s.studentIds.length > 1
                              ? styles.chipGroup
                              : styles.chipIndividual
                        }`}
                        onClick={() => openSession(s)}
                        title={s.topic}
                      >
                        {new Date(s.scheduledAt).toLocaleTimeString('es-PE', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}{' '}
                        {s.topic}
                      </button>
                    ))}
                    {overflow > 0 && <span className={styles.more}>+{overflow} más</span>}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className={styles.weekGrid}>
            {weekDays.map((day) => {
              const daySessions = sessionsOnDay(sessions, day);
              const isToday = isSameDay(day, today);
              return (
                <div key={day.toISOString()} className={styles.weekCol}>
                  <div className={styles.weekColHead}>
                    {WEEKDAY_LONG.format(day)}
                    <b>{isToday ? `${DAY_NUM.format(day)} ·  hoy` : DAY_NUM.format(day)}</b>
                  </div>
                  <div className={styles.weekCards}>
                    {daySessions.length === 0 ? (
                      <span className={styles.empty}>Sin sesiones</span>
                    ) : (
                      daySessions.map((s) => (
                        <button
                          key={s.id}
                          className={`${styles.weekCard} ${
                            s.cancelledAt
                              ? styles.weekCardCancelled
                              : s.studentIds.length > 1
                                ? styles.weekCardGroup
                                : ''
                          }`}
                          onClick={() => openSession(s)}
                        >
                          <div className={styles.weekCardTime}>
                            {new Date(s.scheduledAt).toLocaleTimeString('es-PE', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </div>
                          <div className={styles.weekCardTopic}>{s.topic}</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {selectedSession && !rescheduleOpen && !cancelOpen && (
        <SessionDetailModal
          session={selectedSession}
          students={students}
          allSessions={sessions}
          onClose={() => setSelectedSession(null)}
          onRegisterAttendance={handleRegisterAttendance}
          registeringAttendance={registeringAttendance}
          attendanceError={attendanceError}
          onRecordRoll={handleRecordRoll}
          recordingRoll={recordingRoll}
          rollError={rollError}
          onReschedule={() => {
            setChangeError('');
            setRescheduleOpen(true);
          }}
          onCancelSession={() => {
            setChangeError('');
            setCancelOpen(true);
          }}
          evidences={evidences}
          evidencesLoading={evidencesLoading}
          onUploadEvidence={handleUploadEvidence}
          uploadingEvidence={uploadingEvidence}
          evidenceError={evidenceError}
          onDownloadEvidence={handleDownloadEvidence}
        />
      )}

      {selectedSession && rescheduleOpen && (
        <RescheduleSessionModal
          session={selectedSession}
          loading={changeLoading}
          serverError={changeError}
          onSubmit={handleReschedule}
          onCancel={() => setRescheduleOpen(false)}
        />
      )}

      {selectedSession && cancelOpen && (
        <CancelSessionModal
          session={selectedSession}
          loading={changeLoading}
          serverError={changeError}
          onConfirm={handleCancelSession}
          onCancel={() => setCancelOpen(false)}
        />
      )}
    </div>
  );
};
