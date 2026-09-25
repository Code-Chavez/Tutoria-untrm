import React, { useEffect, useState } from 'react';
import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  SelectField,
  StatCard,
  EmptyState,
  TableSkeleton,
  Badge,
} from '@shared/components/ui';
import {
  ReportIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  UsersIcon,
} from '@shared/components/icons';
import { useAuth } from '@features/auth/hooks/useAuth';
import { assignmentService, TutorWorkload } from '@features/asignacion/services/assignmentService';
import {
  reportService,
  ScheduleAttendanceReport,
  ScheduleAttendanceParams,
  ScheduleAttendanceStatus,
} from '../services/reportService';
import { getApiErrorMessage } from '@shared/services/apiClient';
import styles from './ScheduleAttendanceReportPage.module.css';

const TUTOR_ROLE = 'Docente Tutor';
// Roles que pueden exportar (mismo criterio que reports:export en el servidor).
const EXPORT_ROLES = ['Docente Tutor', 'Coordinador', 'Administrador DBU'];

const STATUS_LABEL: Record<ScheduleAttendanceStatus, string> = {
  CANCELADA: 'Cancelada',
  PROXIMA: 'Próxima',
  EN_CURSO: 'En curso',
  REALIZADA: 'Realizada',
};

const STATUS_TONE: Record<ScheduleAttendanceStatus, 'danger' | 'info' | 'success' | 'neutral'> = {
  CANCELADA: 'danger',
  PROXIMA: 'info',
  EN_CURSO: 'success',
  REALIZADA: 'neutral',
};

// Consolidado de horarios y asistencia por tutor (HU-27, Art. 15.d): resume
// las sesiones ya registradas del periodo, exportable a PDF y Excel.
export function ScheduleAttendanceReportPage() {
  const { user } = useAuth();
  const isTutor = user?.role === TUTOR_ROLE;
  const canExport = user ? EXPORT_ROLES.includes(user.role) : false;

  const [tutors, setTutors] = useState<TutorWorkload[]>([]);
  const [tutorId, setTutorId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [report, setReport] = useState<ScheduleAttendanceReport | null>(null);
  const [loading, setLoading] = useState(isTutor);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  useEffect(() => {
    if (isTutor) return;
    let ignore = false;
    assignmentService
      .getTutorWorkload()
      .then((list) => {
        if (!ignore) setTutors(list);
      })
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, [isTutor]);

  // Consolidado propio del docente tutor: se carga solo, sin esperar un clic.
  useEffect(() => {
    if (!isTutor) return;
    let ignore = false;
    reportService
      .getScheduleAttendanceReport({ mine: true })
      .then((r) => {
        if (!ignore) setReport(r);
      })
      .catch((err) => {
        if (!ignore) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [isTutor]);

  const currentParams = (): ScheduleAttendanceParams => ({
    mine: isTutor || undefined,
    tutorId: !isTutor ? tutorId || undefined : undefined,
    from: from || undefined,
    to: to || undefined,
  });

  const handleGenerate = () => {
    if (!isTutor && !tutorId) return;
    setLoading(true);
    setError('');
    reportService
      .getScheduleAttendanceReport(currentParams())
      .then(setReport)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExporting(format);
    setError('');
    try {
      if (format === 'pdf') await reportService.downloadScheduleAttendancePdf(currentParams());
      else await reportService.downloadScheduleAttendanceExcel(currentParams());
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setExporting(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Consolidado de horarios y asistencia"
        subtitle="Resumen de sesiones y asistencias del periodo, por tutor (Art. 15.d)"
        icon={<ReportIcon size={24} />}
      />

      <Card padded>
        <div className={styles.filters}>
          {!isTutor && (
            <div className={styles.field}>
              <label>Tutor</label>
              <SelectField value={tutorId} onChange={(e) => setTutorId(e.target.value)}>
                <option value="">Selecciona un tutor…</option>
                {tutors.map((t) => (
                  <option key={t.tutorId} value={t.tutorId}>
                    {t.fullName}
                  </option>
                ))}
              </SelectField>
            </div>
          )}
          <div className={styles.field}>
            <label>Desde</label>
            <input
              type="date"
              className={styles.dateInput}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label>Hasta</label>
            <input
              type="date"
              className={styles.dateInput}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <Button onClick={handleGenerate} disabled={!isTutor && !tutorId}>
            Generar consolidado
          </Button>
          {canExport && report && (
            <>
              <Button
                variant="secondary"
                icon={<DownloadIcon size={16} />}
                loading={exporting === 'pdf'}
                onClick={() => handleExport('pdf')}
              >
                PDF
              </Button>
              <Button
                variant="secondary"
                icon={<FileSpreadsheetIcon size={16} />}
                loading={exporting === 'excel'}
                onClick={() => handleExport('excel')}
              >
                Excel
              </Button>
            </>
          )}
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </Card>

      {loading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : !report ? (
        <EmptyState
          icon={<UsersIcon size={26} />}
          title="Selecciona un tutor"
          description="Elige un tutor y, opcionalmente, un periodo para generar su consolidado."
        />
      ) : (
        <>
          <div className={styles.stats}>
            <StatCard
              icon={<CalendarIcon size={20} />}
              value={report.totalSessions}
              label="Total de sesiones"
              hint={`${report.individualSessions} individuales · ${report.groupSessions} grupales`}
              tone="info"
            />
            <StatCard
              icon={<CheckCircleIcon size={20} />}
              value={report.attendanceConfirmed}
              label="Asistencias confirmadas"
              tone="success"
            />
            <StatCard
              icon={<XCircleIcon size={20} />}
              value={report.attendancePending}
              label="Asistencias pendientes"
              tone="warning"
            />
            <StatCard
              icon={<XCircleIcon size={20} />}
              value={report.cancelledSessions}
              label="Sesiones canceladas"
              tone="danger"
            />
          </div>

          <Card>
            <CardHeader
              title={`Sesiones de ${report.tutorName}`}
              description={
                report.periodFrom || report.periodTo
                  ? `Periodo: ${report.periodFrom ? new Date(report.periodFrom).toLocaleDateString('es-PE') : '—'} a ${report.periodTo ? new Date(report.periodTo).toLocaleDateString('es-PE') : '—'}`
                  : 'Historial completo'
              }
            />
            {report.sessions.length === 0 ? (
              <EmptyState
                icon={<CalendarIcon size={26} />}
                title="Sin sesiones en el periodo"
                description="Este tutor no tiene sesiones registradas en el rango seleccionado."
              />
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tema</th>
                    <th>Modalidad</th>
                    <th>Tutorados</th>
                    <th>Estado</th>
                    <th>Asistencia</th>
                  </tr>
                </thead>
                <tbody>
                  {report.sessions.map((s) => (
                    <tr key={s.id}>
                      <td>
                        {new Date(s.scheduledAt).toLocaleString('es-PE', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td>{s.topic}</td>
                      <td>{s.modality === 'PRESENCIAL' ? 'Presencial' : 'Virtual'}</td>
                      <td>{s.studentNames.join(', ')}</td>
                      <td>
                        <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                      </td>
                      <td>
                        {s.attendanceConfirmed === null
                          ? 'N/A'
                          : s.attendanceConfirmed
                            ? 'Confirmada'
                            : 'Pendiente'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
