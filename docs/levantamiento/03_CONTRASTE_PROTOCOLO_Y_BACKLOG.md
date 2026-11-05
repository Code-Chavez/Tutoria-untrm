# Contraste con el Protocolo, el backlog y las estimaciones (Fase 1)

Borrador para revisión. Para cada necesidad: qué dicen los **artículos del Protocolo** (leídos completos los citados; PDF fuera del repositorio), qué dicen **RF/HU/RNF**, el **Sprint Backlog** y la **estimación** de las partes relacionadas, qué hace el **código** (`c2e0460`), y las **discrepancias**. Las etiquetas están en el [README](README.md). Los Word (RF, HU, RNF, backlog, estimación) están fuera del repositorio; las citas son literales o resumidas con su identificador.

**Cómo se leyó el Protocolo.** Texto extraído del PDF del Protocolo N.° 01-2024-UNTRM/DBU (24 páginas; las dos primeras sin texto extraíble). Leídos completos para esta fase: artículos 5, 7 a 17 y 19 a 25; los artículos 1 y 2 solo en parte, y **no** se leyeron el 3, el 4, el 6 ni el 18 (temas a trabajar) ni los anexos. El Protocolo **no menciona** certificados de tutores, roles configurables, correos de pedido de listas, ni a «Decano» o «Director de escuela» como cargos.

## 1. Requisito por requisito

### A. Roles, competencias y permisos configurables

| Fuente | Qué dice |
|---|---|
| Protocolo, Art. 5 | Responsables: Vicerrectorado Académico; DBU; Dirección de Gestión Docente, Curricular y Educación Virtual; **coordinador del sistema de tutoría de las facultades**; **responsable del sistema de tutoría de las escuelas profesionales**; docentes tutores; tutorandos |
| Protocolo, Arts. 9.a y 14.c | Confidencialidad entre tutor y tutorado; solo se informa en situaciones de riesgo o emergencia → sustenta el **alcance por objeto** y los avisos sin datos del caso |
| Protocolo, Art. 17.a | La **coordinación** (de tutoría) desarrolla el plan de trabajo, que lleva resolución de aprobación, asignación de docentes, recursos y cronograma |
| Protocolo, Art. 24.a | **La facultad** emite la amonestación escrita → sustenta el rol Decano |
| RF-04 | Cinco roles: Administrador DBU, Docente tutor, Tutorado, Profesional de servicio, Vicerrectorado (solo lectura); «solo el Administrador DBU puede asignar o revocar roles» |
| HU-04 | **Siete** roles: Administrador DBU, Coordinador, **Responsable de escuela**, Docente tutor, Tutorado, Profesional de servicio, Vicerrectorado (lectura); «se deniega y **notifica** toda acción fuera de permisos» |
| Sprint Backlog y estimación (HU-04) | Prioridad Crítica, 8 Story Points (el Product Backlog suma 164 de planificación original: 50 HU, 8 TT y 1 RSK); tareas T-1.22 (modelos Role/Permission), T-1.23 (middleware `requirePermission()` y «endpoints de roles») y T-1.24 («**Guard de rutas por permiso**» en el frontend): 3 + 3 + 2 = **8 h estimadas originalmente** (no horas ejecutadas). El Sprint Backlog menciona `RoleService` con `assignRole` y `revokeRole` |
| Código | 7 roles sembrados (con **Decano**, sin **Responsable de escuela**); permisos finos; `POST /roles` crea nombre y descripción; **un solo rol por usuario; sin `revokeRole`**; el cliente decide el menú con un mapa fijo de nombres de rol |

**Discrepancias:** (1) RF-04 (5 roles) ≠ HU-04 (7, con «Responsable de escuela» y sin Decano) ≠ código (7, con Decano y sin «Responsable de escuela»). (2) T-1.24 pide guardas **por permiso** en el cliente; el cliente usa **nombres de rol**. (3) HU-04 pide **notificar** las acciones denegadas; el servidor responde 403 con mensaje, sin aviso. (4) Ni RF, HU ni la estimación incluyen **crear roles con permisos configurables**; las 8 h estimadas cubren solo la autorización por permisos. (5) El Protocolo no pide roles configurables.

### B. Perfiles vinculados y sincronización

| Fuente | Qué dice |
|---|---|
| Protocolo, Art. 15.d | El docente tutor **informa periódicamente** el horario y la asistencia a la oficina de tutorías académicas |
| Protocolo, Arts. 21–22 | Derivaciones a escuela, Psicopedagogía, Psicología, Asistencia Social y Salud; seguimiento por los tutores de cada ciclo (22.a) y por la DBU en casos especializados (22.b) |
| RF-34 / HU-33 | Solo **notificaciones de derivación**: el servicio recibe aviso de una derivación nueva, el tutor de cada cambio de estado, respetando la confidencialidad |
| Estimación (HU-33) | T-4.15 (2 h) y T-4.16 (1 h) |
| Código | Avisos para derivaciones **y** para solicitudes y sesiones; **cada aviso genera además un correo** con reintentos |

