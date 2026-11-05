# Decisiones que necesita la DBU: cobertura de tutores, plan semestral y atención urgente

Fecha: 18/10/2026 · Código observado: rama `develop` con los PR #156–#157 integrados y el PR #158 en revisión.
Base: `EVALUACION_PROTOCOLO_Y_ESCENARIOS_REALES_2026-10-18.md` (simulación con el código real y repositorios ficticios) y el Protocolo N.° 01-2024-UNTRM/DBU (R.C.U. N.° 283-2024).

**Para qué sirve este documento.** El sistema ya funciona en el caso normal. Fallan o quedan sin definir los casos en que *no hay quien atienda*. Cada tema pide una decisión que no es técnica: la toma la DBU (o la facultad) y el equipo de desarrollo la implementa después. Hasta entonces no se cambia el comportamiento de esos puntos.

## Cómo leer las etiquetas

| Etiqueta | Significado |
|---|---|
| **[PROTOCOLO]** | Lo dice el Protocolo; se cita el artículo o anexo. Se revisaron los artículos 6–25 y los Anexos 4, 8 y 9 (extracción de texto y revisión visual de las páginas del Anexo 8 y de los arts. 15–17). Las dos primeras páginas del PDF no tienen texto extraíble: no se afirma revisión de todas las disposiciones de la UNTRM. |
| **[CÓDIGO]** | Lo que hace el sistema hoy, comprobado en el código o en la simulación del 18/10. |
| **[PROPUESTA]** | Idea del equipo del proyecto. **No es una exigencia del Protocolo** y puede rechazarse o cambiarse. |
| **[VALOR A ACORDAR]** | Un número o plazo que el equipo **no inventa**; lo fija la DBU. |

> Regla de redacción: donde el Protocolo no dice algo, este documento lo dice así. Ningún plazo, teléfono ni número de este texto proviene del Protocolo salvo los citados con artículo.

---

## Resumen de decisiones pedidas

| N.° | Decisión | Quién decide | Urgencia |
|---|---|---|---|
| 1 | Qué pasa con las solicitudes mientras un ciclo no tiene tutor que acepte (rechazo, silencio, correo fallido) | DBU con la facultad/escuelas | Alta: hoy puede llegar a quien rechazó |
| 2 | Cuándo "se aplica" una designación a los estudiantes (al designar o al aceptar) | DBU | Alta |
| 3 | Disponibilidad, carga máxima, límite de ciclos por docente, suplencias | DBU y facultad | Alta |
| 4 | Forma del plan semestral en el sistema (qué es borrador, presentado, aprobado) | DBU (coordinación de escuela propone) | Media |
| 5 | Atención urgente y servicios sin profesional disponible | DBU y los servicios | Alta por riesgo, pero **depende de datos que solo la institución tiene** |

---

## 1. Docente que rechaza o no responde: ¿a quién llegan las solicitudes mientras tanto?

**Problema real.** Un ciclo queda sin tutor efectivo (el docente rechaza, no contesta, o el correo no llegó). Los estudiantes de ese ciclo siguen pudiendo pedir ayuda y hoy la solicitud puede quedar dirigida a quien dijo que no.

