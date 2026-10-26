# Pruebas de integración del servidor: base exclusiva y datos propios

Las pruebas de `server/tests/integration/` usan HTTP y base de datos reales y **escriben datos**. Por eso:

1. **Solo corren contra una base exclusiva de pruebas** (nombre terminado en `_test`), nunca contra la de desarrollo (`sit_db`).
2. **Cada corrida usa datos propios** y borra únicamente lo que creó, también si una prueba falla.

> **Estado:** el aislamiento protege la base de desarrollo (§2) y el **registro de origen de filas** (§3) deja la base de pruebas sin residuos tras cada corrida; además la corrida **falla** si una fila preexistente se borró o cambió de valor. Lo que sigue **siendo cierto**: la mayoría de las suites usa las **cuentas de demostración como actores** (para iniciar sesión y comprobar permisos por rol; no se modifican sus datos ni sus permisos, y la verificación final lo comprueba), y dos suites que tocan estado global (`securityParameters`, `periodClosure`) corren **solas** (candado exclusivo, §3.3), no en paralelo con las demás.

## 0. Preparar el entorno desde el repositorio (reproducible)

La CI instala con **pnpm 9.15.9** y el lockfile (`server/pnpm-lock.yaml`). Con otra versión mayor de pnpm el resultado puede diferir (pnpm 11 ya no lee el campo `pnpm.overrides` de `package.json`, del que depende la auditoría de dependencias). Requisitos: Node 22, Docker.

```bash
cd server
npx -y pnpm@9.15.9 install --frozen-lockfile   # exactamente las versiones del lockfile; falla si el lockfile no coincide
npx prisma generate
```

## 1. Correrlas (base exclusiva)

```bash
# 1) una base de pruebas aparte (puerto 5433, sin volumen: se descarta al apagarla)
docker compose -f docker-compose.test-db.yml up -d

# 2) migraciones y cuentas de demostración, solo sobre esa base
cd server
TEST_DATABASE_URL=postgresql://sit_user:sit_pass@localhost:5433/sit_db_test pnpm run test:db:prepare

# 3) todas las pruebas de integración (sin paralelismo: comparten la base), o un archivo
TEST_DATABASE_URL=postgresql://sit_user:sit_pass@localhost:5433/sit_db_test pnpm run test:integration
TEST_DATABASE_URL=postgresql://sit_user:sit_pass@localhost:5433/sit_db_test pnpm run test:integration tests/integration/cycleTutors
```

- `TEST_DATABASE_URL` **tiene prioridad** sobre `DATABASE_URL`: aunque el `.env` apunte a desarrollo, las pruebas usan la base de pruebas.
- La CI no cambia: define `DATABASE_URL=…/sit_db_test` y `REQUIRE_DB_TESTS=1`, y esa base cumple la regla.

## 2. Qué pasa si se intenta con la base de desarrollo

| Comando | Resultado |
|---|---|
| `pnpm test` (habitual) con el `.env` de desarrollo | **Solo corren las unitarias.** Las de integración se omiten con un aviso que explica cómo activarlas. |
| `REQUIRE_DB_TESTS=1 pnpm test` contra `sit_db` | La corrida **aborta en el `globalSetup`** con «La conexión configurada llega a la base «sit_db», que no es una base de pruebas…», antes de ejecutar ninguna prueba. No se escribe nada. |
| `pnpm run test:integration` o `test:db:prepare` sin `TEST_DATABASE_URL` de una base `…_test` | Se niegan y no hacen nada. |

**La comprobación decisiva es contra la base real, no contra una variable.** Antes de ejecutar la primera prueba (`globalSetup`, `tests/support/testDatabaseGlobalSetup.ts`), la conexión que usará la aplicación (`DATABASE_URL`, ya con `TEST_DATABASE_URL` aplicada) le pregunta al servidor `SELECT current_database()`. Si la respuesta no termina en `_test`, **toda la corrida aborta** sin haber ejecutado ni una prueba (solo se hizo esa consulta de lectura). Además, cada archivo de integración vuelve a comprobar el nombre de la URL antes de crear su cliente. Si no hay conexión, no se puede modificar nada y las pruebas fallan por eso.

La regla vive en `server/tests/support/testDatabase.ts` (con su prueba unitaria `testDatabaseGuard.test.ts`), se aplica en `jest.config.ts` (qué se ejecuta) y en `tests/support/testDatabaseGuard.ts` (defensa por archivo).

## 3. Datos propios, registro de origen y verificación final

### 3.1 Reglas para escribir una suite

1. **Datos propios** con una marca de la corrida (`Date.now()`): escuelas, coordinaciones, docentes, estudiantes y periodos que la prueba modifica o borra se crean en la prueba. Ayudas: `tests/helpers/ownUsers.ts` (`ownUser`, `removeOwnUserTraces`).
2. **Las cuentas de demostración (Ana, Elena, Rosa, la DBU…) son actores de autenticación/lectura**, no sujetos de modificación: la prueba no cambia sus datos ni sus permisos. Una petición «sin efecto» (p. ej. `PATCH` con los mismos valores) también cambia `updated_at`, por eso las modificaciones se prueban sobre un estudiante propio.
3. Lo que se crea se borra en el `afterAll` (corre aunque una prueba falle). El registro de abajo es la red de seguridad de todo lo demás.

### 3.2 Registro de origen de filas (solo base de pruebas)

Código: `server/tests/support/rowLedger.ts`, `testDatabaseGuard.ts` (por archivo), `testDatabaseGlobalSetup.ts` y `testDatabaseGlobalTeardown.ts`.

