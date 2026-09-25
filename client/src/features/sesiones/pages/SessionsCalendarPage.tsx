import React, { useMemo, useState } from 'react';
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
} from '../services/sessionService';
import { SessionDetailModal } from '../components/SessionDetailModal';
import { RescheduleSessionModal } from '../components/RescheduleSessionModal';
import { CancelSessionModal } from '../components/CancelSessionModal';
import { getApiErrorMessage } from '@shared/services/apiClient';
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
  const [view, setView] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<TutoringSession | null>(null);
  const [registeringAttendance, setRegisteringAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeError, setChangeError] = useState('');

  const monthDays = useMemo(() => getMonthGridDays(cursor), [cursor]);
  const weekDays = useMemo(() => getWeekDays(cursor), [cursor]);
  const today = new Date();

  const goPrev = () => setCursor((c) => (view === 'month' ? addMonths(c, -1) : addDays(c, -7)));
  const goNext = () => setCursor((c) => (view === 'month' ? addMonths(c, 1) : addDays(c, 7)));
  const goToday = () => setCursor(new Date());

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

  const handleReschedule = async (data: RescheduleSessionData) => {
    if (!selectedSession) return;
    setChangeLoading(true);
    setChangeError('');
    try {
      await sessionService.rescheduleSession(selectedSession.id, data);
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
      await sessionService.cancelSession(selectedSession.id, { reason });
      setCancelOpen(false);
      setSelectedSession(null);
      refresh();
    } catch (err) {
      setChangeError(getApiErrorMessage(err));
    } finally {
      setChangeLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Sesiones"
        subtitle="Calendario de tu agenda de tutoría (individuales y grupales)"
        icon={<CalendarIcon size={24} />}
      />

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
                        onClick={() => {
                          setAttendanceError('');
                          setSelectedSession(s);
                        }}
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
                          onClick={() => {
                            setAttendanceError('');
                            setSelectedSession(s);
                          }}
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
          onReschedule={() => {
            setChangeError('');
            setRescheduleOpen(true);
          }}
          onCancelSession={() => {
            setChangeError('');
            setCancelOpen(true);
          }}
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