**Comportamiento actual.**
- [CÓDIGO] Al nombrar a un docente se le envía un correo con un enlace personal de un solo uso para aceptar o rechazar (vigencia = `INVITATION_TTL_HOURS`, el mismo valor de las invitaciones de acceso). Quedan los estados `SIN_SOLICITAR`, `PENDIENTE`, `ACEPTADA`, `RECHAZADA`.
- [CÓDIGO] Si rechaza: se registra `RECHAZADA` y se avisa por correo; **el estudiante conserva su `tutorId`**, así que la solicitud sigue yendo a ese docente (brecha confirmada en la simulación).
- [CÓDIGO] Si no responde o el enlace vence: se guarda la fecha de vencimiento del enlace, pero el estado sigue siendo `PENDIENTE`; no hay un estado "sin respuesta" ni un aviso en la bandeja.
- [CÓDIGO] Si el correo falla: a quien lo pidió se le dice en ese momento que no se pudo enviar y queda anotado en la bitácora (CYCLE_TUTOR_ACCEPTANCE_REQUESTED, "correo no enviado"), pero el estado guardado también es `PENDIENTE`; después no se distingue de "no contestó".
- [CÓDIGO, ya corregido en el PR #158] Si el tutor tiene la cuenta desactivada, o la coordinación no está activa o no tiene el rol, la solicitud pasa al siguiente destinatario válido; si no hay ninguno, el estudiante lo ve *antes* de enviar y el sistema no promete atención.

**Qué dice el Protocolo.**
- [PROTOCOLO] Art. 19: la atención parte del reporte de riesgo, de la solicitud del estudiante y de la del docente de asignatura; no depende solo de la demanda voluntaria.
- [PROTOCOLO] Art. 24.b: la facultad puede reasignar responsabilidades.
- [PROTOCOLO] No define plazos de aceptación ni qué hacer con las solicitudes durante una vacante.

**Propuesta recomendada.** [PROPUESTA]
1. Una solicitud **nunca** se dirige a un docente con designación rechazada o sin vigencia: va a la **coordinación de la escuela** y, si no la hay, a la DBU (misma cadena que ya existe para un estudiante sin tutor).
2. Estados distintos y visibles: *Designado (sin enviar)*, *Pendiente de respuesta*, *Aceptó*, *Rechazó (con motivo opcional)*, *Sin respuesta* (vencido el plazo), *Correo no entregado*. Hoy "sin respuesta" y "correo fallido" se confunden con "pendiente".
3. Bandeja de **"ciclos sin cobertura"** para la coordinación y la DBU, con alerta, el motivo y quién debe actuar. Sin sanción automática por rechazar o callar (art. 24.b: reasignación es evaluación institucional).
4. El estudiante ve siempre *quién gestiona su solicitud hoy* (la coordinación), no un tutor inexistente.
5. Reintento controlado del correo y un canal alternativo manual de la coordinación (llamar o avisar en persona) registrado en el sistema.

**Alternativas.**
- A. Mantener al tutor con rechazo y solo avisar a la coordinación (más simple, pero el estudiante sigue esperando a quien no atenderá).
- B. Liberar automáticamente a los estudiantes del ciclo al rechazar (más drástico: pierden su referencia hasta que se designe a otro).
- C. Mantener la designación y agregar un "tutor de cobertura" por ciclo (ver tema 3).
- Recomendación: propuesta 1–5, que se parece a C sin crear una figura nueva.

**[VALOR A ACORDAR]** Plazo para considerar "sin respuesta"; cuántos reintentos; quién tramita la vacante.

**Quién decide.** DBU junto con las escuelas profesionales; la facultad si hay reasignación (art. 24.b).

**Casos de aceptación.**
1. Docente rechaza → ninguna solicitud nueva del ciclo llega a él; llegan a la coordinación; el estudiante ve a la coordinación como responsable; la coordinación ve el ciclo en "sin cobertura".
2. Docente no responde en el plazo acordado → estado "Sin respuesta" visible; nadie lo cuenta como aceptación ni rechazo; la coordinación recibe el aviso en su bandeja, no solo por correo.
3. Correo rechazado por el servidor → estado "Correo no entregado", distinto de "Sin respuesta", con la acción "reenviar" o "avisar por otro medio".
4. Docente acepta después de haber estado "Sin respuesta" → vuelve a ser tutor y las solicitudes nuevas le llegan; las ya atendidas por la coordinación conservan su responsable.
5. No hay coordinación activa ni DBU → el estudiante ve *antes* de enviar que no hay quien reciba y no queda ninguna solicitud huérfana (ya cubierto por el PR #158).

---

## 2. Designación frente a aceptación: ¿cuándo se aplica la asignación a los estudiantes?

**Problema real.** Hoy son dos hechos separados (*nombrar* y *aceptar*) pero los estudiantes quedan asignados desde que se nombra. Si el docente después rechaza, los estudiantes ya vieron un tutor que no atenderá.

**Comportamiento actual.**
- [CÓDIGO] Nombrar a un docente aplica la asignación a los estudiantes del ciclo con aceptación `SIN_SOLICITAR` (comprobado en la simulación). El estudiante ve a su tutor desde ese momento.
- [CÓDIGO] El docente solo puede ser tutor de su propia escuela y activo; un tercer ciclo se rechaza (ver tema 3).

**Qué dice el Protocolo.**
- [PROTOCOLO] Art. 17.a: la coordinación desarrolla el plan e incluye la asignación de docentes.
- [PROTOCOLO] No distingue "propuesta de designación" de "tutoría operativa" ni exige la aceptación del docente por un medio concreto.

**Propuesta recomendada.** [PROPUESTA]
- **Designado ≠ operativo.** La designación queda *propuesta* hasta que el docente acepte o la coordinación la confirme por un medio autorizado (por ejemplo, resolución, correo del docente adjunto o acta).
- Mientras sea propuesta: los estudiantes **no** ven al docente como su tutor; las solicitudes van a la coordinación.
- Al aceptar o al confirmar la coordinación: se aplica la asignación y se notifica a los estudiantes con el nombre de su tutor.
- La coordinación puede **confirmar en nombre del docente** (con motivo y evidencia) si este aceptó por otro canal; queda en la bitácora.

**Alternativas.**
- A. Aplicar al designar (hoy) y aceptar solo informativo: más simple, pero repite el problema del tema 1.
- B. Aplicar solo cuando el docente acepta por el enlace: más estricto; depende del correo y de que el docente lo use.
- Recomendación: la propuesta, porque combina la seguridad de B con la salida manual que exige la operación real.

**[VALOR A ACORDAR]** Qué evidencia vale como aceptación fuera del enlace; si el estudiante recibe aviso al cambiar de tutor.

**Quién decide.** DBU.

**Casos de aceptación.**
1. Se designa a un docente → los estudiantes del ciclo siguen sin tutor visible; su solicitud llega a la coordinación.
2. El docente acepta por el enlace → los estudiantes ven a su tutor y reciben el aviso; las solicitudes nuevas le llegan a él.
3. El docente acepta por otro medio → la coordinación confirma con motivo; queda registrado quién lo confirmó y cuándo.
4. El docente rechaza tras haber sido designado → los estudiantes nunca llegaron a ver su nombre como tutor; el ciclo aparece en "sin cobertura".
5. Cambio de tutor a mitad de periodo → los estudiantes reciben aviso; el expediente conserva la historia (quién fue tutor y cuándo).

---

## 3. Disponibilidad, carga máxima, cobertura de varios ciclos y suplencias

**Problema real.** Con pocos docentes y muchos ciclos, la regla actual de "máximo dos ciclos" más la falta de una agenda única por docente no permite cubrir todos los ciclos ni medir la sobrecarga. Un ciclo con 90 estudiantes pesa igual que uno con 5.

**Comportamiento actual.**
- [CÓDIGO] Máximo **dos ciclos por docente**, ni siquiera por excepción; el segundo ciclo exige excepción con motivo. Con dos docentes disponibles para diez ciclos solo se cubrirían cuatro.
- [CÓDIGO] Parámetro `tutor_max_weekly_hours` (por defecto **10 horas semanales**, rango 1–40): tope de horas que el docente puede ofrecer al aceptar. Es un valor del proyecto, no del Protocolo.
- [CÓDIGO] La disponibilidad que el docente ofrece se valida respuesta por respuesta; no se suma entre ciclos del mismo docente. Sí se comprueba el choque entre sesiones al programar.
- [CÓDIGO] No hay figura de suplente ni de cobertura temporal.

**Qué dice el Protocolo.**
- [PROTOCOLO] Art. 15.c: sesión de **45 minutos**, individual o grupal.
- [PROTOCOLO] Arts. 12.d y 17.b: contemplan tiempo y recursos del tutor y apoyo de la facultad.
- [PROTOCOLO] Art. 7.a y 7.b: atención individual obligatoria para riesgo académico y deserción; la tutoría grupal es otro servicio (dos o más estudiantes) y no la sustituye.
- [PROTOCOLO] **No se encontró** en el Protocolo el límite de dos ciclos por docente, el cupo de estudiantes por tutor ni un máximo de horas. Hay que sustentar el límite en otra disposición o declararlo política operativa autorizada.

**Propuesta recomendada.** [PROPUESTA]
1. **Una sola agenda de disponibilidad por docente y periodo.** Cada ciclo asignado consume la misma capacidad; no se duplican horas.
2. **Mostrar cobertura y déficit antes de asignar:** estudiantes por ciclo, riesgo, capacidad efectiva en sesiones de 45 minutos y brecha. No ocultar el déficit aumentando cupos en pantalla.
3. **Límite de ciclos como política configurable con motivo**, no como regla rígida del código, con el sustento institucional escrito (hoy dice "dos" sin respaldo).
4. **Suplencia o cobertura temporal** con docente, motivo, fechas y aceptación; conserva el expediente y la autoría; no traslada notas clínicas a personas ajenas.
5. **Grupos y cotutoría solo si la facultad los autoriza,** con responsables definidos (tutoría grupal, art. 7.b). La colaboración de estudiantes destacados o egresados que menciona el art. 7.b no equivale a reemplazar al docente ni da acceso a expedientes confidenciales.

*Ejemplo ilustrativo del tipo de cuenta que el sistema mostraría (supuestos, no datos reales):* dos docentes × 3 h semanales × 16 semanas = 96 h = 128 sesiones de 45 min. Una sesión individual para 180 estudiantes serían 135 h: faltarían 39 h antes de contar inasistencias o gestión. El Protocolo revisado no fija una frecuencia individual universal, así que esto es una **demanda hipotética**, no un incumplimiento; sirve para mostrar por qué la capacidad debe verse antes de asignar.

**Alternativas.**
- A. Mantener el tope de dos ciclos (más fácil de explicar; deja ciclos sin cubrir).
- B. Quitar el tope y avisar solo por sobrecarga de horas (más flexible; riesgo de docentes saturados sin que nadie lo decida).
- C. Tope configurable, con excepciones aprobadas por la DBU y visibles en un panel de carga. **Recomendada.**

**[VALOR A ACORDAR]** Tope de ciclos y su sustento; tope de horas semanales (hoy 10 es un valor de configuración del proyecto); quién autoriza excepciones y suplencias; si se permiten grupos/cotutoría.

**Quién decide.** DBU y facultad; la coordinación de escuela propone.

**Casos de aceptación.**
1. Diez ciclos y dos docentes disponibles → el sistema muestra cuántos ciclos y estudiantes quedan sin cobertura y no permite creer que están cubiertos.
2. Un docente con dos ciclos y 3 h semanales → la capacidad es la misma bolsa de 3 h; se advierte saturación si la demanda la supera.
3. Tercer ciclo a un docente → se rechaza o se aprueba solo con autorización registrada, según lo que se decida; el mensaje cita la política (no el Protocolo si no lo dice).
4. Docente en licencia a mitad de periodo → cobertura temporal con fechas y aceptación; el expediente conserva autoría; los pendientes y las citas se revisan una por una.
5. Ciclo con 90 estudiantes frente a otro con 5 → se ve la diferencia de demanda; la división en grupos solo se habilita si fue autorizada.

---

## 4. Plan semestral simplificado, conservando el art. 17.a y el Anexo 8

**Problema real.** El plan es obligatorio en el Protocolo, pero llenarlo completo en pantalla cada semestre cuesta, y hoy subir la resolución se interpreta como "aprobado".

**Comportamiento actual.**
- [CÓDIGO] El plan se captura por secciones y se puede subir la resolución; cargarla marca el plan como aprobado. Eso es un **registro**, no una autoridad.
- [CÓDIGO] No hay copia del plan anterior como borrador, ni verificación de que la resolución corresponda a la escuela, el periodo y la versión.

**Qué dice el Protocolo.**
- [PROTOCOLO] Art. 17.a: la coordinación desarrolla el plan de trabajo; contempla resolución de aprobación, asignación de docentes, recursos y cronograma.
- [PROTOCOLO] Anexo 8: estructura en diez apartados (introducción, datos generales, fundamentación, objetivos, público, metodología, cronogramas, recursos, presupuesto, otras consideraciones).
- [PROTOCOLO] No exige que se digite a mano cada campo en una aplicación, ni que aprobar el plan cree citas, ni que la ausencia del plan impida pedir ayuda.

**Propuesta recomendada.** [PROPUESTA]
1. "Preparar plan de la escuela" una vez por escuela y periodo, con responsable, prellenando escuela, periodo y responsables.
2. Plantilla editable o **copiar el plan anterior como borrador**, revisando fechas, docentes y presupuesto. **Nunca** copiar la aprobación ni la firma.
3. Captura agrupada en pocos pasos (objetivos/estudiantes; actividades; docentes y disponibilidad; recursos y presupuesto), pero **el documento exportado conserva los diez apartados del Anexo 8.** Cualquier adaptación formal la valida la DBU.
4. Tres estados separados: **Borrador → Presentado → Con resolución registrada.** Se registra autor, fecha, número y alcance de la resolución y se verifica que corresponda a la escuela, el periodo y la versión.
5. Metas de actividades conectadas a ejecución: previsto, realizado, pendiente (una charla grupal y una entrevista individual son actividades distintas).
6. Alertas administrativas de "plan pendiente" para quien debe tramitarlo; **no se bloquea el acceso a ayuda** por un trámite pendiente sin regla institucional explícita.

**Alternativas.**
- A. Dejar el plan como adjunto (PDF) sin captura en el sistema: casi sin trabajo, pero se pierde la conexión con las metas.
- B. Captura completa de todos los campos (como hoy): más fiel, más costosa para quien llena.
- Recomendación: la propuesta (captura agrupada + exportación fiel al Anexo 8).

**[VALOR A ACORDAR]** Si "resolución registrada" equivale a "aprobado" para el sistema; qué roles pueden registrarla; si el plan pendiente genera solo alerta o alguna restricción (el equipo recomienda solo alerta).

**Quién decide.** DBU; la coordinación de escuela revisa la usabilidad.

**Casos de aceptación.**
1. La coordinación inicia el periodo → "Preparar plan" aparece con escuela y periodo ya llenos y puede copiar el anterior como borrador.
2. Se copia un plan aprobado → el nuevo queda en Borrador, sin resolución ni firma.
3. Se exporta → el documento contiene los diez apartados del Anexo 8 aunque la captura sea agrupada.
4. Se carga una resolución de otro periodo o escuela → el sistema avisa que no corresponde y no marca el plan como con resolución.
5. Plan pendiente y llega una solicitud → la atención sigue; la coordinación ve la alerta administrativa.

---

## 5. Atención urgente y servicios sin disponibilidad

**Problema real.** Si un estudiante está en una situación que no puede esperar, o si el servicio al que se deriva no tiene profesional disponible, el sistema no debe aparentar que hay respuesta inmediata.

**Comportamiento actual.**
- [CÓDIGO] Las solicitudes y derivaciones son colas ordinarias con estados; no hay un canal urgente ni un indicador de gravedad.
- [CÓDIGO] Una derivación queda en el servicio que se eligió; la DBU puede ver el seguimiento de todos los servicios.
- [CÓDIGO] No hay suplencia entre profesionales ni aviso cuando un servicio no tiene a nadie activo.

**Qué dice el Protocolo.**
- [PROTOCOLO] Art. 21: derivación a escuela, Psicopedagogía, Psicología, Asistencia Social y Salud.
- [PROTOCOLO] Art. 21.e: en emergencia médica se exige **atención inmediata** (no esperar una cola ordinaria).
- [PROTOCOLO] Art. 22: seguimiento por tutores de ciclo y DBU en casos especializados.
- [PROTOCOLO] No define teléfonos, horarios de guardia ni plazos de respuesta.

**Propuesta recomendada.** [PROPUESTA]
1. **Aviso visible y permanente** en el sistema: este no es un canal de emergencias. Si alguien está en peligro, debe usar el canal institucional vigente (**lo define y entrega la DBU**; el equipo no inventa números ni correos).
2. **Marca de "requiere atención prioritaria"** en solicitudes y derivaciones, que sube el caso en la bandeja y avisa a la DBU, sin promesas de plazo. Es un orden de trabajo, no una evaluación clínica.
3. **Servicio sin disponibilidad:** la derivación queda visible para la DBU como "servicio sin profesional activo", con suplencia autorizada dentro del alcance del servicio; no se cierra ni se envía a otro servicio por conveniencia sin justificación.
4. La **supervisión de colas** (casos sin recibir, casos de riesgo sin sesión, citas canceladas sin continuación) vive en una bandeja institucional.
5. El sistema nunca presenta confirmaciones como atención efectiva ("recibido por el sistema" ≠ "atendido").

**Alternativas.**
- A. Solo el aviso de que no es canal de emergencia (mínimo, sin cambios de proceso).
- B. Aviso + marca prioritaria + bandeja de supervisión. **Recomendada.**
- C. Un canal de emergencia dentro del sistema (no recomendada mientras no exista una guardia que lo monitoree).

**[VALOR A ACORDAR]** Texto exacto del aviso y a dónde dirige; quién monitorea la marca prioritaria y en qué horario; qué profesional suple a cuál; si la marca la puede poner cualquier docente o solo ciertos roles. **Estos datos solo los tiene la DBU.**

**Quién decide.** DBU y los servicios (Psicología, Salud, Asistencia Social, Psicopedagogía).

**Casos de aceptación.**
1. Cualquier pantalla de solicitud o derivación muestra el aviso de que no es un canal de emergencias, con el canal que defina la DBU.
2. Un caso marcado como prioritario aparece primero en la bandeja correspondiente y la DBU recibe aviso; la pantalla no promete plazo.
3. Un servicio sin profesional activo → la DBU lo ve en su bandeja y puede autorizar suplencia; el caso no desaparece.
4. Una derivación recibida por el sistema se muestra como "recibida", nunca como "atendida", hasta que el servicio la registre.
5. Ningún texto de la aplicación contiene teléfonos o correos inventados.

---

## Qué ya está hecho y qué no depende de estas decisiones

Hecho sin necesitar decisión institucional:
- La solicitud del estudiante ya no se dirige a un tutor con cuenta desactivada ni a una coordinación inactiva o sin rol; si no hay nadie, el estudiante lo ve antes de enviar y no se le promete atención (PR #158).
- La pantalla "Pedir listas" distingue estudiantes de docentes; el vocabulario de tarea ("estudiantes", "responsable") reemplazó términos administrativos (PR #157).
- Borradores del estudiante, leyenda de la escala de evaluación y etiquetas claras (PR #156).

Pendiente por cuenta del equipo, **sin** esperar a la DBU:
1. Prueba combinada de escenarios (rechazo tras designación, inactivación, horarios compartidos, estudiante sin cuenta).
2. Bandeja de "citas canceladas sin continuación" y de correos de invitación fallidos (solo visibilidad, sin cambiar reglas).
3. Revisión con teclado y lector de pantalla; revisión en otros navegadores y móvil.

Todo lo demás de este documento se implementa **después** de cada decisión, empezando por el tema 1 y el 2, que comparten el modelo de estados.

## Registro de decisiones (para llenar)

| N.° | Decisión tomada | Fecha | Quién la tomó | Respaldo (acta, resolución, correo) |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |
