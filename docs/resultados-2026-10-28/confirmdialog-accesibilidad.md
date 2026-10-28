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

Suite del cliente completa en local con `--maxWorkers=2` (solo para ejecutarla; no es una recomendación ni un cambio de configuración): **88 archivos y 581 pruebas pasaron**. Una primera pasada con el mismo ajuste terminó con 2 archivos sin arrancar (`Failed to start forks worker`, máquina muy cargada; 86 archivos y 555 pruebas pasaron) y otras dos pasadas con los trabajadores por defecto tuvieron los tiempos agotados de 5 s ya conocidos (`CycleTutorsPage`, `GroupSessionFormModal`, ver [la investigación](../resultados-2026-10-27/cliente-fallos-intermitentes-investigacion.md)) en pruebas que no usan `ConfirmDialog`. Se informa tal cual: no se repitió hasta obtener verde, se repitió el archivo no arrancado dentro de la suite completa.

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
- Una anomalía **no reproducida** al probar la carga de C-4 con un retraso de 4 s: en una corrida los botones aparecieron habilitados y Escape cerró el diálogo; repetida con 8 s se comportó como en C-3 y C-5. No se pudo explicar (posible desfase del instante de la lectura).
- **Observación fuera de alcance** (no corregida): el mensaje de C-4 cuando el correo no está configurado muestra el nombre técnico del error (`MailNotConfiguredError`) a la persona usuaria. Conviene un texto sin nombres internos.
- No se cambiaron tiempos, el calentamiento de `getComputedStyle` ni el número de trabajadores.
