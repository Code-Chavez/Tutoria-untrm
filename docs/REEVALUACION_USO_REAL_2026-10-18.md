# Reevaluación del SIT desde el uso real

Fecha: 18/10/2026. HEAD observado: `bb32349`. Entorno local http://localhost:5173, con base de demostración y datos acumulados de pruebas E2E. Contraste con `REVISION_USO_REAL_2026-10-17.md`. No se confunde esta revisión con aceptación estable o despliegue institucional.

## Dictamen

El proyecto sí representa la base del proceso real: preparación del periodo, asignación, solicitud, programación, seguimiento y derivación. La experiencia mejoró de forma comprobable respecto al corte anterior. No debe repetirse como pendiente todo el listado U01–U13 original.

Todavía hay problemas de continuidad de estados y consulta del siguiente paso, especialmente al cancelar una sesión vinculada. Recomiendo resolver R01/R02 antes de presentar el recorrido de atención como completo para la beta. Los demás hallazgos deben priorizarse con responsable y criterio de aceptación. No se puede afirmar que todos los roles, formatos, correos y RNF estén aceptados.

## Recorridos realizados

Se inició sesión por interfaz como estudiante, docente tutor, profesional de Psicología, coordinador y administrador. Se recorrieron inicio, solicitud propia, recuperación de borrador al cambiar de pantalla, sesiones propias, pendientes del docente, programación desde solicitud, solicitud con sesión vinculada, contador y recepción del servicio, asignación por ciclo, panel administrativo y pedido de lista de docentes.

No se crearon sesiones, derivaciones, cuentas ni solicitudes; no se cambiaron estados ni asignaciones, no se enviaron correos y no se cerró el periodo. Solo se escribió un borrador sintético local, se comprobó su recuperación y se descartó explícitamente; se cerraron formularios sin guardar. Login/logout generan sus registros habituales. No se modificó código del producto.

La inspección visual fue de escritorio; no se afirma nueva aceptación a 360/390 px. Decano y Vicerrectorado no se recorrieron con su cuenta en esta sesión; tampoco se verificaron todos los servicios ni casos vacíos, firma/exportación de cada anexo, permisos adversariales o SMTP real.

## Resultado frente a los hallazgos anteriores

| Hallazgo anterior | Estado actual observado |
|---|---|
| U01, solicitud a sesión/derivación | Mejorado: el docente tiene ambos botones y el formulario conserva estudiante y motivo. Hay enlace persistido en código y etiquetas en bandeja. Pendiente ciclo completo y consulta, R01/R02. No se ejecutó una nueva creación. |
| U02, orientación del estudiante | Mejorado: inicio muestra nombre del tutor, solicitudes y evaluación; formulario identifica al destinatario y avisa que habrá respuesta interna. Faltan acciones posteriores y verificar escenarios sin asignación. |
| U03, carga | Mejorado: se observó indicador accesible «Cargando tus sesiones…» y luego sesiones. No se reprodujo la pantalla sin explicación del corte anterior. No equivale a probar todos los errores ni medir latencia. |
| U04, prioridades | Verificado: «Por atender» abre aplicado; pendientes antiguos primero, búsqueda, antigüedad y conteos. |
| U05, móvil | Sin aceptación nueva. Escritorio legible; repetir móvil/zoom antes de cerrar este hallazgo. |
| U06, notificación de sesiones | Texto corregido: explica aviso interno y correo si está activo. No se comprobó entrega real ni nueva operación de programación. |
| U07, borradores | Verificado: texto sintético recuperado al volver, aviso de almacenamiento solo de pestaña y descarte funciona. Pruebas automatizadas de borradores aprobadas. |
| U08, escala de evaluación | Cambios presentes en código y suite de evaluación aprobada; no se volvió a completar el cuestionario por interfaz en esta sesión. |
| U09, contador del servicio | Verificado: «Por recibir: 1» abre `?estado=por-recibir` y muestra solo el caso enviado. |
| U10, lenguaje del servicio | Verificado: aspecto legible en lugar de `MENTAL_HEALTH_ANXIOUS`, sin HU-32; botón «Recibir caso». No se afirma barrido total de todos los textos. |
| U11, preparación institucional | Sigue parcial: coordinación muestra aceptación por ciclo y administrador conserva «Paso 5 Cierre de periodo» junto a la preparación. Falta resumen de preparación y separar finalización. |
| U12, vocabulario | Mejorado: menú «Atención a estudiantes», «Estudiantes», encabezado «Responsable» y etiquetas de roles comprensibles. Algunos textos aún dicen «enrutaremos». |
| U13, listas por tipo | Verificado: al elegir Docentes cambian título, explicación, columnas y enlaces a Carga de docentes. Falta relación más directa entre pedido recibido e importación. |

