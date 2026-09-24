import React from 'react';
import { SearchField, SelectField, Button } from '@shared/components/ui';
import { RefreshIcon } from '@shared/components/icons';
import { School } from '../services/schoolService';
import styles from './TutoradoFilters.module.css';

export interface StudentFilterValues {
  search: string;
  schoolId: string;
  cycle: string;
  status: string;
}

interface TutoradoFiltersProps {
  values: StudentFilterValues;
  schools: School[];
  cycles: number[];
  onChange: (values: StudentFilterValues) => void;
  onClear: () => void;
}

export const TutoradoFilters: React.FC<TutoradoFiltersProps> = ({
  values,
  schools,
  cycles,
  onChange,
  onClear,
}) => {
  const set = (patch: Partial<StudentFilterValues>) => onChange({ ...values, ...patch });
  const hasFilters =
    values.search !== '' || values.schoolId !== '' || values.cycle !== '' || values.status !== '';

  return (
    <div className={styles.bar}>
      <SearchField
        placeholder="Buscar por código, nombre o apellido…"
        value={values.search}
        onChange={(e) => set({ search: e.target.value })}
        aria-label="Buscar tutorado"
        wrapClassName={styles.search}
      />
      <SelectField
        value={values.schoolId}
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
        value={values.cycle}
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
      <SelectField
        value={values.status}
        onChange={(e) => set({ status: e.target.value })}
        aria-label="Filtrar por estado"
        wrapClassName={styles.selectSm}
      >
        <option value="">Todos los estados</option>
        <option value="active">Activos</option>
        <option value="inactive">Inactivos</option>
        <option value="risk">En riesgo</option>
      </SelectField>
      {hasFilters && (
        <Button variant="ghost" size="md" icon={<RefreshIcon size={16} />} onClick={onClear}>
          Limpiar
        </Button>
      )}
    </div>
  );
};
