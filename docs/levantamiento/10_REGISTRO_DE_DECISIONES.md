# Registro de decisiones de trabajo (27/10/2026)

Registra lo que el **responsable del proyecto** decidió para continuar la **especificación** (sin implementar) y distingue, para cada una, qué es una **propuesta del proyecto** y qué **aprobación institucional o de requisitos sigue pendiente**. Una decisión de trabajo **no** es una aprobación de la DBU, de la facultad, de TI ni del Product Owner, y **no modifica** el Protocolo ni los RF/HU existentes. Preguntas y opciones completas: [00](00_PREGUNTAS_P0_PARA_RESPONDER.md). Etiquetas: [README](README.md).

**Vocabulario de estado.**

| Estado | Significado |
|---|---|
| **Decisión de trabajo** | Tomada por el responsable del proyecto; permite especificar. No es aprobación institucional |
| **Propuesta técnica del proyecto** | El proyecto la propone; sigue siendo propuesta hasta que se confirme lo indicado |
| **Pendiente institucional** | Lo debe decidir o respaldar por escrito la instancia indicada; **la especificación correspondiente permanece bloqueada** |
| **Cambio de RF/HU por aprobar** | Cambia un requisito aprobado; requiere actualizar RF/HU y la aprobación del Product Owner |

## Decisiones

| Pregunta | Decisión de trabajo registrada | Tipo | Aprobación o confirmación pendiente | Qué desbloquea | Qué sigue bloqueado | Especificación |
|---|---|---|---|---|---|---|
| **Q01** Roles configurables | **B**: roles configurables mediante un **catálogo de permisos definido por el sistema**, con **roles base protegidos**. Debe definir también el **alcance por usuario, escuela o facultad**: no basta con reemplazar comparaciones por nombre de rol | Decisión de trabajo + propuesta técnica | **Cambio de RF/HU por aprobar** (RF-04 habla de roles fijos; HU-04 y la estimación solo cubren la autorización por permisos). **DBU**: qué roles existen institucionalmente y quién los administra | Catálogo de permisos, roles y roles base, alcance como dato, migración por etapas | Cuáles son los roles institucionales definitivos (depende de Q02); qué permisos son no delegables (valor a confirmar con la DBU) | [11](11_ESPECIFICACION_ROLES_PERMISOS_ALCANCE.md) |
| **Q02** Coordinador, Responsable de escuela, Decano | **Pendiente institucional.** La estructura actual se documenta **como existente** (7 roles, con Decano y sin «Responsable de escuela»). **No se modifica el Protocolo ni los RF/HU para hacerlos coincidir con el código** | Pendiente institucional | **DBU**, Vicerrectorado y facultades | Documentar lo existente ([06](06_MATRIZ_ROLES_PERMISOS_ACTUAL.md)); especificar roles y alcances de forma neutra, sin presuponer los cargos | Cualquier rol o cargo nuevo, y la corrección de la discrepancia RF-04 / HU-04 / código | [06](06_MATRIZ_ROLES_PERMISOS_ACTUAL.md), [03](03_CONTRASTE_PROTOCOLO_Y_BACKLOG.md) (X1) |
| **Q05** Último administrador | **A**: proteger al último administrador activo. Para evitar escalamiento se define **qué permisos y alcances puede delegar cada administrador** (la frase «mayor privilegio» no es una jerarquía suficientemente precisa) | Decisión de trabajo + propuesta técnica | Ninguna para la regla del último administrador. El **conjunto de permisos no delegables** y el mínimo (1) se confirman con la **DBU/TI** | Reglas de delegación y de protección | Qué permisos concretos son no delegables (valor propuesto, a confirmar) | [11](11_ESPECIFICACION_ROLES_PERMISOS_ALCANCE.md) (LEV-R13, LEV-R14) |
| **Q11** Canal de las listas | **A por ahora**: pedido por correo, respuesta con archivo y **carga supervisada**, con **vista previa, fecha límite y canal de respuesta explícito** | Decisión de trabajo + propuesta técnica | **DBU** y **escuelas** (que el canal les sirva); **TI** (correo). La obligatoriedad de la fecha límite por tipo de pedido sigue en Q12 | Especificación del pedido, de la vista previa y de la carga supervisada | Canales B y C; formato institucional del oficio (Q12); SMTP real (Q13) | [12](12_ESPECIFICACION_PEDIDO_DE_LISTAS.md) |
| **Q17** Lugar | **A como propuesta**: el **solicitante propone** el lugar y el **docente lo confirma**. Si el docente necesita cambiarlo, el cambio **queda registrado y se notifica** al solicitante | Propuesta técnica del proyecto | **Cambio de RF/HU por aprobar** (RF-21 / HU-20 asignan el lugar al docente). **DBU y coordinaciones o direcciones de escuela** para el proceso | Especificación de la propuesta, la confirmación, el cambio registrado y su aviso | Catálogo de lugares y validación de choques (Q18); contrapropuesta o negociación (Q19) | [13](13_ESPECIFICACION_LUGAR_DE_LA_TUTORIA.md) |
| **Q20** Quién emite | **Pendiente institucional** | Pendiente institucional | **Facultad (decanato)**, DBU, Vicerrectorado | Un proceso con el emisor, el revisor y el firmante como **parámetros** | Nombrar al emisor; alcance por escuela o facultad del certificado | [14](14_ESPECIFICACION_CERTIFICACION.md) |
| **Q21 y Q22** Qué acredita y quién revisa las evidencias | **Pendiente institucional.** **No se convierte el certificado de cumplimiento en una constancia de participación solo para simplificarlo**: se debe confirmar quién emite, qué acredita y quién revisa las evidencias | Pendiente institucional | **Facultad** y **dirección de escuela** | El proceso reserva el paso de **revisión de evidencias** y no escribe «cumplió» por actividad registrada | Los criterios de elegibilidad, los umbrales y la persona revisora | [14](14_ESPECIFICACION_CERTIFICACION.md) |
| **Q23** Firma | **A como propuesta técnica**: generar **sin firma**, **firma externa institucional** y **posterior incorporación del PDF firmado**; **no custodiar claves privadas** | Propuesta técnica del proyecto | **Vicerrectorado, TI y la autoridad firmante** (qué firma exige la universidad y con qué herramienta) | Generación sin firma; incorporación del PDF firmado; registro de hashes | Validar criptográficamente la firma (Q28); consulta pública de autenticidad (Q27) | [14](14_ESPECIFICACION_CERTIFICACION.md) |
| **Q24** Plantilla | **A preferida** (la institución entrega plantilla sin firmar, logotipos y textos); **B como alternativa sujeta a aprobación** (el equipo propone un diseño que la universidad aprueba). Mientras llega el formato oficial se puede preparar una **plantilla de demostración con datos ficticios**, que **no debe emitirse como certificado válido** | Decisión de trabajo + propuesta técnica | **DBU / Vicerrectorado / facultad** (formato oficial). La alternativa B requiere aprobación | Plantilla de demostración con marca de agua y numeración separada | El formato, los logotipos y los textos oficiales | [14](14_ESPECIFICACION_CERTIFICACION.md) |

