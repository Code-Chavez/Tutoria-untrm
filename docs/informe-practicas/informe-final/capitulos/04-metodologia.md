# Capítulo IV. Metodología y organización del trabajo

## 4.1 Enfoque

El trabajo se organizó con el **plan por fases** presentado al inicio de las prácticas y, dentro de la fase de desarrollo, con un enfoque **iterativo e incremental** (Larman y Basili, 2003; Sommerville, 2016):

- **Plan por fases.** Seis fases consecutivas, desde los requerimientos hasta la documentación y la entrega, que fijan el orden general y la duración prevista de 120 días hábiles.
- **Incremental.** El sistema se construyó agregando capacidades completas (acceso, estudiantes, sesiones, derivaciones, informes, certificación) y cada incremento se publicó como una versión etiquetada en el repositorio.
- **Iterativo.** Cada capacidad se revisó con pruebas, auditorías, el ensayo técnico de los recorridos de los roles y correcciones, y esas revisiones modificaron requisitos, pantallas y pruebas ya hechas. Un hallazgo del ensayo o de una auditoría volvió a la cola de trabajo y salió en una versión posterior.

Cada cambio conserva su trazabilidad: necesidad u hallazgo, issue con sus criterios de aceptación, rama, pruebas, solicitud de integración y versión.

## 4.2 Las fases del plan

Las duraciones y fechas son las del plan presentado por el estudiante. Constituyen una **programación**, no un registro de lo ocurrido.

[[tabla: Fases del plan de prácticas]]

| Fase | Periodo previsto | Días hábiles |
| --- | --- | --- |
| 1. Requerimientos | 08/06/2026 a 03/07/2026 | 20 |
| 2. Análisis y modelado | 06/07/2026 a 07/08/2026 | 25 |
| 3. Arquitectura y entorno | 10/08/2026 a 28/08/2026 | 15 |
| 4. Desarrollo e implementación | 31/08/2026 a 23/10/2026 | 40 |
| 5. Pruebas y ajustes | 26/10/2026 a 06/11/2026 | 10 |
| 6. Documentación y entrega | 09/11/2026 a 20/11/2026 | 10 |
| **Total** | 08/06/2026 a 20/11/2026 | **120** |

[[fuente: Plan de prácticas preprofesionales presentado por el estudiante (documento del proyecto).]]

El plan cuenta todos los días de lunes a viernes. Las fichas de asistencia (Anexo A) descuentan los feriados nacionales ciertos (29/06, 28/07, 29/07 y 08/10) y por eso llegan hasta el 26/11/2026; esa diferencia es de calendario y no de alcance.

[[tabla: Evidencia disponible de cada fase]]

| Fase | Evidencia en el repositorio | Observación |
| --- | --- | --- |
| 1. Requerimientos | Documentos de levantamiento (diagnóstico, preguntas, contraste con el protocolo, requisitos, matrices) y matriz de formatos de los anexos | El historial del repositorio **comienza el 22/07/2026**. De lo hecho antes no hay evidencia versionada y se consigna «pendiente de acreditar» |
| 2. Análisis y modelado | Diagramas de casos de uso, esquema de datos y diagramas de diseño (Anexo B), historias de usuario y tareas técnicas | Los diagramas de clases, entidad-relación, actividades, secuencia, estados, componentes y despliegue se elaboraron en la fase de documentación |
| 3. Arquitectura y entorno | Arquitectura hexagonal del servidor, organización por funcionalidades del cliente, Docker e integración continua (primer commit del 22/07) | Descrita en el manual del sistema (Anexo E) |
| 4. Desarrollo e implementación | Versiones `v0.0.1` a `v0.4.4` y `v1.0.0-beta.1` (01/09 a 13/10/2026) | Sección 4.4 |
| 5. Pruebas y ajustes | Auditorías, pruebas de extremo a extremo, revisiones de seguridad, ensayo técnico del piloto y betas 2 a 4 (05/11 a 19/11/2026) | El desarrollo y las correcciones continuaron en las fases 5 y 6, de modo que las fechas reales no coinciden con las previstas |
| 6. Documentación y entrega | Manuales, informes de prácticas V01 a V04, control de evidencias y guía del piloto | En curso al corte |

Las fechas reales de cada fase no se reconstruyen a partir de lo previsto: se toman de las etiquetas y del historial del repositorio, y donde no hay evidencia se dice.

## 4.3 Lo que no se afirma

- **No se aplicó Scrum.** No se afirman eventos (planificación de sprint, reunión diaria, revisión, retrospectiva), roles ejercidos ni actas que no consten. En el repositorio figuran los términos «sprint», «Product Backlog», «historia de usuario» y «tarea técnica» y una plantilla de integración con casillas de visto bueno: son **artefactos de planificación** conservados como evidencia histórica, no la demostración de un marco de gestión.
- **No se aplicó Kanban.** Solo se afirmaría si se documentaran sus políticas de flujo y el control del trabajo en curso.
- **No se atribuyen** reuniones, entrevistas, participación de autoridades, horas ni aprobaciones sin fuente. Se usa «pendiente de acreditar».

