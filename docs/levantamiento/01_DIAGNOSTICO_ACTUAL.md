# Diagnóstico actual (Fase 1)

Borrador para revisión. Corte del código: `develop` en `c2e0460`. Etiquetas y fuentes: ver [README](README.md). Las rutas son relativas a la raíz del repositorio. Nada de lo marcado **[EXISTE]** está, por eso, aprobado institucionalmente.

## 0. Resumen

| Necesidad | Estado general | Qué la bloquea (preguntas en [02](02_PREGUNTAS_INSTITUCIONALES.md)) |
|---|---|---|
| A. Roles, competencias y permisos configurables | **Parcial**: permisos finos y autorización por permisos existen; roles dinámicos casi no (solo crear nombre) | Q01, Q02, Q04, Q05 |
| B. Perfiles vinculados y sincronización | **Parcial**: avisos internos con sondeo y correo por cada aviso; faltan eventos (disponibilidad, informes, certificados) y política de correo | Q07–Q10 |
| C. Correos y pedidos de listas | **Parcial**: pedido formal con plantilla y registro enviado/fallido; faltan vista previa, fecha límite, canal de entrega acordado | Q11–Q14 |
| D. Primer acceso y aceptación del docente | **Existe en lo esencial** (invitación, aceptación, activación); faltan el plazo de «sin respuesta» y la edición posterior de la disponibilidad | Q15, Q16 |
| E. Lugar de la tutoría | **Falta**: la solicitud no tiene lugar; el lugar lo fija quien programa la sesión | Q17–Q19 |
| F. Certificación del docente tutor | **Falta por completo** | Q20–Q29 |
| G. Firma digital y plantilla institucional | **Parcial** solo como patrón: se suben escaneos firmados de dos formatos; no hay generación ni verificación de firmas | Q23, Q24, Q28 |
| H. Usabilidad, accesibilidad y validaciones | **Parcial**: auditoría y pruebas con límites declarados | Q30, Q31 |

## A. Roles, competencias y permisos configurables

