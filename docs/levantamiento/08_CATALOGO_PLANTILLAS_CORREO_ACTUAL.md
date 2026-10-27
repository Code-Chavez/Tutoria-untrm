# Catálogo de plantillas de correo — sistema actual

**Estado: IMPLEMENTADO** (lo que envía el código hoy, corte `c2e0460`). Es el entregable 6 del levantamiento («catálogo de plantillas de correo y campos variables») **solo para lo que ya existe**; las plantillas de funciones propuestas (certificados, nuevos tipos de pedido) **no se definen aquí** porque dependen de decisiones. Fuente única del catálogo: este archivo; la documentación integral del informe debe referenciarlo. Etiquetas: [README](README.md).

Todas las plantillas comparten el encabezado institucional (Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas, Dirección de Bienestar Universitario, Sistema Integral de Tutoría) y, salvo el pedido de listas y el aviso de rechazo, el pie «mensaje automático: no responda a este correo». En desarrollo todo llega a Mailpit; el SMTP institucional real depende de TI (Q13).

## 1. Plantillas

| N.° | Plantilla | Cuándo se envía | Destinatario | Asunto | Campos variables | Adjuntos | Fuente |
|---|---|---|---|---|---|---|---|
| P01 | Aviso de derivación nueva | Se crea una derivación (E01) | Profesionales activos del servicio elegido | «Nueva derivación recibida — SIT UNTRM» | Nombre del destinatario, enlace a la derivación en el sistema | — | `notificationEmail.ts` |
| P02 | Aviso de cambio de estado de derivación | El servicio cambia el estado (E02) | Tutor que la emitió | «Actualización del estado de una derivación — SIT UNTRM» | Nombre, enlace | — | `notificationEmail.ts` |
| P03 | Aviso de solicitud de tutoría nueva | Se crea una solicitud (E03) | Destinatario resuelto (tutor, coordinación o DBU) | «Nueva solicitud de tutoría — SIT UNTRM» | Nombre, enlace a la solicitud | — | `notificationEmail.ts` |
| P04 | Constancia de solicitud registrada | Se registra la solicitud (E04) | Estudiante con cuenta de portal | «Solicitud de tutoría registrada — SIT UNTRM» | Nombre, enlace | — | `notificationEmail.ts` |
| P05 | Actualización de la solicitud | Cambia su estado o se vincula a una sesión o derivación (E05, E06) | Estudiante | «Actualización de su solicitud de tutoría — SIT UNTRM» | Nombre, enlace | — | `notificationEmail.ts` |
| P06 | Sesión programada | Se programa una sesión (E07) | Estudiantes participantes con cuenta | «Sesión de tutoría programada — SIT UNTRM» | Nombre, enlace a «Mis sesiones» | — | `notificationEmail.ts` |
| P07 | Sesión reprogramada | Se cambia el horario (E07) | Ídem | «Cambio en su sesión de tutoría — SIT UNTRM» | Nombre, enlace | — | `notificationEmail.ts` |
| P08 | Sesión cancelada | Se cancela (E07) | Ídem | «Su sesión de tutoría fue cancelada — SIT UNTRM» | Nombre, enlace | — | `notificationEmail.ts` |
| P09 | Invitación de activación de cuenta | Se crea una cuenta o se reemite la invitación (E11) | La persona dueña de la cuenta | «Active su cuenta — SIT UNTRM» | Nombre, enlace de un solo uso, vigencia en horas (por defecto 72) | — | `invitationEmail.ts` |
| P10 | Recuperación de contraseña | La persona la solicita (E11) | La persona | «Recuperación de contraseña — SIT UNTRM» | Enlace de un solo uso | — | `RequestPasswordResetUseCase.ts` |
| P11 | Confirmación como docente tutor | Se designa al docente por ciclo (E08) | El docente | «Confirmación como docente tutor — {escuela}, ciclo {n} ({periodo})» | Nombre, escuela, ciclo, periodo, si es excepción (segundo ciclo), enlace personal de un solo uso, vigencia en horas | — | `tutorAcceptanceEmail.ts` |
| P12 | Aviso de rechazo del docente | El docente rechaza (E10) | Coordinación de la escuela | «Docente rechazó el ciclo {n} — {escuela}» | Nombre del docente, escuela, ciclo, periodo, **motivo escrito por el docente** (≤ 500 caracteres) | — | `tutorAcceptanceEmail.ts` |
| P13 | Pedido de lista de estudiantes o de docentes | Coordinación o DBU lo envía (E12) | Correo de pedido de la escuela (copia y «responder a» la persona que pide) | «Solicitud de lista de {estudiantes\|docentes tutores} — {escuela} — periodo {periodo}» | Escuela, facultad, periodo, ciclos, observaciones (≤ 500), persona que pide y su correo, columnas requeridas | Plantilla Excel de la lista | `dataRequestEmail.ts` |

