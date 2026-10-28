# Fallos intermitentes de la suite completa del cliente (observados al preparar C-3 y C-4)

**Actualización:** la investigación con experimentos controlados está en [cliente-fallos-intermitentes-investigacion.md](cliente-fallos-intermitentes-investigacion.md) (dos mecanismos medidos, un grupo indeterminado). Lo que sigue es el registro original.

**Estado original: causa NO determinada.** Este archivo conserva lo observado. No afirma que fueran causados por la carga de la máquina: que un archivo pase al ejecutarlo solo **no demuestra** esa causa. No se cambió ninguna aserción ni ningún tiempo de espera.

## Qué se observó

| Corrida | Qué | Resultado | Registro conservado |
|---|---|---|---|
| A (al preparar C-3, rama `fix/last-active-admin-protection`) | `npx vitest run` completa, dos veces seguidas | Primera: 4 pruebas en 3 archivos (nombres no conservados). Segunda: 1 prueba (`InterviewFormModal`, «recorre el flujo completo…», 5 020 ms) | **Solo el resumen de consola**; el registro completo no se guardó |
| B (al preparar C-4, rama `fix/data-request-idempotency`) | `npx vitest run` completa | 4 pruebas en 3 archivos ajenos al cambio: `CycleTutorsPage` («si el docente ya tiene otro ciclo pide el motivo…», 5 080 ms; «registra un motivo sugerido…», 1 819 ms), `SemesterReportPage` («guarda lo editado…», 5 212 ms), `ReportFilters` («muestra los cinco controles…», 1 420 ms) | **Solo el resumen de consola**; el registro completo no se guardó |
| C | `npx vitest run` completa, sin cambios de código | **87 archivos y 553 pruebas pasaron** (265,8 s) | [cliente-suite-completa-corrida-1.log](cliente-suite-completa-corrida-1.log) |
| D | `npx vitest run` completa, sin cambios de código | **1 prueba falló**: `UserManagementPage.test.tsx > … ante el 409 muestra el mensaje…` (1 965 ms) con `TestingLibraryElementError: Unable to find role="button" and name "Desactivar"` (293,2 s) | [cliente-suite-completa-corrida-2.log](cliente-suite-completa-corrida-2.log) (con el volcado del DOM) |
| E (al preparar C-5, rama `feat/decline-notice-queue`) | `npx vitest run` completa | **2 pruebas en 2 archivos ajenos al cambio**: `InterviewFormModal` («recorre el flujo completo y confirma con el usuario autenticado») y `SessionFormModal` («confirma con el enlace de videollamada al elegir modalidad virtual»); 568 de 570 pasaron (299,4 s). **Causa no determinada** | [cliente-suite-completa-corrida-3-c5.log](cliente-suite-completa-corrida-3-c5.log) |

Los archivos de las corridas A y B, ejecutados **por separado** (33 de 33 pruebas, y 4 de 4 en `entrevistas`), pasaron. Eso describe lo ocurrido; **no** identifica la causa.

## Lo que se sabe y lo que no

- **Se sabe:** los fallos son intermitentes (la misma suite pasó entera en la corrida C), afectan a archivos distintos en corridas distintas, incluidos archivos que no se tocaron, y entre las corridas C y D no hubo ningún cambio de código.
- **Observado en la corrida D:** la falla es una búsqueda asíncrona (`findByRole`) que no encontró el botón dentro del tiempo de espera por omisión de Testing Library (1 000 ms); la prueba duró 1 965 ms. En la corrida B dos de las cuatro fallas duraron 1,4 y 1,8 s, es decir, **no** llegaron al límite de 5 s de la prueba: no son todas «tiempos de prueba agotados» de 5 s.
- **No se sabe:** por qué la espera no alcanzó. Hipótesis **sin verificar**: contención de CPU entre los trabajadores en paralelo (la suma de entornos fue de 794 s y 889 s en un tiempo de pared de 266 s y 293 s), el orden o la forma de cargar los módulos, o un defecto de las propias pruebas. No se midió.
- **No se hizo:** variar el número de trabajadores, repetir la suite un número suficiente de veces para estimar una frecuencia, ni ejecutar la suite en el `develop` limpio para comparar.

## Decisión mantenida

Sin investigar la causa no se suben tiempos ni se alteran aserciones. Queda como **pendiente de investigación** (propuesta: repetir la suite en `develop` limpio y con distinto número de trabajadores, con registro completo de cada corrida). La CI del repositorio es la referencia de la rama; este archivo no la sustituye.