| ID | Hallazgo | Estado | Evidencia |
|---|---|---|---|
| LEV-D01 | 7 roles sembrados: Administrador DBU, Coordinador, Docente Tutor, Tutorado, Profesional de Servicio, Vicerrectorado, Decano. **RF-04 enumera 5** (sin Coordinador ni Decano) y **HU-04 enumera 7 distintos** (con «Responsable de escuela» y sin Decano). Las tres listas no coinciden | **[CONFIRMAR]** | `server/src/infrastructure/bootstrap/seedBase.ts`; RF-04; HU-04; [03](03_CONTRASTE_PROTOCOLO_Y_BACKLOG.md) |
| LEV-D02 | 36 permisos finos con la forma `recurso:acción` (p. ej. `users:write`, `referrals:read`, `admin:system`). Las acciones del encargo (consultar, registrar, modificar, aprobar, emitir, firmar, descargar, administrar) no existen como vocabulario uniforme: hoy hay `read`, `write`, `delete`, `import`, `export`, `manage`, `respond`, `self`, `system` | **[PARCIAL]** | `seedBase.ts` (lista de permisos) |
| LEV-D03 | La autorización de cada ruta consulta los permisos del rol en la base, con una caché de 30 s; la cuenta (activa, rol vigente) se lee en cada petición | **[EXISTE]** | `server/src/interfaces/http/middleware/authorize.ts`, `…/security/rolePermissions.ts`, `…/middleware/authenticate.ts` |
| LEV-D04 | Los permisos de un rol solo cambian al sembrar: **no hay endpoint ni pantalla** para asignar o retirar permisos de un rol, ni para editar o desactivar un rol | **[FALTA]** | `rolePermissions.ts` (comentario «solo cambian al sembrar»); `role.routes.ts` |
| LEV-D05 | Existe `GET /roles` y `POST /roles` (exige `admin:system`): crea un rol con **nombre y descripción, sin permisos**. **No se registra en la bitácora**: ni el caso de uso lo hace ni el interceptor automático (solo audita `User`, `Faculty`, `School`, `AcademicPeriod` y `CatalogItem`) | **[PARCIAL]** | `server/src/interfaces/http/routes/role.routes.ts`, `…/use-cases/roles/CreateRoleUseCase.ts` (sin llamada a auditoría), `server/src/infrastructure/database/auditEntry.ts` (`CRITICAL_MODELS`) |
| LEV-D06 | Un usuario tiene **un solo rol**; asignar reemplaza el vigente (`PUT /users/:id/role`, `admin:system`) y registra `ASSIGN_ROLE` en la bitácora | **[EXISTE]** | `…/use-cases/roles/AssignRoleUseCase.ts`, `user.routes.ts` |
| LEV-D07 | **El alcance (propios, escuela, facultad, institución) se decide por el NOMBRE del rol**, no por un dato configurable: `StudentAccessGuard.scopeFor` hace un `switch` por nombre (DBU → todo; Coordinador → escuelas que coordina por `School.coordinatorId`; Docente Tutor → sus asignados; cualquier otro → ninguno). Un rol nuevo obtiene alcance **ninguno**: no hereda acceso | **[EXISTE]** (y es seguro por defecto) | `server/src/application/access/StudentAccessGuard.ts` |
| LEV-D08 | Comprobaciones por nombre de rol dispersas: **43 ocurrencias en 22 archivos del servidor** (34 de ellas en forma de comparación) y **68 ocurrencias en 17 archivos del cliente** (19 archivos con la expresión ampliada), más un mapa fijo de 7 roles que decide el menú (`ROLE_CODES`). Comando, alcance y commit en la sección «Comprobaciones por nombre de rol: recuento y método» | **[PARCIAL]**: un rol nuevo no entra a esas rutas, pero tampoco se puede dar acceso configurable | `git grep` en `c2e0460`; `client/src/shared/components/layout/navigation.ts` |
| LEV-D09 | El menú y las pantallas del cliente se deciden con el nombre de rol del token; el servidor vuelve a comprobar cada petición. Qué ve el usuario con sesión iniciada tras un cambio de rol hasta renovar el token **no se probó** | **[CONFIRMAR]** | `navigation.ts`; comportamiento no verificado |
| LEV-D10 | **Sin protección del último administrador ni de la auto-desactivación:** `ToggleUserStatusUseCase.execute(id)` no recibe quién actúa y no cuenta administradores activos; `AssignRoleUseCase` tampoco comprueba si deja al sistema sin un administrador habilitado | **[FALTA]** | `server/src/application/use-cases/users/ToggleUserStatusUseCase.ts`, `roles/AssignRoleUseCase.ts` |
| LEV-D11 | Anti-escalamiento: crear usuarios exige `users:write` y asignar rol exige `admin:system`; hoy solo el Administrador DBU tiene ambos, así que no hay escalamiento posible **con los roles actuales**. Con roles configurables, un rol con `users:write` podría crear cuentas de cualquier rol: **sin regla** que lo impida | **[FALTA]** (riesgo futuro) | `user.routes.ts`; `CreateUserUseCase.ts` |
| LEV-D12 | «Acceso total» y «acceso medio» **no aparecen** en ningún documento revisado (RF, HU, RNF, `docs/`): la necesidad viene del encargo | **[CONFIRMAR]** | búsqueda en `docs/`, `doc/` y los textos de RF/HU |
| LEV-D13 | Perfiles: estudiante = rol Tutorado; docente tutor = rol; **psicología, salud, asistencia social, psicopedagogía y escuela son un atributo `service` de un mismo rol** (Profesional de Servicio); coordinación = rol Coordinador por escuela; decanato = rol Decano con `facultyId`; administración = rol. **No existe «dirección de escuela»** como rol distinto de «Coordinador» | **[CONFIRMAR]** frente al Protocolo, Art. 5, que nombra al «Coordinador del sistema de tutoría de las facultades» y al «Responsable del sistema de tutoría de las escuelas profesionales» | `seedBase.ts`; `…/users/serviceAssignment.ts`; Protocolo Art. 5 |
| LEV-D14 | Cambios de rol y permisos retirados: `authenticate` lee de la base la cuenta (activa y con su rol vigente) en **cada petición**, así que un cambio de rol o una baja aplican en la siguiente; los permisos de ese rol tienen una caché de 30 s; el alcance sobre estudiantes lo calcula `StudentAccessGuard` desde el usuario y su rol (no se verificó si esa ruta tiene su propia caché). No se cierran las sesiones al cambiar el rol | **[EXISTE]** con el desfase indicado (≤ 30 s en permisos) | `authenticate.ts`, `rolePermissions.ts` |

