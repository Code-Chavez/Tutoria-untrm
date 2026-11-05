# Correcciones de preparación y aislamiento de pruebas (TT-100)

## Cambios concretos

1. **UserManagementPage y ReportFilters:** esperar primero un dato visible que acredita que la respuesta ya se pintó, y después comprobar el botón/opción mediante su rol accesible. Se conservan los roles, nombres, acciones y aserciones originales. No se calientan estilos ni se amplían las esperas.
2. **CycleTutorsPage:** `clearAllMocks` no vacía las colas `Once`. Un caso abortado podía dejar una respuesta sin consumir y hacer que el siguiente caso recibiera un éxito cuando esperaba el rechazo que abre el diálogo. `resetAllMocks` elimina esa contaminación; los valores por defecto necesarios se vuelven a configurar en el mismo beforeEach.
3. **prepare-test-db.js:** comprueba la conexión con Prisma Client antes de migrar. En Windows el motor de migraciones devolvía solo «Schema engine error», mientras Prisma Client sí identificaba P1001. Se informa un código estructurado, sin publicar el error libre ni credenciales. Un fallo impide ejecutar migraciones y seed; las expectativas existentes de seedCommands no se relajan.

No cambian reglas de negocio, endpoints, permisos, dependencias ni esquema. Se conserva el tipeo completo de los escenarios: no se sustituyó por pegado. Se preparó esa alternativa durante el trabajo, la revisión automática la rechazó por cambiar la interacción ejercitada y se retiró por completo.

## Evidencia antes/después

- Diagnóstico temporal de UserManagementPage: coste síncrono controlado de 1100 ms en el primer cálculo de estilos; la espera anterior falla y la nueva pasa, con las mismas comprobaciones funcionales. Esto reproduce un mecanismo de bloqueo del render; no atribuye retroactivamente cada fallo histórico a una sola causa.
- Diagnóstico equivalente de ReportFilters: anterior falla; corregido pasa conservando la aserción del rol de la opción.
- Diagnóstico temporal de aislamiento de ciclos: una respuesta sobrante insertada al terminar el caso anterior hace fallar el siguiente con clearAllMocks; los dos casos pasan con resetAllMocks. Las copias de diagnóstico se retiraron de src antes de ejecutar la suite completa. Sus casos no seleccionados no se presentan como omisiones de la suite funcional.
- seedCommands: 2 aprobadas/1 fallida antes; 3/3 después, sin modificar sus aserciones. La preparación real de sit_db_test también pasó después de que PostgreSQL alcanzara estado healthy. El primer intento durante el arranque falló correctamente con P1001 y no migró ni sembró; no se oculta ese resultado.
- Servidor completo sobre sit_db_test: **157 suites y 1416 pruebas aprobadas, 0 fallidas y 0 omitidas**. Incluye 34 suites y 235 pruebas de integración. No se usa la base de desarrollo.
- Cliente completo local: **88 archivos y 588 pruebas aprobadas, 0 fallidas y 0 omitidas**, con `--maxWorkers=2`, autorizado expresamente por el usuario para ajustar la ejecución a los recursos del equipo. No se cambió vitest.config.ts ni la configuración de CI.

## Resultados que siguen conservados

Las pasadas anteriores con trabajadores por defecto en Windows y en Linux local también se guardaron completas. Mostraron recorridos que agotaron 5 s y, en un caso, la contaminación de mocks descrita arriba. El contenedor Linux usó el lockfile actualizado y mantuvo las aserciones y el tipeo; no se presenta como una pasada aprobada.

La autorización de dos trabajadores controla la carga; **no demuestra que todas las intermitencias desaparecieran**, ni que el fallo perdido de IMP-3 tuviera esta misma causa. IMP-3 permanece abierto como seguimiento y no se inventa su mensaje histórico.

## Reproducción

Desde client: `node node_modules/vitest/vitest.mjs run --maxWorkers=2 --reporter=default --reporter=json --outputFile.json=../tmp/merge-ready-2026-10-29/client-two-workers.json`.

Desde server, con TEST_DATABASE_URL dirigida únicamente a sit_db_test y REQUIRE_DB_TESTS=1: `node node_modules/jest/bin/jest.js --ci --runInBand --json --outputFile=../tmp/merge-ready-2026-10-29/server-full-after.json`.

Los registros completos, diagnósticos y JSON originales permanecen locales en tmp/merge-ready-2026-10-29. No se publican salidas del seed, credenciales ni volcados con datos de cuentas. El archivo test-readiness-evidence.json resume las cifras y los hashes de los originales.

## Revisión asistida y límites de aceptación

La revisión comprueba que no se cambian timeouts, trabajadores de CI, aserciones funcionales, secuencias de tipeo, reglas institucionales ni datos de desarrollo. La preconexión solo se ejecuta después de comprobar el sufijo de la base de pruebas; no imprime la URL y se desconecta incluso al fallar.

La asociación con TT-100 se apoya en la tarea existente de pruebas integrales y en docs/MATRIZ_TRAZABILIDAD_PRUEBAS.md. No se inventan puntos, Sprint u horas nuevas. La revisión está asistida por Codex; no suplanta el visto bueno del PO, la validación del practicante ni una tarjeta real del tablero.

Las pruebas de navegador del diálogo se documentan por separado en confirmdialog-navegadores.md: no equivalen a verificar toda la aplicación o a un lector de pantalla. No se fusiona ni despliega en esta entrega.
