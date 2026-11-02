import fs from 'fs';
import path from 'path';

/**
 * Respaldo de la excepción de auditoría GHSA-g3hv-75wg-m249 (minimatch < 11.0.1, ver docs/resultados-2026-11-01/auditoria-dependencias.md).
 * La excepción se justifica porque minimatch 3.x solo llega por glob@7 (archiver-utils, fstream/rimraf), que el servidor no usa:
 * exceljs solo lee un buffer (`xlsx.load`) y escribe libros. Si alguien empieza a usar esas librerías o a pasar patrones de glob
 * del usuario, esta prueba falla y la excepción debe revisarse (o resolverse actualizando minimatch).
 */
const SRC = path.resolve(__dirname, '../../src');
const FORBIDDEN = ['glob', 'minimatch', 'rimraf', 'fstream', 'unzipper', 'archiver', 'archiver-utils', 'readdir-glob'];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|js)$/.test(entry.name) ? [full] : [];
  });
}

/** Importaciones del paquete `name` (con o sin subruta): `from 'name'`, `from "name/x"` o `require('name')`. */
function importsPackage(text: string, name: string): boolean {
  const quoted = [`'${name}'`, `"${name}"`, `'${name}/`, `"${name}/`];
  return text.split('\n').some((line) => /\b(from|require)\b/.test(line) && quoted.some((q) => line.includes(q)));
}

describe('uso de las dependencias cubiertas por una excepción de auditoría', () => {
  const files = sourceFiles(SRC);

  it('el código del servidor no importa glob, minimatch ni las librerías que los traen', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      for (const name of FORBIDDEN) if (importsPackage(text, name)) offenders.push(`${path.relative(SRC, file)} → ${name}`);
    }
    expect(offenders).toEqual([]);
  });

  it('la comprobación detecta una importación (control de la propia prueba)', () => {
    expect(importsPackage("import { glob } from 'glob';", 'glob')).toBe(true);
    expect(importsPackage('const m = require("minimatch/dist");', 'minimatch')).toBe(true);
    expect(importsPackage("import ExcelJS from 'exceljs';", 'glob')).toBe(false);
  });

  it('exceljs solo se usa para leer un buffer o escribir libros (sin rutas de archivos)', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      if (!importsPackage(text, 'exceljs')) continue;
      if (/\.(xlsx|csv)\.(readFile|writeFile)\(/.test(text)) offenders.push(path.relative(SRC, file));
    }
    expect(offenders).toEqual([]);
  });
});