### Comprobaciones por nombre de rol: recuento y método

Hubo dos cifras distintas en mensajes anteriores («45 en 21 archivos» y luego «43 en 22»). **La primera era una estimación mía a partir de una lista parcial y es incorrecta; la cifra verificada es la segunda.** Cómo se obtiene, para que sea reproducible:

Se ejecutan desde la raíz del repositorio (`R` es la expresión de los siete nombres; las rutas excluyen la seed y las pruebas):

```bash
R="'(Administrador DBU|Coordinador|Docente Tutor|Tutorado|Profesional de Servicio|Vicerrectorado|Decano)'"

# Servidor: ocurrencias (43) y archivos (22)
git grep -nE "$R" c2e0460 -- 'server/src/*.ts' ':!server/src/infrastructure/bootstrap/seedBase.ts' | wc -l
git grep -lE "$R" c2e0460 -- 'server/src/*.ts' ':!server/src/infrastructure/bootstrap/seedBase.ts' | wc -l

# Servidor: las que están en forma de comparación (34)
git grep -nE "(===|!==|case|includes\(|\[)[^;]*$R|$R[^;]*(===|!==)" c2e0460 -- 'server/src/*.ts' ':!server/src/infrastructure/bootstrap/seedBase.ts' | wc -l

# Cliente, sin pruebas: ocurrencias (68) y archivos (17)
git grep -nE "$R" c2e0460 -- 'client/src/*.ts' 'client/src/*.tsx' ':!client/src/**/*.test.*' | wc -l
git grep -lE "$R" c2e0460 -- 'client/src/*.ts' 'client/src/*.tsx' ':!client/src/**/*.test.*' | wc -l

# Cliente con la expresión ampliada (roleName, role ===): archivos (19)
git grep -lE "$R|roleName|role(Name)? *===" c2e0460 -- 'client/src/*.ts' 'client/src/*.tsx' ':!client/src/**/*.test.*' | wc -l
```

Resultados en `c2e0460` (verificados el 27/10/2026): **43 / 22 / 34** en el servidor y **68 / 17 / 19** en el cliente.

**Alcance y límites:** cuenta *texto*, no *decisiones de acceso*: una ocurrencia puede ser una etiqueta o una asignación y no una comprobación. Las 34 «comparaciones» son una aproximación por patrón, no una auditoría línea por línea. No incluye nombres de rol en minúsculas ni códigos (`'dbu'`, `'coord'`) del cliente.

**Contraste con el Protocolo.** Art. 5 enumera como responsables: Vicerrectorado Académico, DBU, Dirección de Gestión Docente, Curricular y Educación Virtual, coordinador del sistema de tutoría de las facultades, responsable del sistema de tutoría de las escuelas profesionales, docentes tutores y tutorandos. El código no tiene un rol para «Dirección de Gestión Docente…» ni para «responsable de escuela» distinto de Coordinador. **No se propone agregar ni eliminar autoridades por su nombre** hasta contrastar su participación efectiva (preguntas Q02–Q03).

## B. Perfiles vinculados y sincronización