[[tabla: Cómo se usan los términos históricos del repositorio]]

| Término | Significado en este informe |
| --- | --- |
| Historia de usuario (HU) | Requisito funcional redactado desde el punto de vista de quien lo usa; se vincula a pruebas en la matriz de trazabilidad |
| Tarea técnica (TT) | Trabajo que sostiene el sistema sin ser una función visible (arquitectura, pruebas, seguridad, documentación) |
| «Sprint» 1 a 6 | **Bloque de entrega**: agrupación de historias y tareas con una fecha objetivo, tal como las organizó el Product Backlog del proyecto. No se afirma la ejecución de las ceremonias |
| Product Backlog | Lista priorizada de historias y tareas |
| Definition of Done (DoD-SIT-001) | Lista de condiciones de un cambio terminado (compila, tiene pruebas, sin secretos, integración en verde) que se reproduce en cada solicitud de integración |

## 4.4 Bloques de entrega y versiones

[[tabla: Bloques de entrega y versiones etiquetadas]]

| Bloque | Versión etiquetada | Fecha de la etiqueta |
| --- | --- | --- |
| 1 | `v0.0.1` | 01/09/2026 |
| 2 | `v0.1.0` | 24/09/2026 |
| 3 | `v0.2.0` | 25/09/2026 |
| 4 | `v0.3.0` | 01/10/2026 |
| 5 y remediación | `v0.4.0` a `v0.4.4` | 09/10 a 12/10/2026 |
| 6 (pruebas integrales, piloto, despliegue y manuales) | `v1.0.0-beta.1` a `v1.0.0-beta.4` | 13/10, 05/11, 16/11 y 19/11/2026 |

[[fuente: Etiquetas del repositorio (git tag) y notas de cada versión (Anexo J).]]

Las versiones posteriores a `v0.4.1` son candidatas y no constan como entregadas formalmente a la institución.

## 4.5 Ciclo de trabajo de un cambio

Descrito a partir de cómo se integró el trabajo en el repositorio, con Git como sistema de control de versiones (Chacon y Straub, 2014):

1. **Necesidad o hallazgo:** una historia, una tarea, un hallazgo de auditoría o del ensayo, o una observación.
2. **Issue** con sus criterios de aceptación, de modo que el criterio de cierre existe antes del código.
3. **Rama propia** desde `develop` y cambios con mensajes de commit convencionales (Conventional Commits, s. f.).
4. **Pruebas** del cambio: del servidor con Jest, del cliente con Vitest y recorridos de extremo a extremo con Playwright cuando afecta un recorrido de usuario (Microsoft, s. f.).
5. **Solicitud de integración (pull request)** con una plantilla que reproduce la Definition of Done y enlaza el issue.
6. **Integración continua:** estilo, compilación, pruebas, auditoría de dependencias, ensayo de restauración del respaldo y extremo a extremo en Chrome; la construcción de imágenes Docker corre en `develop` y `main`.
7. **Fusión a `develop`** con commit de fusión y, para un lanzamiento, rama de versión, solicitud a `main`, etiqueta y retorno de `main` a `develop`.

Al corte del 19/11/2026 se habían fusionado 277 solicitudes de integración.

## 4.6 Verificación y calidad

La calidad se documenta con validaciones de entrada y de permisos, pruebas unitarias y de integración, recorridos de extremo a extremo, revisión de interfaz, las revisiones de seguridad (informe del 11/10 y repasos del 12/11 y del 19/11) y los controles de la integración continua. Cada resultado indica commit, entorno, fecha y alcance. Una ejecución verde de la integración continua **no** acredita por sí sola usabilidad con usuarios reales, cumplimiento integral del protocolo ni aceptación institucional. El ensayo técnico del piloto lo realizó el equipo de desarrollo con guiones automatizados y datos ficticios, y así se declara.

## 4.7 Ampliaciones respecto del levantamiento inicial

Los roles configurables (`v1.0.0-beta.2`) y la certificación del docente tutor en **modo de demostración** (`v1.0.0-beta.3`) están implementados y comprobados. Los certificados **no** tienen valor oficial: la plantilla, los logos, la firma y la autoridad firmante siguen pendientes de la DBU.

## 4.8 Pendientes de la metodología

- Confirmar con el asesor la denominación del enfoque («plan por fases con desarrollo iterativo e incremental»), pues el plan original no menciona un marco de gestión y el repositorio usa términos propios de Scrum como artefactos de planificación.
- Acreditar, si existen, las actividades previas al 22/07/2026 (fase 1) y los registros de asistencia, supervisión y horas.
