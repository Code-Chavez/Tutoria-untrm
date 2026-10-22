# Protocolo, plan semestral y escenarios de operación real

Fecha: 18/10/2026. Código observado: `bb32349`. Objetivo: decidir qué conservar del plan y evaluar escasez de docentes y otras excepciones sin inventar obligaciones del protocolo. Documento de análisis; no cambia políticas de la UNTRM ni configuración del producto.

## Decisión sobre el plan semestral

**Conservar y simplificar. No es relleno.** El artículo 17.a del Protocolo N° 01-2024-UNTRM/DBU encarga al coordinador desarrollar el plan de trabajo para el proceso tutorial y contempla resolución de aprobación, asignación de docentes, recursos y cronograma. El Anexo 8 establece la estructura del plan semestral: introducción, datos generales, fundamentación, objetivos, público, metodología, cronogramas, recursos, presupuesto y otras consideraciones. Se inspeccionaron las páginas PDF 11 y 23 (numeración interna 9 y 21).

Su base normativa no demuestra que el formulario actual sea fácil ni que deba repetirse manualmente cada dato. Tampoco demuestra que la ausencia de plan deba impedir al estudiante pedir ayuda. El protocolo no exige literalmente que se introduzcan a mano todos los campos en una aplicación ni que aprobar el plan cree citas automáticamente.

Propuesta de experiencia:

1. «Preparar plan de tutoría de la escuela», una vez por escuela y periodo, con explicación de para qué sirve y responsable.
2. Prellenar escuela, periodo y responsables. Ofrecer plantilla editable o copiar plan anterior como borrador, revisando fechas, docentes y presupuesto. Nunca copiar aprobación o firma como si valieran para el nuevo periodo.
3. Capturar en pocos pasos objetivos/estudiantes a atender; actividades; docentes y disponibilidad; recursos/presupuesto. Conservar las diez secciones del Anexo 8 en el documento exportado, aunque la captura sea agrupada. Cualquier adaptación formal debe validarse con DBU.
4. Diferenciar borrador, presentado y evidencia de aprobación. El sistema actual interpreta la carga de la resolución como aprobación; eso es un mecanismo de registro, no una autoridad para aprobar. Registrar autor, fecha, número y alcance de la resolución, y verificar correspondencia con escuela/periodo/versión.
5. Conectar metas de actividades con ejecución y reporte: previsto, realizado y pendiente. No todos los textos del plan se convierten en citas; una charla grupal y una entrevista individual son actividades distintas.
6. Mostrar alertas administrativas de plan pendiente al responsable; no bloquear automáticamente acceso a ayuda por un trámite pendiente sin regla institucional explícita.

## Qué exige el protocolo y qué es decisión del proyecto

| Tema | Sustento y límite |
|---|---|
| Plan | Art. 17.a y Anexo 8. Debe conservarse la planificación y aprobación institucional. |
| Atención individual de estudiantes en riesgo | Art. 7.a: servicio obligatorio para estudiantes con riesgo académico y deserción. La tutoría grupal no sustituye toda esa atención individual. |
| Tutoría grupal | Art. 7.b: dos o más estudiantes; contempla colaboración de estudiantes destacados/egresados seleccionados por la escuela. Colaboración no equivale a sustituir al docente ni darles acceso a expedientes confidenciales. |
| Duración | Art. 15.c establece 45 minutos, individual o grupal. Hacerlo configurable no autoriza institucionalmente otra duración; una excepción requiere respaldo aplicable. |
| Tiempo y recursos del tutor | Art. 12.d y 17.b contemplan tiempo/recursos y apoyo de la facultad. No asumir disponibilidad ilimitada. |
| Detección | Art. 19: reporte de riesgo, solicitud del estudiante y del docente de asignatura. El proceso no puede depender únicamente de demanda voluntaria. |
| Derivación | Art. 21 incluye escuela, Psicopedagogía, Psicología, Asistencia Social y Salud. En emergencia médica exige atención inmediata, no esperar una cola ordinaria. |
| Seguimiento | Art. 22: tutores de ciclo y DBU en casos especializados. |
| Reasignación | Art. 24.b contempla reasignación de responsabilidades por la facultad. No automatizar sanción por silencio o falta de disponibilidad sin evaluación institucional. |
| Máximo dos ciclos por docente | Restricción observada en código. No se encontró ese número en el protocolo aportado; no presentarlo como artículo. Validar fundamento en otra disposición o reformular como política operativa autorizada. |
| Cupo de estudiantes, plazo para aceptar y horas semanales máximas | Pueden ser controles operativos útiles, pero sus valores requieren acuerdo. No derivarlos de la cantidad de filas del papel ni de parámetros existentes. |

