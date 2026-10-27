# Requisitos propuestos que no dependen de las decisiones P0

**Estado: PROPUESTO.** Ninguno está implementado ni aprobado. Son ampliaciones pequeñas, derivadas del [diagnóstico](01_DIAGNOSTICO_ACTUAL.md), que se pueden especificar y luego construir **sin esperar** las decisiones de certificación ni de roles configurables. Identificadores `LEV-R` **provisionales**: no pertenecen al backlog aprobado (los HU/TT/RSK existentes están en [03](03_CONTRASTE_PROTOCOLO_Y_BACKLOG.md)). Fuente única de requisitos del levantamiento: esta carpeta; la documentación integral del informe debe referenciarla.

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

## LEV-R04 · Prevenir pedidos duplicados por doble clic o reintento

| Campo | Contenido |
|---|---|
| Descripción | Enviar dos veces el mismo pedido en poco tiempo no produce dos correos sin que la persona lo confirme |
| Actor | Coordinación o Administrador DBU |
| Prioridad (propuesta) | Media |
| Origen | Encargo C («prevención de envíos repetidos por doble clic»); LEV-D34 (hoy solo hay estado de carga en el cliente; el servidor no se verificó) |
| Datos | Escuela, periodo, tipo de lista, ciclos, fecha y hora del pedido anterior |
| Reglas | (1) El servidor detecta un pedido equivalente (misma escuela, periodo, tipo y ciclos) dentro de una **ventana de tiempo** y pide confirmación explícita; no lo bloquea. (2) El cliente deshabilita el botón mientras envía. (3) La ventana por omisión de trabajo es de **10 minutos**; su valor es una decisión menor pendiente |
| Permisos | Los de enviar pedidos |
| Criterios de aceptación | (1) Dos envíos idénticos en el mismo segundo producen un solo correo y una respuesta clara al segundo. (2) Pasada la ventana, se permite un reenvío legítimo. (3) Prueba de integración con peticiones simultáneas |
| Casos límite | Pedido anterior `FALLIDO` (el reenvío se permite sin confirmación); ciclos distintos (no es duplicado) |
| Dependencias | Ninguna. Estado: **Propuesto con valor pendiente** (ventana de tiempo) |

## LEV-R05 · Hacer visible el fallo del correo de rechazo del docente

| Campo | Contenido |
|---|---|
| Descripción | Si el correo que avisa a la coordinación del rechazo de un docente no sale, el fallo queda registrado en el sistema y visible para quien debe actuar, en lugar de quedar solo en el registro del servidor |
| Actor | Sistema (consecuencia del rechazo del docente) |
| Prioridad (propuesta) | Media |
| Origen | Encargo B («errores y reintentos»); LEV-D22; evento E10 de [07](07_MATRIZ_EVENTOS_ACTUAL.md) |
| Datos | Designación afectada, motivo del fallo (sin credenciales ni enlaces), intentos, fecha |
| Reglas | (1) El rechazo del docente se registra siempre, aunque el correo falle (como hoy). (2) El fallo del aviso a la coordinación aparece en Pendientes institucionales junto al rechazo. (3) Se puede reenviar. (4) El aviso interno a la coordinación puede complementar al correo; si **solo** se agrega correo o también aviso interno es una decisión menor (Q07) |
| Permisos | Los de la pestaña Pendientes (`students:write`) |
| Criterios de aceptación | (1) Con el SMTP caído, el rechazo sigue registrándose y el fallo del aviso aparece en Pendientes. (2) El texto no contiene el enlace ni el motivo íntegro del docente si no corresponde. (3) Prueba que simula el fallo del envío |
| Casos límite | Escuela sin coordinación (no hay destinatario: debe verse como tal, no como éxito) |
| Dependencias | Q07 solo para el canal; el registro del fallo no depende. Estado: **Propuesto** |

## LEV-R06 · Fecha y hora límite opcionales en el pedido de listas

| Campo | Contenido |
|---|---|
| Descripción | El pedido puede incluir una fecha y hora límite de entrega, que se muestra en el correo y en el registro del pedido |
| Actor | Coordinación o Administrador DBU |
| Prioridad (propuesta) | Baja |
| Origen | Encargo C («fecha y hora límite, cuando corresponda»); LEV-D32 |
| Datos | Fecha y hora límite (opcional), validada como futura y dentro del periodo |
| Reglas | (1) Es **opcional**; la obligatoriedad por tipo de pedido es una decisión pendiente (Q12). (2) Se incluye en la vista previa (LEV-R03) y en el texto del correo. (3) No genera recordatorios ni cambios de estado automáticos |
| Permisos | Los de enviar pedidos |
| Criterios de aceptación | (1) Sin fecha límite el correo es igual que hoy. (2) Con fecha límite aparece con zona horaria clara. (3) Una fecha pasada se rechaza con mensaje |
| Casos límite | Zona horaria del servidor frente a la de los destinatarios; periodo que termina antes de la fecha |
| Dependencias | LEV-R03 (vista previa). Estado: **Propuesto con valor pendiente** (obligatoriedad: Q12) |

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
