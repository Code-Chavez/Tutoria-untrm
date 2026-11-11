import { Link } from 'react-router-dom';
import type { CatalogKind } from '../services/catalogService';

const CLOSE_PERIOD_TEXT = '«Cierre de periodo»';

export function CatalogErrorMessage({ kind, message }: { kind: CatalogKind; message: string }) {
  const start = message.indexOf(CLOSE_PERIOD_TEXT);
  if (kind !== 'periods' || start === -1) return <>{message}</>;

  return (
    <>
      {message.slice(0, start)}
      <Link to="/cierre-periodo" style={{ textDecoration: 'underline' }}>{CLOSE_PERIOD_TEXT}</Link>
      {message.slice(start + CLOSE_PERIOD_TEXT.length)}
    </>
  );
}
