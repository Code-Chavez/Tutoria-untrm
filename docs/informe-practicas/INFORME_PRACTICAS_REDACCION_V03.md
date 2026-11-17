# Informe de prácticas preprofesionales

Sistema de Información para la Sistematización de los Procesos de Acompañamiento de Tutoría Universitaria de la Facultad de Ingeniería de Sistemas y Mecánica Eléctrica

Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas

Facultad de Ingeniería de Sistemas y Mecánica Eléctrica

Escuela Profesional de Ingeniería de Sistemas

Estudiante: Brayni Chavez Caruajulca

Asesor: Mg. Eder Nicanor Figueroa Piscoya

Bagua, Amazonas, 2026

Versión de trabajo del informe final · Corte al 16 de noviembre de 2026 · Software v1.0.0-beta.3

## 1 Resumen

El proyecto de prácticas preprofesionales desarrolla un sistema de información para apoyar los procesos de acompañamiento tutorial de la Facultad de Ingeniería de Sistemas y Mecánica Eléctrica de la Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas. Su referencia funcional es el Protocolo de Acompañamiento de Tutoría N° 01-2024-UNTRM/DBU, aprobado mediante la R.C.U. N° 283-2024. El sistema reúne la gestión de estudiantes, la asignación de docentes por ciclo, las solicitudes de tutoría, las entrevistas, las sesiones con asistencia, el seguimiento, las derivaciones a servicios especializados, la evaluación de la función tutorial, los planes e informes semestrales, los reportes institucionales, el cierre del periodo académico, los certificados de los docentes tutores (en modo de demostración) y la administración del sistema [1, 2].

El trabajo se organizó en doce versiones incrementales etiquetadas en el control de versiones, de la v0.0.1 (1 de septiembre de 2026) a la v1.0.0-beta.3 (16 de noviembre de 2026), a partir de requerimientos funcionales y no funcionales, historias de usuario, un backlog priorizado y criterios de terminado. La solución comprende una interfaz web con React y TypeScript, una API con Node.js y Express con arquitectura hexagonal, persistencia en PostgreSQL mediante Prisma (50 modelos y 58 migraciones) y un entorno basado en Docker, con configuración de producción, respaldos y procedimiento de reversión [3-8, 18].

Al corte del 16 de noviembre de 2026 se dispone de una versión candidata (v1.0.0-beta.3, commit 11486c3 de `main`) cuya integración continua terminó satisfactoriamente: 1 704 pruebas del servidor y 766 del cliente aprobadas, 141 pruebas de extremo a extremo en Chrome, y ejecuciones de Firefox y WebKit. Se dispone además de dos revisiones de seguridad con el OWASP Top 10 (11 de octubre y 12 de noviembre), un ensayo técnico automatizado de los recorridos de todos los roles con datos ficticios, y los manuales técnico y de usuario actualizados a esta versión. Permanecen pendientes y fuera del alcance de lo que puede acreditarse con el repositorio: el piloto con usuarios reales, las mediciones de rendimiento y usabilidad, la validación de los formatos y del certificado oficial por la Dirección de Bienestar Universitario, el entorno de producción y la entrega formal. Este informe describe los productos y sus límites sin atribuir una mejora institucional cuantificada que no ha sido medida.

## 2 Introducción

La tutoría universitaria requiere que la información de cada estudiante mantenga continuidad entre el registro inicial, las actividades de acompañamiento, el seguimiento y, cuando corresponda, la derivación a un servicio especializado. Además de registrar esas actuaciones, es necesario identificar sus responsables, conservar los antecedentes y producir información útil para evaluar el servicio. La naturaleza personal de algunos datos obliga a controlar quién puede consultarlos y modificarlos.

El proyecto planteado en el plan de prácticas busca sistematizar ese recorrido mediante una aplicación web. Su alcance comprende tanto las tareas cotidianas del docente como las funciones de administración y consulta necesarias para organizar el servicio tutorial. El protocolo y sus formatos constituyen el punto de partida para identificar los datos y procesos que el sistema debe representar [1, 2].

El presente informe desarrolla el contexto, los objetivos, la organización del trabajo, la solución técnica y los resultados de verificación. La exposición vincula los productos con sus evidencias y diferencia los resultados registrados de las actividades previstas. El periodo consignado en el plan abarca del 8 de junio al 20 de noviembre de 2026; por ello, el corte del 16 de noviembre corresponde a una versión de trabajo, previa a la fecha de cierre prevista, y no a la culminación formal de las prácticas [1]. Esta versión conserva como corte histórico la V02 (11 de octubre de 2026) y actualiza lo que cambió desde entonces.

## 3 Información general de las prácticas

### 3.1 Institución y ámbito de ejecución

La institución consignada en el plan es la Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas. El lugar de ejecución previsto es la Dirección de Bienestar Universitario, en la ciudad de Chachapoyas, región Amazonas. El proyecto se enfoca en los procesos de acompañamiento tutorial de FISME. La ciudad indicada en la carátula, Bagua, corresponde a la presentación del documento y no sustituye el lugar de ejecución señalado en el plan [1].

La solución involucra estudiantes, docentes y personal responsable de la gestión y de los servicios especializados. El diseño de sus funciones se relaciona con las responsabilidades del proceso tutorial, de modo que la digitalización mantenga la continuidad de atención y proteja los antecedentes personales del estudiante.

### 3.2 Periodo y producto principal

El plan establece una duración de 120 días hábiles distribuida en seis fases. Esta duración representa la programación presentada y debe distinguirse del registro de asistencia y de las horas efectivamente acreditadas, que este informe no declara. El producto principal es el sistema de información, acompañado por sus documentos de análisis, pruebas y operación [1].