**Discrepancias:** el sistema avisa de más eventos que los aprobados en HU-33, y envía un correo por cada aviso, lo que ningún RF/HU aprueba (nació de una auditoría). No hay eventos aprobados para aceptación de designaciones, disponibilidad, informes ni certificados.

### C. Correos y pedidos de listas

| Fuente | Qué dice |
|---|---|
| Protocolo | **No regula** el pedido de listas por correo. El Art. 19.a menciona un «reporte de estudiantes con riesgo académico y deserción» que entrega la Dirección de Admisión y Registros Académicos (otra cosa: es el insumo de detección, no la lista de matriculados) |
| RF / HU / estimación | Búsqueda de «pedido», «lista» y correo masivo: **sin resultados** relacionados; los únicos correos previstos son la recuperación de contraseña (HU-02) |
| Código | Pedido formal con plantilla, estados enviado/fallido, recepción manual (`DataRequest`) |

**Brecha de trazabilidad:** una funcionalidad completa (y su estado de datos) existe **sin RF/HU/estimación** que la respalde. Es una brecha de trazabilidad; **no se le asigna aprobación retroactiva**: queda por definir qué requisito, decisión o acta la respalda.

### D. Primer acceso y aceptación del docente

| Fuente | Qué dice |
|---|---|
| Protocolo, Arts. 17.a y 24.b | La coordinación asigna docentes en el plan; la facultad puede reasignar responsabilidades. **No prevé** aceptación del docente, plazos ni invitación |
| RF-03 / HU-03 | Alta, edición y baja lógica de usuarios por el Administrador DBU |
| RF-02 / HU-02 y Sprint Backlog | Recuperación con token temporal de un solo uso (el Sprint Backlog indica 1 h) |
| Código | Invitación de un solo uso para cuentas nuevas, aceptación con enlace, activación posterior |

**Discrepancia:** la **aceptación del docente** y la **invitación de activación** no figuran en RF/HU/estimación; fueron añadidas por auditoría y por la fase TT-103. Sus reglas de plazo y de qué ocurre al rechazar están pendientes de la DBU (`DECISIONES_DBU…` §1–2).

### E. Lugar de la tutoría

| Fuente | Qué dice |
|---|---|
| Protocolo, Art. 8 | Modalidad **presencial**: «en las instalaciones de la universidad y siguiendo un horario establecido»; **virtual**: con herramientas tecnológicas y horario programado. **No dice quién elige el lugar** |
| Protocolo, Art. 12.b y 12.d | Derechos del tutor: ambiente propicio; **programar las sesiones** de tutoría con los recursos necesarios |
| Protocolo, Art. 15.c | Sesiones de 45 minutos, individual o grupal |
| RF-21 / HU-20 | «Presencial **registra el lugar**; virtual, el enlace»; historia: «**como docente tutor** quiero indicar la modalidad de cada sesión» |
| Estimación (HU-20) | «Backend: Modalidad presencial/virtual con lugar o enlace» |
| Código | El docente registra lugar o enlace al programar; la solicitud no tiene lugar |

**Discrepancia:** la necesidad (el solicitante decide el lugar) **contradice el criterio de aceptación de HU-20** («presencial registra el lugar» por el docente tutor). Cambiarla requiere modificar HU-20/RF-21, no solo agregar un campo.

### F. Certificación del docente tutor

| Fuente | Qué dice |
|---|---|
| Protocolo, Art. 23.a | «**La facultad puede otorgar** reconocimientos formales, como premios o menciones honoríficas, a los docentes tutores destacados por su dedicación y excelencia en la tutoría» |
| Protocolo, Art. 23.b–e | Desarrollo profesional por el Vicerrectorado; menciones en publicaciones o informes; retroalimentación positiva; participación en comités o liderazgo (reconocimientos posibles, no obligaciones) |
| Protocolo, Art. 17.d | Las facultades supervisan y evalúan la implementación, usando la encuesta de satisfacción |
| RF / HU / estimación | **Nada** sobre certificados, constancias de tutores ni reconocimientos |
| Ejemplo del encargo (observación visual de Codex, relatada por el usuario) | Director de Escuela, Resolución de Decanato, docente, escuela, facultad, semestre, ciudad, fecha y registro. **Yo no leí ese contenido**; mi inspección técnica solo confirmó que es una página horizontal con la imagen del certificado y un campo de firma digital. **La firma no se validó** |

