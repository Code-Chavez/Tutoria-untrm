# Informe de prácticas preprofesionales

**Borrador de trabajo al 10 de octubre de 2026.** Se construye a partir del plan presentado por el estudiante, los documentos del proyecto y las evidencias disponibles. La estructura es provisional: no se ha verificado un formato oficial de informe final de la Escuela Profesional de Ingeniería de Sistemas. Este borrador no acredita horas, aprobación del plan ni culminación de prácticas.

## Datos para la carátula

- Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas.
- Facultad de Ingeniería de Sistemas y Mecánica Eléctrica.
- Escuela Profesional de Ingeniería de Sistemas.
- Estudiante: Brayni Chavez Caruajulca.
- Proyecto: Sistema de Información para la Sistematización de los Procesos de Acompañamiento de Tutoría Universitaria de la Facultad de Ingeniería de Sistemas y Mecánica Eléctrica.
- Lugar de ejecución consignado en el plan: Dirección de Bienestar Universitario de la UNTRM, Chachapoyas, Amazonas.
- Periodo previsto: 8 de junio al 20 de noviembre de 2026.
- Duración consignada en el plan: 120 días hábiles. No equivale a horas efectivamente acreditadas.
- Asesor en la carátula del plan: Mg. Eder Nicanor Figueroa Piscoya. El cuerpo y pie de firmas usan «Eder Figueroa»; confirmar el nombre oficial antes de cerrar la carátula.
- Lugar y año de presentación consignados en la carátula del plan: Bagua, Amazonas, 2026.

La redacción del título regulariza ortografía y conectores del plan. Para la versión de entrega debe cotejarse con el título formal registrado, si existe una resolución o constancia.

## Índice provisional

1. Resumen.
2. Introducción.
3. Información de la institución y del área de prácticas.
4. Diagnóstico y alcance del proyecto.
5. Objetivos de las prácticas.
6. Metodología y planificación.
7. Actividades realizadas y desarrollo del sistema.
8. Pruebas de calidad y resultados.
9. Dificultades, soluciones y aprendizaje profesional.
10. Conclusiones.
11. Recomendaciones.
12. Referencias.
13. Anexos.

La carátula, índices de tablas y figuras y las secciones preliminares adicionales se ajustarán al formato exigido por la escuela. No se añade una hipótesis ni un experimento de tesis si no corresponde al informe de prácticas.

## Introducción

El presente informe documenta el trabajo vinculado al desarrollo del Sistema de Información para la Sistematización de los Procesos de Acompañamiento de Tutoría Universitaria de la Facultad de Ingeniería de Sistemas y Mecánica Eléctrica de la UNTRM. El proyecto toma como referencia el Protocolo de Acompañamiento de Tutoría N° 01-2024-UNTRM/DBU, aprobado mediante la R.C.U. N° 283-2024, y tiene como propósito apoyar el registro, seguimiento y reporte de las actividades tutoriales.

El plan presentado organiza el trabajo en seis fases: levantamiento de requerimientos, análisis y modelado, diseño de arquitectura, desarrollo e implementación, pruebas y ajustes, y documentación y entrega final. El informe relacionará estas actividades con los productos obtenidos y las evidencias que permitan comprobarlos. También describirá las dificultades, las decisiones técnicas y el aprendizaje profesional durante las prácticas.

En esta versión de trabajo se distingue la planificación de la ejecución acreditada. Los resultados definitivos se incorporarán a partir de pruebas, documentos, registros y conformidades verificables. Las actividades de piloto, capacitación y puesta en producción no se darán por realizadas únicamente porque figuren en el cronograma o porque el software funcione en un entorno local.

## Información de la institución y del área

Según el plan presentado, la institución receptora es la UNTRM y el lugar de ejecución es su Dirección de Bienestar Universitario, en Chachapoyas. El ámbito funcional del proyecto corresponde a los procesos de acompañamiento tutorial de FISME.

Por completar con información oficial o confirmada: unidad en la que se realizó efectivamente el trabajo, responsable inmediato, funciones del área, relación con FISME, modalidad de prácticas, horario y actividades complementarias. La sede de ejecución y la ciudad indicada en la carátula se documentarán por separado.

## Diagnóstico y alcance

El proyecto aborda el registro de estudiantes, la asignación de docentes, las solicitudes de tutoría, las entrevistas, las sesiones y asistencias, el seguimiento, las derivaciones a servicios especializados, la evaluación y los reportes. La información de atención personal requiere controles de acceso y una separación clara de responsabilidades.

