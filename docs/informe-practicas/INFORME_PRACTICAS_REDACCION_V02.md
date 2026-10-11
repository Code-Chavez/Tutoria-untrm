# Informe de prácticas preprofesionales

Sistema de Información para la Sistematización de los Procesos de Acompañamiento de Tutoría Universitaria de la Facultad de Ingeniería de Sistemas y Mecánica Eléctrica

Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas

Facultad de Ingeniería de Sistemas y Mecánica Eléctrica

Escuela Profesional de Ingeniería de Sistemas

Estudiante: Brayni Chavez Caruajulca

Asesor: Mg. Eder Nicanor Figueroa Piscoya

Bagua, Amazonas, 2026

Versión de trabajo del informe final · Corte al 11 de octubre de 2026

## 1 Resumen

El proyecto de prácticas preprofesionales desarrolla un sistema de información para apoyar los procesos de acompañamiento tutorial de la Facultad de Ingeniería de Sistemas y Mecánica Eléctrica de la Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas. Su referencia funcional es el Protocolo de Acompañamiento de Tutoría N° 01-2024-UNTRM/DBU, aprobado mediante la R.C.U. N° 283-2024. El sistema reúne la gestión de estudiantes, la asignación de docentes, las solicitudes de tutoría, las entrevistas, las sesiones con asistencia, el seguimiento, las derivaciones a servicios especializados, la evaluación de la función tutorial, los planes e informes semestrales, los reportes institucionales y la administración del sistema [1, 2].

El trabajo se organizó en seis entregas incrementales etiquetadas en el control de versiones (de la v0.0.1 a la v0.4.1), a partir de requerimientos funcionales y no funcionales, historias de usuario, un backlog priorizado y criterios de terminado. La solución comprende una interfaz web con React y TypeScript, una API con Node.js y Express con arquitectura hexagonal, persistencia en PostgreSQL mediante Prisma y un entorno basado en Docker, con configuración de producción, respaldos y procedimiento de reversión [3-8].

Al corte del 11 de octubre de 2026 se dispone de una versión candidata (v0.4.1) con pruebas automáticas de servidor y cliente verificadas por integración continua (689 y 299 pruebas respectivamente en el commit de referencia), ocho recorridos de extremo a extremo que se ejecutaron con resultado satisfactorio de forma local, una revisión de seguridad con el OWASP Top 10, evidencias de aceptación manual y los manuales técnico y de usuario. Permanecen pendientes y fuera del alcance de lo que puede acreditarse con el repositorio: el piloto con usuarios reales, las mediciones de rendimiento y usabilidad, la validación de los formatos por la Dirección de Bienestar Universitario, la definición de la infraestructura de producción y la entrega formal. Este informe describe los productos y sus límites sin atribuir una mejora institucional cuantificada que no ha sido medida.

## 2 Introducción

La tutoría universitaria requiere que la información de cada estudiante mantenga continuidad entre el registro inicial, las actividades de acompañamiento, el seguimiento y, cuando corresponda, la derivación a un servicio especializado. Además de registrar esas actuaciones, es necesario identificar sus responsables, conservar los antecedentes y producir información útil para evaluar el servicio. La naturaleza personal de algunos datos obliga a controlar quién puede consultarlos y modificarlos.

El proyecto planteado en el plan de prácticas busca sistematizar ese recorrido mediante una aplicación web. Su alcance comprende tanto las tareas cotidianas del docente como las funciones de administración y consulta necesarias para organizar el servicio tutorial. El protocolo y sus formatos constituyen el punto de partida para identificar los datos y procesos que el sistema debe representar [1, 2].

El presente informe desarrolla el contexto, los objetivos, la organización del trabajo, la solución técnica y los resultados de verificación. La exposición vincula los productos con sus evidencias y diferencia los resultados registrados de las actividades previstas. El periodo consignado en el plan abarca del 8 de junio al 20 de noviembre de 2026; por ello, el corte del 11 de octubre corresponde a una versión de trabajo y no a la culminación formal de las prácticas [1].

## 3 Información general de las prácticas

