# Autorrevisión: aislamiento y limpieza de las pruebas de integración (PR #170 y #171)

Fecha: 26/10/2026 · Alcance: `server/tests/support/*`, `server/jest.config.ts`, `server/scripts/*`, `docker-compose.test-db.yml` y las suites de integración modificadas · Tipo: **autorrevisión** de quien implementó (no es una revisión independiente ni cuenta como aprobación del Product Owner).

Documento de apoyo: `docs/PRUEBAS_DE_INTEGRACION.md`. Evidencia: `docs/resultados-2026-10-25/` (PR #170) y `docs/resultados-2026-10-26/` (PR #171 y este documento).

## 1. Qué se revisó y qué se encontró

| # | Riesgo revisado | Cómo se revisó | Resultado | Evidencia |
|---|---|---|---|---|
| 1 | Que las pruebas escriban en la base de desarrollo | `current_database()` consultado al servidor antes de la primera prueba; defensa por archivo; `pnpm test` omite integración si la base no es `_test` | Correcto: con `DATABASE_URL` a `sit_db` la corrida aborta; los conteos de todas las tablas de `sit_db` no cambian y no existen tablas del registro allí | `resultados-2026-10-25/guardia-contra-desarrollo.txt`, `resultados-2026-10-26/guardia-contra-desarrollo.txt` |
| 2 | Que la limpieza borre datos ajenos | El registro anota solo filas insertadas por conexiones de prueba; no borra una fila si una fila ajena la referencia por **cualquier** FK | **Hallazgo propio, corregido:** la primera versión borraba una sede que una escuela ajena referenciaba y la FK `SET NULL` modificaba esa escuela. Ahora se comprueba antes y hay una prueba que lo cubre (`rowLedger.test.ts`) | `server/tests/integration/rowLedger.test.ts` |
| 3 | Que una prueba cambie datos o permisos de las cuentas de demostración | Comparación fila por fila del JSON completo de las 205 filas preexistentes (41 tablas) antes y después de 2 corridas completas y de la corrida de integración sola; verificación final en `globalTeardown` | **Hallazgo propio, corregido:** `objectAccess` enviaba `PATCH` sin efecto sobre el estudiante de la seed y cambiaba su `updated_at`; ahora usa un estudiante propio. Después: sin diferencias | `resultados-2026-10-26/dos-corridas-completas.txt` |
| 4 | Carreras entre suites en paralelo (la CI usa los workers por defecto) | Dos corridas completas en paralelo con la base nueva; lectura de los errores de clave foránea de la salida | **Hallazgos propios, corregidos:** (a) `periodClosure` falló con un 500 intermitente (el cierre copia la matrícula de todos los estudiantes y otra suite borró uno); ahora corre sola. (b) La comprobación «preexistentes intactas» de `cycleTutors` comparaba filas que otra suite creaba y borraba durante la corrida; falló una vez y se rehízo dos veces hasta definir «preexistente» como «no creada por ninguna conexión de prueba» | `docs/PRUEBAS_DE_INTEGRACION.md` §3.3 |
| 5 | Estado global compartido (parámetros de seguridad) | Lectura de cómo se consumen (`loadSecurityPolicy` sin caché: cada inicio de sesión los lee) | `securityParameters` sigue cambiando un parámetro **global** por diseño; corre solo y se restaura. **No está evitado**, está aislado | `docs/PRUEBAS_DE_INTEGRACION.md` §3.3 |
| 6 | Que la limpieza «garantice» la restauración ante cualquier fallo | Prueba que falla a propósito, prueba con residuo deliberado y **terminación abrupta (SIGKILL)** | **Corrección de una afirmación mía:** dije que los parámetros se restauraban «incluso si el proceso muere». Es **falso**: con una terminación abrupta no corre ningún código de limpieza. Solo se libera el candado. Los parámetros y las filas quedan, y una corrida posterior no lo detecta. Ahora está documentado con la recuperación manual probada (§3.5 del documento de apoyo) | `resultados-2026-10-26/terminacion-abrupta.txt` |
| 7 | Que el código de pruebas llegue a producción o a desarrollo | El registro (tablas `test_*`, funciones, disparadores) se instala solo en el `globalSetup` tras confirmar `*_test`; no son migraciones de Prisma | Correcto: no existen en `sit_db` (conteo de tablas `test_*` en desarrollo: 0) | `resultados-2026-10-26/guardia-contra-desarrollo.txt` |
| 8 | Secretos y datos personales | Revisión de los archivos nuevos | Solo aparecen las claves de desarrollo que el repositorio ya publica (`docker-compose.yml`, seed); datos ficticios; sin imágenes generadas ni PDF de sesiones | — |

## 2. Qué NO se garantiza (límites que se mantienen)

1. **Terminación abrupta del proceso** (§1.6): no hay recuperación automática. *(Actualización: la corrida siguiente ya no acepta esa base en silencio, se detiene con instrucciones; ver `docs/PRUEBAS_DE_INTEGRACION.md` §3.5.)* Se recupera recreando la base de pruebas (recomendado) o con los comandos de `docs/PRUEBAS_DE_INTEGRACION.md` §3.5. Mejora posible, no hecha: que el `globalSetup` se niegue a empezar si encuentra la foto de una corrida anterior sin cerrar.
2. La mayoría de las suites sigue usando las **cuentas de demostración como actores** (iniciar sesión y comprobar permisos por rol). No se modifican sus datos ni sus permisos y la verificación final lo comprueba, pero siguen siendo una dependencia compartida.
3. `securityParameters` cambia un parámetro global (§1.5).
4. El registro solo conoce lo que insertan las conexiones de las pruebas; cualquier otra escritura en la base de pruebas durante una corrida se vería como diferencia. La base de pruebas es exclusiva.
5. No se ejecutaron las pruebas E2E ni se midió el efecto sobre el tiempo de la CI más allá de que `Server — Test` pasó (1 min 54 s en #171; 2 min 8 s en #170).

## 3. Fallo aislado de `BcryptPasswordHasher`

Una sola vez, en una corrida local de diagnóstico, la prueba unitaria `BcryptPasswordHasher › rechaza una contraseña incorrecta` superó el plazo de 5 s. **No se determinó la causa.** No se reprodujo en las 4 corridas completas locales posteriores ni en la CI de #170, #171 ni de `develop` tras las fusiones. No se atribuye a la carga de la máquina como causa demostrada (no se midió); es solo una hipótesis sin probar. No se cambió la prueba. Detalle en `docs/resultados-2026-10-26/bcrypt-fallo-aislado.txt`.

## 4. Base de datos de desarrollo

- **No se recreó ni se reinició (resetear) la base de desarrollo.** Lo único recreado fue la base de pruebas: `docker compose -f docker-compose.test-db.yml down` y `up`, que solo afecta al contenedor `sit-postgres-test` (servicio `postgres-test`, datos en `tmpfs`, puerto 5433). La base de desarrollo es `sit-postgres` (`sit_db`).
- El 26/10/2026 Docker Desktop estaba apagado y los contenedores quedaron detenidos; se **arrancaron** con `docker start` (`sit-postgres`, `sit-mailpit`, `sit-server`, `sit-client`), sin recrearlos ni borrar volúmenes. El comando de arranque de `sit-server` ejecuta `prisma migrate deploy` (sin migraciones pendientes) y `pnpm run seed`; la seed es idempotente (`update: {}`) **salvo** que reajusta el coordinador y la sede de las tres escuelas de la seed a sus valores de seed. Hoy esas escuelas coinciden con la seed (coordinación de Sistemas y Mecánica con su cuenta de demostración, sede central); **no se comprobó si antes del arranque diferían.** Un arranque normal del stack hace lo mismo.
- Huella de los conteos de todas las tablas de `sit_db`: idéntica antes y después de las pruebas del guardia (`cb28d8e7…`), también tras ese arranque.

## 5. Orden de integración y estado

- Ambos PR tenían como destino `develop`. El #171 dependía del #170 (su rama contiene los commits del #170), por lo que el orden era: fusionar #170; comprobar que el diff restante de #171 fuera solo `ec14f9d` y `c18ef2d`; ejecutar la CI de nuevo sobre la combinación final.
- Estado verificado el 26/10/2026: #170 se fusionó a las 19:21 UTC y #171 a las 19:23 UTC, ambos por la cuenta `Code-Chavez` (sin fusión automática); `develop` quedó en `0299db1`, cuyo árbol es **idéntico** al de la cabeza de #171 (`c18ef2d`: diferencia de archivos vacía). La CI de `develop` sobre `0299db1` (ejecución 40386370728) pasó completa: 138 suites y 1203 pruebas, 25 suites de integración, y también `Docker — Build Images`.
- Este documento y la corrección de `PRUEBAS_DE_INTEGRACION.md` §3.3/§3.5 se entregan en un PR posterior (solo documentación), porque la afirmación incorrecta ya estaba en `develop`.
