# Capítulo V. Diseño y desarrollo de la solución

Este capítulo describe cómo está construido el sistema y cómo evolucionó. Los diagramas se generaron a partir de las fuentes del proyecto (esquema de la base de datos, entidades del dominio y código) o se dibujaron a partir de ellas; cada uno indica su fuente y la versión de referencia. Los diagramas completos están en el Anexo B.

## 5.1 Visión general

El SIT es una aplicación web de tres partes: un **cliente** que se usa desde el navegador, una **API** que aplica las reglas del servicio tutorial y una **base de datos** PostgreSQL. El sistema envía avisos y pedidos por correo a través de un servidor SMTP institucional y prevé una copia de respaldo fuera del servidor; ambos servicios dependen de la Oficina de TI y no están entregados, por lo que la figura los muestra con línea punteada.

![Contexto del sistema (DOC-D01). Fuente: roles y manual del sistema; v1.0.0-beta.4.](../../figuras/dc-d01.png){w=4.4}

## 5.2 Arquitectura

El servidor sigue una arquitectura hexagonal (Cockburn, 2005): el **dominio** define las entidades y los contratos (puertos); la **aplicación** agrupa los casos de uso; la **infraestructura** implementa los adaptadores (repositorios Prisma, correo, generación de documentos, seguridad); y las **interfaces** exponen las operaciones HTTP con sus controladores, autenticación, permisos y validación con Zod. Una raíz de composición conecta los casos de uso con sus implementaciones. En el commit de referencia, el dominio y la aplicación no importan nada de la infraestructura ni de las interfaces.

El cliente usa React con Vite y TypeScript y se organiza por funcionalidades (*features*). Las peticiones se resuelven con una capa de servicios HTTP y una caché de consultas, y el estado de cada pantalla (filtros, opción elegida, ventana abierta) vive en la dirección, de modo que se restaura al recargar o compartir el enlace.

![Componentes del sistema (DOC-D08). Fuente: manual del sistema y carpetas del servidor y del cliente; v1.0.0-beta.4.](../../figuras/dd-d08.png){w=3.7}

Como orden de magnitud, al commit 11486c3 el servidor contiene alrededor de 27 mil líneas de código TypeScript en 459 archivos y el cliente alrededor de 24 mil en 226 archivos, sin contar pruebas ni hojas de estilo. Son cifras de tamaño, no de calidad ni de esfuerzo.

## 5.3 Modelo de datos

El esquema de la base de datos tiene **50 tablas y 92 relaciones**, administradas con Prisma y 58 migraciones versionadas. Se presenta por módulos (Anexo B): acceso y auditoría; estructura académica y configuración; estudiantes y acompañamiento; solicitudes y sesiones; derivaciones, avisos y documentos; evaluación, planes, informes y pedidos de listas; y certificación. El diagrama entidad-relación de cada módulo y el diccionario de datos con todas las columnas se generan desde el esquema (Anexo B), de modo que no pueden diferir de él.

## 5.4 Acceso y protección de la información

Los controles verifican tanto el **permiso** para realizar una operación como el **alcance** de los datos (estudiantes asignados a un docente, estudiantes de una escuela, casos de un servicio o información propia del estudiante). La restricción se aplica en la API aunque el usuario intente entrar por una dirección directa. La autorización lee el rol de la base de datos y no del contenido del token.

Las medidas implementadas incluyen contraseñas con bcrypt (Provos y Mazières, 1999), tokens de sesión JSON Web Token de vida corta con renovación rotativa y detección de reutilización (Jones et al., 2015), bloqueo de la cuenta tras cinco intentos fallidos, recuperación de contraseña por correo con enlace de un solo uso, cierre de sesión por inactividad, aislamiento de la caché entre cuentas, validación del contenido de los archivos subidos, cabeceras de seguridad y una bitácora de auditoría. Desde la v1.0.0-beta.2 las cuentas nuevas no reciben una clave inicial: la persona crea su contraseña con un enlace de invitación de un solo uso.

![Secuencia del inicio de sesión (DOC-D06a). Fuente: manual del sistema y rutas de autenticación; v1.0.0-beta.4.](../../figuras/dc-d06a.png){w=4.6}

## 5.5 Módulos principales

### 5.5.1 Estudiantes y acompañamiento

El módulo reúne el registro individual, la importación desde Excel con reporte de resultado, la matrícula en el periodo vigente, la asignación con historial y el expediente (con descarga en PDF). La asignación pasó de ser por estudiante a ser **por ciclo**: la coordinación elige el docente tutor de cada ciclo de su escuela, el docente recibe un enlace personal para aceptar con su disponibilidad o rechazar con un motivo, y un docente atiende un solo ciclo salvo una excepción registrada con su motivo.