### 3.1 Institución y ámbito de ejecución

La institución consignada en el plan es la Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas. El lugar de ejecución previsto es la Dirección de Bienestar Universitario, en la ciudad de Chachapoyas, región Amazonas. El proyecto se enfoca en los procesos de acompañamiento tutorial de FISME. La ciudad indicada en la carátula, Bagua, corresponde a la presentación del documento y no sustituye el lugar de ejecución señalado en el plan [1].

La solución involucra estudiantes, docentes y personal responsable de la gestión y de los servicios especializados. El diseño de sus funciones se relaciona con las responsabilidades del proceso tutorial, de modo que la digitalización mantenga la continuidad de atención y proteja los antecedentes personales del estudiante.

### 3.2 Periodo y producto principal

El plan establece una duración de 120 días hábiles distribuida en seis fases. Esta duración representa la programación presentada y debe distinguirse del registro de asistencia y de las horas efectivamente acreditadas. El producto principal es el sistema de información, acompañado por sus documentos de análisis, pruebas y operación [1].

La documentación comprende este informe y los manuales técnico y de usuario del sistema, elaborados sobre una versión identificada del software (v0.4.1) para que sus instrucciones coincidan con la aplicación. Los manuales de despliegue y respaldo se encuentran en los documentos operativos del repositorio [14-16].

## 4 Diagnóstico y alcance del proyecto

### 4.1 Necesidad que atiende la solución

El plan identifica la necesidad de sistematizar el registro, seguimiento y reporte de actividades tutoriales. Desde el punto de vista del diseño de información, estas actividades están relacionadas: una solicitud puede originar una sesión, una sesión puede requerir seguimiento y un caso puede continuar en un servicio especializado. Si cada registro se trata como un dato independiente, resulta más difícil reconstruir el recorrido de atención y relacionarlo con los reportes [1-3].

El diagnóstico documental se centra en esa necesidad de articulación. No permite, por sí solo, establecer cuántos expedientes se perdían, cuánto tiempo demandaban las tareas o con qué frecuencia ocurrían errores en la institución. Para medir esos aspectos se requiere una línea de base y evidencia del proceso anterior. Por tanto, la centralización y la trazabilidad se presentan como objetivos de la solución, no como beneficios cuantificados ya demostrados.

### 4.2 Necesidades funcionales y de calidad

La gestión de estudiantes exige registros consistentes, control de duplicados y asignación de responsables. La atención tutorial requiere formularios, calendario, asistencia y seguimiento. Las derivaciones demandan un recorrido de estados y una separación de la información según el servicio y la participación del usuario. La evaluación y los reportes necesitan datos coherentes con el periodo académico y criterios definidos para contabilizar las actividades [2, 3].

Las necesidades de calidad abarcan validación de entradas, autenticación, permisos, integridad de datos, respuesta ante errores y facilidad de uso. La interfaz debe permitir completar tareas frecuentes sin solicitar información que ya se encuentra registrada. Esta simplificación no debe eliminar datos necesarios para el proceso ni sustituir confirmaciones por valores inventados.

### 4.3 Alcance y límites

El sistema contempla autenticación, usuarios, estudiantes, asignación, entrevistas, red de apoyo, expediente, solicitudes, sesiones individuales y grupales, asistencia, seguimiento, evidencias, derivaciones, notificaciones, evaluación, planes semestrales, informes, indicadores, catálogos, parámetros, identidad visual y bitácora de auditoría [3, 5, 14].

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

El Product Backlog y el Sprint Backlog incorporan una programación posterior por sprints (seis sprints; el sexto, del 9 al 20 de noviembre, corresponde a pruebas integrales, piloto, despliegue y cierre). Las diferencias entre ambos cronogramas deben registrarse al comparar ejecución y planificación: el desarrollo se completó antes de la fecha prevista para su fase y las actividades de prueba, seguridad y documentación se adelantaron a la fase de «Pruebas y ajustes». Las fechas previstas no se utilizan como prueba de que cada actividad ocurrió ese día [1, 6].

### 6.2 Organización incremental