Para sostener el diagnóstico institucional se necesitan evidencias de cómo se ejecutaba el proceso antes del sistema: formularios utilizados, responsables, recorrido de información y dificultades observadas. No se afirmará que hubo pérdida de expedientes, retrasos o errores frecuentes sin una fuente. Tampoco se atribuirá una reducción porcentual de tiempos sin mediciones comparables.

El cambio de nombres y roles solicitado el 10 de octubre de 2026 debe registrarse como propuesta de ajuste del producto hasta comprobar su implementación y aceptación. No sustituye retroactivamente los roles consignados en el plan presentado.

## Objetivos

### Objetivo general

Desarrollar un sistema de información que permita sistematizar los procesos del Protocolo de Acompañamiento de Tutoría N° 01-2024-UNTRM/DBU de la Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas, mejorando la gestión del registro, seguimiento y reporte de las actividades tutoriales.

### Objetivos específicos del plan

1. Levantar y documentar los requerimientos funcionales y no funcionales de la tutoría universitaria a partir del protocolo y las necesidades informáticas de la DBU.
2. Analizar y modelar la arquitectura y la base de datos, incluyendo procesos AS-IS y TO-BE, casos de uso y modelo entidad-relación.
3. Diseñar interfaces adaptables a dispositivos móviles y de escritorio, con flujos ágiles para los usuarios previstos.
4. Desarrollar e implementar los módulos esenciales, incluyendo carga de Excel, mecanismos de autenticación y repositorios seguros de evidencias.
5. Validar el sistema mediante pruebas de rendimiento, usabilidad y seguridad, y un piloto con usuarios reales.
6. Elaborar documentación técnica y de usuario, incluyendo instalación, operación y uso funcional.

Estos objetivos se resumen del plan. Su cumplimiento se argumentará individualmente con evidencia; no se cambiarán para ocultar actividades pendientes.

## Metodología y planificación

El plan presentado establece las siguientes fechas previstas:

| Fase | Periodo planificado | Días consignados |
| --- | --- | --- |
| Recopilación y requerimientos | 08/06/2026 a 03/07/2026 | 20 |
| Análisis y modelado | 06/07/2026 a 07/08/2026 | 25 |
| Arquitectura y entorno | 10/08/2026 a 28/08/2026 | 15 |
| Desarrollo e implementación | 31/08/2026 a 23/10/2026 | 40 |
| Pruebas y ajustes | 26/10/2026 a 06/11/2026 | 10 |
| Documentación y entrega | 09/11/2026 a 20/11/2026 | 10 |

Las fechas reales y desviaciones se incorporarán desde el registro de actividades. El cronograma posterior del Product Backlog/Sprint Backlog debe cotejarse con este plan, pues no todos sus periodos de desarrollo y estabilización coinciden. Se explicará la diferencia con una versión documentada del cronograma, sin modificar silenciosamente el plan presentado.

Los documentos del proyecto incorporan historias de usuario, backlog priorizado, tareas técnicas y Definition of Done. Para describir Scrum como metodología efectivamente aplicada, se necesitan evidencias de planificación, seguimiento, revisión y retrospectiva; la existencia de un backlog no acredita por sí sola todas esas prácticas.

## Actividades y desarrollo del sistema

El repositorio local contiene una aplicación web con frontend React, Vite y TypeScript; backend Node.js, Express y TypeScript; PostgreSQL y Prisma para persistencia; y Docker para el entorno. Su estructura documenta una separación del backend en dominio, aplicación, infraestructura e interfaces, y una organización del frontend por funcionalidades.

El informe explicará para cada módulo la necesidad atendida, la participación del practicante, la solución implementada y cómo se comprobó. Se incorporarán diagramas y capturas del commit elegido para el informe. Antes de citarlos como versión entregada, se verificará su correspondencia con el repositorio GitHub indicado por el estudiante.

| Actividad | Evidencia disponible o candidata | Información que falta cerrar |
| --- | --- | --- |
| Requerimientos y planificación | RF, RNF, HU, backlog, estimación, DoD y sprint backlog suministrados | Versiones, validación y cambios de alcance |
| Procesos y modelado | Modelos propuestos en los objetivos; esquema Prisma del repositorio | Diagramas AS-IS/TO-BE, casos de uso y MER finales |
| Arquitectura y entorno | README, estructura de código, configuración e historial Git | Justificación y diagramas de la versión elegida |
| Implementación de módulos | Código, migraciones y commits | Participación efectiva y relación HU con entregables |
| Auditoría y ajustes | Informes del 6 y 8 de octubre, correcciones posteriores | Revalidación de hallazgos contra el commit final |
| Pruebas | Matriz de trazabilidad y evidencias de aceptación del 9 de octubre | Logs, capturas, pendientes visuales y resultados finales |
| Piloto con usuarios | Previsto en el plan | Participantes, instrumento, consentimiento aplicable y resultados |
| Documentación y entrega | Prevista en el plan | Manuales finales y constancia o acta de entrega |