Las sesiones incorporan programación individual y grupal, modalidad presencial o virtual, reprogramación y cancelación con motivo, y asistencia. La asistencia se distingue de la programación: una sesión en el calendario no acredita que el estudiante haya sido atendido. El tope de ocho sesiones por estudiante se aplica por semestre y la numeración reinicia en cada periodo.

### 5.5.2 Solicitudes y derivaciones

El estudiante (o su docente en su nombre) registra una solicitud, que el sistema enruta a un responsable: el tutor y, si no lo hay, el coordinador de la escuela y, si tampoco, la DBU, de modo que ninguna solicitud se pierde. La atención exige una respuesta, y la solicitud puede atenderse programando una sesión o derivando el caso. La derivación avanza por estados que solo van hacia adelante, y la información que puede ver el docente que deriva no incluye las notas internas del profesional del servicio.

![Actividades de la atención de una solicitud y de la preparación y cierre del periodo (DOC-D05). Fuente: entidades del dominio, casos de uso del periodo y manual de usuario; v1.0.0-beta.4.](../../figuras/dc-d05.png){w=5.2}

![Secuencia de una solicitud de tutoría y su aviso por correo (DOC-D06b). Fuente: esquema de datos y servicios de correo; v1.0.0-beta.4.](../../figuras/dc-d06b.png){w=5.4}

Los estados de la solicitud y de la derivación están definidos en el dominio (figura siguiente).

![Estados de la solicitud de tutoría (DOC-D07a), de la derivación (DOC-D07b) y del periodo académico (DOC-D07d). Fuente: entidades del dominio y casos de uso; los estados solo avanzan, salvo la reapertura del periodo.](../../figuras/c-estados.png){w=5.6}

### 5.5.3 Periodo académico, roles y configuración

El periodo académico tiene tres estados: sin abrir, vigente y cerrado. La DBU cierra el periodo vigente escribiendo su nombre como confirmación; el cierre guarda un resumen, deja la tutoría en solo lectura y puede revertirse si se cerró por error y no hay otro periodo vigente. La preparación del periodo incluye el pedido de listas por correo, la carga de estudiantes y docentes y la asignación por ciclo (figuras de actividades y de estados).

Los roles y sus permisos se configuran en la aplicación, con roles base protegidos; un permiso de administración no puede delegarse y cada cuenta recibe un alcance. Los catálogos, los parámetros y la identidad visual se administran desde la configuración.

### 5.5.4 Evaluación e informes

La evaluación incorpora el cuestionario de 20 ítems del servicio tutorial, que se responde una sola vez por periodo y se presenta de forma agregada y sin identificar al estudiante. Los reportes e indicadores se calculan con las sesiones, la asistencia, las derivaciones y el periodo, y se exportan en PDF y Excel. Un corte de matrícula por periodo conserva la información histórica, de modo que las cifras de un semestre cerrado no cambian si luego se reasignan o desactivan estudiantes. Los planes semestrales aprobados conservan su versión vigente cuando se propone una modificación, que se maneja como una revisión pendiente de resolución.

### 5.5.5 Certificación del docente tutor (demostración)

A partir del levantamiento de ampliaciones se implementó, en seis cortes sucesivos durante noviembre, el trámite de certificación de los docentes de la comisión de tutoría: modelo de datos y numeración transaccional, permisos con alcance por escuela, un trámite con estados y tres evidencias que quien revisa marca como conformes u observadas, la generación del PDF y su descarga auditada, y la pantalla con borradores y verificación de accesibilidad.

**El certificado es de demostración:** lleva la marca de agua «DEMOSTRACIÓN — SIN VALOR», una numeración que empieza con `DEMO-` y no se firma ni se entrega, porque la universidad aún no ha entregado el formato oficial. Ningún certificado de demostración puede alcanzar los estados de firma y entrega, algo que la propia base de datos impide.

![Estados del trámite de certificación (DOC-D07c). Fuente: máquina de estados del dominio; los estados de firma y entrega no son alcanzables en demostración.](../../figuras/dd-d07c.png){w=4.2}

### 5.5.6 Interfaz de usuario

La interfaz se revisó con perfiles de prueba y con las heurísticas de Nielsen (1994). Las revisiones de octubre registraron problemas de navegación, de presentación de opciones y de continuidad de solicitudes, corregidos en la versión v0.4.0; la auditoría previa al lanzamiento simplificó las denominaciones visibles (por ejemplo, «Estudiante» en pantalla para el rol interno «Tutorado»), agrupó el menú por tareas y, en noviembre, lo reorganizó con menús de sección por pantalla. Los borradores de lo que se escribe se conservan por pestaña y por persona sin pasar por el servidor.

## 5.6 Entornos y despliegue

