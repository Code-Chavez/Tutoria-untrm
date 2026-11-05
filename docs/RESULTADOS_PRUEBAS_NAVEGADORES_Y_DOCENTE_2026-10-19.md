# Resultados: navegadores, accesibilidad de gestión y estados del docente (19/10/2026)

Commit probado: **`d442c61224e4f8e00814ab275248130c82c00d64`** (rama `test/cross-browser-and-teacher-states`). La única diferencia posterior es el diagnóstico de red que se añadió a la prueba E2E-19 (no cambia la aplicación). Salidas completas guardadas en `docs/resultados-2026-10-19/` (carpeta `final/` = matriz completa; el resto, repeticiones aisladas y corridas unitarias).

Entorno: Windows 11 Pro 10.0.26300, Node 22.19.0, Playwright 1.56.1, pila de desarrollo en Docker (`sit-server`, `sit-client`, `sit-postgres`, `sit-mailpit`), 15,4 GB de RAM (1,2 GB libres al terminar las corridas). Los datos son ficticios (cuentas sembradas y cuentas «Prueba E2E …»).

## 1. Navegadores realmente probados

| Navegador | Versión | Motor | ¿Probado? |
|---|---|---|---|
| Google Chrome (instalado) | 155.0.8059.80 | Chromium | **Sí** |
| Microsoft Edge (instalado) | 155.0.4283.62 | Chromium | **Sí** |
| WebKit de Playwright | 26.0 | WebKit | **Sí** — **no equivale a Safari real** (Safari incluye su propio ajuste de Tab, medios y extensiones) |
| Firefox de Playwright | build 1495 | Gecko | **No: no abre en este equipo** (ver 4) |
| Teléfono físico (iOS/Android) | — | — | **No** (solo emulación 375×812 con pantalla táctil en escritorio) |
| Lector de pantalla (NVDA/JAWS/VoiceOver) | — | — | **No** (pendiente) |

Chrome y Edge comparten el motor Chromium: cuentan como **un motor**, no como dos.

## 2. Matriz completa (mismo commit, mismas 15 especificaciones, 104 pruebas por navegador)

Especificaciones: E2E-01 ingreso y menú por rol, 02 solicitud, 03 sesiones y asistencia, 04 derivación, 05 informes y exportaciones, 06 plan semestral, 07 evaluación, 09 carga masiva y asignación, 13 carga de docentes, 14 solicitud → sesión/derivación, 16 borrador, 17 pendientes y cita cancelada/reemplazada (vista del estudiante), 18 accesibilidad (ingreso, solicitud, sesiones, evaluación, diálogos, móvil emulado), 19 accesibilidad de gestión (31 pantallas + diálogo), 20 estados del docente.

| Navegador | Aprobadas | Fallidas | Omitidas | Duración |
|---|---|---|---|---|
| Chrome 155.0.8059.80 | 102 | 1 | 1 | 92,7 min |
| Edge 155.0.4283.62 | 102 | 2 | 0 | 49,2 min |
| WebKit 26.0 | 102 | 1 | 1 | 73,5 min |
| Firefox | — | — | — | no ejecutado |

### Las fallas, una por una (sin atribuirlas a «la carga» sin evidencia)

