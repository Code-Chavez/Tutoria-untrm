# Requisitos propuestos que no dependen de las decisiones P0

**Estado: PROPUESTO.** Ninguno está implementado ni aprobado. Son ampliaciones pequeñas, derivadas del [diagnóstico](01_DIAGNOSTICO_ACTUAL.md), que se pueden especificar y luego construir **sin esperar** las decisiones de certificación ni de roles configurables. Identificadores `LEV-R` **provisionales**: no pertenecen al backlog aprobado (los HU/TT/RSK existentes están en [03](03_CONTRASTE_PROTOCOLO_Y_BACKLOG.md)). Fuente única de requisitos del levantamiento: esta carpeta; la documentación integral del informe debe referenciarla.

> **Actualización 27/10/2026.** Con las decisiones de trabajo de [10](10_REGISTRO_DE_DECISIONES.md), las especificaciones de roles y delegación ([11](11_ESPECIFICACION_ROLES_PERMISOS_ALCANCE.md)), pedido de listas ([12](12_ESPECIFICACION_PEDIDO_DE_LISTAS.md)), lugar ([13](13_ESPECIFICACION_LUGAR_DE_LA_TUTORIA.md)) y certificación ([14](14_ESPECIFICACION_CERTIFICACION.md)) amplían o reemplazan algunos de estos requisitos. Este archivo conserva los que no dependen de ninguna decisión.

**Cada requisito indica su estado:** `Propuesto` (se puede aprobar tal cual) o `Propuesto con valor pendiente` (la regla es clara pero un número o un texto lo fija la DBU). Las **prioridades** y los **valores por omisión** son propuestas de trabajo, no decisiones. No se incluyen estimaciones: se harán en la Fase 4, declaradas como propuestas con sus supuestos.

Estructura de cada requisito: identificador, descripción, actor, prioridad (propuesta), origen, datos, reglas, permisos, criterios de aceptación, casos límite y dependencias.

---

## LEV-R01 · Registrar en la bitácora la creación de roles

| Campo | Contenido |
|---|---|
| Descripción | Toda creación de un rol queda en la bitácora de auditoría (hoy `POST /roles` no la registra, mientras que el alta de usuarios y la asignación de roles sí) |
| Actor | Administrador DBU (quien crea el rol) |
| Prioridad (propuesta) | Media |
| Origen | Encargo A («registro de cambios en bitácora»); RF-08 / RNF-COMP-01; LEV-D05 (el interceptor automático de auditoría solo cubre `User`, `Faculty`, `School`, `AcademicPeriod` y `CatalogItem`) |
| Datos | Acción `ROLE_CREATED`, usuario que actúa, fecha y hora, nombre del rol, IP. Sin datos sensibles |
| Reglas | Se registra solo si el rol se creó; un error de auditoría no deja un rol creado sin rastro: ambas cosas ocurren o se informa del fallo |
| Permisos | Los de `POST /roles` (`admin:system`); la consulta de la bitácora sigue en `audit:read` |
| Criterios de aceptación | (1) Crear un rol añade una entrada con quién, cuándo y qué nombre. (2) Un nombre duplicado no genera entrada. (3) La entrada aparece en la pantalla de bitácora con una etiqueta legible, no con el código interno |
| Casos límite | Nombre con espacios al inicio o fin (se guarda recortado y así se audita); creación concurrente del mismo nombre |
| Dependencias | Ninguna. Estado: **Propuesto** |

## LEV-R02 · Proteger al último administrador y la autodesactivación

> **Ampliado y reemplazado por LEV-R14** de [11](11_ESPECIFICACION_ROLES_PERMISOS_ALCANCE.md) tras la decisión de trabajo Q05 = A: la definición de «administrador habilitado» pasa a basarse en permisos y no en el nombre del rol. Este texto se conserva como antecedente.

