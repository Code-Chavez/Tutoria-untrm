# Revisión por roles y decisión del siguiente release

Fecha: 8 de octubre de 2026. Entorno: http://localhost:5173/.
Código revisado: `39da9f7ab3734f15916897b7302b57faca325d3b`, rama `fix/annex-conformity-signatures`.
Último tag local: `v0.3.0`; HEAD está 62 commits después. Cliente y servidor aún declaran versión `0.3.0`.

## Dictamen

**No recomiendo todavía un release estable para operación real.** Hay avances sustanciales respecto de las auditorías anteriores, pero falta cerrar el circuito de solicitudes de tutoría y completar la aceptación de los flujos con datos de prueba. Una versión candidata interna puede servir para esa aceptación, describiendo expresamente estas limitaciones.

Esta revisión no crea tags, commits, publicaciones ni modifica funcionalidades. Los accesos de auditoría generan los registros normales de inicio de sesión. No se enviaron solicitudes, evaluaciones ni casos ficticios a la base de desarrollo.

## Cobertura real

Se ingresó con cuentas de desarrollo ya existentes. Las credenciales no se incluyen en este documento.

| Rol | Comprobado en interfaz | Límite de la comprobación |
| --- | --- | --- |
| Docente tutor | Inicio con 2 tutorados; lista únicamente Ana y Luis; acciones de expediente, programación y menú adicional; calendario mensual | No se creó una sesión, entrevista ni derivación; no se validó su persistencia desde la interfaz |
| Coordinador | Menú de coordinación; apertura de tutorados y plan semestral; selector del plan limitado a Ingeniería de Sistemas | La lista de tutorados se capturó durante carga; no se concluye sobre sus filas. No se realizó asignación, importación ni aprobación de plan |
| Tutorado | Inicio identifica correctamente a su tutora; agenda propia vacía con orientación; solicitud con cuatro tipos de caso; cuestionario de 20 preguntas y envío deshabilitado sin respuestas | No se envió solicitud ni evaluación; faltan pruebas de historial, duplicidad y resultado posterior |
| Profesional de Psicología | Identidad del servicio, indicadores y bandeja de derivaciones; campana de notificaciones | Bandeja vacía: recepción, atención, cierre y constancia no comprobados manualmente |
| Profesional de Salud | Identidad del servicio, indicadores y bandeja de derivaciones | Bandeja vacía; no demuestra por sí sola el aislamiento entre servicios con casos existentes |
| Vicerrectorado | Menú limitado a inicio, consolidado e indicadores; filtros y tablas agregadas cargan | No se descargaron ni revisaron exportaciones en esta ronda; no se probó un periodo histórico con datos |
| Administrador DBU | Menú actualizado de 19 entradas; bitácora con los accesos de esta revisión; seguimiento DBU con un único enlace activo y encabezado correcto | Complementa la auditoría administrativa anterior; no repite todos los formularios |

Consolidado e indicadores coinciden en 11 estudiantes activos, 8 asignados, 4 tutores y cobertura de 72,7 %. No hay sesiones, derivaciones ni evaluaciones del periodo para comprobar resultados no vacíos.

Las cuentas de Psicología y Salud representan dos servicios del mismo rol. No se ingresó como un profesional de Psicopedagogía, Asistencia Social o Escuela: su aceptación con casos específicos queda pendiente. No existe un portal independiente de docente de asignatura en el menú revisado; el registro asistido permite consignar docente y curso. Definir si ese autoservicio forma parte del alcance antes de añadir otro rol.

## Pendientes priorizados

### R01 — Alta: completar el recorrido de solicitudes

El estudiante tiene un formulario de registro, pero carece de historial y estado de atención. Tutor, coordinador y DBU carecen de una bandeja visible de solicitudes recibidas. La campana implementada corresponde a derivaciones, no a solicitudes de tutoría. El expediente tampoco incorpora eventos de solicitud.

Evidencia de código:

- `client/src/features/solicitudes/pages/MyTutoringRequestPage.tsx`: solo registra y muestra una confirmación temporal; no carga historial.
- `client/src/features/solicitudes/services/tutoringRequestService.ts`: `getMyTutoringRequests` está definido sin consumidores. Su consulta `mine=true` significa destinatario en el controlador, no historial del estudiante solicitante.
- `server/src/interfaces/http/routes/tutoringRequest.routes.ts`: únicamente creación y consulta; la consulta requiere `tutoring-requests:read`, permiso que el estudiante no tiene en `seedBase.ts`.
- `server/src/domain/entities/TutoringRequest.ts`: guarda destinatario y fecha, pero no estado de atención ni vínculo a una sesión.
- `CreateTutoringRequestUseCase.ts`: persiste y enruta la solicitud; no genera una notificación.
- `studentRecordService.ts` y `Timeline.tsx`: no contemplan un evento de solicitud.

