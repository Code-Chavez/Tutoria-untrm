import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentRecordService, StudentRecord } from '../services/studentRecordService';
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
import styles from './ExpedientePage.module.css';

export const ExpedientePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [record, setRecord] = useState<StudentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let ignore = false;

    studentRecordService
      .getStudentRecord(id)
      .then((data) => {
        if (!ignore) setRecord(data);
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
  }, [id]);

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
