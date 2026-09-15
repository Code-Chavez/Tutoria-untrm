import React from 'react';
import styles from './Field.module.css';
import { SearchIcon, ChevronDownIcon } from '@shared/components/icons';

interface SearchFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  wrapClassName?: string;
}

// Campo de búsqueda con icono. Reenvía el resto de props al <input>.
export const SearchField: React.FC<SearchFieldProps> = ({
  wrapClassName = '',
  className = '',
  ...rest
}) => (
  <div className={`${styles.search} ${wrapClassName}`}>
    <span className={styles.searchIcon}>
      <SearchIcon size={17} />
    </span>
    <input type="search" className={`${styles.input} ${styles.withIcon} ${className}`} {...rest} />
  </div>
);

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  wrapClassName?: string;
  children: React.ReactNode;
}

// Select con chevron personalizado y estilo consistente.
export const SelectField: React.FC<SelectFieldProps> = ({
  wrapClassName = '',
  className = '',
  children,
  ...rest
}) => (
  <div className={`${styles.selectWrap} ${wrapClassName}`}>
    <select className={`${styles.input} ${styles.select} ${className}`} {...rest}>
      {children}
    </select>
    <span className={styles.chevron}>
      <ChevronDownIcon size={16} />
    </span>
  </div>
);
