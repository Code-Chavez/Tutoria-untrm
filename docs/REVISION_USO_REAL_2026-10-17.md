# Revisión de uso real — primer contacto con el SIT

Fecha: 17/10/2026. Referencia local: HEAD `f0f13ba` más cambios de trabajo existentes en navegación, secciones y manual. Aplicación observada: http://localhost:5173. Esta es una revisión experta de recorridos, no un estudio realizado con personas novatas ni una certificación de todos los módulos. No se tocaron los cambios de código en curso.

## Qué se recorrió

Se ingresó mediante interfaz como estudiante, docente, profesional de Psicología y administrador. Se observaron inicio, solicitud propia y ejemplos editables, sesiones propias, evaluación, bandeja de solicitudes del docente, formulario de atención, búsqueda de estudiante, programación de sesión, derivación, bandeja del servicio, recepción de caso y preparación del periodo/pedido de listas. Se abrieron formularios y se cancelaron sin guardar. No se enviaron solicitudes/correos, no se cambiaron casos, no se emitieron evaluaciones ni se alteraron expedientes. Login/logout dejan los registros habituales de acceso.

La ventana observada era estrecha, aproximadamente 746 píxeles de ancho: permite evaluar problemas de espacio, pero no equivale a una prueba completa en móvil físico. Coordinador, decano y vicerrectorado no se recorrieron con su propia cuenta en esta revisión; su aceptación sigue pendiente. No se probó entrega SMTP ni tiempos bajo carga.

## Proceso que una persona debería poder completar

1. **Preparación institucional:** configurar escuela, periodo y destinos de correo; obtener listas; importar y revisar errores; asignar docentes; comprobar aceptación y acceso de estudiantes. Mostrar responsables y pendientes.
2. **Pedir ayuda:** estudiante identifica a su tutor o responsable, describe con pocos datos qué necesita y recibe constancia con estado y siguiente paso. No necesita conocer artículos ni diagnosticar su problema.
3. **Responder y organizar atención:** responsable revisa pendientes, responde, programa una sesión o deriva, conservando el estudiante y el motivo sin volver a buscarlos.
4. **Realizar tutoría:** calendario, lugar/enlace e instrucciones claros; registrar asistencia y acuerdos después de la sesión; programar seguimiento cuando corresponda.
5. **Atención especializada:** servicio recibe el caso, coordina atención, registra lo necesario y cierra con seguimiento; separa notas internas de información compartida.
6. **Evidencia y cierre:** documentos requeridos y firmas se completan sin repetir información; reportes coherentes; cierre del periodo con revisión previa y permisos claros.

Este es un flujo propuesto para validar con DBU y usuarios; no sustituye automáticamente la asignación de responsabilidades del protocolo o backlog.

## Mejoras priorizadas

