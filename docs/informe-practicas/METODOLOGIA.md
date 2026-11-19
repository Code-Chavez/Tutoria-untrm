# Metodología del trabajo

Texto para el capítulo «Metodología y organización del trabajo» del informe de prácticas (V04). Corte del 19 de noviembre de 2026, software `v1.0.0-beta.4`. Reemplaza el borrador `documentacion-integral/METODOLOGIA_BORRADOR.md`, que sigue como antecedente. **La denominación del enfoque está pendiente de confirmar con el asesor** (ver «Pendiente»).

## 1. Enfoque

El trabajo se organizó con el **plan por fases** presentado al inicio de las prácticas, y dentro de la fase de desarrollo se aplicó un **enfoque iterativo e incremental**:

- **Plan por fases:** seis fases consecutivas, desde los requerimientos hasta la documentación y entrega (sección 2). Fija el orden general y la duración prevista: 120 días hábiles.
- **Incremental:** el sistema se construyó agregando capacidades completas (acceso, estudiantes, sesiones, derivaciones, informes, certificación, etc.) y cada incremento se publicó como una **versión etiquetada** en el repositorio (sección 4).
- **Iterativo:** cada capacidad se revisó con pruebas, auditorías, el ensayo técnico de los recorridos de los roles y correcciones, y esas revisiones modificaron requisitos, pantallas y pruebas ya hechas. Un hallazgo (por ejemplo, H10 y H11 del ensayo del piloto, o los de la auditoría del 17/11) volvió a la cola de trabajo y salió en una versión posterior.

Cada cambio conserva su trazabilidad: necesidad u hallazgo → issue → rama → pruebas → solicitud de integración → versión (sección 5).

## 2. Las fases del plan

Duración y fechas tal como constan en el plan presentado por el estudiante (informe V03, sección 6.1). Son una **programación**, no un registro de lo ocurrido.

| Fase | Periodo previsto | Días hábiles |
| --- | --- | --- |
| 1. Requerimientos | 08/06/2026 a 03/07/2026 | 20 |
| 2. Análisis y modelado | 06/07/2026 a 07/08/2026 | 25 |
| 3. Arquitectura y entorno | 10/08/2026 a 28/08/2026 | 15 |
| 4. Desarrollo e implementación | 31/08/2026 a 23/10/2026 | 40 |
| 5. Pruebas y ajustes | 26/10/2026 a 06/11/2026 | 10 |
| 6. Documentación y entrega | 09/11/2026 a 20/11/2026 | 10 |
| **Total** | 08/06/2026 a 20/11/2026 | **120** |

El plan cuenta todos los días de lunes a viernes. Las fichas de asistencia (`fichas-asistencia/`) descuentan los feriados nacionales ciertos (29/06, 28/07, 29/07 y 08/10) y por eso llegan hasta el 26/11/2026; esa diferencia es de calendario, no de alcance.

### Qué evidencia hay de cada fase

| Fase | Evidencia en el repositorio | Observación |
| --- | --- | --- |
| 1. Requerimientos | `docs/levantamiento/` (diagnóstico, preguntas, contraste con el protocolo, requisitos, matrices), `docs/formatos-anexos-matriz.md` | Los documentos de levantamiento se versionaron desde octubre. El historial del repositorio **empieza el 22/07/2026**: de lo hecho antes no hay evidencia versionada y se consigna «pendiente de acreditar». |
| 2. Análisis y modelado | Diagramas de casos de uso (`docs/diagramas/casos-de-uso`), esquema de datos (`server/prisma/schema.prisma`), historias de usuario y tareas técnicas en las notas de cada versión | Diagramas de clases, entidad-relación, secuencia, estados, componentes y despliegue: en elaboración (documento de diseño). |
| 3. Arquitectura y entorno | Arquitectura hexagonal del servidor y organización por features del cliente (primer commit del 22/07, tarea TT-000), Docker, integración continua | Descrita en `docs/MANUAL_TECNICO.md`. |
| 4. Desarrollo e implementación | Versiones `v0.0.1` a `v0.4.4` y `v1.0.0-beta.1` (01/09 a 13/10/2026) | Sección 4. |
| 5. Pruebas y ajustes | Auditorías (`docs/AUDITORIA_*`), pruebas de extremo a extremo, revisiones de seguridad, ensayo técnico del piloto, betas 2 a 4 (05/11 a 19/11/2026) | El desarrollo y las correcciones continuaron en las fases 5 y 6; las fechas reales no coinciden con las previstas. |
| 6. Documentación y entrega | Manuales, informe de prácticas V01 a V04, control de evidencias, guía del piloto | En curso. |

Las fechas reales de cada fase no se reconstruyen a partir de lo previsto: se toman de las etiquetas y del historial, y donde no hay evidencia se dice.

## 3. Lo que no se afirma

- **No se aplicó Scrum.** No se afirman eventos (planificación de sprint, reunión diaria, revisión, retrospectiva), roles ejercidos (Scrum Master, Product Owner, equipo de desarrollo) ni actas que no consten. En el repositorio figuran los términos «sprint», «Product Backlog», «historia de usuario (HU)» y «tarea técnica (TT)» y una plantilla de integración con casillas de visto bueno; son **artefactos de planificación** conservados como evidencia histórica, no la demostración de un marco de gestión.
- **No se aplicó Kanban.** Solo se afirmaría si se documentaran sus políticas de flujo y el control del trabajo en curso; no es el caso.
- **No se atribuyen** reuniones, entrevistas, participación de autoridades, horas ni aprobaciones sin fuente. Se usa «pendiente de acreditar».

