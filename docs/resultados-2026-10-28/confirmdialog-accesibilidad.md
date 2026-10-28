# Accesibilidad del diálogo de confirmación compartido (`ConfirmDialog`) — hallazgo F1

**Qué es.** Corrección del hallazgo F1 de [verificacion-c5-proceso-de-fondo-y-pendientes.md](../resultados-2026-10-27/verificacion-c5-proceso-de-fondo-y-pendientes.md) y registro de su verificación con teclado. No sustituye a una auditoría de accesibilidad completa ni a la CI.

## Defecto

`ConfirmDialog` declaraba `role="alertdialog"` y `aria-modal="true"`, pero **no** gestionaba el foco: al abrirse el foco seguía en el botón de atrás, Tab recorría la página tapada, el fondo seguía interactuable, el nombre era un `aria-label` sin descripción y Escape cancelaba también con una operación en curso. Lo usan 8 pantallas, entre ellas las de C-3 (activar/desactivar usuario), C-4 (pedido equivalente) y C-5 (reenviar aviso).

## Evidencia anterior que parecía contradecirlo: ¿regresión, otro componente o comprobación insuficiente?

No se reescribe ningún resultado histórico; esto es lo que muestran los registros:

- **UI-06** ([AUDITORIA_UI_2026-10-08.md](../AUDITORIA_UI_2026-10-08.md)) encontró el problema en el **modal de alta** y pidió un «componente modal compartido». Se atendió en el PR #74 con el hook `useDialog`/`useDialogFocus` (`client/src/shared/hooks/useDialog.ts`), aplicado a **los modales con formulario** (alta de usuario, entrevistas, derivaciones, sesiones, etc.). Ese commit **no tocó** `ConfirmDialog.tsx`.
- El manual de usuario (§ teclado) y los resultados con axe describen «ventanas» como *Atender solicitud*, y el recorrido axe incluyó «un diálogo»: eran **esos modales**, no el de confirmación.
- Conclusión respaldada por el historial: **no es una regresión** (`ConfirmDialog` nunca usó el hook) y **no eran componentes mal descritos**; fue un **alcance incompleto** de UI-06 (se corrigió la familia de modales de formulario y no el diálogo de confirmación, que es otro componente) y una **comprobación que no lo cubría**: el criterio de aceptación de UI-06 se verificó sobre el alta, no sobre los diálogos de confirmación. Las frases «los diálogos atrapan el foco» son verdaderas para los modales de formulario y no para este.

## Cambio

- `ConfirmDialog` reutiliza el hook existente `useDialogFocus` (no se creó otro mecanismo) y se monta solo mientras está abierto.
- Foco inicial en «Cancelar» (la opción no destructiva; la acción destructiva **no** se ejecuta al abrir). Tab y Shift+Tab quedan dentro (hook existente).
- Fondo inerte: el diálogo va en un portal hijo de `<body>` y el nuevo `useInertBackground` marca el resto con `inert` (el foco, los clics y el árbol de accesibilidad quedan fuera) y lo retira al cerrar.
- Nombre y descripción accesibles: `aria-labelledby` (título) y `aria-describedby` (mensaje) en lugar de `aria-label`.
- Escape, clic en el fondo y «Cancelar» cancelan **solo cuando no hay operación en curso**; con `loading` no hacen nada, el diálogo se marca `aria-busy` y el foco permanece en el diálogo (el botón con foco se deshabilita).
- Al cerrar, el foco vuelve al botón que abrió el diálogo **si sigue conectado y habilitado**.
- Dos ajustes en el hook compartido, descubiertos al verificar en un navegador real (ver más abajo): (1) sin elementos enfocables, Tab devuelve el foco al diálogo en vez de perderlo; (2) se recuerda el último control enfocado para el caso en que el botón se deshabilitó mientras corría su petición (`loading`) y al abrirse el diálogo el foco activo ya era `<body>`.

## Pruebas

| Dónde | Qué cubre |
|---|---|
| `ConfirmDialog.test.tsx` (10) | foco inicial en «Cancelar» sin ejecutar la acción; nombre y descripción; Tab/Shift+Tab contenidos; fondo `inert` y restablecido; Escape y «Cancelar» devuelven el foco al botón de origen; confirmar solo por acción explícita; botón de origen retirado (sin error); carga: Escape, fondo y «Cancelar» sin efecto, `aria-busy`, foco no perdido; **orden** (el fondo deja de ser inerte antes de devolver el foco) |
| `useDialog.test.tsx` (+1) | botón que se deshabilitó con su petición: el foco vuelve a él |

Corridas locales de la suite del cliente sobre el código **anterior** a la corrección de la carrera descrita abajo, registradas tal cual (la causa de los fallos intermitentes sigue **no determinada**; véase [la investigación](../resultados-2026-10-27/cliente-fallos-intermitentes-investigacion.md)):

| Corrida | Resultado |
|---|---|
| Subconjunto de 12 carpetas, trabajadores por defecto, 1.ª | 4 fallos en 3 archivos; **no se conservaron los nombres** (causa no determinada) |
| El mismo subconjunto, 2.ª (con JSON) | 2 fallos de 5 s: `CycleTutorsPage` «si el docente ya tiene otro ciclo…» y `GroupSessionFormModal` «confirma con el enlace de videollamada…» (causa no determinada); ninguna usa `ConfirmDialog` |
| Suite completa, `--maxWorkers=2`, 1.ª | 86 archivos y 555 pruebas pasaron y **2 archivos no arrancaron** (`Failed to start forks worker`; causa no determinada, máquina muy cargada) |
| Suite completa, `--maxWorkers=2`, 2.ª | **88 archivos y 581 pruebas pasaron** |

`--maxWorkers=2` es solo una **opción de línea de comandos** de esa ejecución; no se cambió la configuración del proyecto (`vitest.config.ts`) ni se recomienda como solución. Una corrida completa aprobada se registra como tal, **sin** borrar las que fallaron. Con la corrección posterior (carrera de «Escape», ver abajo) se ejecutaron los **151 tests** de `shared`, `pedidos`, `pendientes`, `admin`, `catalogos`, `identidad`, `periodo`, `planificacion` y `tutorados/pages`: pasaron; no se repitió la suite completa (la CI del PR la ejecuta).

Las dos pruebas de orden y de botón deshabilitado **fallan** si se revierte la corrección correspondiente (comprobado quitándola temporalmente). Límite: jsdom no aplica `inert` al foco ni al árbol de accesibilidad y no suelta el foco de un botón que se deshabilita; por eso esas dos propiedades se comprobaron también en un navegador real (abajo) y la prueba simula el segundo comportamiento con `blur()` explícito.

## Verificación con teclado en un navegador real (C-3, C-4, C-5)

Entorno: servidor real (`ts-node`) en el puerto 3998 **contra la base exclusiva de pruebas** `sit_db_test`, cliente Vite en el 5175 con este código, navegador integrado del escritorio (viewport 1024×768, motor tipo Chromium). Cuenta del administrador de desarrollo del seed del proyecto. Sin tocar la base ni los contenedores de desarrollo. Para C-5 se usó un Mailpit desechable (11025) y se **detuvo** para provocar un fallo real de SMTP. Para la «carga» se retrasó 8 s (4 s en C-3) el envío de las peticiones no-GET **solo en esa pestaña** con un parche de `XMLHttpRequest`; el servidor y las respuestas son los reales. Se llegó a cada botón de origen con Tab real y las teclas fueron reales (Intro, Tab, Mayús+Tab, Escape); el foco **no** se movió por código (solo se leyó `document.activeElement`).

| Diálogo | Foco inicial | Tab ×3 / Mayús+Tab ×3–4 | Fondo `inert` | Escape → foco | Cargando | Resultado/error | Cancelar (Intro en «Cancelar») |
|---|---|---|---|---|---|---|---|
| C-3 «Desactivar usuario» | «Cancelar» | siempre dentro | `#root` inerte | vuelve al botón «Desactivar» de la fila | `aria-busy`, ambos botones deshabilitados, foco en el diálogo, Escape y Tab sin efecto | **409 real** (última cuenta de administración): el diálogo cierra, foco al botón de origen, mensaje en `role="alert"` | — |
| C-4 «Ya hay un pedido equivalente» | «Cancelar» | dentro | inerte | vuelve a «Enviar pedido» | igual | pedido registrado, correo no salió (SMTP no configurado): diálogo cierra, foco a «Enviar pedido», mensaje en `role="alert"` | foco a «Enviar pedido» |
| C-5 «Reenviar el aviso» | «Cancelar» | dentro | inerte | vuelve a «Reenviar aviso» | igual | «El servidor de correo no aceptó el aviso. Puede volver a intentarlo.» (SMTP detenido), foco a «Reenviar aviso» | — |