Los documentos del proyecto descomponen las funciones en historias de usuario y tareas técnicas. El backlog prioriza los accesos y la seguridad como base de los módulos posteriores. La estimación de tareas permite organizar el esfuerzo, mientras que la Definition of Done establece condiciones de aceptación, código, pruebas, documentación e integración [5-7].

Cada cambio se integró mediante una rama propia y una solicitud de integración (pull request) con una plantilla que reproduce la Definition of Done; la integración continua verifica estilo, compilación, pruebas, auditoría de dependencias y un ensayo de restauración de respaldos antes de aceptar el cambio. La descripción de ceremonias y participación de usuarios en Scrum requiere sus respectivos registros; la presencia de estos artefactos no demuestra por sí sola la ejecución completa del marco de trabajo.

### 6.3 Trazabilidad y control de versiones

Git permite identificar modificaciones y versiones del software. La matriz de trazabilidad relaciona las 50 historias de usuario con pruebas del servidor, del cliente, pasos de la aceptación manual y recorridos de extremo a extremo, e identifica los huecos de cobertura que quedaron [10].

Para este corte se toma como referencia técnica la rama `develop` del repositorio en el commit 3860bd285d238409a03776eec1b8a07b9ef4e9b8 (11 de octubre de 2026), cuya integración continua terminó satisfactoriamente, y la etiqueta v0.4.1 sobre `main`. Esta referencia delimita el código consultado y no constituye una constancia de entrega institucional. Cada evidencia final deberá conservar su fecha, versión, entorno y resultado [8].

### 6.4 Entregas realizadas

| Versión | Fecha | Contenido principal |
| --- | --- | --- |
| v0.0.1 | 01/09/2026 | Autenticación, recuperación de contraseña, usuarios, roles y permisos, perfil, expiración de sesión, respaldo de base |
| v0.1.0 | 24/09/2026 | Carga masiva y registro de estudiantes, riesgo académico, asignación, entrevista inicial (Anexo 3), red de apoyo, expediente |
| v0.2.0 | 25/09/2026 | Solicitudes, sesiones individuales y grupales, calendario, asistencia (Anexo 4), seguimiento (Anexo 5), evidencias, alertas, consolidado de horarios |
| v0.3.0 | 01/10/2026 | Derivaciones (Anexo 6), enrutamiento por servicio, estados, notificaciones, seguimiento de la DBU, evaluación (Anexo 7) |
| v0.4.0 | 09/10/2026 | Planes e informes semestrales (Anexos 8 y 9), informe consolidado, indicadores, exportación PDF y Excel, catálogos, parámetros, identidad visual, y las correcciones de las auditorías |
| v0.4.1 | 10/10/2026 | Corrección de seguridad de enlaces de reunión y evidencias de aceptación (versión candidata) |

Las fechas corresponden a las etiquetas del repositorio. Su contenido se verifica en las notas de cada versión y en el historial [8].

## 7 Actividades y desarrollo de la solución

### 7.1 Documentación de requerimientos

La documentación disponible comprende requerimientos funcionales y no funcionales, historias de usuario, riesgos y tareas técnicas. Los requerimientos funcionales describen las operaciones esperadas; los no funcionales establecen condiciones de seguridad, integridad, disponibilidad, rendimiento y usabilidad. Las historias permiten relacionar cada función con el usuario que la necesita y con sus criterios de aceptación [3-5].

La diferencia entre una función implementada y una aceptada es relevante para el seguimiento. Una pantalla puede existir sin que todos sus casos límite estén verificados. Por ello, la documentación y la matriz de pruebas se mantienen relacionadas, especialmente cuando se modifica el alcance o se detecta un defecto.

### 7.2 Arquitectura y entorno

El backend se organiza en dominio, aplicación, infraestructura e interfaces, con una raíz de composición donde se conectan los casos de uso con sus implementaciones. El dominio representa entidades y contratos; la aplicación agrupa casos de uso; la infraestructura conecta persistencia y servicios; y las interfaces exponen las operaciones HTTP. La finalidad de esta separación es limitar el acoplamiento entre reglas del proceso y mecanismos externos [8, 15].

