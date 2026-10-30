# Revisión de DoD-SIT-001: PR #193–#196

Fecha de la revisión inicial: 29 de octubre de 2026. Los estados y fallos iniciales se conservan como históricos. El cierre técnico y las aclaraciones aprobadas el 30/10/2026 están en el [registro de entrega](../seguimiento/REGISTRO_ENTREGA_TECNICA_2026-10-30.md). No se autorizó fusión ni despliegue.

## Base revisada

Revisión técnica asistida por Codex, no aprobación del PO ni certificación legal. Se leyeron las descripciones y diffs actuales de GitHub. Base local integrada: `cfe2953e73ee8b884521fe62c2a80f82ddfe6373`; rama de investigación `codex/investigate-imp3`. No se afirma haber ejecutado cada suite en cada rama de PR por separado.

| PR | Commit consultado | Alcance |
|---|---|---|
| #193 | `03cdfc35a6dab3401e7631a10bb4caf0f3191a60` | ConfirmDialog, foco e integración de sus promesas |
| #194 | `7ad3fe09adb73082d838c09230879e97bd05a73a` | Mensajes públicos y registros de pedidos de listas |
| #195 | `d2a08caa89fd3b657944597c5bcf45a4ce2ae5b3` | Clasificación SMTP observando DATA y redacción de errores |
| #196 | `eed169fd03ff2973f16e03a56387449695560068` | Registro documental de IMP-3, sin corrección de producto |

En la consulta inicial los cuatro PR estaban abiertos y su último resultado por nombre de check era 12 SUCCESS y 2 SKIPPED. Repeticiones de un mismo check no se suman. Esta evidencia es del commit consultado y no se traslada automáticamente a futuros commits.

## Matriz de cumplimiento al corte inicial (histórica)

| Criterio | #193 | #194 | #195 | #196 |
|---|---|---|---|---|
| C-01, aceptación y PO | Pendiente de recorridos completos y aceptación | Pendiente de aceptación del texto y criterios | Pendiente de aceptación | Aceptar registro documental no cierra IMP-3 |
| C-02, tipos, Clean Code, arquitectura | Tipos estrictos; revisión abajo | Tipos estrictos; revisión abajo | Tipos estrictos; revisión abajo | Sin código nuevo; falta resolución formal de aplicabilidad |
| C-03, pruebas y cobertura | Cobertura >70 %; suite completa local no aprobada | Igual | Cobertura >70 %; suite completa con un fallo ajeno | No hay lógica nueva que medir; no marcar sin decisión de aplicabilidad |
| C-04, seguridad y datos | Revisión acotada abajo; no certificación de cumplimiento general | Igual | Igual | Revisar registros antes de publicar |
| C-05, revisión | Esta revisión asistida no suplanta autorrevisión del practicante ni visto bueno del PO | Igual | Igual | Igual |
| C-06, documentos | Borrador del manual preparado en esta entrega; no está todavía en la rama original | Igual | Manual técnico existente; manual de usuario complementado en esta entrega | Documenta un pendiente, sin endpoints ni UX nuevos |
| C-07, CI e integración | CI del commit consultado aprobada; regresiones locales no descartadas | Igual | CI aprobada; no confundir con prueba de ausencia absoluta de defectos | CI aprobada; no prueba que IMP-3 esté resuelto |
| C-08, interfaz | Cinco pantallas adicionales revisadas para apertura/cancelación; faltan otros navegadores, lector y dispositivos | Mensajes vistos antes en un navegador; no cuatro | No añade pantalla; efectos en mensajes requieren alcance explicado | Documentación; aplicabilidad pendiente de decisión |
| C-09, gestión | Rama `fix/…`; no cumple literalmente `feature/HU-XX…`; no reescribir historia | Igual | Igual | Rama `docs/…`; no cumple literalmente el ejemplo exigido |

La plantilla exige todas las casillas antes de solicitar revisión. No se cambia esa regla ni se concede una excepción de forma unilateral. Si un criterio no aplica, se documenta y queda sin marcar hasta que el responsable apruebe cómo tratarlo. Ejecutar pruebas hoy no acredita haberlas ejecutado antes de abrir el PR.

## Revisión técnica del alcance