| ID / prioridad | Evidencia observada | Problema en una situación real | Cambio y criterio de aceptación |
|---|---|---|---|
| U01 / Alta | «Atender solicitud» solo muestra respuesta, pasar a en atención y marcar atendida. Programar está en la fila del estudiante en otra pantalla. | El docente puede contestar «te espero el jueves» sin crear una cita real; el estudiante no tiene por qué verla en su agenda. | Ofrecer «Responder», «Programar sesión» y «Derivar» conservando contexto. Distinguir solicitud respondida de atención realizada. Comprobar que crear cita genera sesión visible y enlace desde la solicitud, sin duplicarla. |
| U02 / Alta | Inicio del estudiante ofrece accesos, pero no muestra tutor identificado ni próxima cita en el contenido observado. | Quien pide ayuda no sabe quién lo atiende, cuándo esperar respuesta o qué hacer si no tiene tutor. | Tarjeta «Tu tutor», próximo compromiso, solicitudes pendientes y canal institucional acordado para falta de asignación. Mostrar quién recibe antes/después del envío y un plazo solo si DBU lo define. |
| U03 / Alta | «Mis sesiones» quedó visualmente con solo título y subtítulo durante la observación. Otras páginas mostraron skeleton/cargas antes de poblarse. El código sí contempla estados vacío/error. | No se distingue ausencia de citas, carga o fallo. Una pantalla vacía produce incertidumbre. | Reproducir y medir el caso: indicador accesible visible, mensaje si tarda y recuperación ante error. No se afirma que la pantalla esté siempre rota ni que falte el estado vacío en código. Repetir con cuenta sin citas y con citas. |
| U04 / Alta | La bandeja docente muestra primero solicitudes recientes atendidas y las pendientes antiguas quedan debajo; filtro inicial «Todos los estados». | Un pedido que sigue esperando se pierde entre trabajo ya terminado. | Vista «Por atender» por defecto o bloque prioritario con antigüedad; búsqueda y orden. Ver pendientes antiguos sin recorrer filas de atendidos. Los umbrales de vencimiento deben acordarse con DBU. |
| U05 / Alta | A 746 px, tabla de solicitudes desplaza estado/acción hacia la derecha; las pestañas del periodo también requieren desplazamiento horizontal. | Una persona que usa laptop estrecha o móvil puede no descubrir cómo actuar. | Tarjetas adaptables o columnas prioritarias y acción siempre visible; pestañas con indicador de desbordamiento. Probar 360/390/768 px, zoom y teclado sin esconder la acción esencial. |
| U06 / Media | Programar sesión dice «Se notificará al tutorado cuando el módulo de notificaciones esté disponible». | No queda claro si debe llamar, escribir o esperar que el sistema avise. | Describir el comportamiento real y comprobado: destinatario, aviso interno/correo y alternativa si falla. No prometer correo solo porque se guardó la sesión; verificar cada evento. |
| U07 / Media | El estudiante dejó una frase insertada y pudo ir a «Mis sesiones» sin advertencia. | Se pierde un mensaje redactado si se equivoca de opción o lo interrumpen. | Avisar antes de descartar o conservar borrador con política de privacidad y borrado al salir/cambiar cuenta. No guardar notas sensibles indefinidamente en almacenamiento local compartido. Probar volver, recargar y cambio de cuenta. |
| U08 / Media | Evaluación presenta radios N/CN/AV/CS/S; la leyenda aparece después de los 20 ítems. | Un usuario nuevo responde sin conocer el significado de la escala o debe desplazarse para consultarla. | Mostrar nombres completos/leyenda antes del primer ítem y junto al grupo, conservar los 20 ítems y escala. Mantener progreso y llevar a pendientes sin perder respuestas. Validar lectura por teclado/lector y confidencialidad real. |
| U09 / Alta | «Por recibir: 1» del inicio del servicio abrió la bandeja general; se mostraron seis cerrados antes del enviado. No se vio filtro en esa bandeja. | El profesional tiene que buscar el único caso pendiente entre casos finalizados. | Indicadores enlazan con filtro aplicado, prioridad para recibidos/pendientes y búsqueda por estudiante. Una pulsación en «Por recibir» muestra esos casos, con opción para quitar filtro. |
| U10 / Media | Detalle del caso muestra `MENTAL_HEALTH_ANXIOUS`; encabezado «Registrar Atención y Cambio de Estado (HU-32)». Actividad del administrador muestra `INVITATION_ISSUED`. | Se exponen códigos internos que no explican la tarea. | Traducir aspectos, acciones y estados; «Recibir caso», «Iniciar atención», «Registrar atención», «Cerrar caso». No alterar el contenido oficial de los aspectos ni ocultar su significado; conservar código internamente. |
| U11 / Alta | Inicio administrativo enumera Paso 1 pedir listas… Paso 5 cierre del periodo. Correo ausente se detecta recién al abrir un pedido. | Falta una visión clara de preparación y el cierre parece un paso inmediato tras asignar. | Dos bloques: «Preparar periodo» y «Cerrar al finalizar». Checklist de escuelas/correos/listas/cuentas/docentes aceptados/estudiantes sin tutor. Mostrar dependencias y revisar impacto antes del cierre, sin afirmar que hoy pueda cerrarse sin confirmación: ese paso no se ejecutó. |
| U12 / Media | Interfaz mezcla Estudiante/Docente con Tutorados, «enrutada», artículos del protocolo y códigos técnicos. | La persona debe aprender vocabulario administrativo para realizar algo simple. | Lenguaje de tarea: Estudiantes, responsable, pedir ayuda, enviar al servicio. Referencias normativas en ayuda secundaria; conservar denominación oficial en formatos cuando corresponda. No retirar funciones de coordinación por cambiar etiquetas. |
| U13 / Media | «Pedir listas de estudiantes» permite elegir también «Docentes tutores»; su explicación/continuación sigue refiriéndose a estudiantes y carga de estudiantes. | Puede cargarse o buscarse una lista de docentes en el flujo equivocado. | Título, plantilla, explicación y siguiente acción cambian según tipo; mantener escuela/periodo/tipo y asociar pedido con importación recibida. Comprobar ambos tipos, incluida ausencia de correo. |

