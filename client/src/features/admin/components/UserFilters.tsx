import React from 'react';
import { SearchField, SelectField, Button } from '@shared/components/ui';
import { RefreshIcon } from '@shared/components/icons';
import { Role } from '../services/roleService';
import styles from './UserFilters.module.css';

export interface UserFilterValues {
  search: string;
  roleId: string;
  status: string;
}

interface UserFiltersProps {
  values: UserFilterValues;
  roles: Role[];
  onChange: (values: UserFilterValues) => void;
  onClear: () => void;
}

export const UserFilters: React.FC<UserFiltersProps> = ({ values, roles, onChange, onClear }) => {
  const set = (patch: Partial<UserFilterValues>) => onChange({ ...values, ...patch });
  const hasFilters = values.search !== '' || values.roleId !== '' || values.status !== '';

  return (
    <div className={styles.bar}>
      <SearchField
        placeholder="Buscar por nombre o correo…"
        value={values.search}
        onChange={(e) => set({ search: e.target.value })}
        aria-label="Buscar usuario"
        wrapClassName={styles.search}
      />
      <SelectField
        value={values.roleId}
        onChange={(e) => set({ roleId: e.target.value })}
        aria-label="Filtrar por rol"
        wrapClassName={styles.select}
      >
        <option value="">Todos los roles</option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </SelectField>
      <SelectField
        value={values.status}
        onChange={(e) => set({ status: e.target.value })}
        aria-label="Filtrar por estado"
        wrapClassName={styles.select}
      >
        <option value="">Todos los estados</option>
        <option value="active">Activos</option>
        <option value="inactive">Inactivos</option>
      </SelectField>
      {hasFilters && (
        <Button variant="ghost" icon={<RefreshIcon size={16} />} onClick={onClear}>
          Limpiar
        </Button>
      )}
    </div>
  );
};
