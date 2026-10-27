# Autorrevisión de la Fase 1 del levantamiento

Autorrevisión de quien elaboró el borrador; **no es una revisión independiente ni una aprobación del Product Owner.** Corte del código `c2e0460`. Se evalúan **por separado** (1) los criterios de aceptación de la **Fase 1** y (2) los del **levantamiento completo** (cuatro fases): terminar el diagnóstico no completa el levantamiento.

## 1. Criterios de aceptación de la Fase 1 (diagnóstico y preguntas)

Derivados del encargo, §1 («Revisión del estado actual») y §5 («Fase 1 — Inventario: leer documentos y código; entregar el diagnóstico y las preguntas prioritarias»). Veredicto: **Cumplido**, **Cumplido con límites** o **No cumplido**.

| N.° | Criterio | Veredicto | Evidencia | Límite o pendiente |
|---|---|---|---|---|
| F1-1 | Cada necesidad A–H clasificada como existente, parcial, faltante o por confirmar, con evidencia (archivo, endpoint, prueba, protocolo o documento) | **Cumplido con límites** | [01](01_DIAGNOSTICO_ACTUAL.md): filas `LEV-D01…D84` con etiqueta y evidencia | Lectura **dirigida** del código, no de cada archivo; la aplicación **no se ejecutó**; el efecto de un cambio de rol sobre una sesión abierta no se probó (LEV-D09) |
| F1-2 | Contraste con código, backlog, RF/RNF, Protocolo y certificado | **Cumplido con límites** | [03](03_CONTRASTE_PROTOCOLO_Y_BACKLOG.md) | Protocolo: artículos 5, 7–17 y 19–25 leídos completos y los arts. 1–2 solo en parte; **no** los arts. 3, 4, 6 y 18 ni los anexos. Backlog y estimación: solo las historias relacionadas. Certificado: **mi** lectura se limita a su estructura técnica; los campos que aparecen son la observación de Codex, no una lectura mía, y la firma **no** está validada |
| F1-3 | No presentar como requisito confirmado una suposición, una recomendación técnica o un comportamiento existente no aprobado | **Cumplido con límites** | Etiquetas `[EXISTE]` / `[CONFIRMAR]` / `[PROPUESTA]`; columna «Mientras tanto» etiquetada como suposición; [00](00_PREGUNTAS_P0_PARA_RESPONDER.md) marca las recomendaciones como del equipo | Una recomendación mal redactada puede leerse como decisión; se corrigieron dos casos (Q01 y Q05) y debe revisarse el resto |
| F1-4 | Preguntas y decisiones institucionales, priorizadas por impacto | **Cumplido** | [02](02_PREGUNTAS_INSTITUCIONALES.md): 31 preguntas; [00](00_PREGUNTAS_P0_PARA_RESPONDER.md): las 10 P0 en lenguaje sencillo, con opciones, recomendación y consecuencias | La prioridad es mía; la DBU puede reordenarla |
| F1-5 | Evitar duplicar funciones y decisiones existentes | **Cumplido con límites** | Se parte de `DECISIONES_DBU…`, `ESTADO_PENDIENTES…`, `CAMBIOS_USUARIO_TT103.md`; el [README](README.md) fija las reglas de coordinación con la documentación integral | No se revisaron todos los documentos de `docs/` |
| F1-6 | Escenarios obligatorios del encargo (§3) con su estado actual | **Cumplido con límites** | Tabla «Escenarios obligatorios: estado actual» en [01](01_DIAGNOSTICO_ACTUAL.md) | El encargo pide **separar reglas confirmadas de las que necesitan decisión**: la tabla da el estado del sistema, pero no una lista aparte de «reglas confirmadas»; **no hay ninguna regla institucional confirmada por escrito** en lo revisado, salvo las que cita el Protocolo |
| F1-7 | No implementar funcionalidades | **Cumplido** | Solo hay archivos en `docs/levantamiento/` | — |
| F1-8 | No subir el certificado personal, firmas, claves, imágenes ni datos personales | **Cumplido** | Búsqueda de nombres propios en la carpeta: sin coincidencias; el PDF no está en el repositorio | — |

**Conclusión sobre la Fase 1:** el diagnóstico y las preguntas están **completos como borrador revisable**, con los límites de la columna de la derecha. No sustituye una revisión por la DBU ni por el Product Owner.

## 2. Criterios de aceptación del levantamiento completo (cuatro fases)