Qué decisiones hay que gestionar, con quién y qué documento se necesita: sección 6 de [15](15_TRAZABILIDAD_Y_PLAN_DE_ENTREGAS.md).

## Corrección acotada para una implementación posterior

El texto del correo de aceptación que todavía pide el lugar al docente es una **inconsistencia identificada** (hallazgo C01 de [08](08_CATALOGO_PLANTILLAS_CORREO_ACTUAL.md)). Queda registrada como **corrección acotada** (LEV-R07 en [05](05_REQUISITOS_SIN_DEPENDENCIAS.md)): cambia solo el texto de la plantilla, no depende de Q17 y se hará en una implementación posterior. **No se implementó.**

## Qué sigue sin decidir (no bloquea lo anterior)

Las 21 preguntas no P0 de [02](02_PREGUNTAS_INSTITUCIONALES.md) siguen abiertas; en particular Q03 (alcances: ahora se especifican como dato, ver [11](11_ESPECIFICACION_ROLES_PERMISOS_ALCANCE.md)), Q04 («acceso total» y «medio»), Q06 (efecto inmediato de los cambios), Q07–Q10 (política de correo y de avisos), Q12–Q14, Q15–Q16, Q18–Q19, Q25–Q29 y Q30–Q31.

## Reglas de este registro

1. Cada fila cita **quién** decide (responsable del proyecto) y **qué falta** para que sea una decisión institucional.
2. Una especificación que depende de una fila «pendiente» lo declara y **no avanza** en esa parte.
3. Si una respuesta posterior de la DBU, la facultad o TI contradice una decisión de trabajo, **prevalece la institucional** y se actualiza esta tabla y las especificaciones.