Defectos hallados **con este recorrido** y corregidos en el mismo cambio (las pruebas de jsdom no los habían visto):

1. Con `inert` aplicado, el foco no volvía al botón de origen porque React deshacía primero el retorno del foco y después retiraba `inert`. Se invirtió el orden y se añadió una prueba.
2. En C-4 el botón de envío se deshabilita mientras corre la petición, así que al abrir el diálogo el foco estaba en `<body>` y no había a dónde devolverlo. Se recuerda el último control enfocado.

Datos de la verificación: una asignación y un pedido ficticios (`*verif*`/`a11y-verif-assign-1`) y un correo de escuela ficticio en la base de pruebas; **se borraron al terminar** (consulta: asignaciones 7 como antes, pedidos 0, intentos 0; el correo de la escuela y la coordinación asignada de la escuela de prueba se restituyeron a NULL). Quedó el rastro de inicio de sesión del administrador de pruebas. No se subió ninguna captura ni dato personal.

## Límites y observaciones

- **Un solo navegador** (el integrado). No se probó en Firefox, Safari ni con lector de pantalla; WebKit/Safari no enfoca los botones al hacer clic con el ratón, así que allí el foco no puede volver a un botón activado con ratón (limitación conocida del hook, no del diálogo).
- `inert` exige navegadores recientes; en uno sin soporte el fondo no queda bloqueado (aún así Tab queda contenido por el hook y `aria-modal` indica el modo).
- Los modales de formulario que muestran un `ConfirmDialog` encima siguen escuchando Escape en `window` cada uno; hoy ningún flujo de C-3/C-4/C-5 los anida. No se verificó el anidamiento.
- **Anomalía de C-4 con retraso de 4 s: explicada, era un defecto real y está corregido.** Reproducida con tiempos medidos (petición retenida 4 000 ms; teclas reales): al confirmar «Pedir de nuevo», `loading` llega del padre **unos 130 ms después** (en esta máquina) de que la petición ya salió; Escape y un segundo Intro pulsados en ese intervalo cancelaban el diálogo o se perdían. Con la pausa mayor del recorrido anterior no ocurría, por eso «no se reprodujo». Consecuencia del defecto: el diálogo se cerraba con la petición aún en curso y el resultado llegaba después por el mensaje de la página (no se duplicó el envío). Corrección (primera versión, **reemplazada**): un bloqueo que se soltaba a los 300 ms. Se descartó porque podía volver a habilitar una operación todavía pendiente si el padre tardaba en actualizar `loading`. **Versión final, contrato explícito:** `onConfirm` devuelve la promesa de la operación; `ConfirmDialog` registra la confirmación al instante (un `ref`) y mantiene bloqueados Escape, fondo, «Cancelar» y un segundo «confirmar» hasta que esa promesa se resuelve o rechaza (o `onConfirm` lanza un error síncrono); `loading` solo pinta el estado. No hay ningún plazo. Los 8 usos ya pasaban funciones `async`, salvo los de `DataRequestPage` y `PendingPage` (`void …`), que ahora devuelven su promesa. Pruebas deterministas: `ConfirmDialog.test.tsx` (3: operación pendiente 10 s simulados con `loading` sin actualizar — Escape, «Cancelar», fondo y segunda confirmación siguen bloqueados; rechazo; error síncrono; las dos primeras fallan sin la corrección) y `DataRequestPage.test.tsx` (1, con la petición controlada por una promesa). Las mediciones de la tabla de abajo son de la primera versión; la versión final se verificó de nuevo en el navegador real (sección «Verificación de la versión final»).
  Medido después de la primera versión de la corrección, con la misma secuencia (petición retenida 4 000 ms):

  | t (ms) | Evento |
  |---|---|
  | 6 539 | Intro: confirmar; la petición sale |
  | 6 547 | Escape (8 ms después): sin efecto |
  | 6 564 | Segundo Intro: sin efecto (una sola petición `POST`) |
  | 6 671 | el diálogo pasa a `aria-busy`, ambos botones deshabilitados, foco dentro |
  | 10 704 | termina la petición (respuesta recibida) |
  | 10 806 | el diálogo se cierra, **102 ms después** de terminar la petición |

  Que el diálogo vuelva a habilitarse o se cierre después de que la petición termina es el comportamiento correcto y no un defecto.