| Navegador | Prueba | Qué se observó | Repetición aislada | Conclusión |
|---|---|---|---|---|
| Edge | E2E-05 «Vicerrectorado ve el consolidado…» | `browser.newContext: Target page, context or browser has been closed` a los 6 ms | **Falla 3 de 3** cuando corre justo después de «la tutora guarda su informe semestral y exporta el PDF»; **pasa sola** | **El navegador se cierra**: con `DEBUG=pw:browser` el proceso de Edge termina con `exitCode=3221225477` (0xC0000005, violación de acceso) tras la descarga del PDF. Fallo del navegador en este equipo, no de la aplicación; Chrome y WebKit no lo presentan. **No resuelto.** |
| Edge | E2E-19 coordinación «Resultados de evaluación» | el esqueleto de carga siguió visible 60 s | **3 de 3 pasan** | **Sin explicar.** No se reprodujo. |
| Chrome | E2E-19 docente «Informe semestral» | idem (prueba terminada por tiempo, 3,5 min) | **3 de 3 pasan** | **Sin explicar.** No se reprodujo. |
| WebKit | E2E-09 «cada tutor ve solo los suyos» | la prueba duró **26,5 min** y terminó por tiempo; contó 0 filas donde esperaba 2 | **Todo el archivo E2E-09 pasa (4/4, 3,6 min)** | **Sin explicar.** No se reprodujo. |
| Chrome / WebKit (1 omitida cada una) | E2E-19 diálogo de caso derivado | `test.skip` porque en ese momento no había casos derivados que abrir | En Edge sí había y pasó | Depende de los datos del entorno, no del navegador. |

Sobre las tres «sin explicar»: no hay error de aplicación registrado ni respuestas 4xx/5xx capturadas (no se tenía diagnóstico entonces). Lo único medible es que al terminar el equipo tenía **1,2 GB libres de 15,4 GB** y que la corrida de WebKit tuvo una prueba de 26 minutos; es una **hipótesis de presión de memoria, no demostrada**. Para la próxima vez, la prueba E2E-19 ya adjunta las peticiones fallidas o pendientes cuando una pantalla no termina de cargar.

## 3. Otras corridas del mismo ciclo

| Qué | Commit | Resultado |
|---|---|---|
| Servidor, pruebas unitarias (Jest) | 5772381 | **107 suites / 1007 pruebas aprobadas, 0 fallidas, 0 omitidas** |
| Cliente, `tsc` y ESLint | 5772381 | limpio; 0 errores (3 advertencias antiguas) |
| Cliente, Vitest completo | 5772381 | 520 aprobadas, **1 fallida**, 0 omitidas: `DashboardPage › los indicadores con detalle enlazan a su vista…` («Unable to find role=link … Mis estudiantes: 12», **1179 ms**, justo sobre el límite de 1000 ms de la búsqueda asíncrona; pasa sola y en dos corridas completas anteriores). Se le dio margen de 4 s **en ese archivo** (`d442c61`). |
| Cliente, Vitest completo | d442c61 | 83 archivos / 490 pruebas aprobadas, 0 fallidas, 0 omitidas, **más 2 archivos que no arrancaron**: `EvaluationPage.test` y `TutoringRequestsInboxPage.test` («Failed to start forks worker … Timeout waiting for worker to respond», fallo del arranque del trabajador, no de las pruebas). Esos dos archivos, vueltos a correr solos: **2 archivos / 31 pruebas aprobadas**. Total: **85 archivos / 521 pruebas aprobadas, 0 fallidas, 0 omitidas** (en dos ejecuciones). |

Esta es la prueba que falló «sin identificar» en la primera corrida: la salida guardada ahora la identifica. La causa más probable es de tiempo (1179 ms ≈ 1000 ms), pero se trata de una **inferencia** (no hay traza del renderizado), y por eso se dejó escrito en el comentario de la prueba.

## 4. Firefox: bloqueado

`firefox.exe` (build 1495 de Playwright, instalado y con la verificación de dependencias de Playwright en verde) **no inicia**: Windows responde «No se pudo iniciar la aplicación; la configuración en paralelo no es correcta» (error SxS), típico de un runtime de Visual C++ ausente o desactualizado. Resolverlo implica **instalar un componente del sistema**, algo que no estaba autorizado (la autorización cubría descargar Firefox y WebKit de Playwright). **Decisión pendiente:** ¿se instala el runtime de Visual C++ para correr Firefox?

## 5. Accesibilidad de las pantallas de gestión (E2E-19)

31 pantallas más un diálogo, con axe (WCAG 2.0/2.1 A y AA y buenas prácticas) y reglas de estructura bloqueantes. La primera pasada encontró **17 pantallas con infracciones**; se corrigió en el código:

