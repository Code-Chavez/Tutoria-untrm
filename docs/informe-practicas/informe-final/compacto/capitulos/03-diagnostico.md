# Capítulo III. Diagnóstico, actores y requisitos

## 3.1 Situación de partida

El diagnóstico de partida es **documental**. Parte de lo que establece el protocolo de la UNTRM (UNTRM, 2024) y de las necesidades informáticas que formuló la DBU para el servicio. Desde el diseño de la información, las actividades de la tutoría están encadenadas: una solicitud puede dar lugar a una sesión, una sesión puede requerir seguimiento y un caso puede continuar en un servicio especializado. Si cada registro se trata como un dato aislado, es más difícil reconstruir el recorrido de atención y relacionarlo con los reportes que la institución necesita.

No existe una línea de base medida (expedientes perdidos, tiempos, errores), por lo que la articulación entre registros y la trazabilidad son **objetivos de diseño** y los beneficios cuantitativos quedan como medición pendiente del piloto.

## 3.2 Procesos y formatos del protocolo

El protocolo define actividades que respaldan sus formatos (anexos del protocolo). El sistema los convierte en registros con autoría, fecha y estado:

[[tabla: Formatos del protocolo y su tratamiento en el sistema]]

| Formato | Actividad | Tratamiento en el sistema |
| --- | --- | --- |
| Anexo N.° 3 | Entrevista inicial | Registro de la entrevista y de la red de apoyo del estudiante |
| Anexo N.° 4 | Hoja de asistencia a la tutoría | Asistencia por sesión, con hoja imprimible; el escaneo firmado se adjunta con registro de autor, fecha y huella de verificación |
| Anexo N.° 5 | Ficha de seguimiento | Seguimiento de las actuaciones y acuerdos posteriores a la sesión |
| Anexo N.° 6 | Ficha de derivación | Derivación a un servicio, con checklist de aspectos observados y estados que solo avanzan; constancia imprimible |
| Anexo N.° 7 | Cuestionario de evaluación del tutor | 20 ítems, una respuesta por estudiante y periodo, resultados agregados sin identificar al estudiante |
| Anexos N.° 8 y 9 | Plan semestral e informe semestral | Plan de trabajo por escuela con versiones y resolución; informe semestral del docente |

La correspondencia exacta de cada campo con los formatos oficiales está pendiente de **validación por la DBU** (Anexo L), porque el sistema trabaja con la transcripción de esos formatos y no con una confirmación institucional de su fidelidad.

## 3.3 Actores y roles

El sistema distingue siete roles base. Cada persona ve solo el menú y la información de su rol, y el servidor aplica además el alcance (propio, escuelas, facultad, servicio o institución) aunque la interfaz no muestre una opción.

[[tabla: Roles del sistema y su alcance]]

| Rol | Alcance |
| --- | --- |
| Administrador DBU | Todo el sistema |
| Coordinador de escuela | Su escuela: estudiantes, asignación, plan semestral, solicitudes, indicadores y resultados de evaluación |
| Docente tutor | Sus tutorados: entrevistas, sesiones, seguimiento, derivaciones, solicitudes e informe semestral |
| Estudiante (rol interno «Tutorado») | Sus sesiones, solicitar tutoría y evaluar a su tutor |
| Profesional de servicio | Los casos derivados a su servicio (Escuela, Psicopedagogía, Psicología, Asistencia Social o Salud) |
| Vicerrectorado | Solo lectura: informe consolidado e indicadores; configura las sedes |
| Decano | Su facultad: registra y consulta amonestaciones a docentes tutores; no ve estudiantes ni expedientes |

Desde la versión v1.0.0-beta.2 los roles y sus permisos se configuran en la propia aplicación, con roles base protegidos y un permiso de administración que no puede delegarse, y cada cuenta recibe un alcance (ninguno, propio, escuelas, facultades, institución o servicio).

## 3.4 Requisitos funcionales

Los requisitos funcionales se expresaron como 50 historias de usuario y tareas técnicas agrupadas por módulo, que la matriz de trazabilidad (Anexo C) vincula con sus pruebas. Los módulos son:

[[tabla: Módulos funcionales del sistema]]

| Módulo | Funciones principales |
| --- | --- |
| Acceso y cuenta | Ingreso, recuperación de contraseña por correo con enlace de un solo uso, perfil, cierre de sesión por inactividad, notificaciones |
| Administración | Usuarios, roles, permisos y alcances; catálogos, parámetros, identidad visual; bitácora de auditoría |
| Estudiantes | Registro individual y carga masiva desde Excel, matrícula por periodo, riesgo académico, asignación con historial, expediente en PDF |
| Acompañamiento | Entrevista inicial, red de apoyo, sesiones individuales y grupales, asistencia, seguimiento, evidencias, alertas |
| Solicitudes | Solicitud del estudiante o del docente, enrutamiento a un responsable, atención con respuesta obligatoria, historial |
| Derivaciones | Ficha de derivación, enrutamiento por servicio, estados, atención y cierre, seguimiento por la DBU, constancia |
| Periodo académico | Pedido de listas por correo, carga de estudiantes y docentes, asignación de un tutor por ciclo con aceptación, pendientes, cierre y reapertura |
| Evaluación e informes | Cuestionario del servicio, plan semestral, informe semestral, informe consolidado, indicadores, exportación PDF y Excel |
| Certificación (demostración) | Trámite de certificación de los docentes de la comisión de tutoría, con estados, evidencias y PDF de demostración |
| Amonestaciones | Registro por el decano y consulta por coordinación y DBU |

## 3.5 Requisitos no funcionales

Los requisitos de calidad abarcan validación de entradas, autenticación, permisos, integridad de datos, respuesta ante errores y facilidad de uso. Los objetivos cuantitativos fijados por el plan son: respuesta de las operaciones frecuentes en hasta tres segundos con al menos cien usuarios concurrentes, importación de dos mil registros en menos de dos minutos y disponibilidad del 99 %. Estos objetivos requieren datos de carga, un entorno de despliegue y seguimiento operacional que **todavía no existen**; por eso el capítulo VI no los declara cumplidos.

## 3.6 Decisiones pendientes de la institución

Varias decisiones no dependen del desarrollo sino de la DBU y de otras unidades, y condicionan el cierre del proyecto: el anonimato de la evaluación y el tratamiento de los datos reales; la validación de los formatos de los anexos; la plantilla, los logos, la ciudad y la autoridad firmante del certificado oficial; el entorno de producción (servidor, dominio, HTTPS, correo institucional, respaldo externo) a cargo de la Oficina de TI; y la regla de que un docente atienda un solo ciclo, que obliga a contar con tantos docentes como ciclos o a registrar excepciones. El Anexo L lista cada pendiente y quién lo decide.