- **Observación fuera de alcance (corrección separada y pequeña, no incluida aquí):** el mensaje de C-4 sin correo configurado muestra el nombre técnico del error (`MailNotConfiguredError`). Se propone una explicación comprensible con el siguiente paso, dejando el detalle técnico en el registro del servidor.
- **Limitaciones aceptadas por ahora** (no se amplían): diálogos anidados y lector de pantalla **no verificados**; un solo navegador.
- **Cinco pantallas con `ConfirmDialog` sin revisión manual con teclado:** `CatalogsPage`, `BrandingPage`, `PeriodClosurePage`, `WorkPlanPage` y `StudentsPage` (cubiertas solo por las pruebas del componente compartido y por sus pruebas de pantalla existentes).
- Se mantienen sin cambios los tiempos, el calentamiento de `getComputedStyle` y la configuración de trabajadores.

## Verificación de la versión final (commit `5b1df86`, contrato basado en promesas)

Entorno: servidor real (`ts-node`, puerto 3998) y cliente Vite (5175) con ese commit, **solo contra la base exclusiva de pruebas** `sit_db_test` (contenedor `sit-postgres-test`, puerto 5433; Docker Desktop estaba apagado y se inició a mano; solo se arrancó ese contenedor y se volvió a detener al terminar; los de desarrollo no se tocaron). La base de pruebas no tiene volumen, así que se recreó con `prepare-test-db` y se sembró. Navegador integrado, teclas y clics reales; las peticiones no-GET se retuvieron (6 s, 5 s y 12 s) **solo en esa pestaña** para poder actuar mientras estaban pendientes; el servidor y las respuestas son los reales.

| Recorrido | Observado |
|---|---|
| C-4, confirmar «Pedir de nuevo» con la petición retenida 6 s: Escape, clic en «Cancelar» (deshabilitado), clic en el fondo, doble clic en «Pedir de nuevo», Intro y Espacio | El diálogo siguió abierto y `aria-busy` hasta que terminó la petición; **solo salió una petición** (`POST` n.º 2; el n.º 1 fue el envío que abrió la advertencia). Terminó a los 22 925 ms y el diálogo se cerró 78 ms después, con el foco en «Enviar pedido» |
| C-3, desactivar la única cuenta de administración con la petición retenida 12 s: Escape, clic en «Cancelar», Intro | Igual: una sola petición `PATCH`; Escape, «Cancelar» e Intro sin efecto; al llegar el 409 real el diálogo se cerró (+54 ms), el foco quedó en el botón «Desactivar» de origen y el mensaje salió en `role="alert"` |
| Tras ese error, volver a operar | Intro desde el botón enfocado reabre el diálogo; Tab + Intro lanzan una segunda petición real (`PATCH` n.º 2) y el diálogo vuelve a quedar ocupado; al terminar (409) se cierra de nuevo con el foco en el origen |

Observación (corregida después, ver «Foco al pulsar el fondo…»): un clic con el ratón sobre el fondo o sobre un botón deshabilitado mientras hay una operación en curso sacaba el foco del diálogo (quedaba en `<body>`) hasta la siguiente pulsación de Tab.

Límites: un solo navegador; C-5 no se repitió con la versión final (solo el cambio del envoltorio `async` en `PendingPage`, cubierto por sus pruebas de pantalla); diálogos anidados y lector de pantalla no verificados; cinco pantallas sin revisión manual (`CatalogsPage`, `BrandingPage`, `PeriodClosurePage`, `WorkPlanPage`, `StudentsPage`).

## Foco al pulsar el fondo o un botón deshabilitado durante la operación (commit `381c98d`)

