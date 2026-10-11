# Informe de prácticas preprofesionales

Sistema de Información para la Sistematización de los Procesos de Acompañamiento de Tutoría Universitaria de la Facultad de Ingeniería de Sistemas y Mecánica Eléctrica

Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas

Facultad de Ingeniería de Sistemas y Mecánica Eléctrica

Escuela Profesional de Ingeniería de Sistemas

Estudiante: Brayni Chavez Caruajulca

Asesor: Mg. Eder Nicanor Figueroa Piscoya

Bagua, Amazonas, 2026

Avance al 10 de octubre de 2026

## 1 Resumen

El proyecto de prácticas preprofesionales se orienta al desarrollo de un sistema de información para apoyar los procesos de acompañamiento tutorial de la Facultad de Ingeniería de Sistemas y Mecánica Eléctrica de la Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas. Su referencia funcional es el Protocolo de Acompañamiento de Tutoría N° 01-2024-UNTRM/DBU, aprobado mediante la R.C.U. N° 283-2024. El sistema reúne funciones de gestión de estudiantes, asignación de docentes, solicitudes, entrevistas, sesiones, asistencia, seguimiento, derivaciones, evaluación y reportes [1, 2].

El trabajo se organiza mediante requerimientos funcionales y no funcionales, historias de usuario, un backlog priorizado y criterios de terminado. La solución tecnológica comprende una interfaz web con React y TypeScript, una API con Node.js y Express, persistencia en PostgreSQL mediante Prisma y un entorno basado en Docker. La verificación incluye pruebas unitarias, de integración, de acceso y recorridos de aceptación [3-10].

Al corte del informe existen productos de planificación, implementación y verificación técnica. Los registros del proyecto también señalan comprobaciones pendientes y la necesidad de completar el piloto con usuarios, las mediciones de rendimiento y la documentación de entrega. Este avance describe los productos y las limitaciones del trabajo, sin atribuir una mejora institucional cuantificada que todavía no ha sido medida.

## 2 Introducción

La tutoría universitaria requiere que la información de cada estudiante mantenga continuidad entre el registro inicial, las actividades de acompañamiento, el seguimiento y, cuando corresponda, la derivación a un servicio especializado. Además de registrar esas actuaciones, es necesario identificar sus responsables, conservar los antecedentes y producir información útil para evaluar el servicio. La naturaleza personal de algunos datos obliga a controlar quién puede consultarlos y modificarlos.

El proyecto planteado en el plan de prácticas busca sistematizar ese recorrido mediante una aplicación web. Su alcance comprende tanto las tareas cotidianas del docente como las funciones de administración y consulta necesarias para organizar el servicio tutorial. El protocolo y sus formatos constituyen el punto de partida para identificar los datos y procesos que el sistema debe representar [1, 2].

El presente informe desarrolla el contexto, los objetivos, la organización del trabajo, la solución técnica y los avances de verificación. La exposición vincula los productos con sus evidencias y diferencia los resultados registrados de las actividades previstas. El periodo consignado en el plan abarca del 8 de junio al 20 de noviembre de 2026; por ello, el corte del 10 de octubre corresponde a un avance y no a la culminación formal de las prácticas [1].

## 3 Información general de las prácticas

### 3.1 Institución y ámbito de ejecución

La institución consignada en el plan es la Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas. El lugar de ejecución previsto es la Dirección de Bienestar Universitario, en la ciudad de Chachapoyas, región Amazonas. El proyecto se enfoca en los procesos de acompañamiento tutorial de FISME. La ciudad indicada en la carátula, Bagua, corresponde a la presentación del documento y no sustituye el lugar de ejecución señalado en el plan [1].

La solución involucra estudiantes, docentes y personal responsable de la gestión y de los servicios especializados. El diseño de sus funciones debe relacionarse con las responsabilidades del proceso tutorial, de modo que la digitalización mantenga la continuidad de atención y proteja los antecedentes personales del estudiante.

### 3.2 Periodo y producto principal