## 4. Cómo se usan los términos históricos

| Término del repositorio | Significado en este informe |
| --- | --- |
| Historia de usuario (HU-xx) | Requisito funcional redactado desde el punto de vista de quien lo usa; se vincula a pruebas en la matriz de trazabilidad |
| Tarea técnica (TT-xxx) | Trabajo que sostiene el sistema sin ser una función visible (arquitectura, pruebas, seguridad, documentación) |
| «Sprint» 1 a 6 | **Bloque de entrega:** agrupación de historias y tareas con una fecha objetivo, tal como las organizó el Product Backlog / Sprint Backlog del proyecto. No se afirma la ejecución de las ceremonias |
| Product Backlog | Lista priorizada de historias y tareas |
| Definition of Done (DoD-SIT-001) | Lista de condiciones de un cambio terminado (compila, tiene pruebas, sin secretos, integración en verde); se reproduce en cada solicitud de integración |

### Bloques de entrega y versiones

| Bloque | Versión etiquetada | Fecha de la etiqueta |
| --- | --- | --- |
| 1 | `v0.0.1` | 01/09/2026 |
| 2 | `v0.1.0` | 24/09/2026 |
| 3 | `v0.2.0` | 25/09/2026 |
| 4 | `v0.3.0` | 01/10/2026 |
| 5 y remediación | `v0.4.0` a `v0.4.4` | 09/10 a 12/10/2026 |
| 6 (pruebas integrales, piloto, despliegue, manuales) | `v1.0.0-beta.1` a `v1.0.0-beta.4` | 13/10, 05/11, 16/11 y 19/11/2026 |

La correspondencia entre bloques y versiones se toma de las notas de cada versión (`docs/RELEASE_*.md`) y de las etiquetas del repositorio (`git tag`); el contenido de cada versión está en el informe, sección «Entregas realizadas». Las versiones posteriores a `v0.4.1` son candidatas y no constan como entregadas formalmente.

## 5. Ciclo de trabajo de un cambio

Descrito a partir de cómo se integró el trabajo en el repositorio:

1. **Necesidad o hallazgo:** una historia, una tarea, un hallazgo de auditoría o del ensayo, o una observación.
2. **Issue** con sus criterios de aceptación (ver `CLAUDE.md` y `.github/`), de modo que el criterio de cierre existe antes del código.
3. **Rama propia** desde `develop` y cambios con mensajes de commit convencionales.
4. **Pruebas** del cambio (servidor con Jest, cliente con Vitest, recorridos de extremo a extremo con Playwright cuando afecta a un recorrido de usuario).
5. **Solicitud de integración (pull request)** con una plantilla que reproduce la Definition of Done y enlaza el issue.
6. **Integración continua:** estilo, compilación, pruebas, auditoría de dependencias, ensayo de restauración del respaldo y extremo a extremo en Chrome; la construcción de imágenes Docker corre en `develop` y `main`.
7. **Fusión a `develop`** con *commit* de fusión y, para un lanzamiento, rama de versión, solicitud a `main`, etiqueta y retorno de `main` a `develop`.

Número de solicitudes de integración fusionadas: se obtiene con `gh pr list --state merged --limit 1000` (277 al 19/11/2026); el recuento cambia con cada corte.

## 6. Verificación y calidad

La calidad se documenta con validaciones de entrada y de permisos, pruebas unitarias y de integración, recorridos de extremo a extremo, revisión de interfaz, las revisiones de seguridad (informe del 11/10 y repasos del 12/11 y del 19/11; este último está en un PR aún no fusionado a esta fecha) y los controles de la integración continua. Cada resultado debe indicar commit, entorno, fecha y alcance. Una ejecución verde de la integración continua **no** acredita por sí sola usabilidad con usuarios reales, cumplimiento integral del protocolo ni aceptación institucional. El ensayo técnico del piloto lo realizó el equipo de desarrollo con guiones y datos ficticios, y así se declara.

## 7. Ampliaciones respecto del levantamiento inicial

Los roles configurables (`v1.0.0-beta.2`) y la certificación del docente tutor en **modo de demostración** (`v1.0.0-beta.3`) están implementados y comprobados. Los certificados **no** tienen valor oficial: la plantilla, los logos, la firma y la autoridad firmante siguen pendientes de la DBU. La sincronización y lo no implementado se mantienen en el levantamiento como propuesta.

## Pendiente

- **Confirmar con el asesor** la denominación («plan por fases con desarrollo iterativo e incremental»), pues el plan original no menciona un marco de gestión y el repositorio sí usa términos propios de Scrum como artefactos de planificación.
- Contrastar con el **formato de la escuela** para ubicar este texto como capítulo.
- Acreditar, si existen, las actividades previas al 22/07/2026 (fase 1) y los registros de asistencia, supervisión y horas.
- Adaptar las referencias al estilo exigido (por ejemplo, la guía de Kanban y la guía de desarrollo iterativo de Open University que cita el borrador, solo si se mantienen en el texto).