| Campo | Contenido |
|---|---|
| Descripción | El sistema impide dejarse sin Administrador DBU habilitado: no se puede desactivar ni cambiar de rol a la última cuenta activa de administración, ni una persona puede desactivarse a sí misma si es la única |
| Actor | Administrador DBU |
| Prioridad (propuesta) | Alta (seguridad; hoy no hay protección: LEV-D10) |
| Origen | Encargo A («impedir dejar al sistema sin un administrador habilitado»); LEV-D10 |
| Datos | Cantidad de cuentas activas con el rol de administración; mínimo configurable |
| Reglas | (1) Desactivar o degradar a una cuenta administradora solo se permite si después queda al menos el **mínimo** de administradores activos. (2) Valor por omisión de trabajo: **1** (el número mínimo es una decisión pendiente, Q05). (3) La regla se aplica en el servidor, no solo en la pantalla. (4) El rechazo explica el motivo y qué hacer |
| Permisos | Los de `PATCH /users/:id/status` y `PUT /users/:id/role` |
| Criterios de aceptación | (1) Con un solo administrador activo, desactivarlo devuelve un error claro y no cambia nada. (2) Con dos, se puede desactivar a uno. (3) Cambiar el rol del último administrador se rechaza. (4) Un intento rechazado queda en la bitácora. (5) Prueba de integración que cubre los cuatro casos |
| Casos límite | Dos administradores desactivándose entre sí a la vez (la regla debe resolverse dentro de una transacción); cuenta administradora ya inactiva; reactivación |
| Dependencias | Ninguna técnica. Estado: **Propuesto con valor pendiente** (Q05) |

## LEV-R03 · Vista previa del pedido de listas antes de enviarlo

| Campo | Contenido |
|---|---|
| Descripción | Antes de enviar un pedido de lista, la persona ve exactamente el correo que saldrá: destinatario, copia, asunto, texto, columnas pedidas y archivo adjunto |
| Actor | Coordinación o Administrador DBU |
| Prioridad (propuesta) | Media |
| Origen | Encargo C («vista previa antes de enviar»); LEV-D32 |
| Datos | Los mismos que el envío real; no se guarda nada al previsualizar |
| Reglas | (1) La vista previa se genera con **el mismo constructor** del correo real, para que no haya dos versiones. (2) No envía ni registra el pedido. (3) Respeta el alcance: solo escuelas a las que la persona tiene acceso. (4) Muestra los datos que el sistema ya conoce (escuela, facultad, periodo, ciclos, solicitante) y avisa de lo que falta (p. ej. correo de pedido sin configurar) |
| Permisos | Los de enviar pedidos (`students:write` y alcance de escuela) |
| Criterios de aceptación | (1) Lo previsualizado coincide con lo enviado, campo por campo. (2) Sin correo configurado se muestra el motivo y cómo corregirlo. (3) Previsualizar no crea registros ni envía correos. (4) Accesible por teclado |
| Casos límite | Cambio de ciclos entre la vista previa y el envío (se vuelve a previsualizar); periodo no vigente |
| Dependencias | Ninguna. El canal de entrega (Q11) y los campos obligatorios (Q12) no cambian este requisito. Estado: **Propuesto** |

## LEV-R04 · Prevenir pedidos de lista duplicados: idempotencia y advertencia de equivalencia

> **Reformulado el 28/10/2026** (diseño aprobado por el responsable del proyecto para C-4). El texto anterior hablaba solo de «doble clic» y de una ventana; ahora separa dos mecanismos y define los estados de envío. **Ventana de 10 minutos: valor provisional del proyecto, no política institucional.** Estado: **Propuesto**; implementación en el PR de C-4.