El plan establece una duración de 120 días hábiles distribuida en seis fases. Esta duración representa la programación presentada y debe distinguirse del registro de asistencia y de las horas efectivamente acreditadas. El producto principal es el sistema de información, acompañado por sus documentos de análisis, pruebas y operación [1].

La documentación final comprende el informe de prácticas y los manuales de usuario, sistema, instalación y despliegue. Estos últimos se elaborarán sobre una versión identificada del software, para que sus instrucciones coincidan con la aplicación entregada.

## 4 Diagnóstico y alcance del proyecto

### 4.1 Necesidad que atiende la solución

El plan identifica la necesidad de sistematizar el registro, seguimiento y reporte de actividades tutoriales. Desde el punto de vista del diseño de información, estas actividades están relacionadas: una solicitud puede originar una sesión, una sesión puede requerir seguimiento y un caso puede continuar en un servicio especializado. Si cada registro se trata como un dato independiente, resulta más difícil reconstruir el recorrido de atención y relacionarlo con los reportes [1-3].

El diagnóstico documental se centra en esa necesidad de articulación. No permite, por sí solo, establecer cuántos expedientes se perdían, cuánto tiempo demandaban las tareas o con qué frecuencia ocurrían errores en la institución. Para medir esos aspectos se requiere una línea de base y evidencia del proceso anterior. Por tanto, la centralización y la trazabilidad se presentan como objetivos de la solución, no como beneficios cuantificados ya demostrados.

### 4.2 Necesidades funcionales y de calidad

La gestión de estudiantes exige registros consistentes, control de duplicados y asignación de responsables. La atención tutorial requiere formularios, calendario, asistencia y seguimiento. Las derivaciones demandan un recorrido de estados y una separación de la información según el servicio y la participación del usuario. La evaluación y los reportes necesitan datos coherentes con el periodo académico y criterios definidos para contabilizar las actividades [2, 3].

Las necesidades de calidad abarcan validación de entradas, autenticación, permisos, integridad de datos, respuesta ante errores y facilidad de uso. La interfaz debe permitir completar tareas frecuentes sin solicitar información que ya se encuentra registrada. Esta simplificación no debe eliminar datos necesarios para el proceso ni sustituir confirmaciones por valores inventados.

### 4.3 Alcance y límites

El sistema contempla autenticación, usuarios, estudiantes, asignación, entrevistas, red de apoyo, expediente, solicitudes, sesiones individuales y grupales, asistencia, seguimiento, evidencias, derivaciones, notificaciones, evaluación, planes semestrales, informes y catálogos [3, 5].

El alcance técnico descrito no equivale a una puesta en producción institucional. La existencia de código, pruebas o imágenes de despliegue acredita productos del desarrollo, mientras que la operación real requiere infraestructura, responsables y conformidad de entrega. Tampoco corresponde presentar el sistema como sustituto del criterio profesional de los servicios de salud, psicología o asistencia social.

## 5 Objetivos de las prácticas

### 5.1 Objetivo general

Desarrollar un sistema de información que permita sistematizar los procesos del Protocolo de Acompañamiento de Tutoría N° 01-2024-UNTRM/DBU de la Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas, mejorando la gestión del registro, seguimiento y reporte de las actividades tutoriales [1].

### 5.2 Objetivos específicos

1. Levantar y documentar los requerimientos funcionales y no funcionales del proceso tutorial a partir del protocolo y las necesidades informáticas de la DBU.
2. Analizar y modelar la arquitectura y la base de datos, considerando procesos AS-IS y TO-BE, casos de uso y un modelo entidad-relación.
3. Diseñar interfaces adaptables a dispositivos móviles y de escritorio con flujos ágiles para los usuarios previstos.
4. Desarrollar los módulos esenciales, incluyendo carga de Excel, autenticación y almacenamiento seguro de evidencias.
5. Validar la solución mediante pruebas de rendimiento, usabilidad y seguridad, y mediante un piloto con usuarios reales.
6. Elaborar la documentación técnica y de usuario necesaria para la instalación, operación y uso funcional [1].