El sistema se ejecuta en contenedores Docker. El entorno de desarrollo y pruebas reúne el cliente, el servidor, PostgreSQL 16, un servidor de correo de pruebas y el servicio de respaldo. Para producción se prepararon imágenes sin código fuente y con usuario no privilegiado, un proxy con HTTPS automático, un servicio de respaldo y una validación que impide arrancar con configuración insegura. Se ensayaron el respaldo, la restauración y la reversión de una actualización con datos de prueba.

El entorno institucional (servidor, dominio, HTTPS, correo y copia externa) **no está entregado**: lo que muestra la figura de producción es la definición del repositorio, no un despliegue realizado.

![Despliegue (DOC-D09). Fuente: definiciones de Docker Compose de desarrollo y de producción; el entorno institucional está pendiente.](../../figuras/dd-d09.png){w=4.8}

## 5.7 Evolución del producto

[[tabla: Entregas realizadas]]

| Versión | Fecha | Contenido principal |
| --- | --- | --- |
| v0.0.1 | 01/09/2026 | Autenticación, recuperación de contraseña, usuarios, roles y permisos, perfil, expiración de sesión, respaldo de base |
| v0.1.0 | 24/09/2026 | Carga masiva y registro de estudiantes, riesgo académico, asignación, entrevista inicial (Anexo 3), red de apoyo, expediente |
| v0.2.0 | 25/09/2026 | Solicitudes, sesiones individuales y grupales, calendario, asistencia (Anexo 4), seguimiento (Anexo 5), evidencias, alertas, consolidado de horarios |
| v0.3.0 | 01/10/2026 | Derivaciones (Anexo 6), enrutamiento por servicio, estados, notificaciones, seguimiento de la DBU, evaluación (Anexo 7) |
| v0.4.0 | 09/10/2026 | Planes e informes semestrales (Anexos 8 y 9), informe consolidado, indicadores, exportación PDF y Excel, catálogos, parámetros, identidad visual y correcciones de las auditorías |
| v0.4.1 | 10/10/2026 | Corrección de seguridad de enlaces de reunión y evidencias de aceptación |
| v0.4.2 | 11/10/2026 | Endurecimiento de seguridad, asignación del servicio del profesional y suite de extremo a extremo |
| v0.4.3 | 12/10/2026 | Nombre del estudiante en las derivaciones, capturas del manual y guía del piloto |
| v0.4.4 | 12/10/2026 | Avisos por correo, correo formal y constancia al estudiante |
| v1.0.0-beta.1 | 13/10/2026 | Candidata para pruebas controladas con datos ficticios: cuentas, correos, importación, alcance y correcciones de la auditoría previa |
| v1.0.0-beta.2 | 05/11/2026 | Invitación de un solo uso, alta masiva de docentes, cierre y reapertura del periodo, matrícula por periodo, pedidos de listas por correo, un tutor por ciclo con aceptación, rol Decano y amonestaciones, roles y alcances configurables, estado de la pantalla en la URL y borradores |
| v1.0.0-beta.3 | 16/11/2026 | Certificación del docente tutor en demostración con certificados configurables, pedidos de listas por facultad, estudiantes por periodo, reorganización del menú, regreso a la vista anterior tras caducar la sesión, E2E en integración continua y correcciones del ensayo del piloto |
| v1.0.0-beta.4 | 19/11/2026 | «Plan semestral» en el menú de la coordinación y validación del formulario al guardar; tutores solo con permiso y escuelas acotadas en la lista de estudiantes; aviso de solapamiento entre pedidos de facultad y de escuela; rótulos «(actual)» en el historial por semestre; manuales, informe y documentos de estado actualizados |
| v1.0.0-beta.5 | 25/11/2026 | Archivos nuevos (evidencias, documentos firmados, resoluciones, imágenes y foto de perfil) en Cloudinary en modo privado, con un solo control de arrastrar o elegir; la foto de perfil se sube en lugar de pegar un enlace; correcciones de la auditoría y del detalle de derivaciones |
| v1.0.0 | 25/11/2026 | Foto de perfil enviada correctamente como archivo; todos los roles se editan salvo el del Administrador; icono de la pestaña con el logotipo; el horario de aceptación de tutoría se corrige solo si dura menos de una sesión |

[[fuente: Etiquetas del repositorio y notas de cada versión (Anexo J). Las versiones posteriores a v0.4.1 son candidatas.]]

La construcción de los recorridos de extremo a extremo reveló defectos que las pruebas por componentes no habían detectado: el formulario de atención de derivaciones reenviaba el estado ya guardado al avanzar dos pasos seguidos, la identidad visual guardada no se aplicaba hasta recargar la página, las sesiones canceladas figuraban con asistencia pendiente en los reportes y los enlaces de reunión admitían esquemas peligrosos. Todos se corrigieron con su prueba de regresión.