| Campo | Contenido |
|---|---|
| Descripción | Repetir la misma operación (doble clic, reintento por respuesta perdida) nunca crea otro pedido ni otro envío; una operación **nueva** equivalente a un pedido reciente exige confirmación expresa de ese pedido |
| Actor | Coordinación o Administrador DBU |
| Prioridad (propuesta) | Media |
| Origen | Encargo C («prevención de envíos repetidos por doble clic»); LEV-D34 |
| **Mecanismo 1 · Idempotencia** | Cada intención lleva un `operationId` (UUID generado por el cliente), **obligatorio**: sin él la petición se rechaza (400) y el servidor no genera uno, para que no exista un camino sin idempotencia. El servidor lo guarda **por persona**: repetirlo con el mismo contenido devuelve el resultado ya guardado (sin otra fila, otro correo ni otra bitácora), también si era un reenvío confirmado o si el resultado fue FALLIDO o INCIERTO; reutilizarlo con **otro contenido** se rechaza (422); el identificador de otra persona no se ve ni devuelve datos (la búsqueda es solo del solicitante). Una operación hace como máximo **un** intento de envío |
| **Contenido que se compara** | Tipo de lista, escuela, periodo, **destinatario efectivo** (correo de la escuela), ciclos guardados y **nota**. Si cambia cualquiera con el mismo identificador, es otro contenido |
| **Mecanismo 2 · Equivalencia** | Dos pedidos son equivalentes si coinciden **tipo, escuela, periodo y alcance**. Alcance: en estudiantes, «ningún ciclo» (que el correo y la lista leen como «todos») y la lista completa de ciclos de la escuela son lo mismo, y el orden o los repetidos no importan; en docentes los ciclos **no aplican** y no se guardan. Dentro de la ventana (**provisional: 10 minutos**) cuentan los pedidos **ENVIADO** (recibidos o no), **INCIERTO** y **PENDIENTE**; **FALLIDO** (fallo demostrado) no cuenta y permite reintentar |
| Reglas | (1) **PENDIENTE vigente** (intento en curso) **bloquea** todo envío equivalente: la confirmación no lo salta. (2) Un equivalente ENVIADO o INCIERTO responde 409 identificando **ese** pedido (id, fecha, estado); el reenvío es una **operación nueva** (otro `operationId`) con `confirmDuplicateOf` = ese id. (3) Si mientras el diálogo estaba abierto se registró otro equivalente, el id ya no coincide y se advierte de nuevo sobre el nuevo pedido: una confirmación genérica no autoriza una situación nueva. (4) El cliente deshabilita el botón mientras envía; conserva el `operationId` ante una respuesta perdida o un error del servidor y lo renueva solo ante una respuesta definitiva, un cambio de contenido o un reenvío deliberado. (5) Dos solicitudes simultáneas se serializan por clave de equivalencia (candado de transacción corto), nunca con una transacción abierta durante el envío |
| **Estados de envío** | `PENDIENTE` (guardado, intento en curso), `ENVIADO` (aceptado por el servidor de correo; no es «llegó a la bandeja»), `FALLIDO` (**demostrado** que no fue aceptado: antes de transmitir el mensaje o con respuesta de rechazo del servidor), `INCIERTO` (no se puede demostrar que falló antes de una posible aceptación: tiempo agotado o corte durante o después de DATA, fase desconocida, plazo propio vencido, o un PENDIENTE sin resultado pasado el margen). Son un eje **distinto** de la recepción, revisión y carga de la lista (LEV-R21, [12](12_ESPECIFICACION_PEDIDO_DE_LISTAS.md)) |
| Plazos | Envío SMTP: se **espera** como máximo **60 s**. Vencer ese plazo **no cancela** el transporte SMTP (sigue hasta sus propios tiempos de espera y puede terminar el envío después) y **no prueba que el correo no salió**: el resultado es INCIERTO. Margen del intento: **5 min** (el mismo de la cola de avisos); pasado el margen un PENDIENTE se trata como INCIERTO y un resultado tardío **ya no lo modifica** (actualización condicional al mismo intento y dentro del margen) |
| **Lo que NO se promete** | **No hay entrega «exactamente una vez».** Si el proveedor acepta el correo y el servidor cae antes de registrar el resultado, el pedido queda PENDIENTE y luego INCIERTO: el correo pudo haber salido y el sistema **no lo reenvía por su cuenta**; reenviar es decisión de la persona, con advertencia. Tampoco se garantiza que el correo llegue a la bandeja |
| Permisos | Los de enviar pedidos; la comprobación de acceso a la escuela ocurre **antes** de buscar el identificador |
| Criterios de aceptación | (1) Dos envíos idénticos simultáneos producen un solo correo y una sola fila. (2) Repetir una operación devuelve lo guardado sin otro envío. (3) Mismo identificador con otro contenido: 422. (4) Equivalente dentro de la ventana: 409 con el pedido anterior; confirmarlo envía otra operación; una confirmación obsoleta se rechaza. (5) PENDIENTE vigente: bloqueo sin remedio. (6) FALLIDO: reintento libre; INCIERTO: exige confirmación. (7) Pasada la ventana: se permite. (8) Pruebas de servidor, de integración con peticiones simultáneas y del cliente |
| Casos límite | Pedido anterior sin identificador (histórico): no se le atribuye ninguno ni cuenta como equivalente; ciclos distintos no son duplicado; docentes con ciclos enviados: se ignoran |
| Dependencias | Ninguna institucional. **Cambio de datos aditivo** (columnas `operation_id`, `content_hash`, `equivalence_key`, `resend_of_id`, `attempt_started_at`; los pedidos históricos quedan con NULL) y dos estados nuevos. La generalización de la cola de correo para pedidos queda **fuera** de esta entrega |

## LEV-R05 · Hacer visible el fallo del aviso del rechazo del docente