Fuente: PDF oficial aportado en `C:/BRAYNI/UNTRM/Practicas/Brayni Chavez Caruajulca/R.C.U N°283-2024-PROTOCOLO DE TUTORÍA.pdf`. Se revisaron los artículos 6–25 por extracción, más visualmente 15–17 y Anexo 8. Las dos primeras páginas del PDF no tienen texto extraíble; no se afirma revisión integral de todas las disposiciones institucionales externas.

## Simulación ejecutada con código actual

Se creó `server/tmp/simular-realidad.cjs`: ejecuta clases reales con repositorios ficticios en memoria, sin conectar a PostgreSQL, crear personas, enviar correos ni cambiar asignaciones de la base. Los resultados describen comportamiento de componentes; no equivalen a una prueba E2E de aceptación ni representan personas reales.

| Caso ejecutado | Resultado observado | Evaluación |
|---|---|---|
| Nombrar docente antes de su aceptación | `SetCycleTutorUseCase` invoca aplicación a estudiantes con estado `SIN_SOLICITAR`. | Distinguir designación propuesta y tutoría operativa; decidir cuándo se activan responsabilidades y qué ve el estudiante. |
| Asignar un tercer ciclo al mismo docente con motivo | Rechazado: «no puede atender más de dos ciclos». | Con dos docentes para diez ciclos solo podrían cubrirse cuatro por este mecanismo. No eliminar el límite sin capacidad; tampoco atribuirlo al protocolo. |
| Docente rechaza; estudiante conserva tutorId | Estado RECHAZADA, pero `TutoringRequestRouter.resolve` devuelve al mismo docente como destinatario. | Brecha alta: falta alternativa/cola y estado coherente. `RespondTutorAcceptanceUseCase` registra rechazo y avisa por correo; no reasigna estudiantes. |
| Estudiante sin tutor | Se resuelve coordinación. | Respaldo útil; comprobar que coordinación esté activa y tenga capacidad de tramitar. |
| Sin tutor ni coordinador | Se resuelve un administrador DBU activo. | Respaldo útil; si no existe ninguno, la ruta no tiene destinatario. Hace falta supervisión del incidente y mensaje/canal acordado. |
| tutorId apunta a cuenta inactiva | Se devuelve ese tutorId sin verificar actividad en el router. | Brecha alta: validar destinatario elegible antes de prometer/enviar atención. La autenticación de cuentas inactivas no corrige el enrutamiento. |
| Dos respuestas de disponibilidad con el mismo horario | `validateAvailability` acepta cada respuesta por separado. | No se consulta agenda acumulada de otros ciclos en esa función. La programación sí comprueba choques de sesiones, pero hace falta distinguir horario común de atención de reserva exclusiva por ciclo y capacidad total por docente. |

Código contrastado: `CycleTutorUseCases.ts`, `TutorAcceptanceUseCases.ts`, `TutoringRequestRouter.ts`, `CreateTutoringRequestUseCase.ts`, `ScheduleSessionUseCase.ts`, `TutorValidation.ts` y `SaveWorkPlanUseCase.ts`.

Se ejecutaron además las suites existentes `CycleTutorUseCases`, `TutorAcceptanceUseCases` y `CreateTutoringRequestUseCase`: **3 suites y 42 pruebas aprobadas, 29,6 s**. Pasar esas pruebas no invalida las brechas detectadas: no cubren todas las combinaciones entre designación, rechazo y enrutamiento.

## Casos realistas adicionales y respuesta propuesta

Los siguientes son escenarios de diseño razonados, no ejecuciones contra usuarios ni nuevas exigencias institucionales.

