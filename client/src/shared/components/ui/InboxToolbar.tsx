import { SearchIcon } from '../icons';
import styles from './InboxToolbar.module.css';

export interface InboxFilterOption<K extends string> {
  key: K;
  label: string;
  count: number;
}

interface InboxToolbarProps<K extends string> {
  /** Nombre accesible del grupo de filtros. */
  label: string;
  options: readonly InboxFilterOption<K>[];
  active: K;
  onChange: (key: K) => void;
  search: string;
  onSearch: (value: string) => void;
  searchLabel: string;
  searchPlaceholder: string;
}

/** Filtros de estado (con cuántos hay en cada uno) y búsqueda de una bandeja: lo pendiente se ve sin recorrer lo ya terminado. */
export function InboxToolbar<K extends string>({ label, options, active, onChange, search, onSearch, searchLabel, searchPlaceholder }: InboxToolbarProps<K>) {
  return (
    <div className={styles.bar}>
      <div className={styles.filters} role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            className={`${styles.chip} ${active === option.key ? styles.chipActive : ''}`}
            aria-pressed={active === option.key}
            onClick={() => onChange(option.key)}
          >
            {option.label} <span className={styles.chipCount}>{option.count}</span>
          </button>
        ))}
      </div>
      <label className={styles.search}>
        <SearchIcon size={16} />
        <input type="search" value={search} placeholder={searchPlaceholder} aria-label={searchLabel} onChange={(e) => onSearch(e.target.value)} />
      </label>
    </div>
  );
}