- **#193:** reutiliza `useDialogFocus`, mantiene el bloqueo lógico mediante la promesa de `onConfirm` y evita ejecutar acciones al abrir el diálogo. Los dos consumidores que descartaban la promesa ahora la devuelven. El portal y `useInertBackground` separan el fondo; el hook retira solo los atributos que añadió. Los identificadores accesibles son generados por React. La revisión no demuestra soporte de diálogos anidados: los listeners globales y la gestión del fondo requieren comprobación específica si se introduce ese uso. `loading` controla la presentación; el ref de confirmación controla el bloqueo. No se cambió ese contrato.
- **#194:** el controlador transforma el error almacenado a una explicación conocida o `null` antes de responder. El cliente distingue FALLIDO e INCIERTO y no recomienda reenvío inmediato ante incertidumbre. El log conserva identificadores y códigos, sin mensaje libre del proveedor. No se introducen consultas SQL ni HTML dinámico en estos cambios; el texto se representa mediante React. Las comprobaciones de acceso existentes se conservan antes de operar sobre escuelas y pedidos. Esto no sustituye una auditoría de toda la autenticación, CSRF o almacenamiento de datos de la aplicación.
- **#195:** cada envío crea su propio transporte y progreso de DATA; no comparten estado entre destinatarios. La incertidumbre se conserva tras DATA, incluso antes de 354, de forma conservadora. El logger no escribe órdenes, credenciales ni cuerpo. Las direcciones de mensajes de error se sustituyen por `[correo]`. Esa expresión no garantiza anonimizar nombres o datos personales que un proveedor incluya en texto libre: no se debe publicar ese texto como dato anónimo. La revisión de llamadas de producción debe conservar el argumento `progress`; el clasificador sin progreso no acredita la fase real de un error CONN.
- **#196:** registra evidencia perdida como perdida y no afirma resolver IMP-3. Los nuevos resultados locales se conservan por separado y no alteran los históricos.

No se detectó en los diffs revisados una nueva vía de SQL injection o inserción de HTML sin escapar. Se mantiene pendiente una revisión de seguridad completa y la evaluación institucional del tratamiento de datos. No se declara cumplimiento general de OWASP ni de la Ley 29733 por pasar estas pruebas.

## Trazabilidad y decisiones humanas

Los cuatro PR usan `RSK-XX` como marcador sin identificador aprobado. Los LEV-* son provisionales según el README del levantamiento. TT-100 es una tarea existente de pruebas y TT-103 de correcciones, pero no se asignan retrospectivamente a estos cambios sin validar su correspondencia con el backlog. No se inventan Sprint, puntos ni horas.

Para cerrar el DoD se necesita: visto bueno del PO sobre el alcance y mensajes; validación de la relación con el backlog; resolución explícita de los criterios históricos y no aplicables; autorrevisión del practicante; y gestión real del tablero una vez terminado. No se mueve la tarjeta a TERMINADO con trabajo pendiente.

Los cambios de manual preparados aquí deben integrarse antes de acreditar ese criterio en los PR de código, o indicarse como dependencia de entrega. No se marcan como ya incluidos en #193 o #194.

## Resultados ejecutados en esta revisión

Resumen publicable: [dod-evidencia.json](dod-evidencia.json). Integridad de los JSON originales: [dod-registros-hashes.json](dod-registros-hashes.json). Los registros completos quedan locales en `tmp/dod-2026-10-29/`: no se publican salidas del seed con credenciales ni volcados de pantalla con datos de cuentas. No se sustituyen ni filtran los originales locales.

- **Cliente completo con cobertura:** 88 archivos; 587 aprobadas y 1 fallida. `UserManagementPage`, «ante el 409 muestra el mensaje del servidor y la cuenta sigue activa»: no encontró el botón Desactivar mientras el DOM aún mostraba la carga (1818,50 ms). Es evidencia de un fallo local, no prueba de causa ni de regresión atribuible a estos PR. IMP-3 de DataRequestPage no se reprodujo en esa corrida. Al fallar, esa ejecución no generó informe de cobertura.
- **Medición específica del cliente:** 45/45 en 3 archivos. No reemplaza la corrida completa fallida. Sin aumentar timeouts ni modificar aserciones o trabajadores. Se ejecutó mientras terminaba la suite del servidor; sus duraciones no son una medición de rendimiento con carga aislada.
- **Servidor completo:** 157 suites; 1415 aprobadas y 1 fallida. Las 34 suites de integración, 235 pruebas, pasaron sobre `sit_db_test`; el proceso terminó con código 1 por `seedCommands`. Su caso de preparación con puerto inalcanzable esperaba P1001 o «Can't reach database server», pero Prisma devolvió «Schema engine error». El comando sí falló y no anunció que la base quedara lista; no se relajó la aserción ni se declaró resuelta la diferencia de diagnóstico.
- **Compilación y build:** tipos estrictos, build y lint de ambos proyectos ejecutados. Lint sin errores; servidor con tres advertencias preexistentes sobre `any` en PrismaNotificationRepository y PrismaStudentReferralRepository; cliente con tres advertencias. Los archivos de cambios no se alteraron para ocultarlas.
- **Dependencias:** auditoría del cliente aprobada. En servidor, `corepack pnpm@9.15.9 audit --prod` (comando de CI) terminó en 0: una vulnerabilidad moderada ignorada por la configuración existente. La variante JSON devolvió 1 y se conserva; no se presenta como ausencia de avisos. El primer intento con el pnpm global avisó que ignoraba la configuración; tampoco se usa como equivalente de CI. No se instalaron dependencias del proyecto ni se cambió el lockfile.