## 2. Reglas comunes que ya cumple el código

1. **Los correos de aviso (P01–P08) no llevan el texto del aviso ni datos del caso:** ese texto puede nombrar al estudiante o al servicio; el correo solo dice que hay algo nuevo y lleva al sistema, donde se exige iniciar sesión (Ley N.° 29733 como referencia). Pruebas: `server/tests/unit/EmailNotifications.test.ts` («no incluye el texto del aviso ni datos de la persona atendida» y «los avisos de sesión … solo avisan: ni fecha, ni lugar, ni motivo»).
2. **Las invitaciones y la recuperación (P09–P11) no llevan contraseñas:** solo un enlace de un solo uso con vigencia; el enlace no se escribe en los registros del servidor.
3. **Reintentos (solo avisos P01–P08):** a 1, 5, 15 y 60 minutos; al quinto fallo seguido queda fallido. Las demás plantillas se envían directo y su fallo se trata caso por caso (P09–P11 se informan a quien las pidió; P12 queda solo en el registro del servidor, ver LEV-R05; P13 queda `FALLIDO` con reenvío).
4. **Estados que se distinguen:** el pedido de listas guarda `ENVIADO` («aceptado por el servidor de correo») o `FALLIDO`; **no existe «entregado al destinatario»** y el sistema no lo afirma.

## 3. Inconsistencias y huecos detectados (documentados, no corregidos)

| N.° | Hallazgo | Evidencia | Estado |
|---|---|---|---|
| C01 | **P11 pide al docente indicar «los días, las horas y el lugar»**, pero el formulario de aceptación ya solo pide días y horas («no se fija el lugar de las sesiones») desde TT-103. El correo y la pantalla se contradicen | `tutorAcceptanceEmail.ts` (variable `ask`); `client/src/features/ciclos/pages/TutorAcceptancePage.tsx`; `CAMBIOS_USUARIO_TT103.md` | Propuesto corregir el texto: **LEV-R07** en [05](05_REQUISITOS_SIN_DEPENDENCIAS.md) |
| C02 | P12 incluye el motivo íntegro que escribió el docente en un correo a la coordinación | `tutorAcceptanceEmail.ts` | Pendiente de decisión sobre qué debe viajar por correo (Q07) |
| C03 | No hay plantilla de aviso de **aceptación** del docente ni de **cambio de disponibilidad** | [07](07_MATRIZ_EVENTOS_ACTUAL.md), H02–H03 | Pendiente de decisión (Q08, Q16) |
| C04 | No hay plantilla propia para cada tipo de pedido de lista salvo estudiantes y docentes; no incluye fecha límite, finalidad como campo ni medio de entrega | LEV-D32 | LEV-R06 y Q11–Q12 |
| C05 | Las plantillas están escritas en el código; **no hay un editor ni versionado de textos** | `server/src/application/services/*Email.ts` | Sin requisito aprobado; se anota como límite |

> **Nota de resolución (C01):** el texto del hallazgo C01 es el histórico del diagnóstico y no se reescribe. **Corregido en el PR #181, commit `00e42f3`** (LEV-R07): el correo de aceptación pide solo días y horas. Pendiente de fusión al momento de esta nota; la CI de ese commit dio 12 comprobaciones aprobadas y 2 omitidas.

## 4. Lo que este catálogo no cubre

No se envió ningún correo ni se probó contra un SMTP real para escribirlo; los textos y asuntos son los del código. Los textos exactos de cuerpo se omiten salvo cuando importan para una inconsistencia: se pueden leer en los archivos citados.
