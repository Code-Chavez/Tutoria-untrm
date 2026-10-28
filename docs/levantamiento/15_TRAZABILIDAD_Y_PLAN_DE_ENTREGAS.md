# Trazabilidad, preparación para implementar y orden de entregas

**Estado: PROPUESTO.** Consolida los requisitos de [05](05_REQUISITOS_SIN_DEPENDENCIAS.md), [11](11_ESPECIFICACION_ROLES_PERMISOS_ALCANCE.md), [12](12_ESPECIFICACION_PEDIDO_DE_LISTAS.md), [13](13_ESPECIFICACION_LUGAR_DE_LA_TUTORIA.md) y [14](14_ESPECIFICACION_CERTIFICACION.md). **No es una aprobación ni un compromiso de plazo.** Cada requisito se define en **un solo archivo** (el de su columna «Fuente»); esta tabla solo lo enlaza. Las decisiones están en [10](10_REGISTRO_DE_DECISIONES.md); las etiquetas, en el [README](README.md).

## 1. Cómo leer las tres categorías

| Categoría | Significa | Quién la levanta |
|---|---|---|
| **L · Listo para implementar** | No cambia un RF/HU aprobado ni espera una decisión institucional. Sigue necesitando la **instrucción expresa** del responsable del proyecto para empezar | Responsable del proyecto |
| **A · Requiere aprobación de RF/HU** | Cambia un requisito aprobado o crea una función sin RF/HU | Product Owner |
| **I · Requiere decisión institucional** | Depende de una respuesta de la DBU, la facultad, el Vicerrectorado, TI o las escuelas | Instancia indicada en la sección 6 |

**Regla de bloqueo.** Una dependencia pendiente bloquea **solo la parte afectada**. Por eso un requisito puede aparecer con una parte **L** y otra **A** o **I**.

## 2. Matriz de trazabilidad

Criterios completos en la fuente. «Prueba propuesta» es el tipo de prueba que cerraría el criterio; **ninguna se ha escrito ni ejecutado**.

### 2.1 Correcciones y mejoras de lo que ya existe

| Id | Requisito | Fuente | Origen | Criterio de aceptación (resumen) | Dependencia | Prueba propuesta | Preparación |
|---|---|---|---|---|---|---|---|
| LEV-R07 | El correo de aceptación no pide el lugar | [05](05_REQUISITOS_SIN_DEPENDENCIAS.md) | Hallazgo C01; TT-103 | El texto no menciona «lugar»; el resto no cambia | Ninguna | Unitaria de la plantilla | **L** |
| LEV-R01 | Bitácora al crear un rol | [05](05_REQUISITOS_SIN_DEPENDENCIAS.md) | Encargo A; RF-08; LEV-D05 | Entrada con quién, cuándo y nombre; duplicado no genera entrada | Ninguna | Integración | **L** |
| LEV-R05 | Aviso del rechazo del docente: cola persistente, estado visible y reenvío (reformulado el 29/10/2026) | [05](05_REQUISITOS_SIN_DEPENDENCIAS.md) | Encargo B; LEV-D22 | Rechazo guardado siempre; aviso EN_COLA atómico; un solo envío entre intento inmediato y proceso de fondo; INCIERTO sin reintento automático; reenvío con identidad y confirmación del intento | Cambio de datos aditivo y proceso de fondo nuevo (aprobados por el responsable del proyecto); motivo íntegro en el correo y aviso interno adicional siguen en Q07 | Servidor, contrato HTTP, integración con procesadores concurrentes y cliente | **L** (diseño aprobado para C-5) · **I** (Q07) |
| LEV-R04 | Idempotencia y advertencia de equivalencia en el pedido de listas (reformulado el 28/10/2026) | [05](05_REQUISITOS_SIN_DEPENDENCIAS.md) | Encargo C; LEV-D34 | Un correo y una fila ante envíos simultáneos; repetir la operación devuelve lo guardado; equivalente reciente pide confirmar ese pedido | Ventana de 10 min **provisional**; migración aditiva y estados PENDIENTE/INCIERTO (aprobados por el responsable del proyecto, no institucionales) | Servidor, integración con peticiones simultáneas y cliente | **L** (diseño aprobado para C-4; no cambia RF/HU aprobados) |
| LEV-R03 | Vista previa del pedido de listas | [05](05_REQUISITOS_SIN_DEPENDENCIAS.md) | Encargo C; LEV-D32 | Lo previsualizado coincide con lo enviado; no crea registros | Ninguna | Integración + cliente | **L** (mejora de una función sin RF/HU: registrar en la brecha de trazabilidad) |
| LEV-R06 | Fecha y hora límite del pedido | [05](05_REQUISITOS_SIN_DEPENDENCIAS.md), ajustada en [12](12_ESPECIFICACION_PEDIDO_DE_LISTAS.md) | Encargo C; Q11 = A | Con zona horaria; pasada se rechaza | R03 | Unitaria de validación + plantilla | **L** (campo opcional) · **I** (obligatoriedad por tipo, Q12) |
| LEV-R14a | Último administrador: parte de **cuentas** | [11](11_ESPECIFICACION_ROLES_PERMISOS_ALCANCE.md) (reemplaza R02) | Encargo A; Q05 = A; LEV-D10 | Con un solo administrador activo no se puede desactivar ni cambiar su rol; una transacción | Ninguna | Integración, incluida la concurrencia | **L** · el mínimo mayor que 1 es **I** (DBU/TI) |