La documentación comprende este informe y los manuales técnico y de usuario del sistema, actualizados el 16 de noviembre de 2026 sobre la versión v1.0.0-beta.3 para que sus instrucciones coincidan con la aplicación. Los manuales de despliegue y respaldo se encuentran en los documentos operativos del repositorio [14-16].

## 4 Diagnóstico y alcance del proyecto

### 4.1 Necesidad que atiende la solución

El plan identifica la necesidad de sistematizar el registro, seguimiento y reporte de actividades tutoriales. Desde el punto de vista del diseño de información, estas actividades están relacionadas: una solicitud puede originar una sesión, una sesión puede requerir seguimiento y un caso puede continuar en un servicio especializado. Si cada registro se trata como un dato independiente, resulta más difícil reconstruir el recorrido de atención y relacionarlo con los reportes [1-3].

El diagnóstico documental se centra en esa necesidad de articulación. No permite, por sí solo, establecer cuántos expedientes se perdían, cuánto tiempo demandaban las tareas o con qué frecuencia ocurrían errores en la institución. Para medir esos aspectos se requiere una línea de base y evidencia del proceso anterior. Por tanto, la centralización y la trazabilidad se presentan como objetivos de la solución, no como beneficios cuantificados ya demostrados.

### 4.2 Necesidades funcionales y de calidad

La gestión de estudiantes exige registros consistentes, control de duplicados y asignación de responsables. La atención tutorial requiere formularios, calendario, asistencia y seguimiento. Las derivaciones demandan un recorrido de estados y una separación de la información según el servicio y la participación del usuario. La evaluación y los reportes necesitan datos coherentes con el periodo académico y criterios definidos para contabilizar las actividades [2, 3].

Las necesidades de calidad abarcan validación de entradas, autenticación, permisos, integridad de datos, respuesta ante errores y facilidad de uso. La interfaz debe permitir completar tareas frecuentes sin solicitar información que ya se encuentra registrada. Esta simplificación no debe eliminar datos necesarios para el proceso ni sustituir confirmaciones por valores inventados.

### 4.3 Alcance y límites

El sistema contempla autenticación, usuarios con roles y permisos configurables, estudiantes, matrícula por periodo, asignación de un docente tutor por ciclo con su aceptación, entrevistas, red de apoyo, expediente, solicitudes, sesiones individuales y grupales, asistencia, seguimiento, evidencias, derivaciones, notificaciones, evaluación, planes semestrales, informes, indicadores, cierre del periodo, pedidos de listas por correo, amonestaciones, certificados de demostración, catálogos, parámetros, identidad visual y bitácora de auditoría [3, 5, 14, 18].

El alcance técnico descrito no equivale a una puesta en producción institucional. La existencia de código, pruebas o imágenes de despliegue acredita productos del desarrollo, mientras que la operación real requiere infraestructura, responsables y conformidad de entrega. Tampoco corresponde presentar el sistema como sustituto del criterio profesional de los servicios de salud, psicología o asistencia social. Los certificados de los docentes tutores son solo de demostración (marca de agua, numeración propia y sin firma ni entrega) hasta que la Dirección de Bienestar Universitario entregue el formato oficial, y las ampliaciones de roles y certificación se incorporaron a partir de un levantamiento propio, que se documenta aparte del alcance original del plan [18, 19].

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

El Product Backlog y el Sprint Backlog incorporan una programación posterior por sprints (seis sprints; el sexto, del 9 al 20 de noviembre, corresponde a pruebas integrales, piloto, despliegue y cierre). Las diferencias entre ambos cronogramas deben registrarse al comparar ejecución y planificación: el desarrollo de los módulos del protocolo se completó antes de la fecha prevista para su fase, y las actividades de prueba, seguridad y documentación se adelantaron a la fase de «Pruebas y ajustes». Entre mediados de octubre y el 16 de noviembre el desarrollo continuó con ampliaciones surgidas del levantamiento de ampliaciones (roles configurables, cierre del periodo, certificación), que se documentan en la sección 7. Las fechas previstas no se utilizan como prueba de que cada actividad ocurrió ese día [1, 6, 18].

### 6.2 Organización incremental

Los documentos del proyecto descomponen las funciones en historias de usuario y tareas técnicas. El backlog prioriza los accesos y la seguridad como base de los módulos posteriores. La estimación de tareas permite organizar el esfuerzo, mientras que la Definition of Done establece condiciones de aceptación, código, pruebas, documentación e integración [5-7].

Cada cambio se integró mediante una rama propia y una solicitud de integración (pull request) con una plantilla que reproduce la Definition of Done. A la fecha del corte se fusionaron 266 solicitudes de integración. La integración continua verifica estilo, compilación, pruebas, auditoría de dependencias, un ensayo de restauración de respaldos y los recorridos de extremo a extremo antes de aceptar el cambio; las ramas `develop` y `main` solo admiten cambios por solicitud de integración y los lanzamientos a `main` exigen además el bloque técnico de la Definition of Done completo. A partir de noviembre cada tarea se registra también como un issue en el repositorio, con sus criterios de aceptación y la evidencia de su verificación. La descripción de ceremonias y participación de usuarios en Scrum requiere sus respectivos registros; la presencia de estos artefactos no demuestra por sí sola la ejecución completa del marco de trabajo.

### 6.3 Trazabilidad y control de versiones

Git permite identificar modificaciones y versiones del software. La matriz de trazabilidad relaciona las 50 historias de usuario con pruebas del servidor, del cliente, pasos de la aceptación manual y recorridos de extremo a extremo, e identifica los huecos de cobertura que quedaron [10].

