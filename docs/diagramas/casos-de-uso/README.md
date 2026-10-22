# Diagramas de casos de uso — SIT UNTRM

Elaboración: 18/10/2026. Referencia consultada: HEAD local `8c420d1` y archivos de trabajo presentes en navegación/secciones. Versión de producto objetivo comunicada: `v1.0.0-beta.1`; los diagramas no afirman que esa versión esté publicada ni aceptada. Son un modelo descriptivo para revisar e incorporar al informe de prácticas.

## Entregables

Cada diagrama tiene una imagen PNG para Word, un SVG vectorial para ampliar sin perder nitidez y una fuente PlantUML `.puml` editable. La representación SVG/PNG usa el mismo catálogo de actores, casos y asociaciones que la fuente. El generador reproducible es `../generar_casos_uso.py` (Python y Pillow).

| Figura | Contenido | Casos |
|---|---|---|
| 1 | Vista general | G01–G08, resumen de procesos |
| 2 | Acceso y cuenta personal | AC01–AC06 |
| 3 | Portal del estudiante | ES01–ES06 |
| 4 | Acompañamiento del docente tutor | AT01–AT09 |
| 5 | Preparación y gestión del periodo | PE01–PE09 |
| 6 | Derivación y atención especializada | DE01–DE08 |
| 7 | Informes y evaluación del servicio | IN01–IN08 |
| 8 | Administración y supervisión | AD01–AD09 |

## Actores y alcance

- **Estudiante:** corresponde al rol interno `Tutorado`; sus solicitudes, sesiones y evaluación.
- **Docente tutor:** rol interno `Docente Tutor`; estudiantes asignados, acompañamiento y documentos propios.
- **Coordinador de tutoría:** rol `Coordinador`; alcance de escuelas asignadas, sin acceso general a notas de servicios.
- **Profesional de servicio:** rol `Profesional de Servicio`; especialidad/servicio determina qué casos puede atender. Comprende Psicopedagogía, Psicología, Asistencia Social y Salud, y el destino Escuela Profesional cuando la configuración y permisos lo contemplen. No son cinco permisos globales independientes.
- **Administrador (DBU):** rol `Administrador DBU`; gestión y supervisión autorizadas. Su participación en una categoría general no implica realizar todas las acciones del docente.
- **Vicerrectorado:** informes/indicadores y gestión de sedes tal como aparecen actualmente en configuración. No se etiqueta como solo lectura de todo el sistema, porque el código actual incluye `campuses:manage`.
- **Decano:** amonestaciones dentro de su facultad.
- **Usuario del sistema:** abstracción empleada solo en el diagrama de cuenta, que representa a los siete actores humanos anteriores; no constituye un rol adicional que deba crearse en la base de datos.

## Convenciones UML

Los actores están fuera del rectángulo del SIT y los casos dentro, representados por elipses. Las líneas sólidas representan asociación/participación; no indican orden temporal, flujo de datos ni acceso irrestricto. Los identificadores son de estos diagramas y no reemplazan códigos RF/HU del backlog.

No se utilizan flechas `include`/`extend` para simular una secuencia de pantallas. Iniciar sesión es una precondición para operaciones protegidas, no un caso incluido que se ejecute nuevamente en cada acción. Recuperación e ingreso tienen condiciones distintas. Las sugerencias forman parte de la evaluación, y los casos individuales/grupales se agrupan a este nivel para mantener legibilidad.

G01–G08 son agregaciones de alto nivel; para responsabilidades precisas utilizar las figuras de detalle. IN08 significa exportar solamente informes autorizados para ese actor: no atribuye al docente exportación de un consolidado institucional ni a Vicerrectorado resultados individuales de evaluación.

## Fuentes y límites

Se contrastaron `client/src/shared/components/layout/navigation.ts`, `sections.ts`, permisos de `server/src/infrastructure/bootstrap/seedBase.ts`, rutas de autenticación, asignación, asignación por ciclo, plan semestral, amonestaciones y casos de uso de amonestaciones/vinculación de cuenta. Se consideró además la revisión de interfaz del 17/10 y el alcance documental previamente aportado.

No representan nuevas pruebas de ejecución ni certifican cumplimiento de anexos. Las firmas y formularios oficiales deben validarse con DBU. No se dibujó como implementada la propuesta de crear una cita o derivación directamente desde una solicitud. Los correos son un medio de soporte; no se atribuyó ingreso al SIT a una escuela que solo recibe un correo. Tampoco se presenta SMTP como persona usuaria.

Las tareas automáticas de respaldo y despliegue no se mezclan con los objetivos de los actores funcionales en estas figuras; corresponden al manual técnico y, si se requiere, a un modelo operativo aparte. La aceptación por enlace del docente debe documentarse con su mecanismo y autorización específica antes de ampliar ese recorrido: PE05 representa la solicitud de aceptación realizada por coordinación/DBU.

## Uso en el informe

Insertar figura 1 para alcance global y las figuras de detalle en análisis funcional o anexos. Pie sugerido: «Figura N. Casos de uso de [proceso]. Elaboración propia, a partir del código y los roles del SIT UNTRM, corte 18/10/2026». Revisar con asesor/DBU las responsabilidades antes de presentar como modelo aprobado.

Este paquete no modifica el informe Word existente. Para un documento de especificación completo se pueden ampliar los casos con objetivo, precondiciones, flujo principal, alternativas, postcondiciones y RF/HU relacionados; las imágenes por sí solas no sustituyen esas fichas.