## Hallazgos actuales y acciones concretas

### R01 — Alta: sesión cancelada anunciada como programada

**Evidencia de interfaz:** en Mis sesiones del estudiante, la sesión de prueba identificada por el sufijo `mvcyn7k5` aparece Cancelada, con motivo «Limpieza de prueba E2E». En la bandeja del docente, la solicitud correspondiente «Apoyo en Álgebra para sesion E2E mvcyn7k5» aparece «Con sesión programada». Al abrirla dice «no hace falta crear otra atención para esta solicitud», y no ofrece Programar/Derivar.

**Código relacionado:** `TutoringRequestsInboxPage.tsx` calcula el texto solo a partir de `sessionId`; `TutoringRequestLinker.prepare` rechaza cualquier nueva vinculación si ya hay sessionId/referralId. No consulta el estado actual de la sesión para ese mensaje. `CancelSessionUseCase` cancela y notifica sin reflejar una continuación de la solicitud.

**Corrección esperada:** definir el ciclo de vida: mostrar «Sesión cancelada» con motivo y acceso al registro; permitir una continuación autorizada (reprogramación si el modelo la admite, nueva sesión sustituta conservando trazabilidad, o cierre con explicación). No borrar vínculos o crear duplicados silenciosamente. Criterio: cancelar una sesión vinculada no deja a docente/estudiante con estado engañoso ni sin siguiente paso. Re-probar cancelación, sustitución y concurrencia.

### R02 — Alta: historial del estudiante no muestra la atención vinculada

**Evidencia:** el historial propio lista solicitudes «En atención» para sesión/derivación de prueba sin vínculo, cita ni explicación de destino. La bandeja del docente sí distingue «Con sesión programada» y «Derivada a un servicio». En `MyTutoringRequestPage.tsx` el historial renderiza motivo, estado, responsable, fecha y responseNote, pero no la atención vinculada.

**Corrección esperada:** mostrar en la solicitud la cita administrativa y acceso a la sesión; para derivación, solo la información que DBU autorice compartir (servicio y siguiente paso), sin notas clínicas o expediente de terceros. Reflejar cambios/cancelación/cierre sin afirmar que «En atención» equivale a atención realizada. Verificar con estudiante dueño y otro estudiante. No ampliar permisos a notas internas para resolver esta mejora.

### R03 — Media: vínculos no navegables para el docente

En detalle de una solicitud vinculada se informa la existencia de sesión/derivación, pero no se ofrece «Ver sesión» o «Ver derivación». Debe poder abrirse el registro correcto desde allí, mantener contexto al volver y explicar un registro que dejó de estar disponible. Especialmente necesario para resolver R01. Es mejora de consulta; no crear otra atención automáticamente.

### R04 — Media: preparación del periodo sin resumen de lo pendiente

Coordinación ve ciclos con «Sin tutor» y varios «Pendiente», pero necesita recorrerlos para interpretar avance. Administración conserva cierre como Paso 5 tras asignación. Separar preparación y cierre; agregar checklist por escuela/periodo con listas, errores de carga, cuentas, estudiantes sin asignación y docentes que no aceptaron. Mostrar definición de cada contador para no confundir docentes disponibles, asignados y aceptados. No se constató ausencia de confirmación de cierre: el código sí la contempla y no se ejecutó esa operación.

### R05 — Media: duración anunciada fija en el formulario desde solicitud

Revisión estática: `TutoringRequestsInboxPage.tsx` declara `SESSION_MINUTES = 45` y lo pasa al formulario. Si el administrador cambia duración, la ayuda puede diferir del valor fijado por el servidor. Obtener duración efectiva de la misma fuente y comprobar parámetro no predeterminado. No se cambió el parámetro ni se reprodujo con una duración distinta durante esta revisión.