Para este corte se toma como referencia técnica la rama `main` del repositorio en el commit 11486c3 (16 de noviembre de 2026), etiquetado v1.0.0-beta.3, cuya integración continua terminó satisfactoriamente, y que reúne el contenido de `develop` al 16 de noviembre. Los manuales actualizados (solicitudes de integración n.° 308 y 310) se fusionaron en `develop` después de esa etiqueta. Esta referencia delimita el código consultado y no constituye una constancia de entrega institucional. Cada evidencia final deberá conservar su fecha, versión, entorno y resultado [8, 18].

### 6.4 Entregas realizadas

| Versión | Fecha | Contenido principal |
| --- | --- | --- |
| v0.0.1 | 01/09/2026 | Autenticación, recuperación de contraseña, usuarios, roles y permisos, perfil, expiración de sesión, respaldo de base |
| v0.1.0 | 24/09/2026 | Carga masiva y registro de estudiantes, riesgo académico, asignación, entrevista inicial (Anexo 3), red de apoyo, expediente |
| v0.2.0 | 25/09/2026 | Solicitudes, sesiones individuales y grupales, calendario, asistencia (Anexo 4), seguimiento (Anexo 5), evidencias, alertas, consolidado de horarios |
| v0.3.0 | 01/10/2026 | Derivaciones (Anexo 6), enrutamiento por servicio, estados, notificaciones, seguimiento de la DBU, evaluación (Anexo 7) |
| v0.4.0 | 09/10/2026 | Planes e informes semestrales (Anexos 8 y 9), informe consolidado, indicadores, exportación PDF y Excel, catálogos, parámetros, identidad visual, y las correcciones de las auditorías |
| v0.4.1 | 10/10/2026 | Corrección de seguridad de enlaces de reunión y evidencias de aceptación |
| v0.4.2 | 11/10/2026 | Endurecimiento de seguridad, asignación del servicio del profesional y suite de extremo a extremo |
| v0.4.3 | 12/10/2026 | Nombre del estudiante en las derivaciones, capturas del manual y guía del piloto |
| v0.4.4 | 12/10/2026 | Avisos por correo, correo formal y constancia al estudiante |
| v1.0.0-beta.1 | 13/10/2026 | Candidata para pruebas controladas en el servidor de la UNTRM con datos ficticios: cuentas, correos, importación, alcance y demás correcciones de la auditoría previa al lanzamiento |
| v1.0.0-beta.2 | 05/11/2026 | Invitación de un solo uso, alta masiva de docentes, cierre y reapertura del periodo, matrícula por periodo, pedidos de listas por correo, un tutor por ciclo con aceptación, rol Decano y amonestaciones, roles y alcances configurables, estado de la pantalla en la URL y borradores |
| v1.0.0-beta.3 | 16/11/2026 | Certificación del docente tutor en modo de demostración con certificados configurables, pedidos de listas por facultad, estudiantes por periodo, reorganización del menú, regreso a la vista anterior tras caducar la sesión, E2E en la integración continua y correcciones del ensayo del piloto |

Las fechas corresponden a las etiquetas del repositorio. Su contenido se verifica en las notas de cada versión (`docs/RELEASE_*.md`) y en el historial; las versiones posteriores a v0.4.1 son candidatas y no constan como entregadas formalmente [8, 18].

## 7 Actividades y desarrollo de la solución

### 7.1 Documentación de requerimientos

La documentación disponible comprende requerimientos funcionales y no funcionales, historias de usuario, riesgos y tareas técnicas. Los requerimientos funcionales describen las operaciones esperadas; los no funcionales establecen condiciones de seguridad, integridad, disponibilidad, rendimiento y usabilidad. Las historias permiten relacionar cada función con el usuario que la necesita y con sus criterios de aceptación [3-5].

La diferencia entre una función implementada y una aceptada es relevante para el seguimiento. Una pantalla puede existir sin que todos sus casos límite estén verificados. Por ello, la documentación y la matriz de pruebas se mantienen relacionadas, especialmente cuando se modifica el alcance o se detecta un defecto. Las ampliaciones posteriores al plan (roles configurables, cierre del periodo, certificación) se levantaron en documentos propios de diseño antes de implementarse, y se distinguen en el informe como ampliaciones y no como parte del alcance original [19].

### 7.2 Arquitectura y entorno

El backend se organiza en dominio, aplicación, infraestructura e interfaces, con una raíz de composición donde se conectan los casos de uso con sus implementaciones. El dominio representa entidades y contratos; la aplicación agrupa casos de uso; la infraestructura conecta persistencia y servicios; y las interfaces exponen las operaciones HTTP. La finalidad de esta separación es limitar el acoplamiento entre reglas del proceso y mecanismos externos; en el corte, el dominio y la aplicación no importan nada de la infraestructura ni de las interfaces [8, 15].

El frontend usa React, Vite y TypeScript y se organiza por funcionalidades. PostgreSQL almacena la información en 50 modelos descritos por Prisma, que administra 58 migraciones versionadas. Docker reúne los servicios en un entorno reproducible; para producción se prepararon imágenes sin código fuente y con usuario no privilegiado, un proxy con HTTPS automático, un servicio de respaldo y una validación que impide arrancar con configuración insegura [8, 15].

Como orden de magnitud, el servidor contiene alrededor de 27 mil líneas de código TypeScript en 459 archivos y el cliente alrededor de 24 mil en 226 archivos de TypeScript, sin contar las pruebas ni las hojas de estilo; son cifras del commit de referencia y describen tamaño, no calidad ni esfuerzo (en la V02 eran alrededor de 17 mil líneas en cada parte).

### 7.3 Accesos y protección de información

La implementación incluye autenticación, gestión de sesiones y autorización. Los controles verifican tanto el permiso para realizar una operación como el alcance de los datos: estudiantes asignados a un docente, estudiantes de una escuela, casos de un servicio o información propia del estudiante. La misma restricción se aplica en la API aunque el usuario intente acceder por una dirección directa [3, 8, 15].