## 6 Metodología y organización del trabajo

### 6.1 Fases del plan

El plan organiza el trabajo desde la comprensión del proceso hasta la entrega. Las dos primeras fases reúnen requerimientos y modelado; la tercera define arquitectura y entorno; la cuarta desarrolla la aplicación; y las dos últimas se destinan a pruebas, ajustes y documentación [1].

| Fase | Periodo previsto | Días |
| --- | --- | --- |
| Requerimientos | 08/06/2026 a 03/07/2026 | 20 |
| Análisis y modelado | 06/07/2026 a 07/08/2026 | 25 |
| Arquitectura y entorno | 10/08/2026 a 28/08/2026 | 15 |
| Desarrollo e implementación | 31/08/2026 a 23/10/2026 | 40 |
| Pruebas y ajustes | 26/10/2026 a 06/11/2026 | 10 |
| Documentación y entrega | 09/11/2026 a 20/11/2026 | 10 |

El Product Backlog y el Sprint Backlog incorporan una programación posterior por sprints. Las diferencias entre ambos cronogramas deben registrarse al comparar ejecución y planificación; las fechas previstas no se utilizarán como prueba de que cada actividad ocurrió ese día [1, 6].

### 6.2 Organización incremental

Los documentos del proyecto descomponen las funciones en historias de usuario y tareas técnicas. El backlog prioriza los accesos y la seguridad como base de los módulos posteriores. La estimación de tareas permite organizar el esfuerzo, mientras que la Definition of Done establece condiciones de aceptación, código, pruebas, documentación e integración [5-7].

Esta organización favorece la construcción incremental: cada cambio puede relacionarse con una necesidad, verificarse y revisarse antes de integrarse. La descripción de ceremonias y participación de usuarios en Scrum requiere sus respectivos registros; la presencia de estos artefactos no demuestra por sí sola la ejecución completa del marco de trabajo.

### 6.3 Trazabilidad y control de versiones

Git permite identificar modificaciones y versiones del software. La matriz de trazabilidad relaciona historias con pruebas del servidor, cliente y aceptación. Esta relación ayuda a distinguir las funciones con evidencia de comprobación de aquellas que todavía necesitan recorridos adicionales [8, 10].

Para el informe se toma como referencia técnica el checkout local en el commit c4ef02b949db1a6d29b90ecce11ba4f179f0f547. Esta referencia delimita el código consultado y no constituye una constancia de entrega institucional. Cada evidencia final deberá conservar su fecha, versión, entorno y resultado.

## 7 Actividades y desarrollo de la solución

### 7.1 Documentación de requerimientos

La documentación disponible comprende requerimientos funcionales y no funcionales, historias de usuario, riesgos y tareas técnicas. Los requerimientos funcionales describen las operaciones esperadas; los no funcionales establecen condiciones de seguridad, integridad, disponibilidad, rendimiento y usabilidad. Las historias permiten relacionar cada función con el usuario que la necesita y con sus criterios de aceptación [3-5].

La diferencia entre una función implementada y una aceptada es relevante para el seguimiento. Una pantalla puede existir sin que todos sus casos límite estén verificados. Por ello, la documentación y la matriz de pruebas deben mantenerse relacionadas, especialmente cuando se modifica el alcance o se detecta un defecto.

### 7.2 Arquitectura y entorno

El backend se organiza en dominio, aplicación, infraestructura e interfaces. El dominio representa entidades y contratos; la aplicación agrupa casos de uso; la infraestructura conecta persistencia y servicios; y las interfaces exponen las operaciones HTTP. La finalidad de esta separación es limitar el acoplamiento entre reglas del proceso y mecanismos externos [8].

El frontend usa React, Vite y TypeScript y se organiza por funcionalidades. PostgreSQL almacena la información, mientras que Prisma describe el esquema y administra migraciones. Docker permite reunir los servicios en un entorno reproducible. Esta configuración facilita preparar entornos de comprobación, aunque no reemplaza la definición de una infraestructura institucional de operación [8, 12].