### Cobertura de los archivos modificados

| Archivo | Líneas | Ramas | Funciones |
|---|---:|---:|---:|
| DataRequestPage | 93,67 % | 83,33 % | 88,46 % |
| ConfirmDialog | 97,44 % | 90,00 % | 92,86 % |
| useDialog | 95,74 % | 80,00 % | 100 % |
| useInertBackground | 100 % | 100 % | 100 % |
| DataRequestUseCases | 99,29 % | 86,05 % | 100 % |
| DataRequestController | 92,86 % | 90,24 % | 100 % |
| SmtpMailer | 100 % | 83,33 % | 100 % |
| smtpOutcome | 100 % | 83,33 % | 100 % |

Los cuatro archivos del cliente se midieron con sus pruebas específicas y los del servidor con la corrida completa. Todos superan el 70 % en las métricas indicadas. Esto habilita acreditar ese criterio con alcance explícito en #193–#195, pero no convierte la suite local completa en aprobada. #196 no modifica lógica.

### Recorrido manual adicional

Cliente local en 5174 y API en 3101, sin SMTP saliente y con base `sit_db_test`; contenedores de desarrollo apagados. Navegador integrado de Codex (Chromium), sin afirmar versión o compatibilidad con Chrome, Firefox, Edge y Safari.

| Pantalla | Verificación nueva |
|---|---|
| BrandingPage | Apertura con Enter, foco en Cancelar, Tab circular, Shift+Tab circular, Escape y retorno al botón. También 375×812: diálogo dentro del viewport, ancho de documento 375 px, sin desbordamiento horizontal en ese caso. |
| CatalogsPage | Enter sobre eliminar motivo, Cancelar inicial, Tab circular, Escape, vuelta al botón. No se confirmó ninguna eliminación. |
| StudentsPage | Menú de acciones por teclado, Quitar riesgo, foco inicial y Tab, Escape, vuelta al menú de origen. El riesgo del estudiante no cambió. |
| PeriodClosurePage | Estado cerrado preparado de forma sintética en la base de pruebas; Enter, Cancelar inicial, Shift+Tab y Escape, regreso a Reabrir periodo. No se ejecutó la reapertura; se restauró el estado previo mediante el fixture. |
| WorkPlanPage | Facultad, escuela y plan sintéticos; metadatos de resolución ficticios, sin documento, firma ni validez institucional. Enter en Guardar como nueva revisión, foco inicial, Tab circular, Escape y regreso al botón. No se guardó una revisión. Fixtures propios eliminados al terminar. |

Una activación mediante la acción AX de clic no enfocó el botón de origen en la primera comprobación de identidad; por ello la comprobación informada se repitió con Enter dirigido al botón y se observó el foco real. No se presenta ese primer intento como prueba aprobada de devolución al botón.

Se completó el recorrido básico de apertura/cancelación en las cinco pantallas antes pendientes; no se repitieron aquí las operaciones de confirmación/carga/error en las ocho pantallas, ni se comparó visualmente contra una versión anterior. Siguen pendientes lector de pantalla, diálogos anidados, dispositivo físico y navegadores adicionales. No se marca C-08 completo.

## Pendientes detectados en la revisión inicial (ver resolución en el registro del 30/10)

1. Investigar por separado el fallo de UserManagementPage y el diagnóstico de seedCommands; no hay suite local completa aprobada en esta revisión.
2. IMP-3 permanece abierto; el timeout previo de WorkPlanPage también conserva su evidencia independiente.
3. Integrar el borrador del manual y la evidencia sin mezclar código de otros PR.
4. PO, autorrevisión del practicante, trazabilidad aprobada, resolución de la convención de ramas y tablero.
5. Completar o resolver formalmente la aplicabilidad de los criterios de C-08 y de documentación sin lógica nueva. No se concede excepción al DoD desde esta revisión.
