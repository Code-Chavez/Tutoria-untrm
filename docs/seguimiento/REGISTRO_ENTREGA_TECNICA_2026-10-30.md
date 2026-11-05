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
- Compilación, lint, build y auditorías comprobados; la auditoría del servidor conserva una moderada ignorada por la configuración previa. No se presenta como cero avisos. **Superado el 1/11/2026: ahora hay dos avisos ignorados en el servidor (ver la actualización).**
- Revisión de seguridad por alcance: no se amplían permisos ni acceso a datos de estudiantes; los errores públicos y registros eliminan detalles innecesarios del proveedor. Los reportes públicos no incluyen datos de cuentas, contraseñas, tokens, capturas ni registros crudos. No es un dictamen legal de toda la institución.
- Revisión de arquitectura: sin cambios de dominio ni endpoints; uso de puertos existentes y estructura de features preservado. La autorevisión técnica asistida y su evidencia fueron presentadas al usuario y aceptadas para esta entrega.

## Límites conservados

- IMP-3 permanece abierto como seguimiento: la salida histórica no existe y no se reconstruye. No es un fallo reproducido de estas correcciones. **Superado el 1/11/2026: IMP-3 se cerró como riesgo aceptado (ver «Actualización de estado — 1 de noviembre de 2026»); el texto original se conserva como histórico.**
- La ejecución con ocho trabajadores por defecto mostró timeouts bajo carga en Windows y Linux local; limitar la ejecución local a dos trabajadores no demuestra resueltas todas las intermitencias. Los resultados fallidos se conservan.
- El usuario confirmó en su iPhone 11 Pro la preferencia de movimiento reducido. Una rueda quieta en ese modo es comportamiento esperado; no se forzó la animación. La versión de iOS no fue proporcionada.
- Los cuatro navegadores se verificaron sobre el componente de confirmación; no se afirma una exploración completa de toda la aplicación, todos los navegadores/versiones, lector de pantalla o diálogos anidados.
- Servidor institucional, SMTP real, piloto, decisiones de roles y certificación y versión estable siguen fuera de esta entrega. Su aprobación no se infiere del visto bueno técnico de estos PR.

## Actualización de estado — 1 de noviembre de 2026

Estado verificado en GitHub al 1/11/2026 (hora local; las marcas de fusión están en UTC). «Fusionado» es un hecho del repositorio; **no** equivale a desplegado ni a versión estable, y este repositorio no registra ningún despliegue.