**Discrepancias:** (1) el Art. 23.a asigna el reconocimiento a «la facultad» y habla de «premios o menciones honoríficas», no de un certificado de participación; el ejemplo lo emite una escuela con respaldo de una resolución de decanato. (2) El Protocolo **no fija criterios** (sesiones, informes, evaluación) ni a quién corresponde firmar. (3) Es una función nueva: sin RF/HU/estimación.

### G. Firma digital y plantilla institucional

| Fuente | Qué dice |
|---|---|
| Protocolo, Art. 16 | Formatos de intervención (entrevista, asistencia, seguimiento, derivación); los anexos están en el PDF |
| RF-15 / HU-14 | «La firma física se reemplaza por la **confirmación del usuario autenticado**» |
| RF-23 / HU-22 | «El tutorado confirma digitalmente en reemplazo de la firma» (asistencia, Anexo 4) |
| Código | Además de la confirmación, existe la **carga de documentos firmados** (escaneos) de la constancia de derivación y de la hoja de asistencia, con `sha256` |

**Discrepancia:** los requisitos aprobados sustituyen la firma por **confirmación electrónica**; el código añadió la carga del documento firmado. Cuál de las dos modalidades exige la universidad **no consta**, y la firma criptográfica del certificado de ejemplo es una tercera cosa (pregunta Q23).

### H. Usabilidad, accesibilidad y validaciones

| Fuente | Qué dice |
|---|---|
| RNF-USA-01 | Responsive (Mobile First) y navegadores Chrome, Firefox, Edge y Safari; **WCAG 2.1 AA «como referencia»** |
| RNF-USA-02 / 03 | Identidad visual institucional; operaciones frecuentes del tutor en **tres pasos o menos** con validaciones en línea |
| RNF-INT-01 | Validación de entradas e integridad referencial |
| Estimación | Sprint 6 (TT-100…TT-105): pruebas integrales, piloto, despliegue y manuales; la accesibilidad con lector de pantalla y los cuatro navegadores no tienen tareas propias |

**Discrepancia:** RNF-USA-01 enumera cuatro navegadores y WCAG como referencia; lo comprobado hoy cubre Chrome y Edge (un motor) y pruebas automáticas de accesibilidad, sin lector de pantalla (`ESTADO_PENDIENTES_2026-10-19.md`).

## 2. Discrepancias consolidadas

| N.° | Discrepancia | Documentos | Qué hay que resolver |
|---|---|---|---|
| X1 | Lista de roles distinta en RF-04 (5), HU-04 (7 con «Responsable de escuela») y código (7 con Decano) | RF-04, HU-04, `seedBase.ts` | Q01–Q02: qué lista es la vigente y actualizar RF/HU |
| X2 | HU-04 pide guardas por permiso en el cliente y notificar lo denegado; el cliente usa nombres de rol y no notifica | HU-04, T-1.24, `navigation.ts` | Registrar como deuda técnica o ajustar el criterio |
| X3 | HU-20 asigna el lugar al docente; la necesidad lo asigna al solicitante | HU-20, RF-21 | Q17: modificar RF/HU si se aprueba |
| X4 | **Brechas de trazabilidad:** funciones existentes sin RF/HU/estimación (pedido de listas, invitación y aceptación del docente, avisos de solicitudes y sesiones, correo por aviso, pendientes institucionales). Se registran como brechas; **no se les asigna aprobación retroactiva** | código, `docs/` | Decidir, función por función, si se respaldan con un requisito nuevo, con una decisión escrita, o se retiran del alcance |
| X5 | RF/HU sustituyen la firma por confirmación electrónica; el código añade carga de documento firmado; el certificado de ejemplo usa firma criptográfica | RF-15, RF-23, `SignedDocument`, ejemplo | Q23 |
| X6 | El Art. 23.a atribuye el reconocimiento a «la facultad» y no menciona certificado, criterios ni firmante | Protocolo, ejemplo | Q20–Q22 |
| X7 | El límite de «dos ciclos» no figura en el Protocolo (ya documentado) | `DECISIONES_DBU…` | Q (DBU) |
| X8 | **Las 323 horas-hombre y los 164 Story Points son las estimaciones originales de planificación** (juicio de experto, un solo recurso): no son horas ejecutadas ni el presupuesto de las ampliaciones, que no están estimadas | Estimación de Tareas v2.0; Product Backlog | Nueva estimación en la Fase 4, declarada como propuesta con sus supuestos |

## 3. Qué no se contrastó

No se releyeron completos el Sprint Backlog ni el Product Backlog más allá de las historias citadas; no se revisaron los Anexos ni los artículos 3, 4, 6 y 18 del Protocolo para esta fase; los documentos Word están fuera del repositorio y su texto se extrajo localmente.