El frontend usa React, Vite y TypeScript y se organiza por funcionalidades. PostgreSQL almacena la información en 34 modelos descritos por Prisma, que administra 35 migraciones versionadas. Docker reúne los servicios en un entorno reproducible; para producción se prepararon imágenes sin código fuente y con usuario no privilegiado, un proxy con HTTPS automático, un servicio de respaldo y una validación que impide arrancar con configuración insegura [8, 15].

Como orden de magnitud, el servidor contiene alrededor de 17 mil líneas de código TypeScript en 339 archivos y el cliente alrededor de 17 mil, sin contar las pruebas del cliente; son cifras del commit de referencia y describen tamaño, no calidad ni esfuerzo.

### 7.3 Accesos y protección de información

La implementación incluye autenticación, gestión de sesiones y autorización. Los controles verifican tanto el permiso para realizar una operación como el alcance de los datos: estudiantes asignados a un docente, estudiantes de una escuela, casos de un servicio o información propia del estudiante. La misma restricción se aplica en la API aunque el usuario intente acceder por una dirección directa [3, 8, 15].

Las medidas implementadas incluyen contraseñas con bcrypt, token de acceso de vida corta con renovación rotativa y detección de reutilización, bloqueo de la cuenta por intentos fallidos, recuperación de contraseña por correo con enlace de un solo uso, cierre de sesión por inactividad, aislamiento de los datos en caché entre cuentas, validación del contenido de los archivos subidos, cabeceras de seguridad y una bitácora de auditoría. Su efectividad se argumenta con las pruebas correspondientes y con la revisión de seguridad, no únicamente con la presencia del código [15, 16].

### 7.4 Registro y acompañamiento tutorial

El módulo de estudiantes reúne registro individual, importación desde Excel con reporte del resultado, asignación masiva e individual con historial, y consulta del expediente. La entrevista inicial y la red de apoyo agregan información necesaria para el acompañamiento. El expediente relaciona antecedentes y actuaciones en una línea de tiempo y puede descargarse en PDF [3, 10, 14].

Las sesiones incorporan programación individual y grupal, modalidad presencial o virtual, reprogramación y cancelación con motivo, y asistencia. La asistencia se distingue de la programación: una sesión registrada en el calendario no acredita que el estudiante haya sido atendido. El tope de ocho sesiones por tutorado se aplica por semestre y la numeración reinicia en cada periodo. La hoja de asistencia (Anexo 4) se imprime y su escaneo firmado se adjunta con registro de autor, fecha y huella de verificación. El seguimiento documenta actuaciones posteriores y acuerdos vinculados al caso.

### 7.5 Solicitudes y derivaciones

El recorrido de solicitudes incluye el registro del estudiante, el enrutamiento a un responsable (el tutor; si no lo hay, el coordinador de la escuela; si tampoco, la DBU, de modo que ninguna solicitud se pierde), la atención con una respuesta obligatoria y la consulta de la respuesta y el historial por el estudiante. La auditoría inicial detectó que guardar la solicitud no bastaba para cerrar el proceso; la corrección incorporó bandeja, estados, avisos e historial [9, 11].

La derivación a servicios especializados continúa mediante estados de recepción, atención y cierre que solo avanzan. La información que puede consultar el docente que deriva no incluye las notas internas del profesional; la constancia (Anexo 6) se imprime y su escaneo firmado lo ven únicamente quien deriva, el servicio de destino y la DBU. Los registros de aceptación y un recorrido de extremo a extremo documentan el flujo completo en el servicio de Psicología, y comprobaciones por API los cinco servicios previstos [11, 17].

### 7.6 Evaluación y reportes

La evaluación incorpora el cuestionario de 20 ítems del servicio tutorial, que se responde una sola vez por periodo y cuyos resultados se presentan agregados y sin identificar al estudiante. La DBU habilita o cierra la evaluación por escuela. Los reportes e indicadores utilizan información de sesiones, asistencia, derivaciones y periodo académico para resumir la actividad, y pueden exportarse en PDF y Excel con la identidad institucional [2, 3, 10].

