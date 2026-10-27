# Decisiones que necesitamos (solo las P0), en lenguaje sencillo

Son **10 preguntas en 4 bloques**, de las 31 del levantamiento (las demás están en [02](02_PREGUNTAS_INSTITUCIONALES.md) y no bloquean). Cada una dice **qué pasa hoy**, **qué significa cada opción** (qué cambia para los usuarios y para el sistema), la **propuesta del equipo** (una propuesta, **no una decisión**) y **quién puede decidirla**. Nada se implementa hasta que haya respuesta. Los bloques van en este orden: **1 Roles y seguridad → 2 Listas → 3 Lugar → 4 Certificación**.

**Quién decide — convención de este documento.**

| Marca | Significa |
|---|---|
| ✅ **Responsable del proyecto** | Se puede decidir dentro del proyecto: alcance técnico, seguridad básica, cómo se construye. Si cambia un requisito aprobado (RF/HU), además hay que **actualizarlo y obtener la aprobación del Product Owner** (el DoD la exige) |
| ⚠️ **Requiere confirmación institucional** | Lo decide o lo respalda por escrito la **DBU**, la **dirección de escuela**, la **facultad (decanato)**, el **Vicerrectorado** o **TI**, según se indica. El proyecto no puede darlo por hecho |

*Mientras no haya respuesta no se detiene todo:* se avanza con lo que no depende de estas decisiones (ver [05](05_REQUISITOS_SIN_DEPENDENCIAS.md) a [09](09_ESTADOS_ACTUALES_SOLICITUD_Y_DERIVACION.md)). Solo la certificación y los permisos configurables esperan.

---

# Bloque 1 · Roles y seguridad de la administración

## Q01 · ¿Los roles pasan a ser configurables?

**Hoy.** El sistema tiene 7 roles fijos con permisos definidos en el código (la seed). Se puede crear un rol nuevo solo con nombre y descripción, pero **no se le pueden dar permisos desde la aplicación**, así que un rol creado no sirve para nada. El requisito RF-04 aprobado habla de 5 roles fijos y de que solo el Administrador DBU asigna roles.

| Opción | Qué significa | Qué cambia en el sistema | Riesgos y costo |
|---|---|---|---|
| **A · Roles fijos** | Nadie crea roles; los 7 actuales y sus permisos se quedan como están | Nada | Se mantiene la limitación que motivó la necesidad |
| **B · Roles configurables con permisos de una lista fija** | El Administrador DBU **crea un rol y le marca permisos** de la lista que ya existe (36). Los roles base —al menos el de Administrador DBU— quedan **protegidos**: no se borran ni se vacían | Pantalla de roles y permisos; hay que **reemplazar las 43 comprobaciones por nombre de rol del servidor** (y las del cliente) por comprobaciones de permiso, o el rol nuevo no podrá usar casi nada; el **alcance** (propios, escuela, facultad) sigue saliendo de la función real de la persona, no de un ajuste libre | Es el cambio más grande de este bloque; requiere pruebas de que un rol nuevo no obtiene acceso a lo que no debe |
| **C · Libertad total** | Además, se podrían crear permisos nuevos y definir alcances a mano | Un editor de permisos y alcances | Riesgo alto de dejar huecos de seguridad y de confidencialidad; no se recomienda |

**Propuesta del equipo (a confirmar):** B.

**Quién decide.** ✅ Responsable del proyecto: el alcance técnico (que el sistema permita configurar permisos y cómo). ⚠️ **DBU**: qué roles existen institucionalmente y quién puede administrarlos. Cambiar RF-04 requiere además la aprobación del Product Owner.

## Q02 · ¿"Coordinador", "Responsable de escuela" y "Decano" son uno, dos o tres perfiles?

**Hoy.** Tres documentos no coinciden: **RF-04** lista 5 roles; la historia **HU-04** lista 7 (con «Responsable de escuela» distinto de «Coordinador», y **sin** Decano); el **sistema** tiene 7 (con **Decano** y **sin** «Responsable de escuela»). El Protocolo, Art. 5, nombra al «coordinador del sistema de tutoría de las **facultades**» y al «responsable del sistema de tutoría de las **escuelas profesionales**».