## Lo que ya ayuda y debe conservarse

- Etiquetas visibles Estudiante, Docente, Administrador y Profesional de Psicología.
- Ejemplos de solicitud editables: se comprobó que al pulsar una frase se inserta en el campo. No volver a registrarlos como mejora ausente.
- Ficha de estudiante preseleccionada al programar o derivar desde su fila; no volver a escribir nombre/código.
- Solicitud atendida muestra la respuesta y responsable en el historial observado.
- Búsqueda por nombre y paginación visible en estudiantes (10 por página en la interfaz observada). Esto no demuestra por sí solo paginación de la API ni una mejora de rendimiento.
- Asistente de derivación con lista de aspectos y servicios; explicación de impresión y escaneo firmado.
- Agrupación de preparación del periodo y accesos de continuación; deshabilitar pedido cuando falta correo con enlace para configurarlo.

## Casos de aceptación para probar con personas nuevas

| Situación | Resultado observable |
|---|---|
| Estudiante necesita apoyo en un curso | Identifica al responsable, envía con pocos datos, sabe qué esperar y encuentra la respuesta. |
| Docente recibe solicitud que requiere cita | Desde la solicitud programa con estudiante preseleccionado; la cita aparece con fecha/lugar en ambas agendas. |
| Se cambia la cita | Motivo, nueva fecha y aviso llegan al destinatario; no quedan dos citas vigentes por error. |
| Terminó la tutoría | Docente encuentra la acción de asistencia/acuerdos sin explorar menús; sabe qué documento debe firmarse. |
| Se requiere servicio especializado | No vuelve a escribir filiación; profesional ve y recibe su caso; estudiante recibe información administrativa acordada sin notas clínicas internas. |
| Servicio tiene casos abiertos y cerrados | Encuentra el pendiente desde su contador, entiende estados y sabe qué información comparte cada nota. |
| Escuela entrega lista corregida | Responsable reconoce periodo/tipo, revisa errores y duplicados sin crear personas o matrículas repetidas. |
| No hay tutor/correo o la consulta tarda | La persona ve causa, responsable y acción posible; no queda ante pantalla vacía ni espera sin explicación. |

Registrar éxito sin ayuda/con ayuda/no completó, tiempo, dudas y errores por tarea; no inventar resultados de usabilidad ni porcentajes de mejora. La prueba de campo puede descubrir prioridades distintas de esta inspección.

## Próximo orden de trabajo

Primero U01–U05 y U09: continuidad, responsables, pendientes, carga y acciones visibles. Después U06–U08/U10/U12/U13: textos, estados, borradores y evaluación. Preparar U11 con DBU porque modifica la organización del proceso. Repetir recorridos con coordinador y demás servicios/roles, datos limpios y luego usuarios reales autorizados.

No se certificó ausencia de iconos duplicados en todo el sistema. La repetición de un acceso en inicio y menú no es automáticamente un defecto: debe conservar nombre, destino y estado activo coherentes. Esta revisión no reemplaza auditoría de permisos, conformidad de anexos ni pruebas de rendimiento anteriores.