Los controles documentados incluyen el tratamiento de sesiones canceladas, el conteo de asistencia y la conservación de información histórica por semestre mediante un corte de matrícula, de modo que las cifras de un semestre cerrado no cambian cuando se reasignan o desactivan estudiantes. Los planes semestrales aprobados conservan su versión vigente cuando se propone una modificación posterior, que se maneja como una nueva revisión pendiente de resolución.

### 7.7 Auditoría y mejora de la interfaz

Las revisiones del 8 de octubre combinaron inspección del código e interacción con perfiles de prueba. Se registraron problemas de navegación, presentación de opciones, títulos, formularios y continuidad de solicitudes. Los commits posteriores documentan correcciones de la selección activa del menú, la bitácora, el inicio por rol, las notificaciones y el recorrido de solicitudes, liberadas en la versión v0.4.0 [9].

El 10 de octubre se planteó además simplificar las denominaciones visibles y reducir la carga de escritura de los formularios. Esta propuesta debe tratarse como un cambio de alcance mientras no exista evidencia de su implementación y aceptación. Cambiar un nombre visible es diferente de retirar un rol: en el segundo caso deben conservarse las funciones, la autoría histórica y los límites de acceso.

### 7.8 Pruebas de extremo a extremo

Se construyó una suite con Playwright sobre la interfaz real, con ocho recorridos que corresponden a la matriz de trazabilidad: acceso, menú y panel por rol; solicitud de tutoría; sesiones y asistencia; derivación a un servicio; informes y exportaciones; plan semestral; evaluación de tutoría; y administración. Reúnen 36 pruebas. Cada recorrido se ejecutó localmente contra el entorno de desarrollo y terminó satisfactoriamente; no se ejecutó la suite completa en una sola corrida y todavía no forma parte de la integración continua [10, 17].

La construcción de estos recorridos reveló dos defectos del producto que las pruebas por componentes no habían detectado: el formulario de atención de derivaciones reenviaba el estado ya guardado al avanzar dos pasos seguidos, y la identidad visual guardada por la DBU no se aplicaba hasta recargar la página tras iniciar sesión, porque el inicio de sesión vaciaba también su caché. Ambos se corrigieron con su prueba de regresión. La lectura de los PDF exportados reveló un tercero, las sesiones canceladas que figuraban con asistencia pendiente en los reportes, y la aceptación manual otro, los enlaces de reunión con esquemas peligrosos, también corregidos [11, 17].

### 7.9 Revisión de seguridad

Se realizó una revisión con las categorías del OWASP Top 10 que combinó el análisis del código y el sondeo de la API en ejecución con las cuentas de cada rol. No se encontró forma de leer datos de otra persona ni de eludir el control de roles; se registraron un hallazgo de severidad media y cinco de severidad baja, todos corregidos, y uno más de severidad baja que se documentó para revisión (una advertencia moderada de dependencias ya conocida). Los corregidos fueron: el contenido de los archivos subidos solo se validaba por el tipo declarado por el cliente; el tiempo de respuesta del inicio de sesión delataba qué correos estaban registrados; el estado de una cuenta desactivada se revelaba sin contraseña; un JSON mal formado producía un error de servidor; faltaba un tope de intentos por dirección IP; y una dependencia de desarrollo tenía un aviso de seguridad [16].

La revisión no incluyó un escáner dinámico externo ni la infraestructura de producción, que dependen de un entorno desplegado. Ambos quedan como actividades pendientes [16].

### 7.10 Manuales y documentación operativa

Se elaboraron el manual de usuario, organizado por perfil y tarea, y el manual técnico y de instalación, que cubre arquitectura, instalación, configuración, base de datos, seguridad, respaldo, pruebas, entrega continua y solución de problemas. Los procedimientos de despliegue en producción, de respaldo y de reversión de una actualización cuentan con documentos propios, ensayados con datos de prueba. Al redactar el manual de usuario se detectó que un profesional de servicio creado desde la interfaz no podía recibir su servicio, lo que le habría impedido ver cualquier derivación en una instalación sin datos de demostración; se corrigió [14, 15].

