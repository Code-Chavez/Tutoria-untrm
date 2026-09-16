import React from 'react';
import { Student } from '@features/tutorados/services/studentService';
import { School } from '@features/tutorados/services/schoolService';
import { Badge, SearchField, SelectField } from '@shared/components/ui';
import table from '@shared/components/ui/DataTable.module.css';
import styles from './StudentSelectList.module.css';

export interface AssignFilterValues {
  search: string;
  schoolId: string;
  cycle: string;
  onlyUnassigned: boolean;
}

interface StudentSelectListProps {
  students: Student[];
  schools: School[];
  cycles: number[];
  filters: AssignFilterValues;
  selectedIds: Set<string>;
  tutorName: (tutorId?: string | null) => string | null;
  onFilterChange: (values: AssignFilterValues) => void;
  onToggle: (id: string) => void;
  onToggleAllVisible: (checked: boolean) => void;
}

export const StudentSelectList: React.FC<StudentSelectListProps> = ({
  students,
  schools,
  cycles,
  filters,
  selectedIds,
  tutorName,
  onFilterChange,
  onToggle,
  onToggleAllVisible,
}) => {
  const set = (patch: Partial<AssignFilterValues>) => onFilterChange({ ...filters, ...patch });
  const allVisibleSelected = students.length > 0 && students.every((s) => selectedIds.has(s.id));

  return (
    <div>
      <div className={styles.filters}>
        <SearchField
          placeholder="Buscar por código o nombre…"
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          aria-label="Buscar estudiante"
          wrapClassName={styles.search}
        />
        <SelectField
          value={filters.schoolId}
          onChange={(e) => set({ schoolId: e.target.value })}
          aria-label="Filtrar por escuela"
          wrapClassName={styles.select}
        >
          <option value="">Todas las escuelas</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          value={filters.cycle}
          onChange={(e) => set({ cycle: e.target.value })}
          aria-label="Filtrar por ciclo"
          wrapClassName={styles.selectSm}
        >
          <option value="">Todos los ciclos</option>
          {cycles.map((c) => (
            <option key={c} value={String(c)}>
              Ciclo {c}
            </option>
          ))}
        </SelectField>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={filters.onlyUnassigned}
            onChange={(e) => set({ onlyUnassigned: e.target.checked })}
          />
          Solo sin asignar
        </label>
      </div>

      <div className={table.scroll}>
        <table className={table.table}>
          <thead>
            <tr>
              <th className={styles.checkCol}>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(e) => onToggleAllVisible(e.target.checked)}
                  aria-label="Seleccionar todos los visibles"
                  disabled={students.length === 0}
                />
              </th>
              <th>Código</th>
              <th>Estudiante</th>
              <th>Ciclo</th>
              <th>Tutor actual</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const current = tutorName(student.tutorId);
              return (
                <tr
                  key={student.id}
                  className={selectedIds.has(student.id) ? styles.rowSelected : ''}
                  onClick={() => onToggle(student.id)}
                >
                  <td className={styles.checkCol}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(student.id)}
                      onChange={() => onToggle(student.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Seleccionar ${student.firstName} ${student.lastName}`}
                    />
                  </td>
                  <td>
                    <span className={table.primary}>{student.studentCode}</span>
                  </td>
                  <td>
                    <span className={table.name}>
                      {student.firstName} {student.lastName}
                    </span>
                  </td>
                  <td>
                    <Badge tone="info">Ciclo {student.cycle}</Badge>
                  </td>
                  <td>
                    {current ? (
                      <span className={styles.tutor}>{current}</span>
                    ) : (
                      <Badge tone="warning">Sin asignar</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
