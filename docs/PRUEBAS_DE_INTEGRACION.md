# Pruebas de integración del servidor: base exclusiva y datos propios

Las pruebas de `server/tests/integration/` usan HTTP y base de datos reales y **escriben datos**. Por eso:

1. **Solo corren contra una base exclusiva de pruebas** (nombre terminado en `_test`), nunca contra la de desarrollo (`sit_db`).
2. **Cada corrida usa datos propios** y borra únicamente lo que creó, también si una prueba falla.

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
| `REQUIRE_DB_TESTS=1 pnpm test` contra `sit_db` | Cada archivo de integración **falla antes de conectarse** con el mensaje «solo corren contra una base exclusiva de pruebas…». No se escribe nada. |
| `pnpm run test:integration` o `test:db:prepare` sin `TEST_DATABASE_URL` de una base `…_test` | Se niegan y no hacen nada. |

La regla vive en `server/tests/support/testDatabase.ts` (con su prueba unitaria `testDatabaseGuard.test.ts`), se aplica en `jest.config.ts` (qué se ejecuta) y en `tests/support/testDatabaseGuard.ts` (defensa por archivo).

## 3. Datos propios y limpieza

Una suite de integración debe: (a) crear sus propias escuelas, cuentas y estudiantes con una marca de la corrida (`Date.now()`), (b) iniciar sesión **con cuentas propias**, no con las de demostración compartidas, (c) no leer como condición ni modificar nada que no haya creado, y (d) limpiar **solo** lo suyo en un `afterAll` (que corre aunque una prueba falle), identificando lo suyo por identificador, no por una hora ni por una cuenta compartida (otra suite puede correr a la vez).

Ayudas: `tests/helpers/ownUsers.ts` (`ownUser` crea una cuenta propia con la clave de demostración; `removeOwnUserTraces` borra sus sesiones, avisos, restablecimientos y bitácora).

### Estado por suite (medido en la base exclusiva, suite por suite)

«Residuo» = filas que la suite deja en la base al terminar, comparando el conteo de **todas** las tablas antes y después.

| Suite | Datos con los que trabaja | Residuo |
|---|---|---|
| `cycleTutors` | **Propios**: 2 escuelas, 2 coordinaciones, 3 docentes, 3 estudiantes. No usa ni toca asignaciones preexistentes; comprueba al final que siguen intactas. | **Ninguno** |
| `tutorAcceptance` | **Propios**: escuela, 2 coordinaciones y 2 docentes. | **Ninguno** |
| `attendanceNumbering`, `bootstrap`, `emailOutbox`, `schoolCycles` | Propios o solo lectura | **Ninguno** |
| `tutoringRequestFollowUp` | Estudiante y docente de demostración (Ana, Elena); solicitudes, sesiones y derivaciones propias, con tema propio de la corrida | Sesiones y avisos: **ninguno** (se corrigió una fuga: la sesión de quien pierde una carrera queda *cancelada*, no borrada, y no se encontraba). Quedan sesiones iniciadas y bitácora de las cuentas de demostración. |
| `accessMatrix`, `objectAccess`, `sensitiveAccessAudit`, `tutoringRequestCircuit`, `sessionNotices`, `signedDocuments`, `notificationLifecycle`, `evaluationScope`, `periodClosure` | Cuentas y registros de demostración (Ana, Elena, Rosa, la DBU…) como sujeto de las pruebas; crean objetos propios y los borran por identificador | Solo **sesiones iniciadas (`refresh_tokens`) y bitácora (`audit_logs`)** de las cuentas de demostración |
| `accountInvitation`, `admonitions`, `campusesAndTutorSchool`, `emailValidation`, `passwordReset`, `periodEnrollment`, `securityParameters`, `tutorImport` | Crean cuentas y, en seis de ellas, las **desactivan** en vez de borrarlas; tres modifican una fila compartida y la restauran (`campusId` de una escuela, `requestEmail`, parámetros del sistema) | `users` +1 (inactiva) en seis; restablecimientos de clave; sesiones y bitácora |

**Pendiente (no resuelto en este cambio):** las suites de las dos últimas filas siguen usando cuentas de demostración compartidas y dejan sesiones y bitácora; algunas modifican temporalmente una fila compartida (con restauración en `afterAll`). La base exclusiva evita que eso afecte al desarrollo, pero convertirlas a cuentas y datos propios (como `cycleTutors` y `tutorAcceptance`) es trabajo siguiente. Mientras tanto, la base de pruebas se descarta o se vuelve a preparar cuando se quiera empezar de cero.

## 4. Un caso de la regla de «máximo de dos ciclos»

`cycleTutors` comprueba, además de «un docente no atiende dos ciclos sin excepción», que **un tercer ciclo se rechaza aun con la excepción y su motivo** (400 «no puede atender más de dos ciclos»). El valor «dos» es una política operativa del sistema; el Protocolo revisado no lo menciona (ver `DECISIONES_DBU_COBERTURA_Y_PLAN_2026-10-18.md`, tema 3).