## 8 Pruebas de calidad y resultados

### 8.1 Estrategia de comprobación

El proyecto reúne pruebas unitarias del servidor con Jest, pruebas de integración y de permisos contra una base de datos real, pruebas de componentes del cliente con Vitest y Testing Library, recorridos de extremo a extremo con Playwright, ensayos de respaldo y restauración, y recorridos de aceptación manual. Cada nivel comprueba cosas distintas: la consulta de una API acredita reglas y respuestas, pero no demuestra por sí sola que el usuario complete cómodamente un formulario ni que un impreso sea legible [10, 17].

### 8.2 Resultados verificados

| Verificación | Resultado | Fuente y fecha |
| --- | --- | --- |
| Pruebas del servidor | 689 pruebas en 89 conjuntos, todas aprobadas; cobertura de sentencias 82,1 % | Integración continua, commit 3860bd2, 11/10/2026 |
| Pruebas del cliente | 299 pruebas en 58 archivos, todas aprobadas; cobertura de sentencias 64,0 % | Integración continua, commit 3860bd2, 11/10/2026 |
| Calidad estática y compilación | Estilo, tipos estrictos y compilación del servidor y del cliente sin errores | Integración continua, commit 3860bd2 |
| Auditoría de dependencias | Sin vulnerabilidades en producción en el cliente; una advertencia moderada ignorada y documentada en el servidor | Integración continua y revisión de seguridad |
| Ensayo de restauración de respaldos | Aprobado (respaldo con adjuntos, fallo controlado, retención y restauración idéntica byte a byte) | Integración continua, commit 3860bd2 |
| Construcción de las imágenes de contenedor | Aprobada | Integración continua, commit 3860bd2 |
| Recorridos de extremo a extremo | 8 recorridos, 36 pruebas; cada recorrido aprobado en ejecución local | Ejecuciones locales del 10 y 11/10/2026 |
| Aceptación manual (secciones 1 a 7 del guion) | Pasos ejecutados por API o interfaz con resultado satisfactorio; quedan identificados los pendientes de lectura visual y el destino real de la copia de respaldo externa (paso 7.4) | Registros del 9 y 10/10/2026 [11, 12] |
| Revisión de seguridad | 0 hallazgos altos; 1 medio y 5 bajos corregidos; 1 bajo documentado | Informe del 11/10/2026 [16] |

Las cifras de pruebas corresponden al commit indicado y no deben reutilizarse para otra versión. La cobertura del servidor supera el 70 % que fija la Definition of Done; la del cliente, en conjunto, queda por debajo, aunque el criterio se refiere a la lógica de negocio del módulo y no se midió separadamente [7].

### 8.3 Relación entre objetivos y productos

| Objetivo | Producto registrado | Alcance pendiente |
| --- | --- | --- |
| 1 Requerimientos | RF, RNF e historias de usuario; matriz de trazabilidad | Conformidad de la DBU y control de cambios |
| 2 Modelado | Esquema de datos (34 modelos) y arquitectura documentada | Diagramas AS-IS/TO-BE, casos de uso y MER finales |
| 3 Interfaz | Aplicación web con revisión por rol y recorridos de extremo a extremo | Medición de usabilidad y pruebas en dispositivos móviles |
| 4 Implementación | Módulos, importación de Excel, autenticación, almacenamiento de evidencias, migraciones | Aceptación formal de la versión de entrega |
| 5 Validación | Pruebas automáticas, aceptación manual, revisión de seguridad | Rendimiento, usabilidad y piloto con usuarios reales; escáner dinámico externo |
| 6 Documentación | Manual de usuario, manual técnico, guías de despliegue y respaldo | Manual en formato final y capacitación |

### 8.4 Limitaciones de los resultados