| PR | Contenido | Fusionado en `develop` (UTC) | CI del último commit de la rama que se leyó en la preparación |
|---|---|---|---|
| [#197](https://github.com/Code-Chavez/Tutoria-untrm/pull/197) | plantilla DoD, manual y este registro | 30/10 15:53 | no verificada en esta actualización |
| [#198](https://github.com/Code-Chavez/Tutoria-untrm/pull/198) | preparación y aislamiento de pruebas | 30/10 15:59 | no verificada en esta actualización |
| [#195](https://github.com/Code-Chavez/Tutoria-untrm/pull/195) | clasificación SMTP por fase | 30/10 16:02 | 12 aprobadas, 2 omitidas |
| [#194](https://github.com/Code-Chavez/Tutoria-untrm/pull/194) | mensajes públicos del envío fallido o incierto | 30/10 16:06 | 12 aprobadas, 2 omitidas |
| [#193](https://github.com/Code-Chavez/Tutoria-untrm/pull/193) | accesibilidad del diálogo de confirmación | 30/10 16:30 | 12 aprobadas, 2 omitidas |
| [#196](https://github.com/Code-Chavez/Tutoria-untrm/pull/196) | registro del pendiente IMP-3 | 30/10 16:40 | 12 aprobadas, 2 omitidas |
| [#200](https://github.com/Code-Chavez/Tutoria-untrm/pull/200) | auditoría de dependencias: `follow-redirects` 1.16.2 (cliente) y excepción documentada `GHSA-g3hv-75wg-m249` (servidor) | 2/11 00:05 | 12 aprobadas, 2 omitidas, más «Dialog — Firefox Linux» |
| [#199](https://github.com/Code-Chavez/Tutoria-untrm/pull/199) | investigación de IMP-3 con registros completos | 2/11 00:09 | 12 aprobadas, 2 omitidas |
| [#201](https://github.com/Code-Chavez/Tutoria-untrm/pull/201) | perfil de la prueba objetivo de IMP-3 | 2/11 00:20 | 12 aprobadas, 2 omitidas |
| [#202](https://github.com/Code-Chavez/Tutoria-untrm/pull/202) | cierre de IMP-3 como riesgo aceptado | 2/11 00:26 | 12 aprobadas, 2 omitidas |

La columna de CI recoge lo leído sobre la rama durante la preparación; si la rama se actualizó con `develop` después (merge de actualización) antes de fusionar, la CI de ese último commit no se vuelve a afirmar aquí. No quedan PR abiertos (comprobado). La CI de `develop` en los commits de fusión `6763f2d`, `3959d1c` y `e04e470` terminó en éxito; la del commit `0fbde0d` (fusión de #202) seguía **en curso** al redactar esto y su resultado no se afirma aquí.

### Cambios de estado respecto a la sección anterior

- **IMP-3: cerrado como riesgo aceptado** (decisión del responsable del proyecto en el chat de trabajo, 1/11/2026 hora local; registrada en `docs/levantamiento/15_TRAZABILIDAD_Y_PLAN_DE_ENTREGAS.md` §5 bis). La causa de la falla original **no** se demostró; se aceptan los fallos por 5 s con la CPU local saturada, con las reglas allí escritas (repetir con la máquina libre y conservar la salida completa; la CI es la referencia; reaparición ⇒ hallazgo nuevo). Evidencia: `docs/resultados-2026-11-01/imp3-investigacion-experimentos.md` y `docs/resultados-2026-11-02/imp3-perfil-prueba-objetivo.md`.
- **Auditorías de dependencias:** volvieron a pasar tras #200. El cliente quedó sin avisos conocidos; el servidor mantiene **dos avisos ignorados** (`GHSA-w5hq-g745-h8pq` y `GHSA-g3hv-75wg-m249`, esta con la justificación y la prueba de respaldo de `docs/resultados-2026-11-01/auditoria-dependencias.md`). **No se presenta como cero avisos.** Ambas excepciones se revisan antes de la v1.0.0.

### Pendientes que impiden llamar a esta entrega «cerrada» sin matices

1. **Desplegado/estable:** no hay despliegue ni versión estable registrados; no se infieren de las fusiones.
2. **Aprobaciones institucionales:** visto bueno de la DBU o de producto sobre los textos y el flujo; las decisiones institucionales siguen pendientes (correo completo del motivo, destinatarios, avisos adicionales, Q07).
3. **Verificaciones no hechas:** SMTP real, STARTTLS y TLS implícito (solo SMTP local en texto plano); servidor institucional; lector de pantalla y diálogos anidados; ~~otras pantallas con `ConfirmDialog` sin revisión manual con teclado (`CatalogsPage`, `BrandingPage`, `PeriodClosurePage`, `WorkPlanPage`, `StudentsPage`)~~ **revisadas el 2/11/2026** (`docs/resultados-2026-11-02/confirmdialog-cinco-pantallas.md`): foco, trampa de Tab, Escape y bloqueo durante la operación correctos en las cinco; hallazgo F3 en `WorkPlanPage` (el diálogo se cerraba al confirmar y el foco quedaba en `<body>`) **corregido el 2/11/2026** (prueba que falla antes y pasa después, y verificación en navegador); solo el componente de confirmación se verificó en cuatro navegadores.
4. **Datos históricos:** los pedidos y avisos que quedaron `FALLIDO` antes de #195 pudieron ser inciertos; no se reclasifican (no se puede demostrar cuáles).
5. **Estado de la suite local:** la intermitencia por CPU saturada se acepta, no se resolvió; «sin regresiones» sigue sin afirmarse por una CI verde.
6. **Fuera de esta entrega:** roles configurables (existe trabajo en una rama local `codex/roles-permissions-foundation`, no revisada aquí), certificación y piloto.

## Actualización de estado — 2 de noviembre de 2026

Verificado en GitHub (marcas de fusión en UTC). «Fusionado» no equivale a desplegado ni a versión estable; no se registra ningún despliegue.

| PR | Contenido | Fusionado en `develop` (UTC) | CI del último commit de la rama que se leyó |
|---|---|---|---|
| [#203](https://github.com/Code-Chavez/Tutoria-untrm/pull/203) | actualización de este registro (1/11) | 2/11 00:37 | 12 aprobadas, 2 omitidas (`8206b6f`) |
| [#204](https://github.com/Code-Chavez/Tutoria-untrm/pull/204) | revisión con teclado del diálogo de confirmación en las cinco pantallas restantes | 2/11 00:52 | 12 aprobadas, 2 omitidas (`3444676`) |
| [#205](https://github.com/Code-Chavez/Tutoria-untrm/pull/205) | corrección de F3 en `WorkPlanPage` | 2/11 01:10 | 12 aprobadas, 2 omitidas (`aba71fe`) |

No quedan PR abiertos (comprobado). La CI de `develop` terminó en éxito en `0d7d6f5` y `4acf4a9`; la del commit de fusión de #205 (`8334c21`) seguía **en curso** al redactar esto y su resultado no se afirma aquí.

### Cambios de estado

- **Pantallas con `ConfirmDialog` revisadas con teclado:** las cinco que faltaban (`CatalogsPage`, `BrandingPage`, `PeriodClosurePage`, `StudentsPage`, `WorkPlanPage`) en un navegador, contra la base de pruebas: foco, trampa de Tab, fondo inerte, Escape, «Cancelar» y bloqueo durante la operación correctos (informe: `docs/resultados-2026-11-02/confirmdialog-cinco-pantallas.md`).
- **F3 corregido** (`WorkPlanPage` cerraba el diálogo al confirmar y el foco quedaba en `<body>`): el diálogo permanece ocupado hasta que termina el guardado y el foco vuelve al botón. Prueba que falla antes y pasa después, y verificación en navegador real. El camino de error (400) no se repitió en el navegador tras el cambio.

### Pendientes que impiden llamar a esta entrega «cerrada» sin matices (vigentes)

1. **Desplegado/estable:** no hay despliegue ni versión estable registrados.
2. **Aprobaciones institucionales:** visto bueno de la DBU o de producto; decisiones institucionales pendientes (correo completo del motivo, destinatarios, avisos adicionales, Q07).
3. **Verificaciones no hechas:** SMTP real, STARTTLS y TLS implícito; servidor institucional; lector de pantalla; diálogos superpuestos (ningún flujo actual los produce; el comportamiento ante ellos se corrigió y se probó con pruebas de componente el 2/11/2026, sin verificación en navegador: `docs/resultados-2026-11-02/dialogos-superpuestos.md`); solo un navegador en la revisión de las cinco pantallas (el componente sí se verificó en cuatro, #193).
4. **Observación menor, sin corregir:** tras borrar un elemento en `CatalogsPage` o reabrir el periodo en `PeriodClosurePage` el control de origen desaparece y el foco queda en `<body>` (esperado, pero podría llevarse a un elemento cercano).
5. **Datos históricos:** pedidos y avisos `FALLIDO` anteriores a #195 que pudieron ser inciertos; no se reclasifican.
6. **Suite local:** la intermitencia por CPU saturada (IMP-3) se acepta, no se resolvió; «sin regresiones» no se afirma por una CI verde. Las dos excepciones de auditoría del servidor se revisan antes de la v1.0.0.
7. **Fuera de esta entrega:** roles configurables (hay una rama local `codex/roles-permissions-foundation`, no revisada aquí), certificación y piloto.