### 2.2 Roles, permisos y alcance (Q01 = B, Q05 = A)

| Id | Requisito | Origen | Criterio de aceptación (resumen) | Dependencia | Prueba propuesta | Preparación |
|---|---|---|---|---|---|---|
| LEV-R19 | Pruebas de caracterización del acceso actual | Encargo A; LEV-D02 | Fijan el comportamiento vigente por rol antes de cambiar nada | Ninguna | Integración | **L** |
| LEV-R10 | Catálogo de permisos definido por el sistema | Q01 = B | Una fila por permiso; ninguna ruta usa un código fuera del catálogo | Ninguna | Prueba automática del catálogo | **L** (sin cambio de comportamiento) |
| LEV-R12 | Alcance como dato (usuario, escuela, facultad) | Q01; LEV-D07 | Prueba de paridad con los accesos de hoy; fuera del alcance responde «no encontrado» | R10 | Paridad por rol base + integración | **A** (Q01 cambia RF-04 / HU-04) |
| LEV-R16 | El cliente decide por permisos y alcances | HU-04 / T-1.24; LEV-D08 | Ningún archivo del cliente compara nombres de rol | R10; R12 para los alcances | Cliente + recuento documentado en [01](01_DIAGNOSTICO_ACTUAL.md) | **L** (la parte de permisos ya la exige HU-04) · **A** (la parte de alcances) |
| LEV-R14b | Último administrador: parte de **roles** (editar, vaciar, borrar) | Q05 = A | Retirar el núcleo de administración al último rol que lo concede se rechaza | R10, R11 | Integración | **A** |
| LEV-R13 | Delegación por permiso y alcance | Q05 | Nadie otorga lo que no posee ni fuera de su alcance | R10 a R12 | Integración de escalamiento | **A** · lista de no delegables **I** (DBU/TI) |
| LEV-R11 | Roles configurables con roles base protegidos | Q01 | Rol sin permisos no da acceso; el rol base no se borra | R10, R12, R14b | Integración | **A** · roles institucionales **I** (Q02) |
| LEV-R18 | Bitácora de roles, permisos y alcances | Encargo A | Cada concesión, retiro o rechazo queda registrado | R11 a R14 | Integración | **A** |
| LEV-R15 | Efecto de los cambios con sesión iniciada | Encargo A | El cambio rige en la siguiente petición; el menú se actualiza | R16 | Integración | **A** · cierre de sesiones **I** (Q06) |
| LEV-R17 | Plantillas de permisos | Encargo A | Copiar desde un rol | R11 | Integración | **A** · «acceso total/medio» **I** (Q04) |

### 2.3 Pedido de listas y carga supervisada (Q11 = A)

| Id | Requisito | Origen | Criterio de aceptación (resumen) | Dependencia | Prueba propuesta | Preparación |
|---|---|---|---|---|---|---|
| LEV-R20 | Canal de respuesta explícito en el correo | Q11 = A; LEV-D35 | Dirección, fecha límite y formato esperado en el texto | R03, R06 | Unitaria de la plantilla | **A** (pedido de listas sin RF/HU) · texto final **I** (DBU) |
| LEV-R21 | Estados de recepción y seguimiento | Q11 = A; LEV-D33 | Marcar recibido registra quién y cuándo; vencido no envía correos | R06, R20 | Integración | **A** · tipos de pedido y plazos **I** (Q12) |
| LEV-R22 | Vista previa de la carga y confirmación | Q11 = A; LEV-D32; HU-09 | La vista previa no escribe; confirmar exige el mismo `sha256` | R12 (alcance) | Integración de los tres casos | **A** (modifica HU-09) · conservación del archivo **I** (DBU y asesoría legal) |
| LEV-R23 | Vínculo carga ↔ pedido | Q11 = A | Un pedido admite varias cargas | R21, R22 | Integración | **A** |

