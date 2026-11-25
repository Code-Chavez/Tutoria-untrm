# Auditoría funcional y preparación del piloto del SIT

Corte del 17 de noviembre de 2026 sobre `develop` en `918b0e4`. La referencia publicada es `v1.0.0-beta.3`. El entorno local de ensayo responde en el puerto 5174. El puerto 5173 estaba apagado al iniciar la revisión.

**Actualizado el 19 de noviembre de 2026** (`develop` en `ae2f68a`, `v1.0.0-beta.4` publicada, #330): las tablas siguen siendo las del corte del 17 y la sección «Seguimiento» dice qué se resolvió después.

El filtro de Estudiantes pasó sus 18 pruebas locales. En Chrome, con la cuenta de administración y los datos de ensayo, 2027-I devolvió cero matrículas y 2026-II devolvió 23. Los registros históricos incluyeron su ciclo de matrícula y la selección sobrevivió a la recarga en ambos casos. El recuento corresponde al entorno de ensayo.

## Hallazgos comprobados en el código o en los documentos

| Prioridad | Hallazgo | Efecto y criterio de cierre |
| --- | --- | --- |
| Alta | Estudiantes usa la matrícula y el ciclo del semestre elegido, pero la escuela y el tutor de la ficha actual. | Probar un estudiante que cambie de escuela o tutor entre dos semestres y decidir si la vista debe mostrar la situación de aquella matrícula o la actual. La autorización debe seguir aplicándose en el servidor. |
| Media | Estudiantes ofrece escuelas que pueden quedar fuera del alcance del tutor. | El servidor acota los resultados. El selector debe evitar opciones que siempre devuelvan vacío para esa cuenta, o explicar su alcance. |
| Media | Estudiantes pide la carga de tutores aunque la cuenta carezca de `students:write`. | La interfaz silencia el error y espera esa consulta durante la carga inicial. Condicionar la petición al permiso y conservar el listado principal aunque falle. |
| Media | «Todos los periodos» muestra el padrón general. | «Todos los periodos» puede leerse como «estudiantes con matrícula en algún semestre». Aclarar el significado y acordar si el semestre activo debe quedar preseleccionado. |
| Media | Pedidos por facultad y por escuela tienen claves de equivalencia separadas. | Se puede pedir toda la facultad y volver a pedir enseguida una de sus escuelas sin aviso de solapamiento. Definir cuándo advertir, manteniendo los reenvíos intencionales. |
| Media | Los pedidos de facultad quedan en el historial institucional. | La coordinación con alcance por escuela no ve que su escuela ya fue incluida. Acordar qué estado puede mostrarse sin exponer el resto del pedido. |
| Media | El guion de Plan semestral todavía tiene una parte ensayada mediante API. | El problema del menú y el foco inicial se corrigió. Falta cronometrar creación completa, validación y aprobación desde la interfaz con una persona que use el formulario por primera vez. |
| Media | Los documentos discrepan sobre el punto de partida. | El estado del piloto presenta beta.2 en cabecera y resultados posteriores, y las notas de beta.3 aún enumeran H10–H12 como pendientes. Consolidar versión, commit, estado y evidencia para el siguiente ensayo. |
| Media | Rastro de trabajo incompleto. | GitHub muestra abiertos #261 y #262 aunque sus cambios aparecen en beta.3. Revisar los criterios de esos issues antes de cerrarlos. |
| Baja | El historial de filtros tiene una decisión abierta. | En #259 queda por acordar qué debe restaurar Atrás dentro de una lista. Documentar el comportamiento acordado y aplicarlo en las vistas afectadas. |

## Seguimiento al 19 de noviembre de 2026

| Hallazgo del corte | Estado | Qué se hizo o quién decide |
| --- | --- | --- |
| Estudiantes mezcla matrícula del semestre con escuela y tutor actuales | **Mitigado** | #326: con un semestre elegido, los encabezados dicen «(actual)» y una nota aclara que solo el ciclo es del semestre. Guardar escuela y tutor por periodo (migración y revisión de autorización) queda **para después del piloto**; lo decide el usuario. |
| Escuelas fuera del alcance del tutor | **Resuelto** | #320: sin `students:write` el selector ofrece solo las escuelas de su lista. |
| Carga de tutores sin permiso | **Resuelto** | #320: no se pide ni se espera. |
| «Todos los periodos» muestra el padrón general | **Abierto** | Decidir si el semestre activo debe quedar preseleccionado o solo aclarar el texto. Decide el usuario o el PO. |
| Pedidos por facultad y por escuela sin aviso de solapamiento | **Resuelto** | #324: aviso confirmable dentro de la ventana de 10 minutos (valor provisional del proyecto). |
| Coordinación no ve pedidos de facultad que incluyen su escuela | **Resuelto** | #324: los ve sin correo, nota ni otras escuelas. |
| Guion de Plan semestral ensayado en parte por API | **Abierto** | Cronometrar la creación, validación y aprobación desde la interfaz con una persona que use el formulario por primera vez (necesita a esa persona). |
| Documentos discrepan sobre el punto de partida | **Resuelto** | #322 (línea base) y las notas de `v1.0.0-beta.4` (`docs/RELEASE_v1.0.0-beta.4.md`). |
| Rastro de trabajo incompleto (#261, #262) | **Resuelto** | Cerrados el 19/11 tras revisar sus criterios. |
| Historial de filtros (#259) | **Abierto** | Acordar qué restaura Atrás dentro de una lista. Decide el usuario o el PO. |

También se registraron H10 y H11 como corregidos (#314) y H12 como ensayado (#318). H9 (un docente por ciclo) sigue como decisión de producto del PO.

## Evidencia pendiente para el piloto y la salida estable

| Prioridad | Pendiente | Evidencia esperada |
| --- | --- | --- |
| Alta | Piloto con usuarios reales autorizados (#293). | Participantes, fecha, observador, tareas por rol, incidencias y aceptación. El ensayo interno acredita ejecución técnica. |
| Alta | Entorno institucional. | Servidor accesible, dominio, HTTPS, correo institucional probado con invitación y recuperación, monitoreo y restauración de un respaldo desde una copia externa. Obtener evidencia de TI. |
| Alta | Datos del piloto. | Base limpia y reproducible, con matrícula en el periodo de trabajo, al menos un año cerrado si se comparan periodos y cuentas apropiadas para cada tarea. El ensayo actual ya se modificó al cerrar 2026-II. |
| Alta para emisión oficial | Certificados (#232). | Plantilla, logos, autoridad, evidencias mínimas, número oficial, firma, entrega y conservación aprobados. |
| Alta para datos reales | Anonimato de evaluación, formatos de anexos y tratamiento de datos. | Decisión documentada de DBU y responsables institucionales, con revisión del alcance y datos visibles por rol. |
| Alta para salida estable | TT-101 (#291). | Revisar el alcance de la aceptación y completar evidencia sobre la versión que se desplegará. El documento revisado corresponde a `1398f9a` y describe un repaso de lecturas por rol. |
| Media | Ensayo de accesibilidad y compatibilidad. | Recorridos con lector de pantalla, Safari real, móvil real y Edge sobre la versión objetivo. El flujo de Firefox y WebKit ejecuta una selección de suites. |
| Media | Cobertura de procesos en CI. | El script de Chrome ejecuta una selección de suites. El flujo de Plan semestral (`e2e-06`) y administración (`e2e-08`) quedan fuera de esa selección. Registrar su ejecución para la candidata o incorporarlos cuando sean aptos para CI. |
| Media | Rendimiento y estabilidad. | Medir el inicio en frío, cargas principales y objetivo de 3 segundos en el entorno de despliegue. El ensayo documenta siete minutos de arranque y #256 sigue abierto por tiempos de espera del cliente. |
| Media | Decanato y variantes de servicio. | El ensayo escrito enumera DBU, coordinación, profesional de servicio, estudiante, docente y vicerrectorado. Agregar el recorrido de decanato y comprobar el uso de Salud y Asistencia Social además de Psicología. |
| Media | Capacidad y excepciones. | Acordar gestión de ciclos sin tutor y situaciones de rechazo, falta de respuesta o centros con pocos docentes. Revisar el resultado para el estudiante cuando falte cobertura. |
| Media | Aceptación y trazabilidad. | Vincular versión, resultados, manuales, issues y visto bueno a un corte único. Los manuales actualizados existen y el último ajuste de capturas de coordinación entró después de la etiqueta beta.3. |
| Baja | Automatización del flujo de trabajo (#236). | Completar la comprobación de detección de la habilidad en una sesión nueva de Claude Code si sigue siendo parte de los criterios del issue. |

## Fuentes

- [Estado del piloto y ensayos](PILOTO_ESTADO_PREPARACION_2026-11-13.md)
- [Notas de beta.3](RELEASE_v1.0.0-beta.3.md)
- [Revisión de seguridad TT-101](INFORME_SEGURIDAD_TT101_REVISION_2026-11-12.md)
- [Issues](https://github.com/Code-Chavez/Tutoria-untrm/issues)
- [Filtro por periodo](https://github.com/Code-Chavez/Tutoria-untrm/pull/286) y [sus pruebas](https://github.com/Code-Chavez/Tutoria-untrm/pull/305)
