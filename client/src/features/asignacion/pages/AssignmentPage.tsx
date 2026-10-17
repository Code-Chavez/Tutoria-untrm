import React, { useMemo, useState } from 'react';
import styles from './AssignmentPage.module.css';
import { useAssignmentData } from '../hooks/useAssignmentData';
import { assignmentService } from '../services/assignmentService';
import { getApiErrorMessage } from '@shared/services/apiClient';
import { StudentSelectList, AssignFilterValues } from '../components/StudentSelectList';
import { TutorWorkloadPanel } from '../components/TutorWorkloadPanel';
import {
  PageHeader,
  Button,
  Card,
  CardHeader,
  CardBody,
  EmptyState,
  NextSteps,
  TableSkeleton,
} from '@shared/components/ui';
import { SwitchIcon, XCircleIcon, CheckCircleIcon } from '@shared/components/icons';

const EMPTY_FILTERS: AssignFilterValues = {
  search: '',
  schoolId: '',
  cycle: '',
  onlyUnassigned: false,
};

export const AssignmentPage: React.FC = () => {
  const { students, schools, tutors, loading, error, refresh } = useAssignmentData();

  const [filters, setFilters] = useState<AssignFilterValues>(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedTutorId, setSelectedTutorId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const tutorName = (tutorId?: string | null): string | null =>
    tutorId ? (tutors.find((t) => t.tutorId === tutorId)?.fullName ?? 'Asignado') : null;

  const cycles = useMemo(
    () => Array.from(new Set(students.map((s) => s.cycle))).sort((a, b) => a - b),
    [students],
  );

  const visible = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return students.filter((s) => {
      if (!s.isActive) return false;
      if (filters.schoolId && s.schoolId !== filters.schoolId) return false;
      if (filters.cycle && String(s.cycle) !== filters.cycle) return false;
      if (filters.onlyUnassigned && s.tutorId) return false;
      if (term) {
        const haystack = `${s.studentCode} ${s.firstName} ${s.lastName}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [students, filters]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setFeedback(null);
  };

  const toggleAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visible.filter((s) => !s.tutorId).forEach((s) => (checked ? next.add(s.id) : next.delete(s.id)));
      return next;
    });
  };

  // Un tutor solo atiende estudiantes de su escuela: se ofrecen los de la escuela de lo elegido (y los aún sin escuela registrada).
  const selectedSchools = new Set(students.filter((s) => selectedIds.has(s.id)).map((s) => s.schoolId));
  const eligibleTutors = tutors.filter((t) => !t.schoolId || selectedSchools.size === 0 || (selectedSchools.size === 1 && selectedSchools.has(t.schoolId)));
  const selectedTutor = eligibleTutors.find((t) => t.tutorId === selectedTutorId) ?? null;

  const handleAssign = async () => {
    if (!selectedTutor || selectedIds.size === 0) return;
    setAssigning(true);
    setFeedback(null);
    try {
      const count = await assignmentService.assignStudents(selectedTutor.tutorId, [...selectedIds]);
      setFeedback({
        ok: true,
        text: `Se asignaron ${count} estudiante(s) a ${selectedTutor?.fullName ?? 'el tutor'}.`,
      });
      setSelectedIds(new Set());
      setSelectedTutorId(null);
      refresh();
    } catch (err) {
      setFeedback({ ok: false, text: getApiErrorMessage(err) });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Asignación de tutorados"
        subtitle="Asigna grupos de estudiantes a un Docente Tutor y equilibra su carga"
        icon={<SwitchIcon size={24} />}
      />

      {error ? (
        <Card>
          <EmptyState
            variant="error"
            icon={<XCircleIcon size={26} />}
            title="No se pudo cargar la información"
            description="Ocurrió un error al consultar estudiantes o tutores. Vuelve a intentarlo."
            action={<Button variant="secondary" onClick={refresh}>Reintentar</Button>}
          />
        </Card>
      ) : (
        <div className={styles.layout}>
          <Card className={styles.studentsCard}>
            <CardHeader
              title="1 · Selecciona los estudiantes"
              description={`${selectedIds.size} seleccionado(s) · ${visible.length} en la vista`}
            />
            {loading ? (
              <TableSkeleton rows={6} columns={5} />
            ) : (
              <StudentSelectList
                students={visible}
                schools={schools}
                cycles={cycles}
                filters={filters}
                selectedIds={selectedIds}
                tutorName={tutorName}
                onFilterChange={setFilters}
                onToggle={toggle}
                onToggleAllVisible={toggleAllVisible}
              />
            )}
          </Card>

          <Card className={styles.tutorsCard}>
            <CardHeader title="2 · Elige el tutor" description="De la escuela de los estudiantes elegidos, por menor carga" />
            <CardBody>
              <TutorWorkloadPanel
                tutors={eligibleTutors}
                selectedTutorId={selectedTutor?.tutorId ?? null}
                onSelect={(id) => {
                  setSelectedTutorId(id);
                  setFeedback(null);
                }}
              />
            </CardBody>

            <div className={styles.footer}>
              {feedback && (
                <div className={`${styles.feedback} ${feedback.ok ? styles.ok : styles.err}`}>
                  {feedback.ok && <CheckCircleIcon size={16} />}
                  {feedback.text}
                </div>
              )}
              <div className={styles.summary}>
                <span>
                  <b>{selectedIds.size}</b> estudiante(s) → <b>{selectedTutor?.fullName ?? '—'}</b>
                </span>
                <Button
                  icon={<SwitchIcon size={17} />}
                  disabled={!selectedTutor || selectedIds.size === 0}
                  loading={assigning}
                  onClick={handleAssign}
                >
                  Asignar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <NextSteps
        steps={[
          { to: '/tutores-por-ciclo', label: 'Fijar el tutor de cada ciclo', description: 'Es lo habitual: los estudiantes del ciclo pasan solos a su tutor' },
          { to: '/tutorados', label: 'Reasignar a un estudiante', description: 'Desde «Tutorados», con motivo y historial' },
          { to: '/carga-masiva', label: 'Cargar más estudiantes', description: 'Si faltan en la lista' },
        ]}
      />
    </div>
  );
};
