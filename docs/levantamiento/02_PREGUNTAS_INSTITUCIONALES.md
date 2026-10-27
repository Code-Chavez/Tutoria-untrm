# Preguntas y decisiones institucionales pendientes (Fase 1)

Borrador para revisión. **Las 10 preguntas P0 están explicadas con opciones, recomendación y consecuencias en [00](00_PREGUNTAS_P0_PARA_RESPONDER.md); responder allí.** Priorización por **impacto sobre el diseño**: **P0** bloquea empezar a especificar esa función o la deja insegura; **P1** cambia la especificación pero no impide empezar; **P2** se resuelve en la validación. «Mientras tanto» es una **suposición de trabajo**, no una decisión. Etiquetas y fuentes: [README](README.md); evidencia: [01_DIAGNOSTICO_ACTUAL](01_DIAGNOSTICO_ACTUAL.md).

## Decisiones ya pedidas a la DBU y todavía sin respuesta

No se repiten aquí. Siguen abiertas las cinco de `docs/DECISIONES_DBU_COBERTURA_Y_PLAN_2026-10-18.md` (rechazo o silencio del docente; cuándo se aplica la designación; capacidad, límite de ciclos y suplencias; forma del plan semestral; atención urgente) y su «Registro de decisiones» está en blanco. Este levantamiento depende de las N.° 1 y 2 para la sincronización (B) y la aceptación (D).

## Roles, competencias y permisos (A)

| ID | Pregunta | Por qué importa | Quién decide | Mientras tanto | P |
|---|---|---|---|---|---|
| LEV-Q01 | RF-04 define cinco roles fijos y reserva la asignación de roles al Administrador DBU. ¿Se reemplaza por **roles configurables**? ¿Quién puede crearlos y editarlos? ¿Qué roles son obligatorios e inamovibles (al menos el de administración)? | Cambia el alcance de un requisito aprobado; sin esto no se puede especificar la matriz de permisos | DBU (con el Product Owner) | Se conservan los 7 roles actuales como base | **P0** |
| LEV-Q02 | ¿Qué perfiles son funciones **distintas** (rol) y cuáles **servicios o atributos** de un perfil? Hoy: psicología, salud, asistencia social, psicopedagogía y escuela son un atributo de «Profesional de Servicio». ¿«Dirección de escuela» es lo mismo que «Coordinador»? ¿«Decano» y «Coordinador de facultad» del Art. 5 son uno o dos? ¿«Dirección de Gestión Docente, Curricular y Educación Virtual» participa en el sistema? | El Protocolo, Art. 5, lista responsables que el código no distingue; no se agregan ni quitan autoridades por su nombre | DBU y Vicerrectorado | Se mantiene el modelo actual | **P0** |
| LEV-Q03 | ¿Los alcances **propios, escuela, facultad, institución** bastan? ¿Un usuario puede tener varios (p. ej. coordinar dos escuelas)? ¿Quién define el alcance de cada persona? | Hoy el alcance sale del nombre del rol y de datos como `coordinatorId` | DBU | Alcances actuales | P1 |
| LEV-Q04 | «Acceso total» y «acceso medio»: ¿qué conjuntos de permisos son? No figuran en ningún documento revisado. ¿Hay un documento institucional del que salgan? | Deben ser conjuntos explícitos, no categorías | DBU | Ninguna: no se asigna significado | P1 |
| LEV-Q05 | Reglas de seguridad de la administración: ¿mínimo de administradores activos (hoy no hay protección)? ¿Un rol con permiso para asignar roles puede asignar uno de igual o mayor privilegio? ¿Se puede desactivar o degradar a uno mismo? | Evita dejar el sistema sin administrador y el escalamiento de privilegios | DBU y TI | Se considera requisito de seguridad (no depende de preferencia institucional) | **P0** |
| LEV-Q06 | Al retirar un permiso o cambiar un rol con sesión abierta: ¿efecto inmediato (hoy: en la siguiente petición; ≤ 30 s para permisos) o al renovar la sesión? | Define el comportamiento esperado y las pruebas | DBU / TI | Comportamiento actual | P2 |

## Sincronización, avisos y correos (B)

