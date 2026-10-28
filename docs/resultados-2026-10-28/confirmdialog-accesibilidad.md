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
- **Anomalía de C-4 con retraso de 4 s: explicada, era un defecto real y está corregido.** Reproducida con tiempos medidos (petición retenida 4 000 ms; teclas reales): al confirmar «Pedir de nuevo», `loading` llega del padre **unos 130 ms después** (en esta máquina) de que la petición ya salió; Escape y un segundo Intro pulsados en ese intervalo cancelaban el diálogo o se perdían. Con la pausa mayor del recorrido anterior no ocurría, por eso «no se reprodujo». Consecuencia del defecto: el diálogo se cerraba con la petición aún en curso y el resultado llegaba después por el mensaje de la página (no se duplicó el envío). Corrección (primera versión, **reemplazada**): un bloqueo que se soltaba a los 300 ms. Se descartó porque podía volver a habilitar una operación todavía pendiente si el padre tardaba en actualizar `loading`. **Versión final, contrato explícito:** `onConfirm` devuelve la promesa de la operación; `ConfirmDialog` registra la confirmación al instante (un `ref`) y mantiene bloqueados Escape, fondo, «Cancelar» y un segundo «confirmar» hasta que esa promesa se resuelve o rechaza (o `onConfirm` lanza un error síncrono); `loading` solo pinta el estado. No hay ningún plazo. Los 8 usos ya pasaban funciones `async`, salvo los de `DataRequestPage` y `PendingPage` (`void …`), que ahora devuelven su promesa. Pruebas deterministas: `ConfirmDialog.test.tsx` (3: operación pendiente 10 s simulados con `loading` sin actualizar — Escape, «Cancelar», fondo y segunda confirmación siguen bloqueados; rechazo; error síncrono; las dos primeras fallan sin la corrección) y `DataRequestPage.test.tsx` (1, con la petición controlada por una promesa). **No se repitió el recorrido en el navegador real tras este cambio de contrato**: las mediciones de la tabla siguiente son de la primera versión.
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