> **Reformulado el 29/10/2026** (diseño aprobado por el responsable del proyecto para C-5). **Aprobación pendiente** de la institución: el contenido íntegro del motivo en el correo y el aviso interno adicional (Q07). Estado: **Propuesto**; implementación en el PR de C-5.

| Campo | Contenido |
|---|---|
| Descripción | El rechazo de un docente queda registrado siempre y se conserva el aviso por correo a la coordinación hasta entregarlo o dejar constancia clara de lo ocurrido; el sistema nunca afirma «se avisó» si solo intentó enviar |
| Actor | Sistema (consecuencia del rechazo del docente) y, para reenviar, la coordinación de la escuela o la DBU |
| Prioridad (propuesta) | Media |
| Origen | Encargo B («errores y reintentos»); LEV-D22; evento E10 de [07](07_MATRIZ_EVENTOS_ACTUAL.md) |
| Mensaje al docente | «Tu respuesta quedó registrada y está disponible para los responsables de tutoría». No promete que exista coordinación ni que se asignará a otro docente |
| Flujo | (1) El rechazo y el aviso `EN_COLA` se guardan **en una sola operación atómica**; la respuesta al docente no espera el correo. (2) Un **intento inmediato** (optimización) y un **proceso de fondo** (revisión cada 30 s: intervalo, no latencia garantizada) comparten la **misma reserva atómica**: solo uno envía. (3) Antes de enviar se comprueba que la designación siga rechazada por ese rechazo y se resuelve el **destinatario habilitado actual** (coordinación vigente con cuenta activa y correo). (4) Resultado por intento: `ENVIADO` (aceptado por el servidor de correo), `FALLIDO` (demostrado), `INCIERTO`, `SIN_DESTINATARIO`, `DATOS_INCOMPLETOS`, `OBSOLETO` |
| Quién lo ve y qué puede hacer | La coordinación de la escuela y la DBU, que ya ven *Pendientes*: **un solo ítem** del rechazo con el estado del aviso (sin duplicar y **sin notificación interna nueva**) y, cuando corresponde, **Reenviar aviso**. El docente no ve datos técnicos |
| Reglas | (1) **Un solo intento automático** por aviso: ni un `INCIERTO` ni un `FALLIDO` se repiten solos; un intento iniciado sin resultado pasa a `INCIERTO` (margen de 5 min). (2) Lo `EN_COLA` que nunca se intentó se recupera tras un reinicio. (3) Sin SMTP configurado el aviso **se conserva** `EN_COLA` y se muestra la causa y el siguiente paso; no se presenta como enviado ni como espera normal. (4) **Reenvío solo del aviso**: no repite ni modifica el rechazo; con `operationId` obligatorio por persona (repetirlo, incluso tras un resultado incierto, no envía otra vez); un `INCIERTO` o un rechazo sin registro previo exige **confirmar el intento mostrado** (`confirmPrevious.attemptId`); una confirmación de otro intento no sirve; un intento en curso bloquea sin remedio; un reenvío de una designación ya no rechazada o reemplazada se rechaza. (5) El reenvío va a la coordinación **vigente** y el intento deja constancia de a quién. (6) Los rechazos anteriores a esta función quedan **sin registro** («no se sabe»): no se les atribuye resultado. (7) Textos: `SIN_DESTINATARIO` = «No se realizó el envío porque no hay un destinatario habilitado» (distinto de `DATOS_INCOMPLETOS`); nunca «nadie recibió el correo» ni «se avisó». (8) Bitácora: una entrada por resultado de intento y, en reenvíos, una de solicitud con actor y motivo, vinculadas al mismo intento; sin tokens ni errores técnicos |
| **Lo que NO se promete** | No hay entrega «exactamente una vez»: si el proveedor acepta el correo y el proceso cae antes de anotarlo, queda `INCIERTO`. «Aceptado» no es «leído» |
| Permisos | Reenviar: `students:write` y alcance por escuela (los de reenviar la aceptación). **Sin cambios de destinatarios ni de permisos** |
| Criterios de aceptación | (1) Con el SMTP caído (fallo demostrado) el rechazo queda guardado y el aviso `FALLIDO` se ve en Pendientes. (2) Un corte durante `DATA` o un plazo agotado deja `INCIERTO`, sin reintento automático. (3) Sin coordinación habilitada: `SIN_DESTINATARIO`, distinto de datos incompletos. (4) Ningún texto afirma «se avisó». (5) Reenviar solo envía el correo y deja el rechazo intacto. (6) Dos reenvíos simultáneos, o el intento inmediato frente al proceso de fondo, envían una sola vez. (7) Repetir la operación no envía otra vez. (8) Confirmación antigua rechazada. (9) Sin SMTP: aviso conservado con causa y siguiente paso. (10) Reinicio: se recupera lo `EN_COLA` y lo iniciado sin resultado queda `INCIERTO`. (11) Pruebas de servidor, de contrato HTTP y de cliente |
| Pendiente institucional | **Contenido íntegro del motivo del docente en el correo** (hallazgo C02 de [08](08_CATALOGO_PLANTILLAS_CORREO_ACTUAL.md), Q07) y **aviso interno adicional** (Q07): no se cambian en esta entrega. Si la escuela no tiene coordinación, **nadie recibe el correo** (lo ve la DBU en Pendientes); copiar a la DBU sería un cambio de regla y no se incluye |
| Dependencias | **Cambio de datos aditivo** (tabla `decline_notice_attempts` y dos columnas de resumen en la designación; los rechazos históricos quedan con `NULL`) y un proceso de fondo nuevo que reutiliza el patrón de la cola de avisos |

