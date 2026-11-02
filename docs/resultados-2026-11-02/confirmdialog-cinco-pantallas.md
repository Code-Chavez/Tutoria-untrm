# Revisión manual con teclado del diálogo de confirmación en las cinco pantallas restantes

Cierra el pendiente «cinco pantallas con `ConfirmDialog` sin revisión manual con teclado» del registro de entrega (`docs/seguimiento/REGISTRO_ENTREGA_TECNICA_2026-10-30.md`). Es una verificación acotada; no sustituye una auditoría de accesibilidad.

## Entorno y método

| Elemento | Valor |
|---|---|
| Código | `develop` `0d7d6f5` (con #193–#203 fusionados), en un `git worktree` |
| Servidor y cliente | servidor real (`ts-node`, puerto 3998) y Vite (5175), **solo contra la base exclusiva de pruebas `sit_db_test`** (contenedor `sit-postgres-test`, puerto 5433, reconstruido con `prepare-test-db` y detenido al terminar); los contenedores de desarrollo no se tocaron |
| Navegador | el integrado del escritorio (motor tipo Chromium), 1024×768; cuenta del administrador del seed del proyecto, solo en la app local |
| Teclado | teclas reales (Tab, Mayús+Tab, Intro, Espacio, Escape, flechas); **el foco nunca se movió por código**, solo se leyó `document.activeElement` (y un registro cada 30 ms) |
| Operación en curso | las peticiones no-GET se retuvieron 8 s **solo en esa pestaña** (parche de `XMLHttpRequest`) para poder actuar mientras estaban pendientes; el servidor y las respuestas son los reales |
| Datos | los de la base de pruebas; para `PeriodClosurePage` se cerró antes el periodo ficticio y para `WorkPlanPage` se insertó un plan aprobado ficticio por SQL (con campos de relleno, por eso su guardado devuelve 400). Todo vive en la base de pruebas, que no tiene volumen |

Comprobaciones por pantalla: foco inicial; Tab ×3 y Mayús+Tab ×4 dentro del diálogo; fondo inerte; Escape y «Cancelar» (Intro) cierran y devuelven el foco; con la operación pendiente (confirmar y, de inmediato, Escape, clic en el fondo, Intro y Espacio) no se cancela ni se repite la petición; qué ocurre al terminar.

## Resultados

| Pantalla (opener) | Foco inicial | Trampa de Tab | Fondo inerte | Escape / Cancelar → foco | En curso: Escape, fondo, Intro, Espacio | Peticiones | Al terminar |
|---|---|---|---|---|---|---|---|
| `CatalogsPage` — «Eliminar» de «Motivos» | «Cancelar» | dentro | `#root` inerte | vuelve al botón «Eliminar» | sin efecto; diálogo `aria-busy` desde ≈ 0,1 s | **1** `DELETE` | cerró 40 ms después de la respuesta (200); el elemento ya no existe, el foco queda en `<body>` (el opener desapareció) |
| `BrandingPage` — «Restablecer identidad UNTRM» | «Cancelar» | dentro | inerte | vuelve al botón | sin efecto | **1** `POST` | cerró 17 ms después (200), foco en el botón de origen, mensaje «Se restableció la identidad institucional.» visible como aviso (`role="alert"`/`"status"`) |
| `PeriodClosurePage` — «Reabrir periodo» | «Cancelar» | dentro | inerte | vuelve al botón | sin efecto | **1** `POST` | cerró 87 ms después (200); el botón «Reabrir periodo» se sustituye por «Cerrar periodo», el foco queda en `<body>` |
| `StudentsPage` — «Quitar riesgo» (menú «Más acciones», solo teclado: Intro, ↓ ×7, Intro) | «Cancelar» | dentro | inerte | vuelve al botón «Más acciones de …» de la fila | sin efecto | **1** `PATCH` | cerró 91 ms después (200), foco en «Más acciones de María Cruz…» |
| `WorkPlanPage` — «Guardar como nueva revisión» | «Cancelar» | dentro | inerte | vuelve al botón | **ver hallazgo F3**: el diálogo se cierra al confirmar | **1** `PUT` | respuesta 400 (datos ficticios incompletos): mensaje «Indique al menos un objetivo específico» en `role="alert"`; botón de nuevo habilitado; foco en `<body>` |

Los clics sobre el fondo y sobre los botones deshabilitados durante la operación no sacaron el foco del diálogo (el registro nunca marcó «fuera»), lo que confirma la corrección de #193 en pantallas reales.

## Hallazgos

- **F3 (nuevo, no corregido) — `WorkPlanPage`: al confirmar, el diálogo se cierra de inmediato y el foco queda en `<body>`.** `handleSave` hace `setConfirmRevision(false)` antes de enviar, de modo que el diálogo no permanece ocupado mientras guarda (a diferencia de las otras cuatro pantallas) y el foco no volvió al botón de origen (lo más probable es que ya estuviera deshabilitado por el guardado en curso: `useDialogFocus` no devuelve el foco a un control deshabilitado; **la causa exacta no se investigó**), y nadie lo recoge al terminar, ni con éxito ni con error. La persona que usa el teclado pierde su posición. El guardado no se duplica (el botón está en `loading` y Intro/Espacio con el foco en `<body>` no hacen nada). Corrección posible y pequeña (no aplicada): dejar el diálogo abierto y ocupado hasta que termine el guardado, como en las demás pantallas (devolviendo la promesa a `onConfirm`), o devolver el foco al botón cuando se rehabilite.
- **Observación — `CatalogsPage` y `PeriodClosurePage`:** tras una operación correcta el control de origen deja de existir (se elimina la fila / el botón cambia a «Cerrar periodo»), así que el foco queda en `<body>`. Es el comportamiento esperado de «si sigue disponible», pero obliga a retomar la navegación desde el principio; podría llevarse el foco a un elemento cercano (p. ej., la pestaña o el título de la sección).
- Los registros de foco cada 30 ms muestran que el diálogo pasa a `aria-busy` unos 60–140 ms después de confirmar (retraso de actualización de `loading`); durante ese lapso el bloqueo de #193 impidió cancelar o repetir la confirmación en las cinco pantallas.

## Límites

Un solo navegador (Chromium integrado); sin lector de pantalla; diálogos anidados no verificados; peticiones retenidas con un parche local, no una red lenta real; `WorkPlanPage` con un plan ficticio cuyo guardado falla por validación (no se vio un guardado correcto); `StudentsPage` solo con el menú de acciones de una fila; una sola pasada por pantalla (sin repeticiones); los datos de prueba quedan en una base sin volumen que se descarta al apagarla. No se cambió ningún código.

## Corrección de F3 (2/11/2026, PR de seguimiento)

`WorkPlanPage.handleSave` ya no cierra el diálogo al confirmar: lo cierra en un `finally`, al terminar el guardado (con éxito o con error), de modo que el diálogo queda ocupado y con el foco dentro mientras se guarda, como en las otras cuatro pantallas.

- **Prueba que detecta el defecto** (`WorkPlanPage.test.tsx`, «F3: al confirmar la revisión el diálogo sigue abierto y ocupado…», guardado controlado por una promesa): **falla antes del cambio** (el diálogo ya no estaba `aria-busy`/abierto) y **pasa después**; comprueba además una sola llamada a `save`, que Escape, Intro y el clic en el fondo no cierran ni repiten, el mensaje de éxito y que el foco vuelve al botón.
- **Navegador real** (misma configuración que arriba, plan ficticio ahora con un objetivo específico para que el guardado sea válido; petición retenida 8 s): una sola `PUT`; Escape, clic en el fondo, Intro y Espacio sin efecto; el diálogo pasó a `aria-busy` ≈ 30 ms después de confirmar; al responder 200 se cerró 17 ms después y el foco quedó en el botón «Guardar como nueva revisión» (que a continuación pasa a llamarse «Guardar plan» porque el plan queda como revisión en edición; el foco se mantiene en ese mismo botón); mensaje «Cambios guardados como nueva revisión…» en `role="status"`.
- **Límites:** el camino de error (400) no se repitió en el navegador tras el cambio (lo cubre el mismo `finally`, sin prueba específica); un solo navegador y una sola pasada.