| Opción | Qué significa | Qué cambia | Riesgos y costo |
|---|---|---|---|
| **A · Se mantiene lo actual** | «Coordinador» (uno por escuela) y «Decano» (uno por facultad) | Nada; se corrigen RF-04/HU-04 para que digan lo mismo que el sistema | Puede no reflejar la estructura real si existe un coordinador por facultad |
| **B · Se separan dos perfiles** | «Coordinador de facultad» y «Responsable de escuela» como roles distintos, como sugiere el Art. 5 | Nuevo alcance por facultad para la coordinación; cambia a quién llegan las solicitudes y qué ve cada pantalla | Más cambios en enrutamiento, permisos y pantallas |
| **C · Otra estructura** | La que indique la DBU | A definir | A definir |

**Propuesta del equipo (a confirmar):** A **hasta que la DBU confirme** cómo se llaman y qué hacen estos cargos en la UNTRM.

**Quién decide.** ⚠️ **DBU** (con el **Vicerrectorado** y las **facultades**): qué cargos existen y qué hacen. ✅ Responsable del proyecto: cómo modelarlo en el sistema una vez confirmado.

## Q05 · ¿Qué reglas evitan dejar el sistema sin administrador?

**Hoy.** Se puede desactivar o cambiar de rol a la **única** cuenta administradora sin que nada lo impida, incluso una persona puede desactivarse a sí misma.

| Opción | Qué significa | Qué cambia | Riesgos y costo |
|---|---|---|---|
| **A · Mínimo 1 administrador activo** | Nadie puede desactivar ni degradar al último administrador activo; nadie puede desactivarse si es el único | Un mensaje claro al intentarlo; la regla se aplica en el servidor | Con un solo administrador no hay forma de «cambiar de administrador» sin crear primero a otro |
| **B · Mínimo 2** | Siempre debe haber al menos dos administradores activos | Igual, con otro número | Exige tener dos cuentas administradoras siempre |

Se propone además que **ningún rol pueda asignar roles de mayor privilegio que el suyo** (importante si se aprueba Q01).

**Propuesta del equipo (a confirmar):** A, más la regla de no asignar un rol superior al propio.

**Quién decide.** ✅ **Responsable del proyecto**: es una regla de seguridad básica sin costo para los usuarios. ⚠️ Confirmar con la **DBU** (y **TI**) solo si se prefiere el mínimo de 2.

---

# Bloque 2 · Listas de estudiantes

## Q11 · ¿Por dónde entrega la escuela la lista?

**Hoy.** El sistema envía por correo un pedido formal con una plantilla Excel adjunta. La escuela **responde ese correo con el archivo**; el sistema solo permite marcar «recibido», y una persona carga el archivo después.

| Opción | Qué significa | Qué cambia | Riesgos y costo |
|---|---|---|---|
| **A · Responder el correo y cargar a mano (hoy)** | La escuela responde el mismo correo; una persona de la DBU o la coordinación carga el archivo | Nada para la escuela; se mejora el pedido (vista previa, fecha límite, seguimiento) | Depende de una persona para cada carga |
| **B · Enlace seguro de un solo uso** | El correo trae un enlace; la escuela sube el archivo al sistema **sin crear cuenta** | Pantalla pública de subida con validación de archivo; el sistema recibe datos personales | Hay que validar archivos, vencer enlaces y definir cuánto tiempo se conservan los datos; depende de TI |
| **C · Cuenta de la escuela con carga directa** | Cada escuela tiene un usuario que sube sus listas | Un rol y permisos nuevos | Gestión de cuentas por escuela; más superficie de seguridad |

**Propuesta del equipo (a confirmar):** A por ahora, con las mejoras ya propuestas en [05](05_REQUISITOS_SIN_DEPENDENCIAS.md); B como evolución si TI y la DBU lo aprueban.

**Quién decide.** ⚠️ **DBU** y las **escuelas** (¿les sirve el canal?) y **TI** (correo y almacenamiento). ✅ Responsable del proyecto: mantener A mientras tanto.

---

# Bloque 3 · Lugar de la tutoría

## Q17 · ¿Quién decide el lugar?

**Hoy.** El lugar (o el enlace virtual) lo escribe el **docente al programar** la sesión; así lo establece la historia HU-20. La solicitud del estudiante no tiene lugar ni modalidad.