Las medidas implementadas incluyen contraseñas con bcrypt, token de acceso de vida corta con renovación rotativa y detección de reutilización, bloqueo de la cuenta por intentos fallidos, recuperación de contraseña por correo con enlace de un solo uso, cierre de sesión por inactividad, aislamiento de los datos en caché entre cuentas, validación del contenido de los archivos subidos, cabeceras de seguridad y una bitácora de auditoría. Desde la v1.0.0-beta.2 las cuentas nuevas no reciben una clave inicial: la persona crea su contraseña con un enlace de invitación de un solo uso, y los roles y sus permisos se configuran en la aplicación, con roles base protegidos, un permiso de administración que no puede delegarse y alcance por persona (ninguno, propio, escuelas, facultades, institución o servicio). Su efectividad se argumenta con las pruebas correspondientes y con las revisiones de seguridad, no únicamente con la presencia del código [15, 16, 20].

### 7.4 Registro y acompañamiento tutorial

El módulo de estudiantes reúne registro individual, importación desde Excel con reporte del resultado, matrícula en el periodo vigente, asignación con historial y consulta del expediente. La lista de estudiantes puede filtrarse por periodo, y muestra el ciclo que cursaba cada estudiante en él. La entrevista inicial y la red de apoyo agregan información necesaria para el acompañamiento. El expediente relaciona antecedentes y actuaciones en una línea de tiempo y puede descargarse en PDF [3, 10, 14].

La asignación pasó de ser por estudiante a ser por ciclo: la coordinación elige el docente tutor de cada ciclo de su escuela, el docente recibe un enlace personal para aceptar con su disponibilidad o rechazar con un motivo, y un docente atiende un solo ciclo salvo una excepción registrada con su motivo. Una pantalla de pendientes reúne lo que ninguna persona vería sola (rechazos, enlaces vencidos, ciclos sin tutor, citas canceladas sin continuación).

Las sesiones incorporan programación individual y grupal, modalidad presencial o virtual, reprogramación y cancelación con motivo, y asistencia. La asistencia se distingue de la programación: una sesión registrada en el calendario no acredita que el estudiante haya sido atendido. El tope de ocho sesiones por tutorado se aplica por semestre y la numeración reinicia en cada periodo. La hoja de asistencia (Anexo 4) se imprime y su escaneo firmado se adjunta con registro de autor, fecha y huella de verificación. El seguimiento documenta actuaciones posteriores y acuerdos vinculados al caso.

### 7.5 Solicitudes y derivaciones

El recorrido de solicitudes incluye el registro del estudiante, el enrutamiento a un responsable (el tutor; si no lo hay, el coordinador de la escuela; si tampoco, la DBU, de modo que ninguna solicitud se pierde), la atención con una respuesta obligatoria y la consulta de la respuesta y el historial por el estudiante, cuya lista se actualiza sola mientras está abierta. La auditoría inicial detectó que guardar la solicitud no bastaba para cerrar el proceso; la corrección incorporó bandeja, estados, avisos e historial. Desde la v1.0.0-beta.2 una solicitud puede atenderse programando una sesión o derivando el caso, y una cita cancelada se reemplaza por otra sesión o derivación sin que el estudiante deba pedirla de nuevo [9, 11].

La derivación a servicios especializados continúa mediante estados de recepción, atención y cierre que solo avanzan. La información que puede consultar el docente que deriva no incluye las notas internas del profesional; la constancia (Anexo 6) se imprime y su escaneo firmado lo ven únicamente quien deriva, el servicio de destino y la DBU. Los registros de aceptación y un recorrido de extremo a extremo documentan el flujo completo en el servicio de Psicología, y comprobaciones por API los cinco servicios previstos [11, 17].

### 7.6 Evaluación y reportes

La evaluación incorpora el cuestionario de 20 ítems del servicio tutorial, que se responde una sola vez por periodo y cuyos resultados se presentan agregados y sin identificar al estudiante. La DBU habilita o cierra la evaluación por escuela. Los reportes e indicadores utilizan información de sesiones, asistencia, derivaciones y periodo académico para resumir la actividad, y pueden exportarse en PDF y Excel con la identidad institucional [2, 3, 10].

Los controles documentados incluyen el tratamiento de sesiones canceladas, el conteo de asistencia y la conservación de información histórica por semestre mediante un corte de matrícula, de modo que las cifras de un semestre cerrado no cambian cuando se reasignan o desactivan estudiantes. El cierre del periodo guarda un resumen, deja la tutoría en solo lectura y puede reabrirse si se cerró por error. Los planes semestrales aprobados conservan su versión vigente cuando se propone una modificación posterior, que se maneja como una nueva revisión pendiente de resolución.

### 7.7 Auditoría y mejora de la interfaz

Las revisiones del 8 de octubre combinaron inspección del código e interacción con perfiles de prueba. Se registraron problemas de navegación, presentación de opciones, títulos, formularios y continuidad de solicitudes. Los commits posteriores documentan correcciones de la selección activa del menú, la bitácora, el inicio por rol, las notificaciones y el recorrido de solicitudes, liberadas en la versión v0.4.0 [9].

Una auditoría previa al lanzamiento (12 de octubre) y las versiones siguientes simplificaron las denominaciones visibles (por ejemplo, «Estudiante» en lugar de «Tutorado» en pantalla, sin cambiar los roles del sistema), agruparon el menú por tareas y, en noviembre, lo reorganizaron: las pantallas de periodo académico, informes y configuración reúnen sus opciones en un menú de sección, y el estado de cada pantalla (filtros, opción elegida y ventana abierta) vive en la dirección, de modo que se restaura al recargar o compartir el enlace. Los borradores de lo que se escribe se conservan por pestaña y por persona sin pasar por el servidor. Cambiar un nombre visible es diferente de retirar un rol: en el segundo caso deben conservarse las funciones, la autoría histórica y los límites de acceso [9, 14].

