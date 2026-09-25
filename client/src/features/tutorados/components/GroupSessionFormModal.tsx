import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@shared/components/ui';
import { CalendarIcon, CloseIcon, InfoIcon } from '@shared/components/icons';
import { Student } from '../services/studentService';
import { School } from '../services/schoolService';
import {
  StudentSelectList,
  AssignFilterValues,
} from '@features/asignacion/components/StudentSelectList';
import { ScheduleSessionData } from '@features/sesiones/services/sessionService';
import styles from './GroupSessionFormModal.module.css';

interface GroupSessionFormModalProps {
  students: Student[];
  schools: School[];
  durationMinutes: number;
  tutorName: (tutorId?: string | null) => string | null;
  loading?: boolean;
  serverError?: string;
  onSubmit: (data: ScheduleSessionData) => void;
  onCancel: () => void;
}

const EMPTY_FILTERS: AssignFilterValues = {
  search: '',
  schoolId: '',
  cycle: '',
  onlyUnassigned: false,
};

// Programación de sesión grupal (HU-19, Art. 7.b): dos o más tutorados,
// agrupables por ciclo o escuela mediante los mismos filtros de la asignación.
export const GroupSessionFormModal: React.FC<GroupSessionFormModalProps> = ({
  students,
  schools,
  durationMinutes,
  tutorName,
  loading,
  serverError,
  onSubmit,
  onCancel,
}) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [topic, setTopic] = useState('');
  const [filters, setFilters] = useState<AssignFilterValues>(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

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
    setError('');
  };

  const toggleAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visible.forEach((s) => (checked ? next.add(s.id) : next.delete(s.id)));
      return next;
    });
  };

  const submit = () => {
    if (!date || !time) {
      setError('Indica la fecha y la hora de la sesión.');
      return;
    }
    const scheduledAt = new Date(`${date}T${time}`);
    if (Number.isNaN(scheduledAt.getTime())) {
      setError('Fecha u hora inválidas.');
      return;
    }
    if (topic.trim().length < 3) {
      setError('Indica el tema de la sesión.');
      return;
    }
    if (selectedIds.size < 2) {
      setError('Selecciona al menos dos tutorados para una sesión grupal (Art. 7.b).');
      return;
    }
    onSubmit({
      studentIds: [...selectedIds],
      topic: topic.trim(),
      scheduledAt: scheduledAt.toISOString(),
    });
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Programar sesión grupal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <span className={styles.icon}>
            <CalendarIcon size={20} />
          </span>
          <div className={styles.headText}>
            <h2>Programar sesión grupal</h2>
            <p>Dos o más tutorados, para abordar temas comunes (Art. 7.b)</p>
          </div>
          <button className={styles.close} onClick={onCancel} aria-label="Cerrar">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="groupSessionDate">Fecha</label>
              <input
                id="groupSessionDate"
                type="date"
                className={styles.input}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setError('');
                }}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="groupSessionTime">Hora</label>
              <input
                id="groupSessionTime"
                type="time"
                className={styles.input}
                value={time}
                onChange={(e) => {
                  setTime(e.target.value);
                  setError('');
                }}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="groupTopic">Tema de la sesión</label>
            <input
              id="groupTopic"
              type="text"
              className={styles.input}
              placeholder="Ej. Técnicas de estudio para el ciclo"
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                setError('');
              }}
            />
          </div>

          <div className={styles.listSection}>
            <div className={styles.listHead}>
              <label>Tutorados (agrupa por ciclo o escuela con los filtros)</label>
              <span className={styles.count}>{selectedIds.size} seleccionado(s)</span>
            </div>
            <div className={styles.listBox}>
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
            </div>
          </div>

          <div className={styles.hint}>
            <InfoIcon size={16} />
            La sesión tendrá una duración de {durationMinutes} minutos (Art. 15.c del Protocolo). Se
            notificará a todos los participantes cuando el módulo de notificaciones esté disponible.
          </div>

          {(error || serverError) && <span className={styles.error}>{error || serverError}</span>}
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="primary" loading={loading} onClick={submit}>
            Programar sesión grupal
          </Button>
        </div>
      </div>
    </div>
  );
};