## LEV-R06 · Fecha y hora límite opcionales en el pedido de listas

| Campo | Contenido |
|---|---|
| Descripción | El pedido puede incluir una fecha y hora límite de entrega, que se muestra en el correo y en el registro del pedido |
| Actor | Coordinación o Administrador DBU |
| Prioridad (propuesta) | Baja |
| Origen | Encargo C («fecha y hora límite, cuando corresponda»); LEV-D32 |
| Datos | Fecha y hora límite (opcional), validada como futura y dentro del periodo |
| Reglas | (1) **Ajustada por la decisión de trabajo Q11 = A** ([12](12_ESPECIFICACION_PEDIDO_DE_LISTAS.md)): la fecha límite forma parte del pedido; si es **obligatoria u omisible con motivo, por tipo de pedido**, sigue pendiente (Q12). (2) Se incluye en la vista previa (LEV-R03) y en el texto del correo. (3) No genera recordatorios ni cambios de estado automáticos |
| Permisos | Los de enviar pedidos |
| Criterios de aceptación | (1) Sin fecha límite el correo es igual que hoy. (2) Con fecha límite aparece con zona horaria clara. (3) Una fecha pasada se rechaza con mensaje |
| Casos límite | Zona horaria del servidor frente a la de los destinatarios; periodo que termina antes de la fecha |
| Dependencias | LEV-R03 (vista previa). Estado: **Propuesto con valor pendiente** (obligatoriedad: Q12) |

## LEV-R07 · Alinear el texto del correo de aceptación con el formulario

| Campo | Contenido |
|---|---|
| Descripción | El correo que se envía al designar a un docente (P11) deja de pedirle «el lugar»: debe pedir solo días y horas, como el formulario de aceptación desde TT-103 |
| Actor | Sistema (texto de la plantilla) |
| Prioridad (propuesta) | Baja (corrige una inconsistencia; no cambia reglas) |
| Origen | Hallazgo C01 de [08](08_CATALOGO_PLANTILLAS_CORREO_ACTUAL.md); `CAMBIOS_USUARIO_TT103.md` |
| Datos | Solo el texto de la plantilla |
| Reglas | (1) El correo y la pantalla dicen lo mismo. (2) Si más adelante se aprueba que el lugar lo decida el solicitante (Q17), el texto no vuelve a pedirlo al docente |
| Permisos | No aplica |
| Criterios de aceptación | (1) El texto del correo no menciona «lugar». (2) Una prueba de la plantilla lo comprueba. (3) El resto del texto no cambia |
| Casos límite | Correos ya enviados con el texto anterior (no se reenvían) |
| Dependencias | Ninguna. Estado: **Propuesto** |

---

## Lo que NO se especifica todavía (depende de una decisión)

| Tema | Bloqueado por |
|---|---|
| Roles configurables con permisos asignables, alcance configurable | Q01–Q04 |
| Separar o unir «Coordinador», «Responsable de escuela» y «Decano» | Q02 |
| Canal por el que la escuela devuelve la lista | Q11 |
| Elegir el lugar en la solicitud y catálogo de lugares | Q17–Q19 |
| Edición posterior de la disponibilidad del docente | Q16 |
| Estados «sin respuesta» y «correo no entregado» de la designación | Q15 y decisiones 1–2 de la DBU |
| Estados del informe semestral | Q10 |
| Certificación, firma y plantilla | Q20–Q29 |