### R06 — Media: listas largas e historial sin acciones de consulta suficientes

La cuenta de prueba contiene muchas solicitudes y sesiones canceladas. El historial propio crece como lista completa y mezclar en una misma vista citas relevantes con muchos cancelados dificulta encontrar el siguiente compromiso. Añadir filtros o paginación, mantener próxima/en curso destacada y ofrecer acciones claras ante cancelación. La base de aceptación debe estar limpia/separada de pruebas automáticas; el volumen de datos E2E no es evidencia de actividad real de DBU.

En el inicio del estudiante se vio «Próxima sesión: —», mientras Mis sesiones tenía una «En curso». No es necesariamente error de fecha: la tarjeta puede contar solo futuras. Mejorar a «Tu próxima sesión / En curso» para conservar utilidad en el momento de acudir. Verificar regla de negocio y casos de borde con reloj controlado antes de clasificarlo como defecto funcional.

### R07 — Media: recepción de listas no conduce al archivo concreto

Ya se distingue correctamente Estudiantes/Docentes. Como siguiente mejora, permitir continuar desde un pedido recibido a su importación con tipo/escuela/periodo seleccionados y dejar relación auditable entre recepción y carga. No asumir que «Marcar recibido» significa archivo válido/importado. Definir política sobre archivo original y conservación; no enviar ni subir archivos reales sin autorización.

## Pruebas ejecutadas en esta revisión

Comando desde `client`: ejecución directa de Vitest de siete archivos existentes: `useDraft.test.tsx`, `TutoringRequestsInboxPage.test.tsx`, `MyTutoringRequestPage.test.tsx`, `referralInbox.test.ts`, `requestInbox.test.ts`, `DataRequestPage.test.tsx` y `EvaluationPage.test.tsx`.

**Resultado: 7 archivos aprobados, 76 pruebas aprobadas; duración 99,46 segundos.** Son pruebas de componentes/lógica y no acreditan todos los flujos reales ni invalidan R01/R02. No se ejecutó la suite E2E completa en este corte.

`docs/EVIDENCIA_E2E_v1.0.0-beta.1.md` informa 40/40 sobre `132d37f`, fecha 13/10; es evidencia histórica, no resultado actual del HEAD `bb32349`. Debe actualizarse con una corrida del candidato final después de corregir estos casos. No reutilizar ese resultado como aceptación de los cambios posteriores.

## Relación con requisitos, protocolo y beta

La implementación tiene módulos correspondientes al proceso tutorial; la presencia de módulos no certifica campos/firmas del protocolo. Continúa pendiente contrastar la conformidad de anexos y decisiones institucionales con evidencia de cierre, en lugar de asumir que los hallazgos del 12/10 permanecen abiertos o fueron todos resueltos.

Se encontró `docs/RENDIMIENTO_MEJORAS_2026-10-13.md`, que describe optimizaciones y mediciones posteriores a nuestra línea base; no repetir los tiempos antiguos como si describieran esta versión. Aquí no se repitió carga de 100 usuarios ni importación de 2000 filas. La paginación de interfaz no acredita paginación del servidor; `PrismaStudentRepository.findAll` sigue sin límites y la bandeja de derivaciones indica que obtiene todo para filtrar en cliente. Medir con volumen real antes de aceptar los RNF.

No se comprobó servidor UNTRM, SMTP institucional, entrega a buzón, restauración, piloto o aprobación PO. La fecha objetivo anterior del 15/10 ya pasó: registrar fecha real y estado de la candidata, sin afirmar despliegue por el nombre beta. El cierre de esta revisión no autoriza publicación.

## Orden recomendado

1. R01/R02/R03: cerrar la continuidad desde solicitud, incluyendo cancelación y consulta del estudiante.
2. R04/R05: preparación del periodo y consistencia de duración.
3. R06/R07: consulta con volumen y trazabilidad de recepción/importación.
4. Repetir aceptación del candidato: permisos por escuela/servicio/persona, móvil, formularios/formatos, SMTP de prueba y pruebas E2E actuales. La atención especializada debe revisarse también con los demás servicios.

No se asigna porcentaje de avance ni se afirma «todo correcto»: se separan observaciones verificadas, inspecciones de código y escenarios pendientes.