| ID | Pregunta | Por qué importa | Quién decide | Mientras tanto | P |
|---|---|---|---|---|---|
| LEV-Q07 | ¿Qué eventos justifican **correo** además del aviso interno? Hoy cada aviso interno genera un correo. | El encargo pide no enviar correo por cada edición sin justificación | DBU | Comportamiento actual | P1 |
| LEV-Q08 | ¿Quién debe enterarse de la **aceptación** de una designación y de los cambios posteriores de **disponibilidad**? Hoy solo el rechazo avisa (por correo, a la coordinación) y la disponibilidad no se puede editar | Completa la matriz evento → destinatario | DBU y coordinaciones | Comportamiento actual | P1 |
| LEV-Q09 | ¿Qué tiempo de actualización de las vistas es aceptable? Hoy: sondeo periódico del cliente; el objetivo medido más cercano es RNF-PERF-01 (3 s en operaciones frecuentes) | Define si basta el sondeo | DBU / Product Owner | Sondeo actual | P2 |
| LEV-Q10 | ¿Se necesita **presentación y revisión de informes semestrales** (estados, revisor, aviso)? Hoy el informe se guarda y se exporta, sin estados | Es un evento de la matriz y posible evidencia de certificación | DBU y facultad | Sin estados | P1 |

## Pedidos de listas por correo (C)

| ID | Pregunta | Por qué importa | Quién decide | Mientras tanto | P |
|---|---|---|---|---|---|
| LEV-Q11 | **¿Por qué canal entrega la escuela la lista?** Hoy: responder el correo con el archivo y luego una persona la carga. ¿Archivo subido al sistema? ¿Otro medio? | El encargo exige confirmar el canal y no inventarlo | DBU y escuelas | Responder el correo | **P0** |
| LEV-Q12 | ¿Existe un formato institucional de solicitud u oficio? ¿Qué campos son obligatorios: finalidad, fecha y hora límite, medio de entrega, contacto, cierre institucional? ¿Cambian por tipo de pedido (estudiantes, docentes, otros)? | Define la plantilla y la vista previa | DBU | Plantilla actual | P1 |
| LEV-Q13 | **SMTP real:** ¿TI entrega servidor, remitente y credenciales? ¿Qué dominios se aceptan como destinatario? (Mailpit solo en desarrollo). Ver `docs/GUIA_SMTP.md` y `docs/SOLICITUD_A_TI_PILOTO_2026-10-17.md` | Sin SMTP institucional no hay entrega real | TI | Mailpit en desarrollo | P1 |
| LEV-Q14 | ¿Quién puede enviar pedidos y a cuántos destinatarios por escuela (hoy uno)? ¿Hay copia obligatoria? | Alcance y permisos del pedido | DBU | Comportamiento actual | P2 |

## Primer acceso y aceptación (D)

| ID | Pregunta | Por qué importa | Quién decide | Mientras tanto | P |
|---|---|---|---|---|---|
| LEV-Q15 | ¿Qué **plazo** se considera «sin respuesta» y cuántos reintentos del enlace? ¿Vigencia del enlace de invitación y de aceptación? (hoy comparten `INVITATION_TTL_HOURS`) | Valor que el equipo no inventa (ya pedido en `DECISIONES_DBU…` §1) | DBU | Vigencia actual | P1 |
| LEV-Q16 | ¿El docente puede **cambiar su disponibilidad** después de aceptar? ¿Con qué aviso y a quién? | Hoy es imposible: el enlace es de un solo uso | DBU y coordinaciones | Sin cambios | P1 |

## Lugar de la tutoría (E)

| ID | Pregunta | Por qué importa | Quién decide | Mientras tanto | P |
|---|---|---|---|---|---|
| LEV-Q17 | ¿Quién elige el lugar: el solicitante (estudiante) **propone** o **decide**? ¿También lo elige quien registra la solicitud a nombre del estudiante? ¿Y en el modo virtual, quién aporta el enlace? | Hoy el lugar lo fija quien programa; invertirlo cambia el modelo de la solicitud y de la cita | DBU y coordinaciones | Sin cambios | **P0** |
| LEV-Q18 | ¿Existe un **catálogo de lugares** por sede o escuela (aulas, cubículos, oficina de tutoría)? ¿Quién lo administra y cómo se valida que esté libre? | Sin catálogo no hay conflictos de lugar | DBU y escuelas | Lugar en texto libre | P1 |
| LEV-Q19 | Si el docente no puede atender en el lugar pedido: ¿contrapropone, reprograma o rechaza? ¿Quién resuelve si no hay acuerdo? | Define estados y avisos | DBU | — | P1 |

## Certificación del docente tutor (F) y firma (G)

