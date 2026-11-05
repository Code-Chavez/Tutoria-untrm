# Estado de pendientes de la auditoría de uso real (19/10/2026)

Corte: rama `chore/accessibility-review` (sobre `develop` con #160 integrado). Este documento **no declara cerrada la auditoría**: separa lo corregido **y verificado**, lo corregido con verificación **parcial**, el **pendiente técnico** y lo que es **decisión institucional**. Las cifras salen de corridas con la salida completa guardada.

Leyenda de evidencia: **U** = pruebas unitarias/componente; **I** = integración con base real; **E** = E2E contra el stack de desarrollo; **A** = axe + teclado; **M** = comprobación manual.

## 1. Corregido y verificado

| Ítem | Qué se corrigió | Evidencia |
|---|---|---|
| U01 | Solicitud → sesión o derivación, sin duplicar; cita cancelada se reemplaza (sesión o derivación) | U, I (incluye carrera de dos reemplazos), E-14, E-17 · PR #148–#160 |
| U02, U03, U06 | Quién recibe la solicitud (anunciado = registrado, incluso sin destinatario), avisos reales de sesión, carga accesible | U, I, E-02 · PR #155, #158 |
| U04, U05, U09 | Bandeja «Por atender» primero, tarjetas en pantallas angostas, contadores con filtro | U, E |
| U07 | Borradores solo en la pestaña, por persona, borrados al cerrar sesión | U, E-16 · PR #156 |
| U08 | Leyenda de la escala antes del primer ítem, «Ir a la primera que falta» | U, E-07 |
| U10 | Códigos internos → nombres claros (aspectos, acciones de la bitácora, pasos del caso) | U (con prueba de cobertura contra el servidor), E-04 |
| U12 | «Estudiantes», «Responsable», sin números de artículo en títulos (los formatos oficiales conservan su nombre) | U, E-01/13 · PR #157 |
| U13 | «Pedir listas» cambia título, plantilla, enlace y pasos según estudiantes/docentes | U, E-13 |
| Permisos por objeto | Matriz de acceso por solicitud → sesión → derivación | I · PR #154 |
| Pendientes institucionales | Pestaña de solo lectura (rechazos, sin respuesta, correo no enviado, cuenta desactivada, ciclo sin tutor, cita cancelada) | U (12), I (matriz HTTP), E-17 · PR #159 |
| Vista del estudiante de la cita | Distingue **cita programada**, **nueva cita** (reemplaza a una cancelada), **cita cancelada** y **«Reemplazada»** en la agenda, con el siguiente paso y sin notas reservadas | U (servidor y cliente), E-17 |
| Accesibilidad (alcance de E-18) | `<main>` único y «Saltar al contenido»; contraste de insignias ámbar y verde; `aria-controls` del menú (el id llevaba espacios); nombre accesible de la campana y de «Cerrar sesión» que contiene el texto visible; encabezados de tabla vacíos; orden de títulos; enlaces dentro de párrafos subrayados | A (axe: sin infracciones serias/críticas ni de estructura) + teclado: E-18 **13/13 en Chrome y 13/13 en Edge** (corrida final completa, con la prueba de «Saltar al contenido» y las reglas de estructura ya bloqueantes) |

## 2. Corregido, con verificación parcial

| Ítem | Qué falta comprobar |
|---|---|
| Accesibilidad | Axe y la prueba de teclado **no sustituyen** un lector de pantalla: **no se probó con NVDA, JAWS ni VoiceOver**. Lo anunciado (carga, error, diálogos) se comprobó por roles y nombres accesibles, no escuchándolo. |
| Navegadores | Probados de verdad: **Google Chrome y Microsoft Edge** (ambos de motor Chromium, es decir, **un solo motor**). **Firefox y Safari/WebKit no se probaron** (no están instalados y descargar navegadores requiere autorización). |
| Móvil | Se emuló **375×812 con pantalla táctil en Chrome y Edge de escritorio** (sin desplazamiento horizontal ni infracciones serias en ingreso, solicitar tutoría, mis sesiones y evaluación). **No se probó en un teléfono real** ni en iOS/Android. |
| Estados de docente | Rechazo, sin respuesta y correo no enviado están cubiertos por pruebas unitarias del caso de uso; **no se recorrieron en la aplicación real** (exige designar y responder como docente). |
| Páginas no revisadas con axe | Solo ingreso, solicitar tutoría, mis sesiones, evaluación, bandeja de solicitudes y diálogos Atender/Programar. El resto (informes, configuración, derivaciones, etc.) **no se escaneó**. |
| Hallazgos leves de axe | Tras las correcciones, las reglas de estructura quedaron bloqueantes; el resto de las leves (si las hay) se anotan en el informe de Playwright, no se han triado una por una. |

## 2 bis. Ronda del 19/10 (navegadores, gestión, docente) — detalle en `RESULTADOS_PRUEBAS_NAVEGADORES_Y_DOCENTE_2026-10-19.md`

- Navegadores probados de verdad: Chrome 155.0.8059.80, Edge 155.0.4283.62 (mismo motor), WebKit 26.0 de Playwright (no es Safari). **Firefox no abre en este equipo** (error SxS; probablemente falta el runtime de Visual C++, que no se instaló sin autorización).
- Matriz del commit `d442c61` (104 pruebas por navegador): Chrome 102 aprobadas / 1 fallida / 1 omitida; Edge 102 / 2 / 0; WebKit 102 / 1 / 1. Las 4 fallas: 3 no se reprodujeron aisladas (sin explicar) y 1 es un cierre del navegador Edge (0xC0000005) tras exportar un PDF.
- Axe en las pantallas de gestión: 17 de 31 con infracciones en la primera pasada; corregidas en el código; 31/31 limpias después.
- Estados del docente recorridos en la app real (rechazo, sin respuesta, correo no enviado); el rechazo deja a la estudiante con la docente que rechazó (decisión de la DBU pendiente).

## 3. Pendiente técnico (no depende de la DBU)

1. Ampliar axe y teclado a las demás pantallas (informes, derivaciones, plan semestral, configuración, auditoría).
2. Prueba con lector de pantalla real (NVDA con Firefox/Chrome) y al menos un teléfono real.
3. Firefox: no abre en este equipo (runtime de Visual C++ ausente o desactualizado); necesita instalarlo. WebKit de Playwright ya se prueba (no equivale a Safari real).
4. ~~Recorrer los tres estados de docente en la app real~~ — hecho (E2E-20); queda decidir con la DBU qué hacer con ellos.
4 bis. Investigar las 3 fallas sin explicar (pantallas que se quedan cargando 60 s; E2E-09 en WebKit) y el cierre de Edge al exportar PDF.
5. La suite completa de Vitest tuvo **una prueba fallida sin identificar** en una corrida anterior (la salida no se guardó) que no se reprodujo en dos corridas completas posteriores. **No se atribuye a carga sin evidencia**; desde ahora toda corrida completa guarda su salida en archivo para identificarla si reaparece.
6. Revisar si las capturas del manual (`docs/manual/img`) siguen mostrando los nombres anteriores («Tutorados», «Salir»); no se comprobó una por una.

## 4. Decisión institucional (DBU / facultad)

Detalle y casos de aceptación en `DECISIONES_DBU_COBERTURA_Y_PLAN_2026-10-18.md`.

| N.° | Decisión | Mientras tanto |
|---|---|---|
| 1 | Qué pasa con las solicitudes cuando un docente **rechaza** o **no responde** (hoy el estudiante conserva su tutor y la solicitud sigue yendo a ese docente) | La bandeja de Pendientes lo hace visible; no hay reasignación automática |
| 2 | Cuándo **se aplica** la designación a los estudiantes (al designar o al aceptar) | Hoy se aplica al designar |
| 3 | Disponibilidad, carga máxima, límite de ciclos por docente (el «dos» no figura en el Protocolo revisado), suplencias | Límite actual sin cambios |
| 4 | Forma del plan semestral en el sistema (borrador, presentado, con resolución) conservando art. 17.a y Anexo 8 | Sin cambios |
| 5 | Atención urgente y servicios sin profesional: texto del aviso, canal, quién monitorea | Sin canal urgente; el sistema no se presenta como tal |
| — | Excepciones al dominio de correo institucional; si el correo de contacto del estudiante debe ser institucional; si la DBU puede programar sesiones | Valores actuales |
| — | Redacción de «respuestas anónimas» en la evaluación (no prometer anonimato total) | Texto actual |
| — | U11 preparar vs. cerrar periodo | Sin cambios |

## 5. Estado de las ramas y los PR

- Integrados en `develop`: #148–#160.
- Esta revisión (accesibilidad, vista de la cita para el estudiante, `@axe-core/playwright`) va en un PR propio contra `develop`.
