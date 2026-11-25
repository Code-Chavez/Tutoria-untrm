# Capítulo I. Introducción

## 1.1 Contexto institucional

La Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas (UNTRM) organiza el acompañamiento tutorial de sus estudiantes de pregrado mediante el Protocolo de Acompañamiento de Tutoría N.° 01-2024-UNTRM/DBU, elaborado por la Dirección de Bienestar Universitario (DBU) y aprobado por la Resolución de Consejo Universitario N.° 283-2024, del 22 de marzo de 2024 (Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas [UNTRM], 2024). El protocolo define quiénes participan (estudiantes, docentes tutores, coordinaciones de escuela y servicios especializados), qué actividades se realizan (entrevista inicial, sesiones, seguimiento, derivación) y qué formatos las respaldan.

En el plano nacional, la Ley Universitaria N.° 30220 establece entre los deberes de los docentes el de brindar tutoría a los estudiantes para orientarlos en su desarrollo profesional o académico (Ley 30220, 2014, art. 87). La tutoría es, por tanto, una obligación de la vida universitaria y no una actividad accesoria; y el tratamiento de los datos personales que produce está sujeto a la Ley de Protección de Datos Personales y a su reglamento (Ley 29733, 2011; Decreto Supremo 016-2024-JUS, 2024).

## 1.2 Planteamiento del problema

La tutoría universitaria exige que la información de cada estudiante mantenga continuidad entre el registro inicial, las actividades de acompañamiento, el seguimiento y, si corresponde, la atención de un servicio especializado. Cuando esos registros viven en formatos sueltos, la historia de cada caso es difícil de reconstruir: no se sabe quién atendió qué, qué se acordó y qué sucedió después. Estudios sobre el funcionamiento de la tutoría en universidades peruanas encuentran carencias de este tipo; por ejemplo, la evaluación del sistema de tutoría de la Universidad Nacional de San Martín identificó falta de acceso a la información de los estudiantes y ausencia de planificación y de documentación que apoyen a los tutores (García-Castro et al., 2023).

El plan de prácticas formula la necesidad de **sistematizar el registro, el seguimiento y el reporte** de las actividades tutoriales de la FISME. El diagnóstico disponible es documental: describe cómo se relacionan las actividades y qué datos exige el protocolo, pero no mide cuántos expedientes se perdían, cuánto tiempo demandaban las tareas ni con qué frecuencia ocurrían errores. Por eso el informe presenta la centralización y la trazabilidad como objetivos de la solución y no como mejoras cuantificadas ya demostradas.

## 1.3 Justificación

La permanencia estudiantil depende, entre otros factores, de la integración académica y social del estudiante con su institución (Tinto, 1975), y la tutoría es uno de los espacios donde esa integración puede acompañarse. Un sistema que ordena la solicitud, la sesión, el seguimiento y la derivación no sustituye el criterio del docente o del profesional, pero reduce la pérdida de información, hace visibles los casos que nadie atendió y da a la coordinación datos para planificar y evaluar el servicio. Al tratar datos personales y sensibles, exige además controlar quién puede consultar o modificar cada dato (roles, permisos, alcance y auditoría). El proyecto permite, por último, aplicar de forma integrada el análisis de requisitos, el diseño, la implementación, las pruebas, la seguridad y la documentación de un sistema real, con las restricciones de una institución pública.

## 1.4 Alcance y límites

El sistema contempla autenticación, usuarios con roles y permisos configurables, estudiantes, matrícula por periodo, asignación de un docente tutor por ciclo con su aceptación, entrevistas, red de apoyo, expediente, solicitudes, sesiones individuales y grupales, asistencia, seguimiento, evidencias, derivaciones, notificaciones, evaluación, planes semestrales, informes, indicadores, cierre del periodo, pedidos de listas por correo, amonestaciones, certificados de demostración, catálogos, parámetros, identidad visual y bitácora de auditoría.

El alcance técnico no equivale a una puesta en producción institucional. La existencia de código, pruebas o imágenes de despliegue acredita productos del desarrollo; la operación real requiere infraestructura, responsables y conformidad de entrega. El sistema tampoco sustituye el criterio profesional de los servicios de salud, psicología o asistencia social. Los certificados de los docentes tutores son **solo de demostración** hasta que la DBU entregue el formato oficial. Las ampliaciones de roles configurables y de certificación surgieron de un levantamiento propio posterior al plan y se distinguen del alcance original.

## 1.5 Objetivos

### 1.5.1 Objetivo general

Desarrollar un sistema de información que permita sistematizar los procesos del Protocolo de Acompañamiento de Tutoría N.° 01-2024-UNTRM/DBU de la UNTRM, mejorando la gestión del registro, el seguimiento y el reporte de las actividades tutoriales.

### 1.5.2 Objetivos específicos

1. Levantar y documentar los requerimientos funcionales y no funcionales del proceso tutorial a partir del protocolo y de las necesidades informáticas de la DBU.
2. Analizar y modelar la arquitectura y la base de datos, considerando procesos, casos de uso y un modelo entidad-relación.
3. Diseñar interfaces adaptables a dispositivos móviles y de escritorio con flujos ágiles para los usuarios previstos.
4. Desarrollar los módulos esenciales, incluyendo la carga desde Excel, la autenticación y el almacenamiento seguro de evidencias.
5. Validar la solución mediante pruebas de rendimiento, usabilidad y seguridad, y mediante un piloto con usuarios reales.
6. Elaborar la documentación técnica y de usuario necesaria para la instalación, la operación y el uso funcional.

## 1.6 Datos generales de las prácticas

[[tabla: Datos generales de las prácticas]]

| Dato | Información |
| --- | --- |
| Estudiante | Brayni Chavez Caruajulca |
| Escuela profesional | Ingeniería de Sistemas, FISME, UNTRM |
| Asesor | Mg. Eder Nicanor Figueroa Piscoya (nombre oficial por confirmar: el cuerpo del plan usa otra variante) |
| Lugar de ejecución previsto en el plan | Dirección de Bienestar Universitario, Chachapoyas, Amazonas. La ciudad de la carátula, Bagua, corresponde a la presentación del documento |
| Duración programada | 120 días hábiles, de lunes a viernes, desde el 08/06/2026 |
| Fin según el plan | 20/11/2026 (sin descontar feriados); 26/11/2026 descontando los feriados nacionales ciertos (29/06, 28/07, 29/07 y 08/10), que es el calendario de las fichas de asistencia del Anexo A |
| Supervisor inmediato, horas efectivas, asistencia y constancias | Pendiente de acreditar: el repositorio no contiene esos registros |
| Producto principal | Sistema de información SIT-UNTRM, con sus documentos de análisis, pruebas y operación |

La duración programada es una **programación**; no equivale a las horas efectivamente acreditadas, que este informe no declara. La asistencia se acredita con las fichas firmadas por la persona encargada (Anexo A).

## 1.7 Estructura del informe

El Capítulo II reúne el marco teórico y normativo; el III, el diagnóstico y los requisitos; el IV, la metodología; el V, el diseño y el desarrollo; el VI, las pruebas y los resultados con sus límites; y el VII, las dificultades, las conclusiones y las recomendaciones. Siguen las referencias en formato APA 7 y los anexos (A a L), que reúnen la evidencia. Las cifras del proyecto (pruebas, fechas de versiones, historial) provienen del repositorio de código y de su integración continua, con el commit o el anexo que las respalda; esos documentos propios son **evidencia** en los anexos y no figuran como referencias bibliográficas.