| ID | Pregunta | Por qué importa | Quién decide | Mientras tanto | P |
|---|---|---|---|---|---|
| LEV-Q20 | **¿Quién tiene competencia para emitir** certificados de tutoría? El Protocolo, Art. 23.a, atribuye el reconocimiento a «la facultad»; el ejemplo del encargo lo emite un director de escuela citando una Resolución de Decanato. ¿Todas las escuelas y facultades usan el mismo esquema? | Define roles, alcance y firmante | Decanato, DBU y Vicerrectorado | Ninguna: no se asume | **P0** |
| LEV-Q21 | **Criterios de elegibilidad y evidencias.** ¿Qué debe haberse cumplido (participación en la comisión, sesiones, informe, evaluación…)? ¿Qué período? **No se proponen umbrales:** el Protocolo no los fija | Sin criterio no se puede especificar la verificación | Facultad / DBU | Ninguna | **P0** |
| LEV-Q22 | ¿**Quién valida** que el docente «cumplió correctamente» y con qué evidencia? El sistema no debe escribirlo por tener actividad registrada | Responsabilidad y trazabilidad | Facultad | Ninguna | **P0** |
| LEV-Q23 | ¿Qué tipo de **firma** exige la universidad: imagen de firma o sello, firma electrónica por flujo de aprobación o **firma digital criptográfica** sobre el PDF? ¿Con qué herramienta y certificado la emite la universidad? El ejemplo observado usa firma criptográfica (estándar CAdES) | Decide si el sistema genera el PDF y se firma fuera, o si se custodia algo dentro | Vicerrectorado, TI y autoridad firmante | Firma externa y luego subir el PDF firmado (patrón de `SignedDocument`); nada de claves dentro del sistema | **P0** |
| LEV-Q24 | **Plantilla original sin firmar, logotipos oficiales y textos aprobados:** ¿quién los entrega? No se debe editar el ejemplo firmado para cambiar el nombre | Sin plantilla no hay generación | DBU / Vicerrectorado | Ninguna | **P0** |
| LEV-Q25 | **Numeración** («número de registro»): formato, ámbito (escuela, facultad, año), quién la asigna, y qué hace el sistema ante duplicados | Prevención de duplicados | Secretaría de la facultad / DBU | Ninguna | P1 |
| LEV-Q26 | ¿Se certifica **por lote** (varios docentes) o solo individualmente? ¿Quién revisa la vista previa antes de firmar? | Alcance de la función | Facultad | Solo individual | P1 |
| LEV-Q27 | **Correcciones, reemisión y anulación:** ¿quién las autoriza y cómo se conserva el rastro? ¿Se requiere **consulta pública de autenticidad** (código, QR, página)? | Estados del proceso | Facultad / Vicerrectorado | Ninguna | P1 |
| LEV-Q28 | La **autenticidad y vigencia de la firma del ejemplo** no se verificaron: ¿quién y con qué herramienta lo hace, y es necesario para especificar? | Evita basar el diseño en un archivo no validado | TI | Se trata como no verificado | P2 |
| LEV-Q29 | Tratamiento de datos del docente en el certificado y plazos de conservación (Ley N.° 29733 como referencia) | Cumplimiento declarado, no asumido | DBU / oficina legal | Ninguna | P2 |

## Usabilidad y vocabulario (H)

| ID | Pregunta | Por qué importa | Quién decide | Mientras tanto | P |
|---|---|---|---|---|---|
| LEV-Q30 | **Nombres institucionales** definitivos: «tutorado» o «estudiante», «docente tutor», «coordinación» o «responsable de escuela», «administrador» o «DBU», «decanato» | Lenguaje consistente en pantallas, correos y certificados | DBU | «Estudiante», «Responsable», «docente tutor» (ya aplicados) | P1 |
| LEV-Q31 | ¿Qué criterio de aceptación de accesibilidad y navegadores se adopta? RNF-USA-01 cita WCAG 2.1 AA «como referencia» y Chrome, Firefox, Edge y Safari; hoy solo Chrome y Edge (un motor) están probados | Define qué se prueba antes de dar por cerrada una función | Product Owner | Límites actuales declarados | P2 |

## Registro de decisiones (para llenar)

| Pregunta | Decisión | Fecha | Quién decidió | Respaldo (acta, resolución, correo) |
|---|---|---|---|---|
| LEV-Q01 | | | | |
| LEV-Q02 | | | | |
| LEV-Q05 | | | | |
| LEV-Q11 | | | | |
| LEV-Q17 | | | | |
| LEV-Q20 | | | | |
| LEV-Q21 | | | | |
| LEV-Q22 | | | | |
| LEV-Q23 | | | | |
| LEV-Q24 | | | | |

Las decisiones pendientes de `DECISIONES_DBU_COBERTURA_Y_PLAN_2026-10-18.md` se registran en su propia tabla.