### 2.4 Lugar de la tutoría (Q17 = A)

| Id | Requisito | Origen | Criterio de aceptación (resumen) | Dependencia | Prueba propuesta | Preparación |
|---|---|---|---|---|---|---|
| LEV-R30 | El solicitante propone modalidad y lugar | Q17 = A; LEV-D50 | Opcional; solicitud antigua se muestra «sin propuesta» | RF-18 / HU-17 | Servidor + formulario | **A** |
| LEV-R31 | El docente confirma o fija otro al programar | Q17 = A; HU-20 | La propuesta original se conserva | R30; RF-21 / HU-20 | Servidor + formulario | **A** |
| LEV-R32 | Cambio de lugar o modalidad registrado y notificado | Q17 = A | Historial con anterior, nuevo, motivo y autor; correo sin lugar ni motivo | R31 | Integración, incluida la confidencialidad del correo | **A** |
| LEV-R33 | Sin negociación en esta versión | Q17 = A | — (regla, no función) | R31 | — | **A** · contrapropuesta **I** (Q19) |
| LEV-R34 | Redacción propuesta de RF/HU | Q17 = A | La aprueba el Product Owner | — | — | **A** (es la aprobación) · catálogo y choques de lugar **I** (Q18) |

### 2.5 Certificación (Q23 = A, Q24)

Los requisitos LEV-R40 a LEV-R47 están **definidos con origen, criterio, dependencia, parte bloqueada y prueba** en la sección 12 de [14](14_ESPECIFICACION_CERTIFICACION.md). Resumen de preparación:

| Id | Requisito | Preparación |
|---|---|---|
| LEV-R44 | Modo de demostración sin valor | **A** (función nueva); sin parte institucional |
| LEV-R40 | Estados y transiciones | **A** · quién ejecuta cada paso **I** (Q20) |
| LEV-R43 | PDF sin firma con huella | **A** · plantilla oficial **I** (Q24) |
| LEV-R42 | Número único transaccional | **A** · formato oficial **I** (Q25) |
| LEV-R45 | Incorporar el PDF firmado | **A** · herramienta y exigencia de firma **I** (Vicerrectorado y TI) |
| LEV-R46 | Corrección, anulación y reemisión | **A** · quién autoriza **I** (Q20) |
| LEV-R41 | Evidencias con revisión humana | **A** · criterios, umbrales y revisor **I** (Q21, Q22): **no se codifica ninguna regla de elegibilidad** |
| LEV-R47 | Bitácora y avisos | **A** · correo por evento **I** (Q07) |

## 3. Matriz breve de preparación

| Categoría | Requisitos | Lo que queda fuera de la categoría |
|---|---|---|
| **L · Listo para implementar** | R07, R01, R04, R03, R14a, R19, R10; la parte de permisos de R16; el campo opcional de R06; el registro del fallo de R05 | Canal de R05 (Q07); obligatoriedad de R06 (Q12); mínimo mayor que 1 de R14a |
| **A · Requiere aprobación de RF/HU** | Roles y alcance: R11, R12, R13, R14b, R15, R17, R18, parte de alcances de R16. Listas: R20 a R23. Lugar: R30 a R34. Certificación: R40 a R47 (función nueva) | — |
| **I · Requiere decisión institucional** | Q02, Q04, Q06, Q07, Q12, Q13, Q18, Q19, Q20 a Q22, Q24 a Q29, lista de permisos no delegables, mínimo de administradores | — |

Todos los requisitos de **A** conservan además su parte **I** cuando la tiene (columna «Preparación» de la sección 2).

## 4. Orden de implementación propuesto (entregas pequeñas)

Cada entrega es **un PR a `develop`**, con su DoD completo, sin mezclar correcciones y funciones nuevas. **No hay estimaciones** (se harán en la Fase 4 con sus supuestos); las 323 h originales no incluyen nada de esto. **Nada de lo siguiente está autorizado todavía.**

### 4.1 Correcciones del comportamiento actual (independientes, sin aprobar RF/HU)