### 7.8 Certificación del docente tutor (demostración)

A partir del levantamiento de ampliaciones se implementó, en seis cortes sucesivos durante noviembre, el trámite de certificación de los docentes que integran la comisión de tutoría: un modelo de datos y numeración transaccional, permisos de consulta con alcance por escuela, un trámite con estados (iniciado, en revisión, observado, aprobado, rechazado o anulado) y tres evidencias que quien revisa marca como conformes u observadas, la generación de un PDF y su descarga auditada, y la pantalla con estado en la URL, borradores y verificación de accesibilidad. El certificado admite logos, marca de agua, firma visual, título, texto, departamento, firmante y ciudad de la sede configurables, y una escuela puede dictarse en varias sedes [19].

**El certificado es de demostración:** lleva la marca de agua «DEMOSTRACIÓN — SIN VALOR», una numeración que empieza con `DEMO-` y no se firma ni se entrega, porque la universidad aún no ha entregado el formato oficial. En producción solo existe si la DBU lo activa de forma explícita. No debe presentarse como funcionalidad aceptada por la institución.

### 7.9 Pruebas de extremo a extremo

Se construyó una suite con Playwright sobre la interfaz real. En la V02 constaba de ocho recorridos que se ejecutaban a mano; a la fecha del corte la integración continua ejecuta en Chrome las 15 suites mantenidas (`test:ci`) con 141 pruebas aprobadas y una omitida en la ejecución del commit de referencia. Firefox ejecuta cinco de las suites en cada solicitud de integración que toca código y WebKit en Linux una suite, además de una ejecución nocturna de ambos; Edge comparte el motor de Chrome y se prueba a mano antes de cada lanzamiento [17, 18].

La construcción de estos recorridos reveló defectos del producto que las pruebas por componentes no habían detectado: el formulario de atención de derivaciones reenviaba el estado ya guardado al avanzar dos pasos seguidos, la identidad visual guardada por la DBU no se aplicaba hasta recargar la página porque el inicio de sesión vaciaba también su caché, las sesiones canceladas figuraban con asistencia pendiente en los reportes y los enlaces de reunión admitían esquemas peligrosos. Todos se corrigieron con su prueba de regresión [11, 17].

### 7.10 Revisiones de seguridad

Se realizaron dos revisiones con las categorías del OWASP Top 10, que combinaron el análisis del código y el sondeo de la API en ejecución con las cuentas de cada rol. La del 11 de octubre no encontró forma de leer datos de otra persona ni de eludir el control de roles; registró un hallazgo de severidad media y cinco de severidad baja, todos corregidos (validación del contenido de los archivos, tiempo de respuesta del inicio de sesión, estado de una cuenta desactivada, JSON mal formado, falta de tope de intentos por IP y una dependencia de desarrollo con aviso), y uno más de severidad baja documentado (una advertencia moderada de dependencias ya conocida) [16].

La del 12 de noviembre repasó lo agregado después (certificación, pedidos por facultad, estudiantes por periodo, roles configurables y catálogos). Encontró un hallazgo de severidad baja, corregido: el listado de roles respondía a cualquier cuenta autenticada, incluido un estudiante, y ahora exige el permiso de lectura de usuarios, con una prueba de integración nueva; y uno informativo (la misma advertencia moderada de dependencias). Se comprobaron los permisos por rol de los endpoints nuevos y el alcance de los datos, y una prueba recorre todas las rutas registradas y exige sesión [20].

Ninguna de las dos revisiones incluyó un escáner dinámico externo ni la infraestructura de producción, que dependen de un entorno desplegado. Ambos quedan como actividades pendientes.

### 7.11 Ensayo técnico de los recorridos de los roles

Entre el 13 y el 15 de noviembre se ensayaron, con guiones automatizados de Playwright en Chrome, sobre un entorno aislado con datos ficticios, las tareas de cada rol según la guía del piloto: docente tutor, coordinación, administración de la DBU, profesional de servicio, estudiante y Vicerrectorado (22 tareas con escritura de los demás roles, además de las nueve de la tutora), con capturas como evidencia. Se completaron todas. **No fue un piloto**: lo ejecutó el propio equipo de desarrollo, sin participantes reales, sin medir tiempos ni éxito de tarea con personas, y no sustituye la prueba de usabilidad [21].

El ensayo produjo hallazgos documentados. Tres defectos se corrigieron y se verificaron en pantalla: la tutora no podía elegir en la sesión grupal a estudiantes que ya tienen tutor, el aviso de validación de la ficha de derivación quedaba fuera de la vista en la zona con desplazamiento, y la estudiante no veía la respuesta de su tutora hasta recargar la página. Cuatro observaciones quedan sin corregir para decisión de la DBU o del asesor: un docente tutor atiende un solo ciclo, de modo que el piloto necesita tantos docentes como ciclos o excepciones registradas; el plan semestral no está en el menú lateral y su formulario valida al guardar; el nombre de un rol en pantalla difiere del de la guía; y el entorno de ensayo solo tenía un periodo, por lo que no se ensayó la consulta de un semestre cerrado [21].

### 7.12 Manuales y documentación operativa