### 7.3 Accesos y protección de información

La implementación incluye autenticación, gestión de sesiones y autorización. Los controles deben verificar tanto el permiso para realizar una operación como el alcance de los datos: estudiantes asignados a un docente, casos de un servicio o información propia del estudiante. La misma restricción debe aplicarse en la API aunque el usuario intente acceder por una dirección directa [3, 8].

Los cambios documentados en el historial incluyen ajustes de segmentación, cuentas inactivas, renovación de sesiones y recuperación de contraseña. Su importancia radica en proteger el recorrido de atención y evitar que un cambio de cuenta o de permiso mantenga información disponible indebidamente. La efectividad de cada control se argumenta con las pruebas correspondientes, no únicamente con la presencia del código.

### 7.4 Registro y acompañamiento tutorial

El módulo de estudiantes reúne registro individual, importación, asignación y consulta del expediente. La entrevista inicial y la red de apoyo agregan información necesaria para el acompañamiento. El expediente relaciona antecedentes y actuaciones para que el docente pueda consultar la continuidad del proceso [3, 10].

Las sesiones incorporan programación, modalidad, reprogramación, cancelación y asistencia. La asistencia debe distinguirse de la simple programación: una sesión registrada en calendario no acredita que el estudiante haya sido atendido. Esta diferencia repercute en alertas, numeración e informes. El seguimiento documenta actuaciones posteriores y acuerdos vinculados al caso.

### 7.5 Solicitudes y derivaciones

El recorrido de solicitudes incluye el registro del estudiante, el enrutamiento a un responsable, la atención y la consulta de respuesta e historial. La auditoría inicial detectó que guardar la solicitud no bastaba para cerrar el proceso. El historial posterior registra la incorporación de bandeja, estados, avisos e historial, y las evidencias de aceptación describen su comprobación mediante API [9, 11].

La derivación a servicios especializados continúa mediante estados de recepción, atención y cierre. La información que puede consultar un docente no debe confundirse con las notas internas del profesional. Los registros de aceptación documentan comprobaciones en los cinco servicios previstos, incluyendo intentos de acceso desde usuarios no involucrados. Sus límites de comprobación visual permanecen identificados [11].

### 7.6 Evaluación y reportes

La evaluación incorpora el cuestionario del servicio tutorial y resultados agregados. Su tratamiento exige distinguir la participación del estudiante de la exposición de respuestas identificables. Los reportes e indicadores utilizan información de sesiones, asistencia, derivaciones y periodo académico para resumir la actividad [2, 3, 10].

Los controles documentados incluyen el tratamiento de sesiones canceladas, el conteo de asistencia y la conservación de información histórica por semestre. Los planes aprobados también necesitan diferenciar su versión vigente de una modificación posterior. Estas reglas evitan que un cambio operativo altere silenciosamente resultados de periodos anteriores.

### 7.7 Auditoría y mejora de la interfaz

Las revisiones del 8 de octubre combinaron inspección del código e interacción con perfiles de prueba. Se registraron problemas de navegación, presentación de opciones, títulos, formularios y continuidad de solicitudes. Los commits posteriores documentan correcciones de la selección activa del menú, la bitácora, el inicio por rol, las notificaciones y el recorrido de solicitudes [9].

El 10 de octubre se planteó además simplificar las denominaciones visibles y reducir la carga de escritura de los formularios. Esta propuesta debe tratarse como un cambio de alcance mientras no exista evidencia de su implementación y aceptación. Cambiar un nombre visible es diferente de retirar un rol: en el segundo caso deben conservarse las funciones, la autoría histórica y los límites de acceso.

## 8 Pruebas de calidad y resultados del avance

### 8.1 Estrategia de comprobación