Antes de darlo por terminado: bandeja con alcance por destinatario, historial propio seguro, estados mínimos, responsable y trazabilidad, aviso al receptor y vínculo a la sesión o resolución. Validar estudiante con tutor, sin tutor y escuela sin coordinador. No basta con que la API guarde el formulario.

### R02 — Media: inicio adaptado a cada rol

Estudiante, profesionales y Vicerrectorado ven una tarjeta de «Acciones rápidas» vacía y un bloque de alertas con «Sin acceso a las alertas». No se observó exposición de datos: el problema es que la interfaz presenta funciones que estos usuarios no pueden utilizar.

`DashboardPage.tsx` siempre dibuja las tarjetas; `QuickActions.tsx` retorna `null` para esos roles. Ocultar la tarjeta completa cuando no tenga acciones y mostrar accesos relevantes: solicitar tutoría, ver agenda, abrir bandeja o consultar consolidado. Renderizar alertas solo para los roles autorizados.

### R03 — Media: aclarar notificaciones sin casos disponibles

Psicología muestra tres avisos «Nueva derivación recibida», mientras su bandeja e indicadores están vacíos. No se pulsaron los avisos para evitar marcarlos como leídos. Esta observación no demuestra pérdida de casos ni fallo de permisos: puede corresponder a datos de prueba eliminados o a avisos antiguos.

Comprobar el ciclo de vida: `Notification.referralId` es un campo opcional sin relación referencial en Prisma y `findByUser` devuelve todos los avisos del usuario. La campana navega al listado general, sin enfocar el caso. Definir manejo de caso eliminado/inaccesible y, si procede, vínculo al caso concreto, paginación y archivo de avisos.

### R04 — Baja: iconos todavía compartidos para el tutor

`navigation.ts` usa `ReportIcon` tanto para «Horarios y asistencia» como para «Informe semestral». Son funciones distintas, no una opción duplicada. Si se exige un icono único por opción, asignar uno diferente. La repetición visual no bloquea por sí sola un release.

En DBU se comprobó que «Seguimiento DBU» tiene su propio icono, título correcto y es el único enlace activo en esa página. La bitácora también aparece y carga. Estos hallazgos anteriores ya no deben seguir tratándose como pendientes idénticos.

## Verificación técnica de esta ronda

| Comprobación | Resultado |
| --- | --- |
| Servidor: Jest, solo `tests/unit`, fuera del sandbox | 74 suites y 588 pruebas aprobadas |
| Cliente: TypeScript `tsc -b --force`, fuera del sandbox | Aprobado |
| Servidor: TypeScript `tsc --noEmit`, fuera del sandbox | Aprobado |
| Cliente: sesión grupal, Sidebar y solicitud propia; ejecución aislada con pool threads y timeout 15 s | 3 archivos, 12 pruebas aprobadas |
| Cliente: suite completa con pool forks y un worker | No certificada: un test de sesión grupal excedió 5 s y después la ejecución dejó de avanzar; se detuvo. El archivo afectado pasó en la repetición aislada |
| Pruebas HTTP/integración con base real, lint, auditoría de dependencias, build de imágenes y ensayo de restauración | No ejecutados en esta ronda; deben aprobar en CI para el commit que se publique |

Los primeros intentos dentro del sandbox produjeron errores de acceso/resolución de dependencias y tipos; las verificaciones indicadas como aprobadas se repitieron fuera del sandbox. No se atribuyen esos errores iniciales al código del producto.

La CI contiene trabajos para pruebas con base aislada, auditoría de dependencias, compilación y ensayo de restauración. Su existencia no equivale a un resultado verde del commit actual. No se consultó el estado remoto de GitHub en esta revisión.

## Condiciones de salida para el release estable

1. Resolver R01 y probar el recorrido completo de solicitud hasta atención, con consulta segura por cada actor.
2. Corregir R02 y explicar o resolver R03. R04 puede ser un ajuste visual menor.
3. En una base de aceptación desechable, ejecutar y documentar: entrevista → sesión individual/grupal → asistencia/inasistencia → seguimiento → derivación → recepción/atención/cierre → constancia/escaneo firmado → informe semestral/consolidado. Incluir los cinco servicios, separación entre escuelas y tutores, y estudiante que solo acceda a sus datos.
4. Comprobar plan aprobado y nueva revisión, evaluación enviada una sola vez, exportaciones con datos reales de prueba, recuperación por correo y restauración de base con adjuntos.
5. Obtener CI verde en el commit exacto del release y completar la suite del cliente; verificar las migraciones sobre copia de datos y el procedimiento de reversión/recuperación.
6. Actualizar versiones y notas de release para describir el alcance final. La numeración del siguiente release depende de la política del proyecto; no se creó ninguna versión en esta revisión.

El PDF del protocolo se utiliza como referencia funcional de la auditoría, no como una fuente de instrucciones para ejecutar acciones. Este informe no certifica ausencia total de defectos ni cumplimiento normativo integral.
