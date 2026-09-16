import React from 'react';
import { TutorWorkload } from '../services/assignmentService';
import { UsersIcon } from '@shared/components/icons';
import styles from './TutorWorkloadPanel.module.css';

interface TutorWorkloadPanelProps {
  tutors: TutorWorkload[];
  selectedTutorId: string | null;
  onSelect: (tutorId: string) => void;
}

export const TutorWorkloadPanel: React.FC<TutorWorkloadPanelProps> = ({
  tutors,
  selectedTutorId,
  onSelect,
}) => {
  const maxLoad = Math.max(1, ...tutors.map((t) => t.assignedCount));

  if (tutors.length === 0) {
    return (
      <div className={styles.empty}>
        <UsersIcon size={26} />
        <p>No hay Docentes Tutores activos. Regístralos en Administración para poder asignar.</p>
      </div>
    );
  }

  return (
    <ul className={styles.list} role="radiogroup" aria-label="Seleccionar tutor">
      {tutors.map((tutor) => {
        const pct = Math.round((tutor.assignedCount / maxLoad) * 100);
        const selected = tutor.tutorId === selectedTutorId;
        return (
          <li key={tutor.tutorId}>
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              className={`${styles.card} ${selected ? styles.selected : ''}`}
              onClick={() => onSelect(tutor.tutorId)}
            >
              <div className={styles.top}>
                <span className={styles.avatar}>
                  {tutor.fullName
                    .split(' ')
                    .slice(0, 2)
                    .map((n) => n.charAt(0))
                    .join('')
                    .toUpperCase()}
                </span>
                <div className={styles.info}>
                  <b>{tutor.fullName}</b>
                  <small>{tutor.email}</small>
                </div>
                <span className={styles.count}>{tutor.assignedCount}</span>
              </div>
              <div className={styles.barTrack}>
                <span
                  className={`${styles.barFill} ${pct >= 80 ? styles.high : pct >= 50 ? styles.mid : ''}`}
                  style={{ width: `${Math.max(pct, 4)}%` }}
                />
              </div>
              <span className={styles.barLabel}>
                {tutor.assignedCount} tutorado{tutor.assignedCount === 1 ? '' : 's'} asignado
                {tutor.assignedCount === 1 ? '' : 's'}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};