**Defecto:** durante una operación, un clic en el fondo o en un botón deshabilitado dejaba el foco en `<body>` (visto en la verificación anterior).
**Corrección:** mientras haya una operación en curso, `mousedown` dentro del diálogo no cambia el foco (`preventDefault`) y, como respaldo, si el foco sale del diálogo se devuelve al propio diálogo (`onBlur` + `queueMicrotask`). No toca el bloqueo: Escape, «Cancelar» y una segunda confirmación siguen sin efecto.
**Prueba** (`ConfirmDialog.test.tsx`, con `user-event` y clics reales sobre el fondo, el botón «Cancelar» deshabilitado y el botón de confirmar deshabilitado): el foco sigue dentro, `onCancel` no se llama y `onConfirm` se llamó una sola vez. Falla si se quitan los dos manejadores.
**Navegador** (sobre la integración de #193, #194 y #195, commit local `c370a60`; `sit_db_test`; petición retenida 12 s; C-3 con el 409 real): clic en el fondo, clic en «Cancelar» deshabilitado, clic en el botón de confirmar deshabilitado y Escape; el registro de foco (cada 30 ms) **nunca** marcó «fuera»; una sola petición `PATCH`; el diálogo se cerró 99 ms después de terminar la petición, con el foco en el botón «Desactivar» de origen y el mensaje en `role="alert"`.

## C-5 con el contrato final del diálogo, sobre la integración (resultado SMTP incierto)

Entorno: integración local `c370a60` = `develop` + #195 (`09f176a`) + #194 (`e5f9ff3`) + #193 (`eed83d8`); servidor real contra `sit_db_test` con un SMTP falso local que acepta el cuerpo y **corta la conexión sin respuesta final** (cuenta conexiones y cuerpos; no sale nada a la red); datos ficticios (una designación rechazada «sin registro», coordinación ficticia) que se borraron después.

| Paso | Observado |
|---|---|
| *Pendientes*, «Reenviar aviso» con el teclado, Tab + Intro en el diálogo | Una sola petición `POST …/decline-notice/resend`; respuesta **202**; diálogo ocupado durante la petición (foco dentro) y cerrado al terminar; foco de vuelta en «Reenviar aviso» |
| Resultado mostrado | «No se puede saber si el aviso salió: puede haber llegado. Revise antes de reenviarlo otra vez.» y, en el ítem, «No se puede saber si el aviso a *(coordinación)* salió. Puede haber llegado. Si lo reenvía, es posible que se reciba dos veces.» **Sin** datos técnicos en la página (búsqueda de `MailSendError`, `ESOCKET`, `ETIMEDOUT`, `Timeout`, `SIN_RESULTADO`, `SIN_REGISTRO`, `INCIERTO`, direcciones, `token`: nada) |
| Base de datos tras ≈ 85 s (más de dos pasadas del proceso de fondo) | **Un** intento `REENVIO` con estado `INCIERTO` (motivo `SIN_REGISTRO_PREVIO`) |
| SMTP falso tras ≈ 85 s | **1 conexión y 1 cuerpo recibido**: no hubo reenvío automático |

Este caso solo es posible con #195: antes de esa corrección un corte tras el cuerpo se clasificaba como `FALLIDO`.
Límites: un solo navegador; un solo caso de incierto (corte tras el cuerpo; no se repitió con silencio/tiempo agotado); el estado `INCIERTO` quedó guardado con el código interno `MailSendError` en la base (no se muestra a la persona usuaria).

## Dependencias entre #193, #194 y #195, y orden de fusión propuesto

- No comparten archivos en conflicto: #193 (cliente: `ConfirmDialog`, hooks, `DataRequestPage`/`PendingPage` solo el envoltorio `async` de `onConfirm`); #194 (mensaje: `DataRequestPage`, controlador y caso de uso de pedidos, `MANUAL_TECNICO.md`); #195 (`SmtpMailer`, `smtpOutcome`, `MANUAL_TECNICO.md`). El posible conflicto del manual se resolvió moviendo la nota de #195 a su **propia viñeta** (commit `09f176a`), así ya no toca la línea que edita #194.
- Se probaron las tres fusiones sobre `develop` (`c370a60`) y los pares (`git merge-tree`): **sin conflictos en ningún orden**.
- **Orden propuesto: #195 → #194 → #193.** #195 es solo servidor y es el que hace posible un resultado `INCIERTO` real; #194 cambia los textos de ese resultado (su mensaje de «incierto» solo se alcanza de forma real con #195); #193 es solo de cliente y toca `DataRequestPage` y `PendingPage` (el envoltorio `async`), por eso va al final, ya sobre los mensajes. Ninguno depende de otro para compilar: el orden no es obligatorio, es el más natural.
- Comprobado sobre la integración: `tsc` y `eslint` (cliente y `npm run lint` del servidor, 0 errores) limpios; pruebas del cliente de las carpetas afectadas 154 de 155 pasaron (la fallida, de `DataRequestPage`, «envía el pedido con los ciclos marcados…», pasó 28/28 al repetir el archivo solo; causa de la falla aislada **no determinada**, como las intermitencias ya registradas); pruebas del servidor `SmtpMailer`, `DataRequest*`, `DeclineNotice*`, `ResendDeclineNotice*`: 137/137.