| ID | Hallazgo | Estado | Evidencia |
|---|---|---|---|
| LEV-D20 | Avisos internos (campana) de: derivación creada/cambio de estado, solicitud de tutoría creada/actualizada/recibida, sesión programada/reprogramada/cancelada. Se leen por **sondeo periódico** del cliente, con «leído/no leído» | **[EXISTE]** | `prisma/schema.prisma` (`Notification`); `…/services/SessionNotifier.ts`; `client/src/features/notificaciones/hooks/useNotifications.ts` |
| LEV-D21 | **Cada aviso interno genera también un correo** (cola con reintentos 1, 5, 15 y 60 minutos; al quinto fallo se da por fallido). No hay política por tipo de evento: no existe «solo aviso interno, sin correo» | **[PARCIAL]** frente al encargo (no enviar correo por cada edición sin justificación) | `server/src/infrastructure/repositories/EmailNotificationRepository.ts`, `…/services/EmailOutboxProcessor.ts` |
| LEV-D22 | Designación del docente: correo con enlace de un solo uso (no es un aviso interno). Rechazo: correo a la coordinación de la escuela. **La aceptación no avisa a nadie** (ni interno ni correo) | **[PARCIAL]** | `…/use-cases/cycle-tutors/TutorAcceptanceUseCases.ts` |
| LEV-D23 | Pestaña «Pendientes institucionales» (solo lectura): rechazos, sin respuesta, correo no enviado, cuenta desactivada, ciclo sin tutor, cita cancelada | **[EXISTE]** | `institutionalPending.routes.ts`; `docs/ESTADO_PENDIENTES_2026-10-19.md` (#159) |
| LEV-D24 | Disponibilidad: el docente la fija **una vez** al aceptar. No hay ruta para modificarla después (el enlace es de un solo uso) ni aviso de cambios | **[FALTA]** | `tutorAcceptance.routes.ts` (solo `GET`/`POST` por token) |
| LEV-D25 | Solicitudes, programación, cancelación y derivaciones tienen avisos y estados; el estudiante ve la cita nueva/cancelada/«Reemplazada». Pruebas de integración de alcance por objeto | **[EXISTE]** | `server/tests/integration/objectAccess.test.ts`, `tutoringRequestCircuit.test.ts`; `ESTADO_PENDIENTES` §1 |
| LEV-D26 | Informe semestral del tutor (Anexo 9): se guarda y se exporta; **no tiene estados** (presentado/revisado/aprobado) ni avisos ni revisor. Plan de trabajo con resolución sí tiene versiones y adjunto | **[FALTA]** (presentación y revisión de informes) | `schema.prisma` (`TutorSemesterReport` sin campo de estado; `WorkPlan`/`WorkPlanVersion`) |
| LEV-D27 | Certificados: **sin eventos** (no existe la función) | **[FALTA]** | — |
| LEV-D28 | Duplicados y confidencialidad: una prueba cubre la carrera de dos reemplazos de cita; los avisos de derivación respetan alcance por objeto. Tiempos de actualización: no hay objetivo medido más allá de RNF-PERF-01 (3 s en operaciones frecuentes) | **[PARCIAL]** | `tutoringRequestFollowUp.test.ts`; RNF-PERF-01 |

## C. Correos y pedidos de listas

| ID | Hallazgo | Estado | Evidencia |
|---|---|---|---|
| LEV-D30 | Pedido formal por correo, con plantilla Excel adjunta, a nombre de quien lo pide (con copia y respuesta a esa persona): institución, área, escuela y facultad, periodo, ciclos, observaciones (≤ 500 caracteres), columnas requeridas, nota de la Ley N.° 29733 | **[EXISTE]** | `server/src/application/services/dataRequestEmail.ts`, `…/data-requests/DataRequestUseCases.ts` |
| LEV-D31 | Completa lo que ya sabe: escuela, facultad, periodo vigente, ciclos de la escuela, solicitante. Un clic basta si hay correo de pedido configurado; si falta, error claro «Esta escuela no tiene configurado el correo…» | **[EXISTE]** | `DataRequestUseCases.ts` (`RequestEmailNotConfiguredError`) |
| LEV-D32 | **Sin vista previa** del correo antes de enviar; **sin fecha y hora límite**, sin medio de entrega, sin finalidad ni contacto como campos propios (la finalidad está en el texto fijo; el contacto es el correo del solicitante) | **[FALTA]** | `client/src/features/pedidos/pages/DataRequestPage.tsx`; `dataRequestEmail.ts` |
| LEV-D33 | Estados del pedido: `ENVIADO` («aceptado por el servidor de correo») y `FALLIDO` (con reenvío); recepción marcada a mano. **No se promete entrega**; no existe «entregado al destinatario» | **[EXISTE]** (distinción entre registrado y aceptado por el servidor) | `schema.prisma` (`DataRequest`); comentario del modelo |
| LEV-D34 | Validación de dirección: formato válido y dominio permitido para cuentas; correo de pedido por escuela, uno solo. **No se comprobó** prevención de duplicados ni de doble clic en el servidor (el botón muestra estado de carga en el cliente) | **[PARCIAL]** / **[CONFIRMAR]** | `isValidOptionalEmail`; `DataRequestPage.tsx` (`loading={send.isPending}`) |
| LEV-D35 | **Canal de entrega de la respuesta:** hoy es «responder el correo con el archivo»; el sistema no recibe la respuesta, solo permite marcarla como recibida; la carga posterior la hace una persona por la carga masiva | **[CONFIRMAR]** (el encargo exige confirmar el canal) | `dataRequestEmail.ts` (cuerpo: «Responda a este correo adjuntando el archivo»); `DataRequest.receivedAt` |
| LEV-D36 | Mailpit (bandeja de desarrollo) recibe todo en desarrollo; el SMTP institucional real depende de TI | **[EXISTE]** la guía; **[CONFIRMAR]** el servidor real | `docs/GUIA_SMTP.md`, `docs/SOLICITUD_A_TI_PILOTO_2026-10-17.md` |

## D. Primer acceso y aceptación del docente

| ID | Hallazgo | Estado | Evidencia |
|---|---|---|---|
| LEV-D40 | Cuenta nueva sin activar: la invitación es un enlace de **un solo uso** que vence (`INVITATION_TTL_HOURS`) y no envía contraseñas; reemitir invalida el anterior; solo quien administra usuarios puede emitir | **[EXISTE]** | `IssueInvitationUseCase.ts`; `server/tests/integration/accountInvitation.test.ts` |
| LEV-D41 | Aceptación de tutoría: enlace personal de un solo uso; estados `SIN_SOLICITAR`, `PENDIENTE`, `ACEPTADA`, `RECHAZADA`; rechazo con motivo (≥ 5 caracteres) | **[EXISTE]** | `TutorAcceptanceUseCases.ts`; `tutorAcceptance.test.ts` |
| LEV-D42 | Tras aceptar, una **cuenta nueva pendiente de activar** recibe la ruta para crear su contraseña; una **cuenta ya activada** no genera activación nueva y se le indica «Ir al sistema» | **[EXISTE]** | `RespondTutorAcceptanceUseCase.execute` (rama `mustChangePassword`); `docs/CAMBIOS_USUARIO_TT103.md` |
| LEV-D43 | Rechazo, vencimiento, enlace usado, fallo de correo: enlace inválido/usado/vencido se rechaza; el fallo de correo deja la designación `PENDIENTE` y se ve en Pendientes. **No existe el estado «sin respuesta»** ni «correo no entregado» como valores propios | **[PARCIAL]** | `InvalidAcceptanceLinkError`; `docs/DECISIONES_DBU_COBERTURA_Y_PLAN_2026-10-18.md` §1 |
| LEV-D44 | La designación se aplica a los estudiantes **al designar**, no al aceptar; un rechazo deja al estudiante con el docente que rechazó. **Decisión institucional pedida y pendiente** | **[CONFIRMAR]** | `DECISIONES_DBU…` §1–2; `ESTADO_PENDIENTES` §4 |

## E. Lugar de la tutoría

| ID | Hallazgo | Estado | Evidencia |
|---|---|---|---|
| LEV-D50 | La solicitud (`TutoringRequest`) guarda tipo de caso y motivo, **sin lugar, modalidad ni fecha preferida** | **[FALTA]** | `schema.prisma` (modelo `TutoringRequest`) |
| LEV-D51 | La disponibilidad del docente pide **solo días y horas**; el servidor todavía acepta un campo opcional `place` (compatibilidad) pero el cliente ya no lo pide | **[EXISTE]** (cambio hecho) | `CAMBIOS_USUARIO_TT103.md`; `TutorAcceptanceUseCases.ts` (campo `place`) |
| LEV-D52 | El lugar o el enlace de reunión los registra **quien programa la sesión** (el tutor): presencial registra el lugar y virtual el enlace; hay choque de sesiones por docente | **[EXISTE]** (opuesto a lo pedido) | `schema.prisma` (`Session.location`, `meetingLink`, `modality`); `ScheduleSessionUseCase.ts` |
| LEV-D53 | El documento de cambios TT-103 declara expresamente que **«sigue pendiente incorporar la elección del lugar por quien solicita una tutoría»** | **[FALTA]** (reconocido) | `CAMBIOS_USUARIO_TT103.md` |
| LEV-D54 | Catálogo de lugares, validación de conflictos de lugar (no solo de docente), cambio de lugar y qué ocurre si el responsable no puede en el lugar pedido | **[FALTA]** | — |

## F. Certificación del docente tutor

| ID | Hallazgo | Estado | Evidencia |
|---|---|---|---|
| LEV-D60 | **No existe** ninguna función de certificados de tutores (ni modelo, ni rutas, ni pantallas). «Constancia» en el código es la **constancia de derivación** (Anexo 6), otra cosa | **[FALTA]** | búsqueda de `certificad`/`constancia` en `server/src` y `client/src` |
| LEV-D61 | Protocolo Art. 23.a: «La facultad **puede** otorgar reconocimientos formales, como premios o menciones honoríficas, a los docentes tutores destacados». No nombra «certificado», ni umbrales, ni a quién corresponde firmar | **[PROTOCOLO]** + **[CONFIRMAR]** | Protocolo Art. 23 |
| LEV-D62 | **Observación documentada de la referencia (revisión visual hecha por Codex y relatada por el usuario; yo no la realicé):** aparecen **director de Escuela, Resolución de Decanato, docente, escuela, facultad, semestre, ciudad, fecha y número de registro**. Eso **no basta** para concluir quién emite todos los certificados; el Art. 23.a asigna el reconocimiento a «la facultad» | **[CONFIRMAR]** | observación de Codex (no reproducible por mí); Protocolo Art. 23.a |
| LEV-D63 | Insumos que el sistema ya registra y que podrían servir de evidencia **sin que nadie los haya aprobado como criterio**: sesiones y asistencia, informe semestral (sin estados), evaluación del estudiante (agregada), amonestaciones, aceptación de tutoría. Ninguno está definido como requisito de certificación | **[PARCIAL]** como datos; **[CONFIRMAR]** como criterio | `prisma/schema.prisma`; módulos de informes, evaluación y amonestaciones |
| LEV-D64 | **Mi inspección (solo estructura técnica, sin reproducir el archivo):** una página horizontal (≈ 840 × 594 pt), **sin texto extraíble** (el contenido visible es una imagen), con un campo de **firma digital** (`/Sig`, subfiltro `ETSI.CAdES.detached`), 3 revisiones del archivo y datos de firma (nombre, motivo, lugar, contacto, fecha). **No leí su contenido (los campos de LEV-D62 son la observación de Codex) y la autenticidad y vigencia de la firma NO están validadas** | **[CONFIRMAR]** | inspección técnica local con `pypdf` (solo estructura) |
| LEV-D65 | Numeración, duplicados, vista previa, entrega, descarga, anulación, reemisión y consulta de autenticidad: nada existe | **[FALTA]** | — |

## G. Firma digital y plantilla institucional

| ID | Hallazgo | Estado | Evidencia |
|---|---|---|---|
| LEV-D70 | Patrón existente de «firma externa y luego subir el PDF/escaneo firmado»: se suben documentos firmados de **dos formatos** (constancia de derivación, Anexo 6; hoja de asistencia, Anexo 4) con su `sha256`, tamaño y quién lo subió | **[EXISTE]** como patrón; **no verifica firmas** | `schema.prisma` (`SignedDocument`); `…/signed-documents/*`; `signedDocuments.test.ts` |
| LEV-D71 | Generación de PDF en el servidor con `pdfkit` (constancia de derivación, hoja de asistencia, exportes con identidad institucional) | **[EXISTE]** | `server/package.json`; `…/parsers/ReferralConstanciaPdf.ts` |
| LEV-D72 | No hay verificación de firma digital, ni custodia de claves o certificados en el sistema, ni sellos/imagenes de firma | **[FALTA]** | — |
| LEV-D73 | No se dispone de la plantilla original **sin firmar**, logotipos oficiales ni textos aprobados para certificados | **[FALTA]** | — |
| LEV-D74 | Las tres modalidades del encargo (imagen de firma o sello; firma electrónica por flujo de aprobación; firma digital criptográfica sobre el PDF) **no están diferenciadas** en ningún documento revisado; el ejemplo observado usa una firma criptográfica | **[CONFIRMAR]** | encargo; LEV-D64 |

## H. Usabilidad, accesibilidad y validaciones

| ID | Hallazgo | Estado | Evidencia |
|---|---|---|---|
| LEV-D80 | Auditoría de uso real y correcciones: formularios más breves, motivos sugeridos con «Otro», borradores por pestaña, leyendas, nombres claros en la bitácora | **[EXISTE]** | `docs/ESTADO_PENDIENTES_2026-10-19.md` §1; `CAMBIOS_USUARIO_TT103.md` |
| LEV-D81 | Accesibilidad: axe y teclado limpios en las pantallas escaneadas (Chrome y Edge, un solo motor); **sin lector de pantalla real, sin Firefox ni Safari, sin teléfono real**; el resto de pantallas no se escaneó | **[PARCIAL]** con límites declarados | `ESTADO_PENDIENTES` §2 y §3 |
| LEV-D82 | Validaciones: servidor y cliente (zod en servidor; mensajes en español); correo, código de estudiante, ciclos, rangos | **[EXISTE]** (parcial por pantalla) | `server/src/application/validation/*` |
| LEV-D83 | Vocabulario: ya se unificó «Estudiantes»/«Responsable» y se retiraron números de artículo de los títulos; los nombres institucionales definitivos (coordinación, dirección de escuela, decanato) **no están confirmados** | **[CONFIRMAR]** | PR #157; Q30 |
| LEV-D84 | Rendimiento de correo: el correo se encola y se envía sin demorar la operación; medición del tiempo de respuesta con correos activos: **no hay medición específica** | **[PARCIAL]** | `EmailNotificationRepository.ts`; `docs/VERIFICACION_RENDIMIENTO_BETA_2026-10-13.md` |

## Escenarios obligatorios: estado actual

| Escenario | Estado actual | Dónde se discute |
|---|---|---|
| Pocos docentes para muchos ciclos | **[PARCIAL]** máximo dos ciclos por docente (no figura en el Protocolo) y sin agenda única | `DECISIONES_DBU…` §3 |
| Docente que rechaza / no responde / está inactivo / cambia de escuela | Rechazo y pendiente visibles; inactivo ya se omite al enrutar (PR #158); «sin respuesta» no es un estado; **cambio de escuela posterior a la designación: no verificado** | `DECISIONES_DBU…` §1; LEV-D43 |
| Cuenta nueva y cuenta ya activada | **[EXISTE]** | LEV-D42 |
| Escuela sin correo configurado o correo que falla | **[EXISTE]** (error claro, estado `FALLIDO`, reenvío) | LEV-D31, LEV-D33 |
| Solicitud duplicada o dos responsables a la vez | Solicitud→sesión: probado (carrera de reemplazos); pedido de listas: **no verificado** | LEV-D28, LEV-D34 |
| Lugar solicitado no disponible o cambio de modalidad | **[FALTA]** | LEV-D50–D54 |
| Informe pendiente y solicitud de certificado | **[FALTA]** (no hay certificados; el informe no tiene estados) | LEV-D26, LEV-D60 |
| Autoridad sin permiso o fuera de su escuela/facultad | Alcance por escuela para estudiantes: **[EXISTE]**; para certificados: **[FALTA]** | LEV-D07 |
| Cambio de autoridad antes de firmar | **[FALTA]** | — |
| Certificado ya emitido, corregido o anulado | **[FALTA]** | LEV-D65 |
| Enlace vencido, firma inválida o PDF modificado | Enlace vencido: **[EXISTE]** para invitaciones y aceptación; firma inválida / PDF modificado: **[FALTA]** (solo se guarda un `sha256` al subir) | LEV-D40, LEV-D70 |

## Tensiones entre fuentes (para resolver, no para decidir aquí)

1. **RF-04 fija cinco roles y dice que solo el Administrador DBU asigna roles; el sistema ya tiene siete y un `POST /roles`.** Crear roles configurables cambia el alcance de RF-04.
2. **Art. 23.a atribuye el reconocimiento a «la facultad»; el ejemplo lo emite una dirección de escuela.**
3. **El límite de «dos ciclos» no está en el Protocolo** (ya documentado).
4. **El sistema envía un correo por cada aviso interno;** el encargo pide justificar los correos por evento.
5. **La designación se aplica antes de la aceptación,** lo que contradice la expectativa de «aceptar antes de operar» (ya pedido a la DBU).

## Lo que no se comprobó en esta fase

No se ejecutó la aplicación ni sus pruebas para esta fase; no se probó el efecto de un cambio de rol sobre una sesión abierta; no se leyó el contenido del certificado de ejemplo ni se verificó su firma; no se revisaron los Anexos 1, 2 y 7 ni los artículos 1–4 y 6–16 y 18–22 del Protocolo más allá de los resúmenes de documentos previos; y el Sprint Backlog y la estimación no se releyeron completos.