El proyecto reúne pruebas unitarias del servidor con Jest, pruebas de componentes del cliente con Vitest y Testing Library, y comprobaciones de integración y permisos. En el commit de referencia también se incorporan recorridos Playwright para acceso y solicitudes. El archivo de las pruebas E2E distingue esos recorridos escritos de los restantes todavía pendientes [8, 10, 13].

Los recorridos de aceptación complementan las pruebas automáticas: relacionan acciones de distintos perfiles y resultados esperados. La consulta de una API acredita reglas y respuestas, pero no demuestra por sí sola que el usuario complete cómodamente el formulario ni que un impreso sea legible. Por esa razón, las verificaciones visuales, de interacción y con usuarios se consideran por separado.

### 8.2 Resultados documentados

Los registros de aceptación del 9 de octubre describen resultados de solicitudes, sesiones, asistencia, derivaciones, evaluación, planes y separación de accesos. También identifican un defecto en los enlaces virtuales que motivó una corrección para restringir los esquemas permitidos. Estos registros constituyen evidencia de las ejecuciones que describen; no se presentan como una repetición de todas las pruebas para el corte de este informe [11].

En la sección operacional se documentan ensayos de respaldo de base y adjuntos, restauración, rechazo de respaldos fallidos, migración y arranque de una imagen de producción con datos ficticios. La validación del mecanismo de copia externa no equivale a disponer ya de un destino institucional definitivo [12].

### 8.3 Relación entre objetivos y productos

| Objetivo | Producto registrado | Alcance pendiente |
| --- | --- | --- |
| Requerimientos | RF, RNF e historias de usuario | Conformidad y control de cambios |
| Modelado | Esquema de datos y estructura del sistema | Diagramas finales y cotejo con procesos |
| Interfaz | Aplicación web y revisiones por rol | Medición de usabilidad y ajustes propuestos |
| Implementación | Módulos, migraciones y control de versiones | Aceptación de la versión de entrega |
| Validación | Matriz, pruebas y evidencias de aceptación | Rendimiento, piloto y recorridos restantes |
| Documentación | Plan, requisitos y registros técnicos | Manuales y entrega formal |

### 8.4 Limitaciones de los resultados

No se dispone en este avance de una medición comparativa de tiempos del proceso institucional ni de resultados consolidados de un piloto con usuarios reales. Tampoco se acredita la culminación de las prácticas, sus horas efectivas, la capacitación final o la puesta en producción institucional. La existencia de funciones y pruebas permite describir el avance técnico, pero no permite concluir que todos los objetivos hayan sido aceptados.

Los resultados de rendimiento deben contrastarse con los objetivos de los requisitos no funcionales: respuesta de operaciones frecuentes en hasta tres segundos con al menos cien usuarios concurrentes e importación de dos mil registros en menos de dos minutos. Para sostener ese cumplimiento se necesitan datos de carga, entorno y mediciones. La disponibilidad objetivo del 99 % requiere seguimiento operacional [4].

## 9 Dificultades técnicas y aprendizajes del proyecto

Una dificultad evidenciada por las auditorías fue diferenciar la disponibilidad de una pantalla del cierre real de un flujo. El caso de las solicitudes mostró que el registro debía acompañarse de responsable, bandeja, estado y respuesta. La corrección de ese recorrido ilustra la necesidad de comprobar procesos completos además de funciones aisladas [9, 11].

Otra dificultad fue mantener una presentación simple sin debilitar la protección de datos. Los menús por perfil deben orientar al usuario, mientras que el servidor debe aplicar restricciones independientemente de lo que la interfaz muestre. Este criterio resulta especialmente relevante cuando intervienen datos personales y servicios especializados.

El trabajo de verificación también exige interpretar las evidencias correctamente. Un archivo de prueba escrito no es un resultado ejecutado; una ejecución satisfactoria de API no representa un piloto; y una restauración en un entorno de ensayo no acredita todavía la recuperación operativa de una instalación institucional. Estas distinciones fortalecen la trazabilidad y evitan conclusiones que excedan lo observado.

## 10 Conclusiones del avance

