import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { studentRecordService } from '../services/studentRecordService';
import { Timeline } from '../components/Timeline';
import { PageHeader, Badge, Card, CardHeader, CardBody, EmptyState, Button } from '@shared/components/ui';
import {
  FolderIcon,
  ChevronLeftIcon,
  XCircleIcon,
  UsersIcon,
  AlertTriangleIcon,
} from '@shared/components/icons';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { ExportButtons } from '@shared/components/ExportButtons';
import { downloadFile } from '@shared/services/downloadFile';
import { useAuth } from '@features/auth/hooks/useAuth';
import { SignedDocumentsPanel } from '@features/firmados/components/SignedDocumentsPanel';
import { useAttendanceSheetDocuments } from '@features/firmados/hooks/useSignedDocuments';
import styles from './ExpedientePage.module.css';

// Quienes registran asistencias (sessions:write) pueden adjuntar la hoja firmada; el resto solo la consulta.
const SHEET_UPLOAD_ROLES = ['Docente Tutor', 'Administrador DBU'];

export const ExpedientePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const sheet = useAttendanceSheetDocuments(id as string);

  const { data: record, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['studentRecord', id],
    queryFn: () => studentRecordService.getStudentRecord(id as string),
    enabled: !!id,
  });
  const error = queryError ? getApiErrorMessage(queryError) : '';

  if (loading) {
    return <div className={styles.loading}>Cargando expediente…</div>;
  }

  if (error || !record) {
    return (
      <EmptyState
        variant="error"
        icon={<XCircleIcon size={26} />}
        title="No se pudo cargar el expediente"
        description={error || 'El tutorado solicitado no existe.'}
        action={
          <Button variant="secondary" onClick={() => navigate('/expediente')}>
            Volver a la búsqueda
          </Button>
        }
      />
    );
  }

  const { student } = record;

  return (
    <div>
      <button className={styles.back} onClick={() => navigate('/expediente')}>
        <ChevronLeftIcon size={16} />
        Volver a la búsqueda
      </button>

      <PageHeader
        title={`${student.firstName} ${student.lastName}`}
        subtitle={`${student.studentCode} · ${record.schoolName} · Ciclo ${student.cycle}`}
        icon={<FolderIcon size={24} />}
        actions={
          <div className={styles.badges}>
            {student.isAtRisk ? (
              <span title={student.riskReason ?? undefined}>
                <Badge tone="danger" icon={<AlertTriangleIcon size={12} />}>
                  En riesgo
                </Badge>
              </span>
            ) : student.isActive ? (
              <Badge tone="success">Activo</Badge>
            ) : (
              <Badge tone="neutral">Inactivo</Badge>
            )}
            <Badge tone="info">Tutor: {record.tutorName ?? 'Sin asignar'}</Badge>
            <ExportButtons
              formats={['pdf']}
              onExport={() => downloadFile(`/students/${student.id}/record/pdf`, 'expediente-tutorado.pdf')}
            />
          </div>
        }
      />

      <div className={styles.layout}>
        <Card className={styles.timelineCard}>
          <CardHeader
            title="Línea de tiempo del acompañamiento"
            description="Entrevistas y asignaciones de tutor, de más reciente a más antigua"
          />
          <CardBody>
            <Timeline events={record.timeline} />
          </CardBody>
        </Card>

        <Card className={styles.sideCard}>
          <CardHeader title="Hoja de asistencia (Anexo N° 4)" description={sheet.period ? `Periodo ${sheet.period.name}` : undefined} />
          <CardBody>
            <SignedDocumentsPanel
              title="Hoja firmada del semestre"
              hint="Imprima la hoja, haga que el tutorado firme cada sesión junto con el docente tutor, y adjunte el escaneo. La asistencia confirmada en el sistema no reemplaza la firma del estudiante."
              documents={sheet.documents}
              loading={sheet.loading}
              canUpload={!!user && SHEET_UPLOAD_ROLES.includes(user.role)}
              onUpload={sheet.attach}
              actions={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => downloadFile(`/students/${student.id}/attendance-sheet/pdf`, 'hoja-asistencia-anexo-4.pdf')}
                >
                  Descargar hoja para imprimir
                </Button>
              }
            />
          </CardBody>
        </Card>

        {record.supportContact !== undefined && (
          <Card className={styles.sideCard}>
            <CardHeader title="Persona de red de apoyo" icon={<UsersIcon size={18} />} />
            <CardBody>
              {record.supportContact ? (
                <div className={styles.contact}>
                  <div>
                    <span className={styles.contactLabel}>Apellidos y nombres</span>
                    <b>{record.supportContact.fullName}</b>
                  </div>
                  <div>
                    <span className={styles.contactLabel}>Parentesco / vínculo</span>
                    <b>{record.supportContact.relationship}</b>
                  </div>
                  {record.supportContact.age !== null && record.supportContact.age !== undefined && (
                    <div>
                      <span className={styles.contactLabel}>Edad</span>
                      <b>{record.supportContact.age}</b>
                    </div>
                  )}
                  {record.supportContact.occupation && (
                    <div>
                      <span className={styles.contactLabel}>Ocupación</span>
                      <b>{record.supportContact.occupation}</b>
                    </div>
                  )}
                  <div>
                    <span className={styles.contactLabel}>Celular</span>
                    <b>{record.supportContact.phone}</b>
                  </div>
                </div>
              ) : (
                <p className={styles.noContact}>
                  Aún no se registró una persona de red de apoyo para este tutorado.
                </p>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
};
