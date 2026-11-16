import { Link, useLocation } from 'react-router-dom';
import { CATALOGS } from '../services/catalogService';
import styles from './CatalogNavigation.module.css';

export function CatalogNavigation({ onSelect, showCampuses }: { onSelect?: () => void; showCampuses?: boolean }) {
  const { pathname, search } = useLocation();
  const kind = new URLSearchParams(search).get('tipo');
  const active = CATALOGS.find((catalog) => catalog.kind === kind)?.kind ?? 'faculties';

  return (
    <ul className={styles.categories}>
      {CATALOGS.map(({ kind, label }) => (
        <li key={kind}>
          <Link
            to={{ pathname: '/catalogos', search: kind === 'faculties' ? '' : `?tipo=${kind}` }}
            replace={pathname === '/catalogos'}
            aria-current={pathname === '/catalogos' && active === kind ? 'page' : undefined}
            onClick={onSelect}
          >
            {label}
          </Link>
        </li>
      ))}
      {showCampuses && (
        <li>
          <Link to="/sedes" aria-current={pathname === '/sedes' ? 'page' : undefined} onClick={onSelect}>
            Sedes
          </Link>
        </li>
      )}
    </ul>
  );
}
