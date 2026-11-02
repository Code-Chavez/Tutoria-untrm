# Auditoría de dependencias: avisos nuevos del 30/10/2026 que bloqueaban la CI

**Qué pasó.** El 1/11/2026 los trabajos «Client — Audit» y «Server — Audit» (`pnpm audit --prod`) empezaron a fallar en **todos** los PR, incluidos los de solo documentación (p. ej. #199), por dos avisos publicados el 30/10/2026 (después de las últimas CI verdes). No cambió ninguna dependencia del repositorio.

## Cliente: `follow-redirects` (alto) — corregido

| | |
|---|---|
| Aviso | GHSA-mrwp-f3q8-3g9p: las listas `sensitiveHeaders` entre «reinos» se descartan y las credenciales personalizadas pueden seguir redirecciones |
| Afectado | `follow-redirects` >= 1.16.0 y <= 1.16.1; corregido en 1.16.2 |
| Camino | `client > axios@1.20.0 > follow-redirects@1.16.1` (axios declara `^1.16.0`, así que 1.16.2 ya era compatible) |
| Corrección | **Solo el lockfile del cliente**: `follow-redirects` 1.16.1 → 1.16.2 (4 líneas: entrada, referencia de axios e integridad). `package.json` no cambia; no se sube ninguna otra dependencia |
| Comprobado | `pnpm audit --prod` (pnpm 9.15.9, el de la CI) → «No known vulnerabilities found»; `pnpm install --frozen-lockfile` correcto y solo `follow-redirects@1.16.2` instalado; `tsc`, `eslint` (0 errores) y `vite build` correctos; suite del cliente (resultado en la descripción del PR) |

## Servidor: `minimatch` (moderado) — excepción documentada, no corrección

| | |
|---|---|
| Aviso | GHSA-g3hv-75wg-m249: posible denegación de servicio por amplificación de `globParts` en `firstPhasePreProcess()` cuando `optimizationLevel >= 2`, **con un patrón controlado por el atacante** |
| Rango declarado | `minimatch < 11.0.1` (corregido en 11.0.1). No hay corrección para la rama 3.x |
| Camino | `server > exceljs@4.4.0` → `archiver@5.3.2` → `archiver-utils@2.1.0`/`zip-stream` → `archiver-utils@3.0.4` → `glob@7.2.3` → `minimatch@3.1.5`, y `exceljs > unzipper@0.10.14 > fstream@1.0.12 > rimraf@2.7.1 > glob@7.2.3 > minimatch@3.1.5` (4 caminos) |
| Opciones | (1) actualizar `exceljs`: **no existe** una versión posterior (4.4.0 es la última estable); (2) forzar `minimatch >= 11.0.1` con un `override` bajo `glob@7`: `glob@7.2.3` declara `minimatch ^3.1.1` y no está soportado con la 11 (otra API y otra generación), así que se cambiaría código de producción de forma no soportada para proteger código que no se usa; (3) **ignorar el aviso con justificación**, como ya se hace con `GHSA-w5hq-g745-h8pq` (F7 del informe de seguridad). Se eligió la 3 |

**Por qué la excepción es segura hoy (verificado en el código y en las dependencias instaladas):**

1. **El código vulnerable no está en la versión instalada.** `minimatch@3.1.5` no contiene `firstPhasePreProcess` ni `optimizationLevel` (0 coincidencias): son de la generación 10+. El rango `< 11.0.1` del aviso es más amplio que el defecto real para la rama 3.x.
2. **No es alcanzable por una entrada del usuario.** `glob@7` solo se carga desde `archiver-utils/file.js` (ayudantes de `directory`/`glob` de archiver, que `exceljs` no usa: crea el zip y agrega buffers/flujos) y desde `fstream`/`rimraf` (escritura de archivos al extraer a disco, que `unzipper` en modo lectura de buffer no usa). El servidor solo hace `workbook.xlsx.load(buffer)` y escribe libros; ninguna ruta pasa patrones de glob.
3. **Se vigila con una prueba**: `server/tests/unit/AuditedDependencyUsage.test.ts` falla si el código del servidor importa `glob`, `minimatch`, `rimraf`, `fstream`, `unzipper`, `archiver`, `archiver-utils` o `readdir-glob`, o si `exceljs` empieza a usar `xlsx/csv.readFile/writeFile` (comprobado añadiendo una importación de prueba, que la rompe).

**Condición de retiro de la excepción:** cuando `exceljs` (o sus dependencias `archiver`, `unzipper`) dejen de usar `glob@7`/`minimatch@3`, o cuando se pueda subir `minimatch` a >= 11.0.1 sin romper `glob`; revisar junto con F7 (`GHSA-w5hq-g745-h8pq`) **antes de la v1.0.0**. `package.json` (JSON) no admite comentarios: la justificación vive en este archivo.

## Límites

- No se ejecutó la CI de GitHub antes de este documento; las comprobaciones locales usan pnpm 9.15.9 y Node 22 (la CI usa Node 20.19.5).
- `pnpm audit` solo ve avisos ya publicados: puede aparecer otro mañana y volver a bloquear la CI; la excepción no cubre ningún otro.
- Que el código vulnerable no exista en 3.1.5 se comprobó por búsqueda de texto en el paquete instalado, no con una prueba de explotación.
- La excepción reduce la protección del audit para este aviso; se acepta porque no hay corrección compatible y se vigila con la prueba anterior.