## Pruebas y resultados

El repositorio incluye una matriz que relaciona historias de usuario y pruebas, además de reportes de aceptación. El documento de las secciones 1 a 6 del 9 de octubre describe comprobaciones de API y revisión del inicio/menú por roles; también identifica aspectos visuales y de interacción que no reemplaza. El documento de la sección 7 registra ensayos de respaldo, restauración, migración y arranque de producción con datos de prueba.

Estas fuentes son evidencia documental candidata, no una nueva ejecución realizada para este informe. Sus resultados deben citarse con fecha, commit, entorno, responsable y limitaciones. Una prueba API no se presentará como prueba de interacción completa en navegador, y un ensayo local no se presentará como despliegue institucional.

Por completar: matriz consolidada de casos ejecutados, fallidos y pendientes; defectos corregidos y regresión; pruebas de carga; evaluación de usabilidad; lectura de PDF/Excel; resultado del piloto. No se reutilizarán cifras de pruebas de una versión anterior como métricas del release final.

## Dificultades y aprendizaje

Por desarrollar a partir de la experiencia real: dificultades de requisitos, cambios de alcance, protección de datos, coordinación, integración, pruebas y documentación. Para cada dificultad: situación, acción tomada, resultado y aprendizaje. Los defectos registrados por la auditoría pueden servir como evidencia técnica, pero no sustituyen la descripción personal del trabajo.

## Conclusiones y recomendaciones

Las conclusiones finales se redactarán por objetivo y con evidencia. Mientras las prácticas continúen, se documentarán avances y pendientes. No se afirma todavía que se completó el piloto, mejoró la atención institucional ni se realizó la entrega formal.

Las recomendaciones se orientarán a la operación y sostenibilidad que efectivamente requiera la versión entregada: responsables, capacitación, respaldos, monitoreo, mantenimiento y seguimiento de mejoras. Los procedimientos detallados irán en los manuales posteriores, no se duplicarán dentro del informe.

## Referencias y anexos previstos

- Plan de prácticas presentado por Brayni Chavez Caruajulca, PDF suministrado por el estudiante, 6 páginas.
- Protocolo de Acompañamiento de Tutoría N° 01-2024-UNTRM/DBU y su resolución.
- Documentos de requisitos y planificación del proyecto.
- Repositorio y versión concreta usada para las evidencias.
- Diagramas, capturas anonimizadas, registros de prueba y matriz de trazabilidad.
- Constancias, control de actividades, conformidades y acta de entrega, cuando existan.

El estilo de referencias se ajustará al formato exigido. No se adjuntarán credenciales, tokens, notas clínicas ni datos de estudiantes reales.

## Ruta de documentación acordada

Ahora: informe de prácticas, documentación de análisis/diseño y matriz de evidencias. Después, conforme a la solicitud del estudiante:

1. Manual de usuario organizado por los perfiles y tareas de la versión definitiva.
2. Manual del sistema con arquitectura, datos, API, seguridad, configuración y mantenimiento.
3. Manual de instalación con requisitos, preparación, configuración, migraciones y verificación.
4. Manual de despliegue y operación con infraestructura, HTTPS, secretos, respaldos, restauración, monitoreo y recuperación.

Los manuales se elaborarán sobre una versión identificada del software. No se redactan en esta etapa.

## Búsqueda de modelos

Consulta realizada el 10 de octubre de 2026. No se pudo verificar un modelo oficial de informe de prácticas de Ingeniería de Sistemas desde el repositorio institucional: su acceso presentó una página de protección. La página de [formatos institucionales de la UNTRM](https://untrm.edu.pe/formatos-institucionales/) consultada contiene formatos de titulación, pero no se identificó allí la estructura específica necesaria para este informe.

Se localizó una [presentación de prácticas sobre un sistema para la OTI de la UNTRM](https://es.scribd.com/document/624311298/ppt-Informe-final-de-practicas), atribuida a Jairo Vallejos Chuquizuta. Su organización separa información del área, actividades, resultados y aprendizaje. Es una referencia ilustrativa publicada en un sitio externo, no un formato oficial verificado ni material para copiar. La estructura de este borrador debe validarse con la guía de la escuela o el asesor.
