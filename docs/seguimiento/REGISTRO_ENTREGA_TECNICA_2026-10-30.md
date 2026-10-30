# Registro de entrega técnica — 30 de octubre de 2026

Este registro es el seguimiento oficial de esta entrega en sustitución de un tablero GitHub Projects. El usuario autorizó expresamente su uso, declaró tener autoridad para las aclaraciones del DoD y aprobó la entrega técnica: **«Yo los valido y los apruebo»**. La revisión está asistida por Codex y validada por el responsable solicitante. No se atribuye a la DBU una aprobación institucional que no se haya recibido.

## Ítems y evidencia

| Ítem existente / entregable | PR | Estado de trabajo validado | Evidencia |
|---|---|---|---|
| TT-103: corrección de accesibilidad de confirmaciones; TT-100: pruebas | [#193](https://github.com/Code-Chavez/Tutoria-untrm/pull/193) | TERMINADO | Componente validado con Chrome/Edge, Firefox Linux en CI y Safari real en iPhone; dos pruebas de movimiento normal/reducido. Código funcional `8ea6029`; cambios posteriores de manual no alteran el componente. |
| TT-103: mensajes públicos de envío; seguimiento LEV-R04 | [#194](https://github.com/Code-Chavez/Tutoria-untrm/pull/194) | TERMINADO | Error público comprensible, fallo confirmado distinto de resultado incierto, detalle técnico no expuesto; pruebas HTTP y del cliente. Código funcional `7ad3fe0`. |
| TT-103: clasificación SMTP; TT-100: pruebas de transporte | [#195](https://github.com/Code-Chavez/Tutoria-untrm/pull/195) | TERMINADO | Fase DATA observada, incertidumbre conservadora, logger sin datos del mensaje y redacción de direcciones. Código funcional `d2a08ca`. |
| TT-100: registro honesto del pendiente IMP-3 | [#196](https://github.com/Code-Chavez/Tutoria-untrm/pull/196) | TERMINADO como documentación | Se conserva la pérdida de la salida original y no se inventa su causa. Registrar el pendiente no lo resuelve. |
| TT-100: evidencia y revisión DoD; TT-103: manual | [#197](https://github.com/Code-Chavez/Tutoria-untrm/pull/197) | TERMINADO como documentación aprobada | Plantilla aclarada, manual y este registro. Los resultados de la revisión inicial se conservan como históricos. |
| TT-100: preparación, disponibilidad de datos y aislamiento | [#198](https://github.com/Code-Chavez/Tutoria-untrm/pull/198) | TERMINADO | [Correcciones y resultados](https://github.com/Code-Chavez/Tutoria-untrm/blob/8357d41/docs/resultados-2026-10-29/correccion-pruebas-locales.md), diagnósticos antes/después y resúmenes sin datos de cuentas. |

TERMINADO describe el trabajo técnico validado; **no significa fusionado, desplegado ni publicado como versión estable**. Antes de cada fusión debe comprobarse la CI del último commit y actualizar la rama si develop cambió. Si esa comprobación falla, se reabre el ítem correspondiente.

TT-100 y TT-103 son referencias existentes: `docs/MATRIZ_TRAZABILIDAD_PRUEBAS.md` y `docs/CAMBIOS_USUARIO_TT103.md`. Los LEV-* son referencias provisionales del levantamiento y no se presentan como identificadores nuevos aprobados. No se asignaron puntos u horas adicionales sin estimación.

## Aceptación y aclaraciones del DoD

El usuario autorizó el 30/10/2026:

1. Exigir la pasada local completa antes de solicitar la revisión final, permitiendo crear borradores antes. No se atribuye a una fecha anterior una prueba ejecutada después.
2. Reconocer ramas `feature/HU-...`, `feature/TT-...`, `bugfix/...`, `fix/...`, `docs/...`, `test/...` y `codex/...`, conservando la relación con un ítem existente y los gates actuales de main.
3. Justificar la aplicabilidad por el diff en cambios sin código, negocio, endpoints o interfaz. Se conserva el checklist completo y no se inventan métricas ni pruebas.
4. Usar este registro de tareas en el repositorio, con PR, evidencia, estado y validación real, en lugar de una tarjeta inexistente de GitHub Projects.
5. Incorporar el borrador del manual directamente en #193, #194 y #195 y actualizar sus DoD con la evidencia final. No autoriza fusión ni despliegue.

## Base de la validación técnica

- Servidor completo: **1416/1416**, incluidas **235** pruebas de integración sobre `sit_db_test`.
- Cliente completo: **588/588**, sin omitir pruebas, con `--maxWorkers=2` autorizado por el usuario. Se mantuvieron tipeo, aserciones, timeouts y configuración de CI.
- Cobertura de los ocho archivos de producto modificados: superior al 70 % en líneas, ramas y funciones, según la revisión documentada. #196–#198 no introducen lógica de negocio nueva; no se inventa una cobertura para documentos o archivos de prueba.
- Compilación, lint, build y auditorías comprobados; la auditoría del servidor conserva una moderada ignorada por la configuración previa. No se presenta como cero avisos.
- Revisión de seguridad por alcance: no se amplían permisos ni acceso a datos de estudiantes; los errores públicos y registros eliminan detalles innecesarios del proveedor. Los reportes públicos no incluyen datos de cuentas, contraseñas, tokens, capturas ni registros crudos. No es un dictamen legal de toda la institución.
- Revisión de arquitectura: sin cambios de dominio ni endpoints; uso de puertos existentes y estructura de features preservado. La autorevisión técnica asistida y su evidencia fueron presentadas al usuario y aceptadas para esta entrega.

## Límites conservados

- IMP-3 permanece abierto como seguimiento: la salida histórica no existe y no se reconstruye. No es un fallo reproducido de estas correcciones.
- La ejecución con ocho trabajadores por defecto mostró timeouts bajo carga en Windows y Linux local; limitar la ejecución local a dos trabajadores no demuestra resueltas todas las intermitencias. Los resultados fallidos se conservan.
- El usuario confirmó en su iPhone 11 Pro la preferencia de movimiento reducido. Una rueda quieta en ese modo es comportamiento esperado; no se forzó la animación. La versión de iOS no fue proporcionada.
- Los cuatro navegadores se verificaron sobre el componente de confirmación; no se afirma una exploración completa de toda la aplicación, todos los navegadores/versiones, lector de pantalla o diálogos anidados.
- Servidor institucional, SMTP real, piloto, decisiones de roles y certificación y versión estable siguen fuera de esta entrega. Su aprobación no se infiere del visto bueno técnico de estos PR.