| Entrega | Contenido | Por qué primero |
|---|---|---|
| C-1 | **LEV-R07**: quitar «lugar» del correo de aceptación | Corrige una inconsistencia comprobada; solo texto y su prueba |
| C-2 | **LEV-R01**: bitácora al crear un rol | Hoy el alta de un rol no deja rastro |
| C-3 | **LEV-R14a**: proteger al último administrador (cuentas) | Hoy se puede dejar el sistema sin administrador |
| C-4 | **LEV-R04**: evitar el pedido de listas duplicado | Hoy el cliente solo muestra estado de carga; el comportamiento del servidor ante dos envíos idénticos **no se verificó** |
| C-5 | **LEV-R05**: hacer visible el fallo del correo de rechazo | Hoy el fallo solo se registra en el log |

### 4.2 Mejoras pequeñas de funciones existentes

| Entrega | Contenido | Depende de |
|---|---|---|
| M-1 | **LEV-R03** vista previa del pedido y **LEV-R06** fecha límite opcional | — |

### 4.3 Funcionalidades nuevas

| Línea | Entregas en orden | Condición para empezar |
|---|---|---|
| **Roles y alcance** | N-1 R19 + R10 (sin cambio de comportamiento) → N-2 R12 con prueba de paridad → N-3 sustituir las comprobaciones por nombre de rol, módulo por módulo, con R19 en verde → N-4 R14b y R13 → N-5 R11, R17, R18 y la pantalla de roles → N-6 R15 y R16 completo | N-1 puede empezar ya (**L**); desde N-2, RF/HU de Q01 aprobados |
| **Pedido de listas** | N-7 R20 → N-8 R21 → N-9 R22 → N-10 R23 | RF/HU aprobados; texto de R20 confirmado por la DBU |
| **Lugar** | N-11 R30 → N-12 R31 → N-13 R32 | RF-18/HU-17 y RF-21/HU-20 aprobados |
| **Certificación** | N-14 R44 (demostración) y R40 → N-15 R43 → N-16 R42 → N-17 R45 → N-18 R46 y R47. **R41 (criterios) no se entrega** hasta Q21 y Q22 | RF/HU nuevos aprobados; para lo oficial, respuestas de Q20 a Q25 y Q23 |

**Criterio de orden.** (1) Primero lo que no depende de nadie y reduce un riesgo actual (C-1 a C-5). (2) Después lo que prepara el terreno sin cambiar el comportamiento (N-1). (3) Las funciones nuevas solo con su RF/HU aprobado. (4) Una dependencia institucional pendiente detiene **su entrega**, no las demás líneas.

## 5. Revisión de coherencia (esta consolidación)

Se revisaron los identificadores, las referencias cruzadas, las decisiones, los permisos, los eventos y los diagramas de los archivos 00 a 14. **Es una revisión documental mía, no una revisión independiente.**

| N.° | Hallazgo | Corrección aplicada |
|---|---|---|
| H-1 | LEV-R14 declaraba depender de R10 y R11 para todo, aunque lo relativo a **cuentas** no necesita roles configurables. Eso retenía innecesariamente una protección de seguridad | Dividida en R14a (cuentas, lista) y R14b (roles, requiere R11) en [11](11_ESPECIFICACION_ROLES_PERMISOS_ALCANCE.md) |
| H-2 | Los eventos propuestos de [07](07_MATRIZ_EVENTOS_ACTUAL.md) se numeraron P01 a P06, igual que las plantillas de correo P01 a P13 de [08](08_CATALOGO_PLANTILLAS_CORREO_ACTUAL.md) | Renumerados N01 a N06 |
| H-3 | LEV-R06 está definido en [05](05_REQUISITOS_SIN_DEPENDENCIAS.md) y ajustado en [12](12_ESPECIFICACION_PEDIDO_DE_LISTAS.md) | Se mantiene la nota cruzada; esta matriz indica qué parte es **L** y cuál **I** |
| H-4 | LEV-R02 ([05](05_REQUISITOS_SIN_DEPENDENCIAS.md)) y LEV-R14 ([11](11_ESPECIFICACION_ROLES_PERMISOS_ALCANCE.md)) se superponen | R02 queda como antecedente (nota ya aplicada); la fuente vigente es R14a/R14b |
| H-5 | Los requisitos de certificación no tenían identificador | Definidos LEV-R40 a LEV-R47 en [14](14_ESPECIFICACION_CERTIFICACION.md), sección 12 |
| H-6 | Los diagramas propuestos de 12, 13 y 14 repiten los números DOC-D06 y DOC-D07 del plan de la documentación integral | Ver la sección 7: el número identifica el **tipo** de diagrama, no una figura única. La asignación definitiva es del plan del informe |