No se dispone en este corte de una medición comparativa de tiempos del proceso institucional ni de resultados consolidados de un piloto con usuarios reales. Tampoco se acredita la culminación de las prácticas, sus horas efectivas, la capacitación final o la puesta en producción institucional. La existencia de funciones y pruebas permite describir el avance técnico, pero no permite concluir que todos los objetivos hayan sido aceptados.

Los requisitos no funcionales de rendimiento (respuesta de operaciones frecuentes en hasta tres segundos con al menos cien usuarios concurrentes e importación de dos mil registros en menos de dos minutos) y de disponibilidad (99 %) requieren datos de carga, entorno y seguimiento operacional que todavía no existen [4]. Las pruebas de extremo a extremo se ejecutaron en un equipo con carga y no sirven como medición de rendimiento.

## 9 Dificultades técnicas y aprendizajes del proyecto

Una dificultad evidenciada por las auditorías fue diferenciar la disponibilidad de una pantalla del cierre real de un flujo. El caso de las solicitudes mostró que el registro debía acompañarse de responsable, bandeja, estado y respuesta. La corrección ilustra la necesidad de comprobar procesos completos además de funciones aisladas [9, 11].

Otra dificultad fue mantener una presentación simple sin debilitar la protección de datos. Los menús por perfil orientan al usuario, mientras que el servidor aplica las restricciones independientemente de lo que la interfaz muestre. Este criterio resulta especialmente relevante cuando intervienen datos personales y servicios especializados.

La verificación de extremo a extremo aportó un aprendizaje distinto al de las pruebas por componentes: los dos defectos que encontró dependían de la interacción entre varias partes (el estado del formulario tras una respuesta del servidor, y la caché compartida entre el inicio de sesión y la identidad visual). Las pruebas unitarias de cada pieza no los habían revelado, lo que justifica mantener ambos niveles.

También se aprendió que los datos de demostración pueden ocultar carencias de configuración. Un profesional de servicio sembrado con su servicio funcionaba; uno creado desde la interfaz no podía recibirlo. La revisión de la documentación de usuario, al obligar a describir cada paso tal como lo ejecutaría una persona nueva, descubrió el problema que las pruebas con cuentas de demostración no mostraban.

Finalmente, el trabajo exige interpretar las evidencias correctamente. Un archivo de prueba escrito no es un resultado ejecutado; una ejecución satisfactoria de API no representa un piloto; y una restauración en un entorno de ensayo no acredita todavía la recuperación operativa de una instalación institucional. Estas distinciones fortalecen la trazabilidad y evitan conclusiones que excedan lo observado.

## 10 Conclusiones

1. La documentación del proyecto permite relacionar necesidades del proceso tutorial con requerimientos, historias y criterios de terminado, y la matriz de trazabilidad vincula las 50 historias con sus pruebas. La aceptación del alcance y de sus cambios debe acompañar esta relación documental.
2. El repositorio contiene una aplicación web que integra los módulos principales del acompañamiento tutorial —del registro del estudiante a la derivación, la evaluación y los informes institucionales—, sobre una estructura tecnológica para persistencia, autenticación y operación en contenedores, entregada en seis versiones incrementales.
3. La auditoría por perfiles, las pruebas de extremo a extremo, la aceptación manual y la revisión de seguridad permitieron identificar y corregir defectos de navegación, continuidad de atención y protección de datos. Cada corrección quedó vinculada con su versión y con una prueba de regresión.
4. Las pruebas automáticas aportan evidencia técnica verificada por integración continua de las reglas del sistema y de sus accesos, y los ensayos de respaldo, restauración y migración respaldan la operación. Permanecen diferenciadas de la medición de rendimiento, la evaluación con usuarios y la puesta en producción institucional.
5. El cierre formal de las prácticas requiere completar el piloto con usuarios, validar los formatos con la DBU, definir la infraestructura de producción, acreditar las horas y obtener las constancias de ejecución y entrega. En consecuencia, este informe no declara el cumplimiento integral de los seis objetivos, sino el estado verificable de cada uno.

## 11 Recomendaciones

Mantener la relación entre cada requisito, cambio y prueba, y seleccionar una versión del sistema como referencia de la entrega. Las capturas, diagramas, reportes y manuales deben corresponder a esa versión para evitar contradicciones entre el informe y la aplicación.