Se elaboraron el manual de usuario, organizado por perfil y tarea, y el manual técnico y de instalación, que cubre arquitectura, instalación, configuración, base de datos, seguridad, respaldo, pruebas, entrega continua y solución de problemas; ambos se actualizaron el 16 de noviembre a la versión v1.0.0-beta.3 y se contrastaron con el menú y las pantallas actuales, y las 35 capturas del manual de usuario se regeneraron con la interfaz actual y datos ficticios. Los procedimientos de despliegue en producción, de respaldo y de reversión de una actualización cuentan con documentos propios, ensayados con datos de prueba, y la guía del piloto incluye guiones por rol, hoja de observación, cuestionario de usabilidad y consentimiento. El procedimiento de instalación no se ha ensayado en el servidor real, porque el entorno no ha sido entregado [14, 15].

Al redactar el manual de usuario se detectó, en octubre, que un profesional de servicio creado desde la interfaz no podía recibir su servicio, lo que le habría impedido ver cualquier derivación en una instalación sin datos de demostración; se corrigió. Al actualizarlo en noviembre se descubrió que varias descripciones del menú del manual ya no coincidían con la interfaz reorganizada, lo que se corrigió contrastando cada pantalla [14].

## 8 Pruebas de calidad y resultados

### 8.1 Estrategia de comprobación

El proyecto reúne pruebas unitarias del servidor con Jest, pruebas de integración y de permisos contra una base de datos real y exclusiva (que se niega a correr sobre la de desarrollo), pruebas de componentes del cliente con Vitest y Testing Library, recorridos de extremo a extremo con Playwright en la integración continua, ensayos de respaldo y restauración, recorridos de aceptación manual y el ensayo técnico de los roles. Cada nivel comprueba cosas distintas: la consulta de una API acredita reglas y respuestas, pero no demuestra por sí sola que el usuario complete cómodamente un formulario ni que un impreso sea legible [10, 17].

### 8.2 Resultados verificados

| Verificación | Resultado | Fuente y fecha |
| --- | --- | --- |
| Pruebas del servidor | 1 704 pruebas en 183 conjuntos, todas aprobadas; cobertura de sentencias 90,95 % | Integración continua, commit 11486c3, 16/11/2026 |
| Pruebas del cliente | 766 pruebas en 102 archivos, todas aprobadas; cobertura de sentencias 78,75 % | Integración continua, commit 11486c3, 16/11/2026 |
| Calidad estática y compilación | Estilo, tipos estrictos y compilación del servidor y del cliente sin errores | Integración continua, commit 11486c3 |
| Auditoría de dependencias | Sin vulnerabilidades en producción en el cliente; una advertencia moderada ignorada y documentada en el servidor | Integración continua y revisiones de seguridad |
| Ensayo de restauración de respaldos | Aprobado (respaldo con adjuntos, fallo controlado, retención y restauración idéntica byte a byte) | Integración continua, commit 11486c3 |
| Construcción de las imágenes de contenedor y migraciones | Aprobadas | Integración continua, commit 11486c3 |
| Recorridos de extremo a extremo en Chrome | 141 pruebas aprobadas, 1 omitida | Integración continua, commit 11486c3 |
| Firefox y WebKit | Ejecución manual aprobada sobre el commit bbfc664 (13/11/2026) y ejecuciones por solicitud de integración | Integración continua |
| Aceptación manual (secciones 1 a 7 del guion) | Pasos ejecutados por API o interfaz con resultado satisfactorio; quedan identificados los pendientes de lectura visual y el destino real de la copia de respaldo externa (paso 7.4) | Registros del 9 y 10/10/2026 [11, 12] |
| Revisiones de seguridad | 0 hallazgos altos; 1 medio y 6 bajos corregidos entre ambas revisiones; una advertencia moderada de dependencias, documentada (baja en la primera revisión, informativa en la segunda) | Informes del 11/10 y del 12/11/2026 [16, 20] |
| Ensayo técnico de los roles | 22 tareas con escritura completadas con datos ficticios; 3 defectos corregidos, 4 observaciones pendientes | Guiones automatizados, 13 a 15/11/2026 [21] |

Las cifras de pruebas corresponden al commit indicado y no deben reutilizarse para otra versión. En la V02 (commit 3860bd2, 11/10/2026) eran 689 pruebas del servidor y 299 del cliente. Las coberturas superan el 70 % que fija la Definition of Done en conjunto; el criterio se refiere a la lógica de negocio del módulo y no se midió separadamente [7].

### 8.3 Relación entre objetivos y productos

| Objetivo | Producto registrado | Alcance pendiente |
| --- | --- | --- |
| 1 Requerimientos | RF, RNF e historias de usuario; matriz de trazabilidad; levantamiento de ampliaciones | Conformidad de la DBU y control de cambios |
| 2 Modelado | Esquema de datos (50 modelos) y arquitectura documentada | Diagramas AS-IS/TO-BE, casos de uso y MER finales contrastados con el corte |
| 3 Interfaz | Aplicación web con revisión por rol, menú reorganizado y recorridos de extremo a extremo | Medición de usabilidad y pruebas en dispositivos móviles reales |
| 4 Implementación | Módulos, importación de Excel, autenticación, almacenamiento de evidencias, migraciones, certificación en demostración | Aceptación formal de la versión de entrega y formato oficial del certificado |
| 5 Validación | Pruebas automáticas, aceptación manual, dos revisiones de seguridad, ensayo técnico de los roles | Rendimiento, usabilidad y piloto con usuarios reales; escáner dinámico externo |
| 6 Documentación | Manuales de usuario y técnico actualizados a v1.0.0-beta.3, guías de despliegue, respaldo y piloto | Manuales con la aprobación del Product Owner y capacitación |

### 8.4 Limitaciones de los resultados