**Pendiente de verificación (no revisado):** que el recuento de 36 permisos y 7 roles de [06](06_MATRIZ_ROLES_PERMISOS_ACTUAL.md) siga vigente si `develop` cambió después de `c2e0460`; que los nombres de permisos `certificados:*` no choquen con otros que se propongan en el informe.

## 5 bis. Pendientes detectados durante la implementación

Hallazgos que **no** forman parte de ninguna entrega aprobada y se tratan por separado. Cada uno necesita su propia instrucción antes de implementarse.

| N.° | Hallazgo | Evidencia | Estado |
|---|---|---|---|
| IMP-1 | **`AssignRoleUseCase` registra como autor de la bitácora al usuario afectado, no a quien hizo el cambio.** Al asignar un rol, la entrada `ASSIGN_ROLE` guarda `userId` = el usuario que recibe el rol y `ipAddress: null`; el actor autenticado no se pasa al caso de uso. La bitácora no permite saber quién cambió el rol de quién | `server/src/application/use-cases/roles/AssignRoleUseCase.ts` (`auditLogs.create({ userId, action: 'ASSIGN_ROLE', … ipAddress: null })`); detectado al preparar C-2. Leído en el código; no reproducido en ejecución | **Pendiente**, sin implementar. Corrección acotada propuesta: pasar el actor y la IP desde el controlador, registrar `userId` = actor con el afectado en `entityId`, y probarlo. No se mezcla con C-2 ni con C-3 |
| IMP-2 | **Fallo intermitente de `UserManagementPage.test.tsx`** (prueba del cliente de C-3). En 1 de 2 corridas completas locales sin cambios de código falló `UserManagementPage: desactivar a la última cuenta de administración > ante el 409 muestra el mensaje del servidor y la cuenta sigue activa` con **`TestingLibraryElementError: Unable to find role="button" and name "Desactivar"`**, a los **1 965 ms**; la otra corrida pasó entera (87 archivos, 553 pruebas). La búsqueda que no encontró el botón es `findByRole` (tiempo de espera por omisión de Testing Library: 1 000 ms). **Causa no determinada**; hipótesis sin verificar (contención de CPU entre trabajadores en paralelo, carga de módulos, defecto de la prueba). No se cambiaron tiempos ni aserciones | `docs/resultados-2026-10-27/cliente-suite-completa-corrida-2.log` (registro completo con el volcado del DOM), `cliente-suite-completa-corrida-1.log` (corrida limpia) y `cliente-fallos-intermitentes.md` | **Pendiente de investigación**, sin cambios. Propuesta: repetir la suite con registro completo, con distinto número de trabajadores y sobre un `develop` limpio, y solo después decidir si hay que ajustar la prueba. No se mezcla con ninguna entrega |

## 6. Decisiones que hay que gestionar con la institución

Los **documentos de respaldo** son lo que habría que pedir o recibir por escrito. Los nombres de cargo son los del Protocolo y del diagnóstico; el cargo concreto lo indica la institución.