| Opción | Qué significa | Qué cambia | Riesgos y costo |
|---|---|---|---|
| **A · El estudiante propone y el docente confirma** | Al solicitar, el estudiante sugiere lugar o modalidad; el docente (o la coordinación) lo confirma o lo ajusta al programar | Un campo en la solicitud y un texto en el aviso; el lugar sigue en texto libre | Hay que definir qué ocurre si el docente no puede (ver Q19); cambia el criterio de HU-20 |
| **B · El estudiante elige de un catálogo y es definitivo** | Existe una lista de lugares disponibles; el estudiante elige uno libre y queda reservado | Catálogo de lugares por sede o escuela, quién lo administra y validación de choques de lugar | Requiere que las escuelas mantengan el catálogo (Q18); mayor cambio en solicitudes y agenda |
| **C · Solo la modalidad** | El estudiante elige presencial o virtual; el lugar o el enlace los fija el docente (como hoy) | Casi nada | No cumple la necesidad expresada (que decida quien solicita) |

**Propuesta del equipo (a confirmar):** A como primer paso, sin catálogo.

**Quién decide.** ⚠️ **DBU** y las **coordinaciones o direcciones de escuela** (quién administra los espacios; si el lugar es una propuesta o una reserva). ✅ Responsable del proyecto: el diseño del formulario una vez decidido. Modificar HU-20 y RF-21 requiere la aprobación del Product Owner.

---

# Bloque 4 · Certificación del docente tutor

## Q20 · ¿Quién tiene competencia para emitir el certificado?

**Hoy.** No existe la función. El Protocolo, Art. 23.a, dice que «**la facultad** puede otorgar reconocimientos formales, como premios o menciones honoríficas»; **no** menciona certificados. El certificado de ejemplo, según la observación visual de Codex relatada por el usuario, muestra a un **director de Escuela** y una **Resolución de Decanato**. No se asume nada.

| Opción | Qué significa | Qué cambia | Riesgos y costo |
|---|---|---|---|
| **A · La facultad (decanato)** | Emite el decanato de cada facultad | Rol y alcance por facultad; el firmante es la autoridad de la facultad | Menos cercano al ejemplo, más cercano al Art. 23.a |
| **B · Cada escuela, con resolución de decanato** | Emite la dirección de escuela respaldada por una resolución del decanato (como el ejemplo) | Alcance por escuela; hay que registrar la resolución que lo autoriza | Depende de que todas las escuelas usen el mismo esquema |
| **C · Una instancia central** | La emite la DBU o el Vicerrectorado | Un solo emisor | Se aleja de lo que hace hoy la escuela |

**Propuesta del equipo (a confirmar):** no hay una que el equipo pueda sostener; **pedir la Resolución de Decanato** del ejemplo y que se confirme por escrito quién emite.

**Quién decide.** ⚠️ **Facultad (decanato)** y **DBU**; **Vicerrectorado** si el esquema es institucional. El proyecto no puede decidirlo. Define el rol que emite, el alcance, el firmante y el formato del número de registro.

## Q21 y Q22 · ¿Qué debe cumplir el docente y quién lo valida?

**Hoy.** El Protocolo **no fija umbrales** (sesiones, informes, evaluación). El sistema **no debe escribir «cumplió correctamente»** solo porque haya actividad registrada: alguien debe validarlo.

| Opción | Qué significa | Qué cambia | Riesgos y costo |
|---|---|---|---|
| **A · Constancia de participación** | Basta figurar en la comisión o resolución y haber aceptado la designación; una persona definida de la escuela o facultad lo valida | Sin umbrales; el sistema solo reúne la prueba de participación | No dice nada del desempeño |
| **B · Cumplimiento con evidencias y umbrales** | La facultad aprueba **por escrito** qué evidencias y cuántas (sesiones, informe, evaluación…) | El sistema calcula si se cumplen y la persona validadora confirma | Requiere acuerdo escrito de la facultad; hoy el informe semestral no tiene estados (presentado, revisado) |
| **C · Mixto** | Participación + informe semestral presentado | Estados del informe y su revisión | Depende de definir los estados del informe |