| Escenario | Cómo debería adaptarse el sistema |
|---|---|
| 180 estudiantes, diez ciclos, solo dos docentes disponibles | Mostrar cobertura y déficit antes de asignar. Permitir agrupaciones/coberturas autorizadas según capacidad, conservando tutor responsable y ciclo del estudiante. Pedir decisión de facultad sobre déficit; no repartir a todos ficticiamente ni permitir carga ilimitada. |
| Docente de un ciclo no puede asumirlo | Registrar rechazo/motivo sin sanción automática, alertar a coordinación por bandeja además de correo y mantener cola de cobertura. Estudiante debe ver responsable de gestión, sin atribuir disponibilidad inexistente. |
| Docente no responde y el correo venció/no llegó | Mostrar «sin respuesta» y «correo fallido» como estados distintos, reintento controlado y canal alternativo de coordinación. No contar como aceptación ni como rechazo. Plazo a acordar. |
| Un docente puede atender dos ciclos pero solo tres horas semanales | Agenda de disponibilidad única por docente y periodo; asignaciones de ciclo consumen la misma capacidad, no duplican horas. Permitir excepciones razonadas y advertencias de saturación. |
| Un ciclo tiene 90 estudiantes y otro cinco | Mostrar cantidad y demanda estimada. «Un ciclo por docente» no es equilibrio de carga; permitir división en grupos/cotutoría formal si se autoriza, con responsables y confidencialidad definidos. |
| Pocos estudiantes solicitan tutoría | Incorporar campaña de bienvenida y sesiones grupales pertinentes, además del reporte de riesgo del art. 19. Medir convocados, inscritos, atendidos y pendientes; no inventar asistencia a quien solo fue invitado. |
| Estudiante de riesgo no pide ayuda | Crear trabajo de seguimiento para su tutor desde reporte validado; no esperar solicitud. Registrar intentos de contacto y acuerdos, sin diagnósticos automáticos. |
| Estudiante no tiene cuenta o no logra entrar | Personal autorizado registra solicitud/contacto a su nombre con origen y autor; recuperación/invitación por canal seguro y validación de identidad. No compartir cuentas ni claves comunes. |
| Docente se licencia a mitad de semestre | Cobertura temporal con motivo, fechas y aceptación; preservar autoría y expediente histórico; transferir/alertar pendientes y citas de forma revisable. No trasladar notas clínicas a personas ajenas. |
| Profesional de un servicio no está disponible | Cola visible para DBU, suplencia autorizada dentro del alcance y canal institucional alternativo. No cerrar caso ni enviarlo a otro servicio por conveniencia sin justificación. |
| Atención que requiere respuesta inmediata | Distinguir orientación ordinaria de canal urgente aprobado. En emergencia médica, el art. 21.e exige atención inmediata; la plataforma no debe presentarse como un canal de emergencia monitoreado si no lo es. No inventar teléfonos, disponibilidad ni criterios clínicos. |
| Plan aún no aprobado pero llega una solicitud | Mantener alerta administrativa a quien debe tramitarlo; atender según canal autorizado. El texto revisado no establece que el software deba bloquear toda ayuda hasta adjuntar PDF. |
| Se cancela una cita surgida de solicitud | Mantener vínculo y estado cancelado, permitir continuación trazable y notificar. No decir «con sesión programada» ni forzar una solicitud duplicada. Hallazgo reproducido en reevaluación anterior. |

## Ejemplo de capacidad, con supuestos explícitos

Supuesto ilustrativo: dos docentes con tres horas semanales cada uno, durante 16 semanas, sesiones de 45 minutos. Capacidad teórica de atención = 2 × 3 × 16 = 96 horas, equivalentes a 128 sesiones individuales de 45 minutos. Si se pretendiera una sesión individual para cada uno de 180 estudiantes, se necesitarían 135 horas: faltan 39, incluso antes de considerar inasistencias, documentación y coordinación. El protocolo revisado no fija aquí una frecuencia individual universal para los 180; este cálculo muestra una demanda hipotética, no incumplimiento acreditado.

Respuesta viable a validar: reservar capacidad individual para riesgo/seguimiento y usar tutoría grupal para necesidades comunes del resto, dejando capacidad de respuesta a nuevas solicitudes. La cantidad de grupos, sesiones por persona y priorización debe decidirse con facultad/DBU. Si la demanda supera capacidad, registrar déficit y solicitud de recursos; no ocultarlo aumentando cupos en pantalla. La colaboración estudiantil del art. 7.b puede apoyar actividades grupales, sin sustituir funciones profesionales o conceder acceso confidencial.

## Cambios propuestos por orden

1. **Elegibilidad del responsable:** activo, disponibilidad/aceptación según política, cobertura vigente; respaldo a coordinación/DBU y alerta cuando no hay capacidad.
2. **Estados operativos:** propuesto/designado, pendiente de respuesta, aceptado, rechazado, cobertura pendiente, reemplazo. No son todos nombres obligatorios; concretar una máquina de estados y migración que preserve historia.
3. **Disponibilidad y carga:** agenda por docente/periodo, demanda de estudiantes y riesgo, capacidad efectiva y sobrecarga visible; revisar límite rígido de dos ciclos con sustento institucional.
4. **Plan semestral sencillo pero completo:** plantilla/prellenado/borrador/copiar con revisión, aprobación verificable y metas conectadas a ejecución.
5. **Bandeja de pendientes institucionales:** docentes que no aceptan, correo fallido, estudiantes sin cobertura, seguimiento de riesgo y citas canceladas sin continuación.
6. **Pruebas de escenarios combinados:** rechazo tras designación; inactivación; tercer ciclo autorizado; horarios compartidos; falta de suplente; contacto de estudiante sin cuenta; plan pendiente y atención necesaria.

Decisiones a pedir a DBU: quién puede designar suplencias y excepciones, capacidad razonable, aceptación frente a designación formal, tratamiento de pendientes y horarios, canal urgente, modelo de grupos/cotutoría y formato de aprobación del plan. No convertir estas decisiones en opciones libres que cada usuario pueda usar para eludir el protocolo.