| N.° | Decisión | Responsable | Qué necesitamos (documento o respuesta) | Desbloquea | Urgencia |
|---|---|---|---|---|---|
| 1 | **Q20** Quién emite certificados | Facultad (decanato), DBU, Vicerrectorado | Oficio o resolución que nombre el cargo emisor y si es por escuela o facultad; la **Resolución de Decanato** del ejemplo, si corresponde | R40, R46 y el alcance del certificado | Alta |
| 2 | **Q21** Qué acredita el certificado y con qué criterios | Facultad y dirección de escuela | Texto del criterio (qué se exige: sesiones, informes, evaluación) y umbrales, si los hay | R41 | Alta |
| 3 | **Q22** Quién revisa las evidencias | Facultad y dirección de escuela | Cargo revisor y si debe ser distinto del emisor | R41 | Alta |
| 4 | **Q24** Plantilla oficial | DBU, Vicerrectorado, facultad | Plantilla **sin firmar**, logotipos y textos oficiales. Si no existe, aprobación escrita de un diseño propuesto | R43 oficial | Alta |
| 5 | **Q23** Firma | Vicerrectorado, TI, autoridad firmante | Confirmar que la universidad firma fuera del sistema con su herramienta y que acepta incorporar el PDF firmado | R45 | Media |
| 6 | **Q25 a Q29** Número de registro, lote, consulta pública, validación de firma, datos personales y conservación | Secretaría de la facultad, Vicerrectorado, TI, DBU y asesoría legal | Formato del número; si habrá lote y consulta pública; política de conservación | R42 oficial; partes posteriores | Media |
| 7 | **Q02** Estructura de roles (coordinador, responsable de escuela, decano) | DBU, Vicerrectorado, facultades | Organigrama de cargos con sus funciones y alcance, y cuál texto (RF-04, HU-04 o el sistema) refleja la realidad | R11 con nombres definitivos | Alta |
| 8 | **Q05** Permisos no delegables y número mínimo de administradores | DBU y TI | Lista de permisos que solo la DBU puede conceder y el mínimo | R13 y el valor de R14a | Media |
| 9 | **Q11/Q12/Q13** Canal de listas, formato del oficio y correo institucional | DBU, escuelas y TI | Conformidad de las escuelas con el canal; formato del oficio; datos del SMTP institucional y dominios admitidos | R20, R21 y la entrega real de correos | Media |
| 10 | **Q07** Qué eventos llevan correo | DBU | Lista de eventos con correo y con aviso interno | R05 canal, R47, N01 a N05 | Media |
| 11 | **Q18/Q19** Catálogo de lugares y negociación | DBU y coordinaciones o direcciones de escuela | Catálogo de lugares por sede o escuela y quién lo administra; si se admite contrapropuesta | Ampliación de R30 a R34 | Baja |
| 12 | **Q04/Q06** Plantillas de permisos y cierre de sesiones al cambiar un rol | DBU y TI | Nombres y contenido de las plantillas; si el cambio debe cerrar sesiones | R17, R15 | Baja |
| 13 | **Aprobación del Product Owner** de los cambios de RF/HU | Product Owner | Aprobación escrita de: HU-04/RF-04 (roles), HU-17/RF-18 y HU-20/RF-21 (lugar), RF/HU nuevos para pedido de listas y para certificación | Todo lo marcado **A** | Alta |

Las 21 preguntas no P0 restantes siguen en [02](02_PREGUNTAS_INSTITUCIONALES.md).

## 7. Trazabilidad con el informe y sus diagramas

`docs/levantamiento` es la **fuente de requisitos**; el informe solo los referencia. Los diagramas del plan de documentación integral usan identificadores `DOC-Dxx` por **tipo**. Esta tabla relaciona cada diagrama de aquí con su tipo y su estado; la **asignación final de figuras es del plan del informe**, que puede subnumerarlas (p. ej. D06-a, D06-b).

| Archivo | Diagrama | Tipo (`DOC-D`) | Estado | Requisitos relacionados |
|---|---|---|---|---|
| 06 | Diagrama del acceso actual | D05/D06 | Vigente | Base de R10 a R19 |
| 07 | Secuencia de avisos | D06 | Vigente | Eventos E01 a E12 |
| 07 | Estados de la designación | D07 | Vigente | H01 a H08 |
| 09 | Estados de solicitud y de derivación | D07 | Vigente | — |
| 11 | Entidad–relación del modelo de roles y alcance | D03/D04 | **Propuesto** | R10 a R14 |
| 11 | Flujo de autorización propuesto y flujo de delegación | D05/D06 | **Propuesto** | R12, R13 |
| 12 | Estados del pedido de listas | D07 | Mezcla vigente y propuesto, marcado por flecha | R20 a R23 |
| 12 | Secuencia del pedido y la carga supervisada | D06 | Mezcla, marcado por paso | R03, R20 a R23 |
| 13 | Secuencia de propuesta, confirmación y cambio de lugar | D06 | **Propuesto** | R30 a R32 |
| 14 | Estados del certificado | D07 | **Propuesto** (separado de los vigentes) | R40, R46 |
| 14 | Secuencia de firma externa e incorporación | D06 | **Propuesto** | R43, R45 |

Compatible con la separación que pide el plan del informe: los estados del certificado propuesto se mantienen aparte de los vigentes.

## 8. Qué no cubre esta consolidación

- No hay estimaciones ni plazos (Fase 4).
- No se ejecutó ninguna prueba funcional: los cambios son **solo documentales**. La CI del PR verifica que el repositorio sigue compilando y que pasan las pruebas existentes; **no valida el contenido** de estos documentos.
- No hay aprobación del Product Owner, de la DBU, de la facultad, del Vicerrectorado ni de TI sobre nada de esto.