Completar el piloto con tareas representativas de estudiantes, docentes y profesionales. Registrar éxito de tarea, pasos, dificultades y comentarios sin incorporar información clínica o credenciales a los anexos. Los cambios de interfaz deben sustentarse en esas observaciones y en las verificaciones de accesibilidad.

Definir antes de la puesta en producción el dominio y el servidor con HTTPS, la cuenta de correo para la recuperación de contraseñas, un destino de copias de respaldo fuera del servidor con un ensayo de restauración en otro equipo, y los responsables de operación y de monitoreo. Ejecutar un escáner dinámico de seguridad sobre el entorno desplegado.

Documentar el modelo final de roles antes de retirar perfiles o transferir funciones. El nombre Administrador no debe justificar acceso indiscriminado a notas sensibles, y la simplificación de formularios no debe eliminar información necesaria ni generar resultados no confirmados.

Incorporar la suite de extremo a extremo a la integración continua cuando se decida levantar el entorno completo en el servicio de automatización, y cubrir los recorridos que aún no la tienen: carga masiva, asignación masiva y reasignación individual.

## 12 Referencias del proyecto

[1] Chavez Caruajulca, B. (2026). Plan de prácticas preprofesionales. Documento presentado por el estudiante, seis páginas.

[2] Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas. (2024). Protocolo de Acompañamiento de Tutoría N° 01-2024-UNTRM/DBU. R.C.U. N° 283-2024.

[3] Proyecto SIT UNTRM. Requerimientos funcionales. Documento de trabajo suministrado por el estudiante.

[4] Proyecto SIT UNTRM. Requerimientos no funcionales. Documento de trabajo suministrado por el estudiante.

[5] Proyecto SIT UNTRM. Historias de usuario, riesgos y tareas técnicas; Product Backlog priorizado. Documentos de trabajo suministrados por el estudiante.

[6] Proyecto SIT UNTRM. Estimación de tareas; Sprint Backlog. Documentos de trabajo suministrados por el estudiante.

[7] Proyecto SIT UNTRM. Definition of Done. Documento de trabajo suministrado por el estudiante.

[8] Proyecto SIT UNTRM. Código y documentación de la rama develop en el commit 3860bd285d238409a03776eec1b8a07b9ef4e9b8 y etiqueta v0.4.1. Consulta del 11 de octubre de 2026. Repositorio indicado por el estudiante: https://github.com/Code-Chavez/Tutoria-untrm.

[9] Proyecto SIT UNTRM. (2026). Auditoría de interfaz y revisión de roles del 8 de octubre; historial posterior de correcciones.

[10] Proyecto SIT UNTRM. (2026). Matriz de trazabilidad de pruebas TT-100 (docs/MATRIZ_TRAZABILIDAD_PRUEBAS.md).

[11] Proyecto SIT UNTRM. (2026). Evidencia de las secciones 1 a 6 del guion de aceptación. Registro fechado el 9 de octubre, con actualización del recorrido 1.11.

[12] Proyecto SIT UNTRM. (2026). Evidencia de la sección 7 del guion de aceptación y documentación de despliegue (docs/ACEPTACION_SECCION7_2026-10-09.md; deploy/README.md; backup/README.md).

[13] Proyecto SIT UNTRM. (2026). Documentación de las pruebas de extremo a extremo (e2e/README.md).

[14] Proyecto SIT UNTRM. (2026). Manual de usuario (docs/MANUAL_USUARIO.md).

[15] Proyecto SIT UNTRM. (2026). Manual técnico y de instalación (docs/MANUAL_TECNICO.md).

[16] Proyecto SIT UNTRM. (2026). Informe de seguridad TT-101, 11 de octubre (docs/INFORME_SEGURIDAD_2026-10-11.md).

[17] Proyecto SIT UNTRM. (2026). Solicitudes de integración y su historial en el repositorio (pull requests n.° 97 a 105), que documentan la suite de extremo a extremo y los defectos que reveló.
