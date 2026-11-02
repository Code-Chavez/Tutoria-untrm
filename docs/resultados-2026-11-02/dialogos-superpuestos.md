# Diálogos superpuestos («anidados»): revisión y corrección

Cierra el límite «diálogos anidados no verificados» de #193. Alcance acotado; no sustituye una auditoría de accesibilidad.

## Qué existe hoy

Revisión del código (`develop` `8334c21`): **ningún flujo deja dos diálogos abiertos a la vez.** Las 8 pantallas con `ConfirmDialog` y los modales de formulario se renderizan como hermanos dentro de la página, y los casos en que un modal da paso a otro lo hacen por **reemplazo** en el mismo cambio de estado (p. ej. `TutoringRequestsInboxPage.startFollowUp`: `setSelected(null)` y `setFollowUp(...)`); el orden de efectos de React (se deshacen los del modal que sale antes de montar los del que entra) deja al segundo con el botón de la página como origen del foco. No se probó ese reemplazo en navegador.

## Defecto encontrado y corregido

Aunque hoy nada se superponga, el hook compartido no lo soportaba: con un diálogo sobre otro (**reproducido con pruebas de componente**), **un solo Escape cerraba los dos** (cada diálogo escucha Escape en `window`) y la trampa de Tab del diálogo de abajo competía con la del de arriba.

**Corrección:** `useDialogFocus` registra cada diálogo en una pila; `isTopDialog` indica cuál es el de arriba; la trampa de Tab, el Escape de `useDialog` y el Escape de `ConfirmDialog` solo actúan si el diálogo es el de arriba. Al cerrarse el de arriba, el de abajo vuelve a ser el activo y el foco regresa a su control de origen (que está dentro del de abajo).

## Pruebas

- `useDialog.test.tsx` (2 nuevas, con dos modales superpuestos): Escape cierra solo el de arriba, el exterior sigue abierto, recupera el foco y un segundo Escape sí lo cierra; Tab y Mayús+Tab se quedan dentro del de arriba. **Ambas fallaban antes del cambio** (Escape cerraba los dos; el foco se desviaba).
- `ConfirmDialog.test.tsx` (1 nueva): una confirmación abierta sobre un modal de formulario cierra solo con Escape y el modal conserva el foco. Pasa también sin la guarda propia de `ConfirmDialog` (la guarda del modal ya la cubre): es una prueba de regresión del conjunto, no una prueba aislada de esa guarda.
- Archivos de modales y pantallas afectados (`shared`, `pedidos`, `pendientes`, `admin`, `catalogos`, `identidad`, `periodo`, `planificacion`, `tutorados`, `solicitudes`, `sesiones`, `derivaciones`, `entrevistas`, `seguimiento`): 63 archivos y 453 pruebas pasaron en local; `tsc` y `eslint` sin errores.

## Límites

Sin verificación en un navegador real (no existe un flujo que superponga diálogos para recorrerlo con teclado); los diálogos superpuestos de las pruebas son mínimos y no los de pantallas reales; no se cubre un diálogo que se monte *fuera* de la pila (p. ej. con un portal ajeno al hook); la pila es global al módulo (una sola pestaña); sin lector de pantalla. No se cambió ningún comportamiento observable de las pantallas actuales.
