import { useState } from 'react';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { PageHeader, Card, Button, EmptyState, TableSkeleton } from '@shared/components/ui';
import { SettingsIcon, CheckCircleIcon, BanIcon } from '@shared/components/icons';
import { useEvaluationWindows, useSetEvaluationWindow } from '../hooks/useEvaluationWindows';
import styles from './EvaluationWindowsPage.module.css';

// Configuración de apertura/cierre de la evaluación de tutoría por escuela
// (HU-38, Art. 17.d): sin abrir explícitamente, ninguna escuela puede
// responder el cuestionario del periodo activo.
export function EvaluationWindowsPage() {
  const { overview, loading, error, refresh } = useEvaluationWindows();
  const setWindow = useSetEvaluationWindow();
  const [pendingSchoolId, setPendingSchoolId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const handleToggle = async (schoolId: string, nextIsOpen: boolean) => {
    setActionError('');
    setPendingSchoolId(schoolId);
    try {
      await setWindow(schoolId, nextIsOpen);
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setPendingSchoolId(null);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Configuración de la evaluación"
        subtitle="Habilita o cierra el cuestionario de evaluación de tutoría por escuela (Art. 17.d)"
        icon={<SettingsIcon size={22} />}
      />

      {loading ? (
        <TableSkeleton rows={5} columns={2} />
      ) : error || !overview ? (
        <EmptyState
          variant="error"
          icon={<SettingsIcon size={26} />}
          title="No se pudo cargar la configuración"
          description="Ocurrió un error al consultar la información. Vuelve a intentarlo."
          action={<Button variant="secondary" onClick={() => refresh()}>Reintentar</Button>}
        />
      ) : (
        <Card>
          <div className={styles.head}>
            <span>Periodo académico: {overview.periodName}</span>
          </div>
          {actionError && (
            <div className={styles.error} role="alert">
              {actionError}
            </div>
          )}
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Escuela Profesional</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {overview.schools.map((school) => (
                <tr key={school.schoolId}>
                  <td>{school.schoolName}</td>
                  <td>
                    <span className={school.isOpen ? styles.badgeOpen : styles.badgeClosed}>
                      {school.isOpen ? 'Habilitada' : 'Cerrada'}
                    </span>
                  </td>
                  <td className={styles.actionCell}>
                    <Button
                      variant={school.isOpen ? 'secondary' : 'primary'}
                      icon={school.isOpen ? <BanIcon size={15} /> : <CheckCircleIcon size={15} />}
                      loading={pendingSchoolId === school.schoolId}
                      onClick={() => handleToggle(school.schoolId, !school.isOpen)}
                    >
                      {school.isOpen ? 'Cerrar' : 'Habilitar'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