**Propuesta del equipo (a confirmar):** A para una primera versión, sin umbrales inventados.

**Quién decide.** ⚠️ **Facultad** y **dirección de escuela** (criterios y quién valida); **DBU** (informes). ✅ Responsable del proyecto: nada de esto; solo puede registrar lo que se decida.

## Q23 · ¿Qué tipo de firma exige la universidad?

**Hoy.** Son tres cosas distintas: una **imagen** de firma o sello; una **firma electrónica** por un flujo de aprobación; y una **firma digital criptográfica** sobre el PDF. Los requisitos aprobados del proyecto sustituyen la firma por la **confirmación del usuario autenticado** en algunos formatos; el sistema ya permite **subir un documento firmado** (escaneo) en otros dos; el ejemplo observado usa una firma criptográfica (CAdES). La universidad no ha dicho cuál exige para certificados.

| Opción | Qué significa | Qué cambia | Riesgos y costo |
|---|---|---|---|
| **A · Firma externa** | El sistema genera el certificado **sin firmar**; la autoridad lo firma con la herramienta de la universidad; el sistema guarda el PDF **ya firmado** (el patrón que ya existe) | Subida del PDF firmado, vínculo con el certificado; **sin claves ni certificados dentro del sistema** | Verificar la firma es trabajo de la herramienta institucional; el sistema no la valida (salvo que se decida después) |
| **B · Imagen de firma o sello** | Se pega una imagen de firma o sello en el PDF generado | Gestión de imágenes de firma | Solo es válida si la universidad la acepta como firma; riesgo de uso indebido de la imagen |
| **C · Firma digital dentro del sistema** | El sistema guarda y usa el certificado digital de la autoridad para firmar | Custodia de claves, vigencia, revocación | La más costosa y riesgosa |

**Propuesta del equipo (a confirmar):** A.

**Quién decide.** ⚠️ **Vicerrectorado**, **TI** y la **autoridad firmante** (qué firma exige y con qué herramienta). ✅ Responsable del proyecto: la forma técnica de integrarla una vez que la universidad decida.

## Q24 · ¿Quién entrega la plantilla original sin firmar, los logotipos y los textos?

**Hoy.** No se dispone de la plantilla original **sin firmar**. **No se debe editar el ejemplo firmado** para cambiar el nombre: cada certificado debe generarse sin firmar y recibir su propia firma.

| Opción | Qué significa | Qué cambia | Riesgos y costo |
|---|---|---|---|
| **A · La institución entrega todo** | La DBU o el Vicerrectorado entrega la plantilla sin firmar, los logotipos oficiales y los textos aprobados | Nada hasta recibirlos | Puede tardar |
| **B · El equipo propone un diseño** | Se diseña un certificado y la universidad lo aprueba | Una ronda de aprobación | Riesgo de que no corresponda al formato oficial |

**Propuesta del equipo (a confirmar):** A.

**Quién decide.** ⚠️ **DBU**, **Vicerrectorado** o la **facultad** que sea dueña del formato. Sin plantilla no se puede empezar a generar PDF.

---

## Resumen de a quién corresponde cada decisión

| Pregunta | ✅ Responsable del proyecto | ⚠️ Requiere confirmación institucional |
|---|---|---|
| Q01 Roles configurables | Alcance técnico (con aprobación del Product Owner si cambia RF-04) | DBU: qué roles existen y quién los administra |
| Q02 Perfiles | Cómo modelarlos | DBU, Vicerrectorado, facultades |
| Q05 Último administrador | **Sí** (regla de seguridad); el número mínimo puede quedar en 1 | DBU/TI solo si se prefiere 2 |
| Q11 Canal de las listas | Mantener A mientras tanto | DBU, escuelas, TI |
| Q17 Lugar | Diseño del formulario; aprobar el cambio de HU-20 (Product Owner) | DBU y coordinaciones o direcciones de escuela |
| Q20 Quién emite | Nada | Facultad, DBU, Vicerrectorado |
| Q21/Q22 Criterios y validación | Nada | Facultad, dirección de escuela |
| Q23 Tipo de firma | La integración técnica | Vicerrectorado, TI, autoridad firmante |
| Q24 Plantilla y textos | Nada | DBU, Vicerrectorado o facultad |