No se dispone en este corte de una medición comparativa de tiempos del proceso institucional ni de resultados de un piloto con usuarios reales. Tampoco se acredita la culminación de las prácticas, sus horas efectivas, la capacitación final ni la puesta en producción institucional, ni la aprobación de la versión por el Product Owner. La existencia de funciones y pruebas permite describir el avance técnico, pero no permite concluir que todos los objetivos hayan sido aceptados.

Los requisitos no funcionales de rendimiento (respuesta de operaciones frecuentes en hasta tres segundos con al menos cien usuarios concurrentes e importación de dos mil registros en menos de dos minutos) y de disponibilidad (99 %) requieren datos de carga, entorno y seguimiento operacional que todavía no existen [4]. Las pruebas de extremo a extremo se ejecutaron en ejecutores de automatización y no sirven como medición de rendimiento. El entorno de producción de la UNTRM, el correo saliente real y la copia de respaldo fuera del servidor dependen de la Oficina de TI y no estaban confirmados a la fecha del corte [21].

## 9 Dificultades técnicas y aprendizajes del proyecto

Una dificultad evidenciada por las auditorías fue diferenciar la disponibilidad de una pantalla del cierre real de un flujo. El caso de las solicitudes mostró que el registro debía acompañarse de responsable, bandeja, estado y respuesta. La corrección ilustra la necesidad de comprobar procesos completos además de funciones aisladas [9, 11].

Otra dificultad fue mantener una presentación simple sin debilitar la protección de datos. Los menús por perfil orientan al usuario, mientras que el servidor aplica las restricciones independientemente de lo que la interfaz muestre. La segunda revisión de seguridad lo confirmó con un caso concreto: una ruta que la interfaz no mostraba a un estudiante respondía igualmente a su cuenta hasta que se le exigió un permiso en el servidor.

La verificación de extremo a extremo aportó un aprendizaje distinto al de las pruebas por componentes: varios defectos dependían de la interacción entre partes (el estado del formulario tras una respuesta del servidor, la caché compartida entre el inicio de sesión y la identidad visual, o una lista que no se refrescaba mientras otra persona respondía). Las pruebas unitarias de cada pieza no los habían revelado, lo que justifica mantener ambos niveles.

También se aprendió que los datos de demostración pueden ocultar carencias de configuración. Un profesional de servicio sembrado con su servicio funcionaba; uno creado desde la interfaz no podía recibirlo. El ensayo de noviembre repitió la lección con el seed: las capturas del manual dependían de sesiones y solicitudes que la siembra base ya no crea, y el generador falló hasta preparar esos datos. Escribir la documentación obliga a recorrer cada paso como lo haría una persona nueva.

Las pruebas dependen también de su entorno. Las pruebas de integración que escribían datos sobre la base de desarrollo obligaron a aislarlas en una base exclusiva; y la ejecución programada de los navegadores falló cuando el servicio de automatización cambió la imagen de sus ejecutores a una versión que la herramienta de pruebas no soportaba, lo que se resolvió fijando la versión de la imagen. Un fallo de automatización puede no ser un defecto del producto, pero hay que investigarlo para saberlo.

Finalmente, el trabajo exige interpretar las evidencias correctamente. Un archivo de prueba escrito no es un resultado ejecutado; una ejecución satisfactoria de API no representa un piloto; un ensayo hecho por el propio equipo con guiones automatizados no equivale a una prueba con usuarios; y una restauración en un entorno de ensayo no acredita todavía la recuperación operativa de una instalación institucional. Estas distinciones fortalecen la trazabilidad y evitan conclusiones que excedan lo observado.

## 10 Conclusiones

1. La documentación del proyecto permite relacionar necesidades del proceso tutorial con requerimientos, historias y criterios de terminado, y la matriz de trazabilidad vincula las 50 historias con sus pruebas. La aceptación del alcance y de sus cambios debe acompañar esta relación documental, y las ampliaciones posteriores al plan (roles configurables, cierre del periodo, certificación) deben distinguirse del alcance original.
2. El repositorio contiene una aplicación web que integra los módulos principales del acompañamiento tutorial —del registro del estudiante a la derivación, la evaluación y los informes institucionales—, el cierre del periodo y la certificación en demostración, sobre una estructura tecnológica para persistencia, autenticación y operación en contenedores, entregada en doce versiones incrementales hasta v1.0.0-beta.3.
3. La auditoría por perfiles, las pruebas de extremo a extremo, la aceptación manual, las dos revisiones de seguridad y el ensayo técnico de los roles permitieron identificar y corregir defectos de navegación, continuidad de atención y protección de datos. Cada corrección quedó vinculada con su versión y con una prueba de regresión.
4. Las pruebas automáticas aportan evidencia técnica verificada por integración continua de las reglas del sistema y de sus accesos (1 704 pruebas del servidor, 766 del cliente y 141 recorridos de extremo a extremo en el commit de referencia), y los ensayos de respaldo, restauración y migración respaldan la operación. Permanecen diferenciadas de la medición de rendimiento, la evaluación con usuarios y la puesta en producción institucional.
5. El cierre formal de las prácticas requiere completar el piloto con usuarios, validar los formatos y el certificado oficial con la DBU, definir la infraestructura de producción, obtener la aprobación del Product Owner, acreditar las horas y obtener las constancias de ejecución y entrega. En consecuencia, este informe no declara el cumplimiento integral de los seis objetivos, sino el estado verificable de cada uno.

## 11 Recomendaciones

Mantener la relación entre cada requisito, cambio y prueba, y seleccionar una versión del sistema como referencia de la entrega. Las capturas, diagramas, reportes y manuales deben corresponder a esa versión para evitar contradicciones entre el informe y la aplicación; si el Product Owner solicita cambios sobre v1.0.0-beta.3, deben pasar por el mismo flujo de integración y de lanzamiento, y regenerarse los manuales.