| Hallazgo | Corrección |
|---|---|
| Saltos de nivel de títulos (h1 → h3, h4) en casi todas las pantallas | Títulos de tarjetas, estados vacíos y siguientes pasos pasan a h2; subsecciones a h3 |
| **Críticas:** filtros sin etiqueta (informe de horarios, sugerencias): campos y selects sin nombre | `label htmlFor` + `id` |
| Contraste de texto secundario, estados verdes/ámbar, días fuera de mes del calendario, rótulos | `--g500` más oscuro, `--ok` y `--alerta-texto`, calendario |
| Región con desplazamiento sin acceso por teclado (informe consolidado) | `tabIndex=0`, `role="region"` con nombre |
| Enlaces dentro de párrafos solo distinguibles por color | subrayado |
| Encabezados de tabla vacíos (columna «Acciones») | texto oculto para lectores de pantalla |

Resultado: **31 de 31 pantallas sin infracciones serias, críticas ni de estructura** en Chrome y en Edge y WebKit (salvo las fallas de la tabla anterior, que no son de axe). **Límite:** axe no sustituye al lector de pantalla; las hallazgos *leves* que no son de estructura solo se anotan y no se han clasificado uno por uno.

Observación de WebKit/Safari: **Tab no pasa por los enlaces por defecto** (hay que usar Opción+Tab o activar «Tab resalta cada elemento»). Es comportamiento del navegador en todos los sitios; el enlace «Saltar al contenido» funciona cuando recibe el foco y la prueba lo verifica de ese modo en WebKit.

## 6. Estados del docente en la aplicación real (E2E-20)

Recorridos contra el stack de desarrollo con una estudiante ficticia del ciclo 10 de Ingeniería de Sistemas. Aprobados 5/5 en Chrome (corrida aislada) y dentro de la matriz en los tres navegadores.

| Estado | Cómo se provoca | Lo que ocurre hoy | Bloqueo / decisión |
|---|---|---|---|
| **Rechazo** | La coordinación designa a Elena; ella abre el enlace del correo y elige «No puedo asumirlo» con un motivo | El ciclo aparece en **Pendientes** («Docente rechazó», con el motivo). **La estudiante conserva a la docente que rechazó y su solicitud sigue yendo a ella** (comportamiento documentado en una prueba marcada como tal) | **Decisión de la DBU** (temas 1 y 2 del documento de decisiones): qué se hace con las solicitudes y cuándo se aplica la designación. No se resolvió por cuenta propia. |
| **Sin respuesta** | Designación; se vence el enlace en la base de desarrollo (UPDATE sobre los datos de prueba de ese ciclo) | **Pendientes** muestra «Sin respuesta» («el enlace venció sin respuesta»); el enlace del docente abre «Enlace no válido» | Plazo para considerar «sin respuesta» y quién lo tramita: decisión de la DBU. (No hay estado propio guardado; se deduce de la fecha de vencimiento.) |
| **Correo no enviado** | Se detiene `sit-mailpit`, se designa | La pantalla de asignación avisa «No se pudo enviar el correo al docente: use «Reenviar»»; **Pendientes** muestra «Correo no enviado» (no «sin respuesta»); al reenviar con el correo activo, el pendiente desaparece | Reintentos automáticos o canal alternativo: decisión de la DBU. Detalle técnico: el estado guardado sigue «pendiente»; el fallo se deduce de la bitácora. |

## 7. Pendientes que se mantienen

1. **Lector de pantalla real** (NVDA con Firefox/Chrome, VoiceOver) y **teléfono físico**.
2. Firefox (bloqueado: runtime de Visual C++) y Safari real.
3. Las tres fallas sin explicar (Edge «Resultados de evaluación», Chrome «Informe semestral», WebKit E2E-09): se vigilarán con el diagnóstico de red añadido.
4. El cierre de Edge al exportar PDF (crash del navegador).
5. Las decisiones institucionales de los temas 1 a 5 (`DECISIONES_DBU_COBERTURA_Y_PLAN_2026-10-18.md`).