1. La documentación del proyecto permite relacionar necesidades del proceso tutorial con requerimientos, historias y criterios de terminado. La aceptación del alcance y sus cambios debe acompañar esta relación documental.
2. El checkout de referencia contiene una aplicación web que integra los módulos principales del acompañamiento tutorial y una estructura tecnológica para persistencia, autenticación y operación en contenedores.
3. La auditoría por perfiles permitió identificar dificultades de navegación y continuidad de atención. El historial y los registros de aceptación documentan correcciones posteriores, que deben vincularse con su versión concreta.
4. Las pruebas registradas aportan evidencia técnica de reglas, accesos y ensayos operacionales. Permanecen diferenciadas de la medición de rendimiento, la evaluación con usuarios y la puesta en producción institucional.
5. El cierre del informe requiere completar la evidencia del piloto, los diagramas, la documentación de operación y las constancias de ejecución y entrega. En consecuencia, este avance no declara el cumplimiento integral de los seis objetivos.

## 11 Recomendaciones

Mantener la relación entre cada requisito, cambio y prueba, y seleccionar una versión del sistema como referencia de la entrega. Las capturas, diagramas y reportes deben corresponder a esa versión para evitar contradicciones entre el informe, los manuales y la aplicación.

Completar el piloto con tareas representativas de estudiantes, docentes y profesionales. Registrar éxito de tarea, pasos, dificultades y comentarios sin incorporar información clínica o credenciales a los anexos. Los cambios de interfaz deben sustentarse en esas observaciones y en las verificaciones de accesibilidad.

Documentar el modelo final de roles antes de retirar perfiles o transferir funciones. El nombre Administrador no debe justificar acceso indiscriminado a notas sensibles, y la simplificación de formularios no debe eliminar información necesaria ni generar resultados no confirmados.

Preparar los manuales de usuario, sistema, instalación y despliegue cuando se estabilice la versión correspondiente. La entrega debe incluir responsables de operación, respaldo, restauración y mantenimiento, junto con la evidencia de revisión y conformidad que proceda.

## 12 Referencias del proyecto

[1] Chavez Caruajulca, B. (2026). Plan de prácticas preprofesionales. Documento presentado por el estudiante, seis páginas.

[2] Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas. (2024). Protocolo de Acompañamiento de Tutoría N° 01-2024-UNTRM/DBU. R.C.U. N° 283-2024.

[3] Proyecto SIT UNTRM. Requerimientos funcionales. Documento de trabajo suministrado por el estudiante.

[4] Proyecto SIT UNTRM. Requerimientos no funcionales. Documento de trabajo suministrado por el estudiante.

[5] Proyecto SIT UNTRM. Historias de usuario, riesgos y tareas técnicas; Product Backlog priorizado. Documentos de trabajo suministrados por el estudiante.

[6] Proyecto SIT UNTRM. Estimación de tareas; Sprint Backlog. Documentos de trabajo suministrados por el estudiante.

[7] Proyecto SIT UNTRM. Definition of Done. Documento de trabajo suministrado por el estudiante.

[8] Proyecto SIT UNTRM. Código y documentación del checkout local c4ef02b949db1a6d29b90ecce11ba4f179f0f547. Consulta del 10 de octubre de 2026. Repositorio indicado por el estudiante: https://github.com/Code-Chavez/Tutoria-untrm.

[9] Proyecto SIT UNTRM. (2026). Auditoría de interfaz y revisión de roles del 8 de octubre; historial posterior de correcciones.

[10] Proyecto SIT UNTRM. (2026). Matriz de trazabilidad de pruebas TT-100.

[11] Proyecto SIT UNTRM. (2026). Evidencia de las secciones 1 a 6 del guion de aceptación. Registro fechado el 9 de octubre, con actualización del recorrido 1.11.

[12] Proyecto SIT UNTRM. (2026). Evidencia de la sección 7 del guion de aceptación y documentación de despliegue.

[13] Proyecto SIT UNTRM. (2026). Documentación de pruebas E2E y recorridos de acceso y solicitudes.