| Fase | Contenido (encargo §5) | Estado | Qué falta |
|---|---|---|---|
| 1. Inventario | Diagnóstico y preguntas prioritarias | **Borrador entregado** (sección 1) | Revisión externa |
| 2. Especificación | Requisitos, matrices y escenarios; decisiones que bloquean cada función | **Avance parcial**: matriz de roles y permisos del sistema actual ([06](06_MATRIZ_ROLES_PERMISOS_ACTUAL.md)), matriz de eventos actual y huecos ([07](07_MATRIZ_EVENTOS_ACTUAL.md)) 7 requisitos que no dependen de decisiones ([05](05_REQUISITOS_SIN_DEPENDENCIAS.md)), el catálogo de plantillas de correo actual ([08](08_CATALOGO_PLANTILLAS_CORREO_ACTUAL.md)) y los estados vigentes de solicitud y derivación ([09](09_ESTADOS_ACTUALES_SOLICITUD_Y_DERIVACION.md)) | La especificación general de requisitos y el proceso de certificación; las plantillas de funciones nuevas; todo lo que depende de las P0 |
| 3. Validación | Incorporar las respuestas de los responsables; registro de decisiones | **No iniciada** | Respuestas a las P0; el registro de decisiones está en blanco |
| 4. Plan de implementación | Entregas pequeñas, dependencias, riesgos, migraciones, pruebas, estimaciones | **No iniciada** | Backlog propuesto, plan de pruebas y trazabilidad |

**Conclusión sobre el levantamiento completo:** **no está completo** (una fase en borrador, una con avance parcial y dos sin iniciar). Los criterios de aceptación del encargo en su conjunto **no se dan por cumplidos**.

## 3. Hallazgos de esta autorrevisión (errores en mi propio trabajo)

| N.° | Hallazgo | Corrección |
|---|---|---|
| R1 | Dos cifras distintas para las comprobaciones por nombre de rol («45 en 21» y «43 en 22»); la primera era una estimación sobre una lista parcial | Cifra verificada y método reproducible en [01](01_DIAGNOSTICO_ACTUAL.md) (43 / 22 / 34 en el servidor; 68 / 17 / 19 en el cliente, en `c2e0460`) |
| R2 | Me atribuí implícitamente la lectura del contenido del certificado («la lista de campos proviene de la descripción del encargo») | Reescrito: la observación visual es de Codex (relatada por el usuario); mi inspección fue solo técnica; la firma no está validada |
| R3 | La primera pasada no detectó que **HU-04 lista siete roles distintos** de los de RF-04 (con «Responsable de escuela» y sin Decano) | Discrepancia X1 en [03](03_CONTRASTE_PROTOCOLO_Y_BACKLOG.md); LEV-D01 corregido |
| R4 | Había dicho que `POST /roles` no se audita sin comprobar el interceptor automático | Comprobado: `CRITICAL_MODELS` no incluye `Role`; LEV-D05 con la evidencia |
| R5 | El uso del término «Responsable de escuela» y de las listas de roles dependía de RF-04 solo | Contrastado con HU-04 y el Art. 5 del Protocolo |
| R6 | Las recomendaciones de la hoja P0 podían leerse como decisiones | Redactadas como propuesta del equipo y corregidas dos frases (Q01, Q05) |
| R7 | Las 323 horas y los 164 Story Points se citaban sin aclarar que son estimaciones **originales** de planificación | Aclarado en el README y en [03](03_CONTRASTE_PROTOCOLO_Y_BACKLOG.md): no son horas ejecutadas ni el presupuesto de las ampliaciones |
| R8 | La matriz de permisos podía leerse como los permisos vigentes o como política aprobada | Advertencia en [06](06_MATRIZ_ROLES_PERMISOS_ACTUAL.md) y en el README: es la configuración inicial del código; se comprobó, en solo lectura, que la base de desarrollo coincide con la seed el 27/10/2026 |
| R9 | Las funciones existentes sin RF/HU se describían con un lenguaje («implementadas fuera de plan» / «retirarlas») que sugería una aprobación implícita | Reescrito como **brechas de trazabilidad**, sin aprobación retroactiva (X4 en 03) |
| R10 | Hay una inconsistencia entre el correo de aceptación (pide «el lugar») y el formulario (solo días y horas) que la Fase 1 no había detectado | Documentada en [08](08_CATALOGO_PLANTILLAS_CORREO_ACTUAL.md) (C01) y propuesta como LEV-R07 |

## 4. Lo que esta autorrevisión no hace

No revisa la corrección jurídica ni institucional de nada; no sustituye la lectura del resto de los artículos y anexos del Protocolo; no verifica los números de los documentos Word más allá de las historias citadas; y no ejecuta la aplicación. Las matrices 06 y 07 se contrastaron con el código, no con la aplicación en ejecución.