Completar el piloto con tareas representativas de estudiantes, docentes y profesionales. Registrar éxito de tarea, pasos, dificultades y comentarios sin incorporar información clínica o credenciales a los anexos. Los cambios de interfaz deben sustentarse en esas observaciones y en las verificaciones de accesibilidad. Antes de la primera sesión, la DBU debe decidir las observaciones pendientes del ensayo, en particular cuántos docentes tutores se necesitan por escuela, dado que cada uno atiende un solo ciclo.

Definir antes de la puesta en producción el dominio y el servidor con HTTPS, la cuenta de correo para la recuperación de contraseñas, un destino de copias de respaldo fuera del servidor con un ensayo de restauración en otro equipo, y los responsables de operación y de monitoreo, mediante la solicitud a la Oficina de TI preparada el 17 de octubre. Ejecutar un escáner dinámico de seguridad sobre el entorno desplegado.

Obtener de la DBU la plantilla oficial del certificado, con sus logos y la ciudad de cada sede, antes de activar la certificación fuera del modo de demostración. Documentar el modelo final de roles antes de retirar perfiles o transferir funciones. El nombre Administrador no debe justificar acceso indiscriminado a notas sensibles, y la simplificación de formularios no debe eliminar información necesaria ni generar resultados no confirmados.

Cubrir con pruebas de extremo a extremo los recorridos que aún no las tienen —carga masiva y reasignación individual, entre otros— y vigilar la estabilidad de las pruebas del cliente en equipos con poca capacidad, donde algunas superan su tiempo de espera de forma intermitente.

## 12 Referencias del proyecto

[1] Chavez Caruajulca, B. (2026). Plan de prácticas preprofesionales. Documento presentado por el estudiante, seis páginas.

[2] Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas. (2024). Protocolo de Acompañamiento de Tutoría N° 01-2024-UNTRM/DBU. R.C.U. N° 283-2024.

[3] Proyecto SIT UNTRM. Requerimientos funcionales. Documento de trabajo suministrado por el estudiante.

[4] Proyecto SIT UNTRM. Requerimientos no funcionales. Documento de trabajo suministrado por el estudiante.

[5] Proyecto SIT UNTRM. Historias de usuario, riesgos y tareas técnicas; Product Backlog priorizado. Documentos de trabajo suministrados por el estudiante.

[6] Proyecto SIT UNTRM. Estimación de tareas; Sprint Backlog. Documentos de trabajo suministrados por el estudiante.

[7] Proyecto SIT UNTRM. Definition of Done. Documento de trabajo suministrado por el estudiante.

[8] Proyecto SIT UNTRM. Código y documentación de la rama develop en el commit 3860bd285d238409a03776eec1b8a07b9ef4e9b8 y etiqueta v0.4.1 (corte de la V02). Consulta del 11 de octubre de 2026. Repositorio indicado por el estudiante: https://github.com/Code-Chavez/Tutoria-untrm.

[9] Proyecto SIT UNTRM. (2026). Auditoría de interfaz y revisión de roles del 8 de octubre; historial posterior de correcciones.

[10] Proyecto SIT UNTRM. (2026). Matriz de trazabilidad de pruebas TT-100 (docs/MATRIZ_TRAZABILIDAD_PRUEBAS.md).

[11] Proyecto SIT UNTRM. (2026). Evidencia de las secciones 1 a 6 del guion de aceptación. Registro fechado el 9 de octubre, con actualización del recorrido 1.11.

[12] Proyecto SIT UNTRM. (2026). Evidencia de la sección 7 del guion de aceptación y documentación de despliegue (docs/ACEPTACION_SECCION7_2026-10-09.md; deploy/README.md; backup/README.md).

[13] Proyecto SIT UNTRM. (2026). Documentación de las pruebas de extremo a extremo (e2e/README.md).

[14] Proyecto SIT UNTRM. (2026). Manual de usuario (docs/MANUAL_USUARIO.md), versión del 16 de noviembre de 2026.

[15] Proyecto SIT UNTRM. (2026). Manual técnico y de instalación (docs/MANUAL_TECNICO.md), versión 1.1 del 16 de noviembre de 2026.

[16] Proyecto SIT UNTRM. (2026). Informe de seguridad TT-101, 11 de octubre (docs/INFORME_SEGURIDAD_2026-10-11.md).

[17] Proyecto SIT UNTRM. (2026). Solicitudes de integración y su historial en el repositorio (pull requests n.° 97 a 105 y posteriores), que documentan la suite de extremo a extremo y los defectos que reveló; flujos de la integración continua (.github/workflows/).

[18] Proyecto SIT UNTRM. (2026). Código y documentación de la rama main en el commit 11486c3 y etiqueta v1.0.0-beta.3 (corte de la V03), y notas de las versiones (docs/RELEASE_v1.0.0-beta.1.md, RELEASE_v1.0.0-beta.2.md y RELEASE_v1.0.0-beta.3.md). Consulta del 16 de noviembre de 2026. Repositorio: https://github.com/Code-Chavez/Tutoria-untrm.

[19] Proyecto SIT UNTRM. (2026). Levantamiento de ampliaciones y diseño de la certificación de demostración (docs/levantamiento/).

[20] Proyecto SIT UNTRM. (2026). Revisión de seguridad TT-101, repaso del 12 de noviembre (docs/INFORME_SEGURIDAD_TT101_REVISION_2026-11-12.md).

[21] Proyecto SIT UNTRM. (2026). Estado de preparación del piloto y resultados del ensayo de los recorridos de los roles, TT-102, 13 a 15 de noviembre (docs/PILOTO_ESTADO_PREPARACION_2026-11-13.md; docs/GUIA_PILOTO.md).
