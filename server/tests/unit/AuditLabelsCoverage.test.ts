import fs from 'fs';
import path from 'path';
import { CRITICAL_MODELS } from '../../src/infrastructure/database/auditEntry';

/**
 * U10: la bitácora y el inicio de la DBU muestran cada operación con un nombre en lenguaje claro, no con su código interno
 * (INVITATION_ISSUED…). Esta prueba lee las acciones y entidades que el servidor realmente registra y falla si alguna no tiene
 * nombre en el cliente: así una operación nueva no vuelve a salir como código.
 */
const SERVER_SRC = path.resolve(__dirname, '../../src');
const CLIENT_LABELS = path.resolve(__dirname, '../../../client/src/features/auditoria/services/auditService.ts');

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.ts') ? [path.join(dir, e.name)] : []));

/** Claves del objeto `export const NAME: Record<string, string> = { … }` del cliente. */
function labelKeys(source: string, name: string): Set<string> {
  const start = source.indexOf(`export const ${name}`);
  const body = source.slice(start, source.indexOf('\n};', start));
  return new Set([...body.matchAll(/^\s{2}([A-Za-z_]+):/gm)].map((m) => m[1]));
}

describe('nombres de la bitácora (U10)', () => {
  const files = walk(SERVER_SRC).map((f) => fs.readFileSync(f, 'utf-8'));
  const client = fs.readFileSync(CLIENT_LABELS, 'utf-8');

  const actions = new Set<string>(['CREATE', 'UPDATE', 'DELETE']);
  const entities = new Set<string>(CRITICAL_MODELS);
  for (const source of files) {
    for (const m of source.matchAll(/\baction:\s*([^,\n}]+)/g)) for (const t of m[1].matchAll(/'([A-Z][A-Z_]+)'/g)) actions.add(t[1]);
    for (const m of source.matchAll(/\bentity:\s*'([A-Za-z]+)'/g)) entities.add(m[1]);
    for (const m of source.matchAll(/auditAccess\(\s*'([A-Za-z]+)'\s*,\s*'([A-Z]+)'/g)) {
      entities.add(m[1]);
      actions.add(m[2]);
    }
  }
  entities.delete('asc'); // orderBy, no una entidad

  it('el servidor registra operaciones (la prueba no está leyendo nada)', () => {
    expect(actions.size).toBeGreaterThan(20);
    expect(entities.size).toBeGreaterThan(10);
  });

  it('cada acción que se registra tiene su nombre claro en el cliente', () => {
    const known = labelKeys(client, 'ACTION_LABEL');
    expect([...actions].filter((a) => !known.has(a)).sort()).toEqual([]);
  });

  it('cada entidad que se registra tiene su nombre claro en el cliente', () => {
    const known = labelKeys(client, 'ENTITY_LABEL');
    expect([...entities].filter((e) => !known.has(e)).sort()).toEqual([]);
  });
});