- **Solo existe en la base de pruebas.** Se instala en el `globalSetup`, después de que `current_database()` confirmó que la base termina en `_test`; en cualquier otra base el `globalSetup` aborta antes y no instala nada. Crea `test_row_origin`, `test_preexisting` y funciones `test_*` en esa base (no son migraciones de Prisma ni existen en producción ni en desarrollo).
- **Registro.** Cada archivo de integración se conecta con un `application_name` propio (`sit-jest:<corrida>:<proceso>:<archivo>`). Un disparador `AFTER INSERT` en cada tabla con columna `id` anota la fila en `test_row_origin` solo si la conexión lleva ese nombre; lo que insertan la seed, el desarrollo u otra herramienta no se anota nunca.
- **Limpieza.** Al terminar cada archivo (también si una prueba falló) se borran, de la más reciente a la más antigua, las filas anotadas con **su** origen: no importa que otra suite corra a la vez (a diferencia de acotar por hora o por cuenta). `globalTeardown` repite el barrido para toda la corrida (cubre un proceso que murió).
- **Las referencias ajenas se conservan.** Antes de borrar una fila se comprueba si alguna fila que **no** es de ese origen la referencia por **cualquier** clave foránea (también `SET NULL` o `CASCADE`, que modificarían o arrastrarían datos ajenos). Si es así, no se borra: se deja, se informa y cuenta como residuo. Esto se comprobó con una prueba (`rowLedger.test.ts`) tras una versión inicial que sí ponía en `NULL` la sede de una escuela ajena.
- **Verificación final que hace fallar la corrida** (`globalTeardown`). Al empezar se guarda una foto con los **valores completos** de todas las filas existentes. Al terminar: (a) se borra lo que quedó por origen; (b) si una prueba dejó cambiado un parámetro del sistema, se restaura; (c) **la corrida falla** si cualquier fila preexistente fue borrada o cambió de valor (no basta con que el conteo sea el mismo), si alguna fila de las pruebas no se pudo borrar o si se debió restaurar un parámetro. El mensaje lista las tablas, los identificadores y las columnas que cambiaron. Se comprobó con una prueba descartable que deja a propósito un parámetro y una fila preexistente cambiados: la corrida terminó con error y el parámetro quedó restaurado.

### 3.3 Candado entre archivos en paralelo

`tests/support/globalStateLock.ts`. Todos los archivos de integración mantienen un candado **compartido** de PostgreSQL mientras duran; los que cambian o recorren estado global toman el **exclusivo**: esperan a que terminen los demás, corren solos y los demás no empiezan hasta que terminan. Lista (`GLOBAL_STATE_SUITES`):

| Suite | Por qué no puede correr en paralelo |
|---|---|
| `securityParameters` | Cambia parámetros de seguridad (intentos de acceso, bloqueo, inactividad) que lee **cada** inicio de sesión de todas las suites. Los restaura en su `afterAll`; si el proceso muriera, `globalTeardown` los restaura. |
| `periodClosure` | Cerrar un periodo copia la matrícula de **todos** los estudiantes; si otra suite borraba uno en ese momento fallaba por clave foránea (500 intermitente visto en paralelo). |

Si una suite nueva cambia o recorre estado global, se agrega a esa lista.

### 3.4 Estado por suite

| Suite | Cómo trabaja | Modifica datos preexistentes |
|---|---|---|
| `cycleTutors`, `tutorAcceptance`, `campusesAndTutorSchool`, `periodEnrollment` | **Datos propios**: escuelas, coordinaciones, docentes y estudiantes propios | No |
| `objectAccess` | Cuentas de demostración como actores; las modificaciones del último caso sobre un **estudiante propio** | No |
| `securityParameters` | Cambia parámetros globales por la API (necesario para probarlos); corre **sola** (§3.3) y los restaura | Temporalmente; restaurados al terminar y verificados |
| `periodClosure` | Periodo propio; corre **sola** | No |
| El resto (`accessMatrix`, `accountInvitation`, `admonitions`, `attendanceNumbering`, `bootstrap`, `emailOutbox`, `emailValidation`, `evaluationScope`, `notificationLifecycle`, `passwordReset`, `schoolCycles`, `sensitiveAccessAudit`, `sessionNotices`, `signedDocuments`, `tutorImport`, `tutoringRequestCircuit`, `tutoringRequestFollowUp`) | Cuentas de demostración como actores; crean y borran sus propios objetos | No (la verificación final lo comprueba) |

**Límites que se mantienen:** (1) las cuentas de demostración siguen siendo el *actor* de la mayoría de las suites; si se borrara o cambiara una de ellas, la prueba fallaría, no se adaptaría; (2) `securityParameters` modifica un parámetro **global** por diseño (aislado y restaurado, no evitado); (3) el registro solo conoce lo que insertan las conexiones de las pruebas: lo que el *servidor de la aplicación en desarrollo* u otra herramienta cambie en la misma base durante una corrida se vería como diferencia (la base de pruebas es exclusiva: no se usa para otra cosa).

## 4. Un caso de la regla de «máximo de dos ciclos»

`cycleTutors` comprueba, además de «un docente no atiende dos ciclos sin excepción», que **un tercer ciclo se rechaza aun con la excepción y su motivo** (400 «no puede atender más de dos ciclos»). El valor «dos» es una política operativa del sistema; el Protocolo revisado no lo menciona (ver `DECISIONES_DBU_COBERTURA_Y_PLAN_2026-10-18.md`, tema 3).
