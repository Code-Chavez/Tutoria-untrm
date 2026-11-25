# Anexo D. Manual de usuario

Versión compacta del manual: cada tarea se explica con una captura anotada (datos ficticios) y sus pasos numerados. Los círculos rojos de la captura corresponden a los números del texto que sigue: **acción → resultado (advertencia)**. El manual completo, con todos los casos y mensajes, está en `docs/MANUAL_USUARIO.md` del repositorio. Corte del 19/11/2026, `v1.0.0-beta.4`.

## D.1 Antes de empezar (todos los roles)

Cada persona entra con su cuenta institucional y ve solo el menú y los datos que le corresponden: no es un error que a usted le falte una opción que otra persona tiene.

[[tabla: Menú principal por rol]]

| Menú | Qué contiene | Quién lo ve |
| --- | --- | --- |
| Mi tutoría | Solicitar tutoría, Mis solicitudes, Mis sesiones, Evaluar tutoría | Estudiante |
| Atención a estudiantes | Estudiantes, Entrevista inicial, Sesiones, Seguimiento, Derivar caso, Solicitudes de tutoría, Casos derivados, Seguimiento DBU | Docente tutor (todo menos Seguimiento DBU), coordinación, profesional de servicio (Casos derivados) y DBU |
| Gestión → Periodo académico | Pedir listas, Carga de estudiantes y de docentes, Asignación por ciclo, Docentes tutores, Pendientes, Certificados, Cierre de periodo | Coordinación (sus escuelas) y DBU (todo) |
| Gestión → Plan semestral | Plan de trabajo de la escuela | Coordinación y DBU |
| Gestión → Informes | Horarios y asistencia, Informe semestral, Informe consolidado, Indicadores, Resultados de evaluación, Sugerencias | Cada rol ve los que le corresponden |
| Gestión → Amonestaciones | Registro y consulta de amonestaciones a docentes | Decano (registra), coordinación y DBU (consultan) |
| Configuración | Correos para pedidos de listas, Catálogos y Sedes, Evaluación de tutoría, Usuarios y roles, Roles y permisos, Parámetros, Identidad visual, Bitácora | Coordinación (solo correos), Vicerrectorado (solo Sedes) y DBU |

**Funciones comunes (se explican solo aquí).**

- **Buscar y filtrar:** el cuadro *Buscar* y los selectores de una lista filtran al escribir o elegir; *Limpiar* quita todos los filtros. Los filtros y la ventana abierta quedan en la dirección de la página, de modo que al recargar o compartir el enlace se ve lo mismo.
- **Paginación:** abajo de cada tabla, «Mostrando x–y de n» y los botones de página anterior y siguiente.
- **Guardar y cancelar:** el botón principal guarda; *Cancelar* o la tecla Esc cierran sin guardar. Si falta un dato, el aviso rojo aparece junto a los botones, siempre a la vista.
- **Borradores:** lo que escribe en una solicitud, una respuesta o una evaluación se conserva como borrador en esa pestaña; si recarga, el sistema avisa «Recuperamos lo que habías escrito» y permite *Descartar borrador*. Se borra al cerrar sesión.
- **Avisos:** la campana lista sus avisos y los abre; también llegan por correo institucional, pero el correo no trae datos del caso.
- **Sesión:** tras 15 minutos sin actividad se pide confirmar en 60 segundos; al volver con la misma cuenta regresa a la misma pantalla. Use siempre *Cerrar sesión* en equipos compartidos.
- **Teclado:** Tab recorre los controles, Esc cierra una ventana y el primer Tab de cada pantalla ofrece «Saltar al contenido».
- **Confidencialidad:** los datos de los estudiantes son confidenciales (Ley 29733); no comparta capturas ni archivos fuera del proceso.

![Pantalla de ingreso](../../figuras/man-01.png){w=3.6}

1. **Correo institucional:** escríbalo; no importan mayúsculas ni espacios sobrantes.
2. **Contraseña:** escríbala; el icono del ojo la muestra.
3. **¿Olvidaste tu contraseña?:** pide su correo y envía un enlace que sirve **una sola vez** y vence en 60 minutos (mínimo 8 caracteres). El sistema responde igual exista o no el correo.
4. **Ingresar:** lleva al Panel de inicio. *Advertencia:* tras 5 intentos fallidos la cuenta se bloquea 15 minutos.

![Panel de inicio del estudiante](../../figuras/man-02.png)

1. **Campana:** avisos nuevos (solicitud respondida, sesión programada).
2. **Menú:** las opciones de su rol; en el celular se reduce a un botón.
3. **Tarjetas:** próxima sesión, tutor, solicitudes pendientes y evaluación; cada una abre su pantalla.
4. **Cerrar sesión:** termina la sesión. Su nombre abre el perfil (teléfono, foto y cambio de contraseña).

## D.2 Estudiante

![Solicitar tutoría](../../figuras/man-03.png){w=4.6}

1. **Motivo:** Académico, Psicológico, Social o Salud.
2. **Frases de ayuda:** tóquelas para empezar a escribir.
3. **Descripción:** cuente brevemente su situación; escriba solo lo que quiera compartir.
4. **Registrar solicitud:** el aviso de arriba ya indica quién la recibirá (su tutor o, si no tiene, la coordinación). *Mis solicitudes* muestra su estado, **Pendiente → En atención → Atendida**, y la respuesta; la lista se actualiza sola cada 30 segundos. El sistema no promete plazos.

**Mis sesiones** lista fecha, modalidad y lugar o enlace de cada cita. Si una cita se cancela aparece con su motivo y el siguiente paso; si el tutor programa otra, la cancelada se marca «Reemplazada». En una sesión grupal solo ve su propia participación.

![Evaluar tutoría](../../figuras/man-04.png)

1. **Cómo responder:** N nunca, CN casi nunca, AV a veces, CS casi siempre, S siempre.
2. **Opciones:** responda los 20 ítems; lo respondido se conserva si recarga.
3. **Contador y enlace «Ir a la primera que falta»:** *Enviar evaluación* se activa con las 20 respuestas. *Advertencia:* solo una vez por periodo y solo si la DBU la habilitó; las respuestas son anónimas.

## D.3 Docente tutor

![Estudiantes del docente](../../figuras/man-05.png)

1. **Buscar:** por código, nombre o apellido.
2. **Filtros:** periodo, escuela, ciclo y estado. Con un periodo elegido se ve el ciclo de esa matrícula; la escuela y el tutor son los **actuales** (así lo rotulan los encabezados).
3. **Ver expediente:** línea de tiempo del acompañamiento.
4. **Programar sesión** (individual).
5. **Más:** solicitar tutoría, entrevista inicial, seguimiento, derivar caso, marcar o quitar riesgo.
6. **Sesión grupal:** para varios estudiantes a la vez.
7. **Paginación.** Usted solo ve a **sus** estudiantes.

**Entrevista inicial (Anexo 3)** y **Seguimiento (Anexo 5):** desde el menú o *Más*, elija al estudiante, complete los motivos y acuerdos (en el seguimiento, el docente de asignatura si corresponde) y guarde; quedan en el expediente.

![Programar una sesión](../../figuras/man-06a.png){w=4.2}

1. **Fecha:** día de la sesión.
2. **Hora:** inicio; dura 45 minutos.
3. **Tema:** obligatorio.
4. **Modalidad:** Presencial exige el lugar; Virtual, un enlace que empiece con `https://` o `http://`.
5. **Lugar** (o enlace).
6. **Programar sesión:** el estudiante la ve en *Mis sesiones* y recibe un aviso (si no tiene cuenta del portal, comuníquesela por otro medio).

![Detalle de una sesión](../../figuras/man-06b.png){w=4.2}

7. **Datos de la sesión** (desde el calendario *Sesiones*).
8. **Asistencia:** se registra cuando la sesión ya empezó.
9. **Adjuntar evidencia:** sube el soporte del Anexo 5.
10. **Cancelar sesión** y 11. **Reprogramar:** el motivo es obligatorio, queda en el historial y avisa a los estudiantes con cuenta.

**Asistencia (Anexo 4).** Con la sesión ya iniciada: en una individual pulse *Registrar asistencia* (recibe el número 1, 2, 3… y el tope es de **8 por estudiante y semestre**) o *Marcar inasistencia*; en una grupal marque a los asistentes (si nadie asistió, no cuenta como realizada). La numeración reinicia en cada semestre.

![Expediente del estudiante](../../figuras/man-09.png)

1. **Volver a Estudiantes.**
2. **PDF:** descarga el expediente.
3. **Línea de tiempo:** entrevistas, solicitudes, sesiones, seguimientos y derivaciones.
4. **Descargar hoja para imprimir:** hoja de asistencia (Anexo 4) en PDF; imprímala y fírmenla estudiante y docente.
5. **Adjuntar documento firmado:** suba el escaneo; queda con autor, fecha y huella de verificación.

![Ficha de derivación](../../figuras/man-07.png){w=4.4}

1. **Aspectos observados:** marque al menos uno (académicos, sociales, apariencia o salud mental).
2. **Casillas:** el sistema sugiere el servicio según lo marcado.
3. **Derivar caso:** exige también el motivo y el servicio (Escuela, Psicopedagogía, Psicología, Asistencia Social o Salud); el profesional recibe un aviso.
4. **Cancelar.** *Advertencia:* las notas internas del servicio no se muestran a quien deriva; ve el estado (Enviado → Recibido → En atención → Atendido → Cerrado) y la constancia, que se imprime, se firma y se adjunta.

![Bandeja de solicitudes de tutoría](../../figuras/man-08a.png)

1. **Por atender:** vista por defecto (pendientes y en atención); los demás botones cambian la vista y muestran sus totales.
2. **Buscar:** por estudiante, código o motivo.
3. **Estado:** desde cuándo espera cada solicitud (el sistema no marca plazos vencidos).
4. **Atender:** abre la solicitud.

![Atender una solicitud](../../figuras/man-08b.png){w=4.4}

5. **Programar sesión** y 6. **Derivar a un servicio:** abren el formulario con el estudiante y el motivo ya cargados y vinculan la solicitud; no se duplican.
7. **Respuesta para el estudiante:** obligatoria.
8. **Pasar a en atención** y 9. **Marcar atendida:** el estado nunca retrocede; el estudiante recibe la respuesta y un aviso.

![Informe semestral](../../figuras/man-10.png)

1. **Informes → Informe semestral** (Anexo 9): borrador autollenado con sus sesiones y seguimientos.
2. **Datos generales:** revíselos y complete logros, dificultades y sugerencias.
3. **Agregar fila**, luego *Guardar informe* y *Exportar PDF*; *Volver a autollenar* recupera el borrador del sistema. **Horarios y asistencia** genera el consolidado de sesiones por fechas, exportable en PDF o Excel.

## D.4 Coordinación de escuela

![Asignación por ciclo](../../figuras/man-11.png)

1. **Escuela:** solo aparecen los docentes de esa escuela.
2. **Filtros de ciclos:** primero lo que necesita acción (ciclos sin tutor o rechazados).
3. **Docente del ciclo:** al elegirlo, los estudiantes matriculados del ciclo pasan a él. *Advertencia:* **un docente atiende un solo ciclo**; para otro, el sistema pide registrar una excepción con motivo.
4. **Estado de aceptación:** Sin solicitar, Pendiente, Aceptó o Rechazó; el docente decide desde un enlace personal de un solo uso (vence en 72 horas). Si rechaza, la coordinación lo ve en *Pendientes* y elige a otro; si el correo no llegó, use *Reenviar*.
5. **Cómo asignar un docente:** ayuda de la pantalla. La **reasignación individual** (caso puntual) está en *Estudiantes → Más → Reasignar tutor*, con motivo.

**Cargar y pedir listas.** *Pedir listas* envía a la escuela un correo con la plantilla Excel (la DBU puede pedir una facultad entera, o la lista de docentes); el correo de cada escuela se configura antes en *Configuración → Correos para pedidos de listas*. Cada pedido muestra solo si el correo salió: **Enviándose, Enviado, Fallido** (se puede volver a pedir) o **Envío incierto** (consulte a la escuela antes de repetirlo). Si el pedido es equivalente a uno de los últimos 10 minutos, o la facultad y una de sus escuelas se solapan, el sistema avisa y pide confirmar *Pedir de nuevo*; pulsar dos veces no envía dos correos. *Carga de estudiantes* usa la plantilla Excel y muestra un reporte (nuevos, que continúan y filas con error); quien no figura en la carga del periodo vigente solo consulta su historial. Un estudiante necesita además su cuenta vinculada (*Más → Vincular cuenta*).

![Plan de trabajo semestral](../../figuras/man-12.png)

1. **Escuela:** el plan es por escuela.
2. **Secciones:** seis pestañas, de *Datos generales* a *Otras consideraciones*.
3. **Campos:** *Guardar plan* lo deja como Borrador; si falta un dato obligatorio el sistema abre la sección, marca el campo («Este campo es obligatorio») y lleva el cursor a él. Con *Adjuntar resolución* (PDF) pasa a **Plan vigente**; para cambiarlo, *Guardar como nueva revisión* conserva la versión aprobada hasta que se adjunte la nueva resolución.

![Tablero de indicadores](../../figuras/man-13.png)

1. **Semestre y filtros:** facultad, escuela, ciclo y tutor; las cifras de un semestre cerrado no cambian.
2. **PDF** y 3. **Excel:** exportan el tablero.
4. **Tarjetas:** estudiantes activos, cobertura de sesiones, estudiantes en riesgo, derivaciones y evaluación (promedios anónimos). *Resultados de evaluación* y *Sugerencias* se leen siempre agregados y sin nombres.

La coordinación también atiende las solicitudes de su escuela como el docente (pero no programa sesiones ni deriva) y ve *Pendientes*: rechazos y enlaces vencidos de docentes, ciclos sin tutor y citas canceladas sin continuación. La pantalla solo informa; decide la coordinación o la DBU.

## D.5 Profesional de servicio

![Bandeja de casos derivados](../../figuras/man-14a.png)

1. **Pendientes y demás botones:** abre en lo enviado, recibido o en atención (los enviados primero); *Atendidos*, *Cerrados*, *Abiertas* y *Todos* cambian la vista.
2. **Buscar:** por estudiante, código, servicio o instancia.
3. **Lupa:** abre el detalle del caso.

![Detalle de la derivación](../../figuras/man-14b.png){w=3.2}

4. **Estado y servicio** del caso.
5. **Aspectos observados**, con el nombre oficial del Anexo 6.
6. **Descargar constancia** (PDF) y 7. **Adjuntar documento firmado:** el escaneo queda con autor, fecha y huella.

Para avanzar el caso use *Recibir caso → Iniciar atención → Registrar atención → Cerrar caso*. *Advertencia:* el estado solo avanza; *Registrar atención* y *Cerrar caso* exigen observaciones, que son **internas** (las ven su servicio y la DBU, no el tutor); un caso cerrado no se modifica. Usted ve solo los casos de su servicio.

## D.6 Administración (DBU)

![Lista de usuarios](../../figuras/man-15a.png)

1. **Importar docentes:** alta masiva con plantilla Excel (nombres, apellidos, correo, teléfono y escuela).
2. **Nuevo usuario:** abre el formulario (figura siguiente).
3. **Buscar** y 4. **filtros** por rol y estado: desactivar una cuenta le quita el acceso de inmediato.

![Alta de un usuario](../../figuras/man-15b.png){w=3.1}

5. **Rol** y 6. **Servicio:** con el rol *Profesional de servicio* el servicio es obligatorio, porque de él depende qué casos recibe.
7. **Guardar:** no se genera contraseña; la persona recibe una invitación de un solo uso (72 horas) y la cuenta queda *Pendiente de activación* (*Emitir invitación nueva* si se perdió o venció). *Advertencia:* el correo debe ser institucional (@untrm.edu.pe) y no repetirse; un docente debe tener su escuela.

![Habilitación de la evaluación](../../figuras/man-16.png)

1. **Contadores** de escuelas con la evaluación habilitada o cerrada.
2. **Buscar escuela** y filtrar por estado.
3. **Habilitar evaluación** y 4. **Cerrar evaluación:** abre o cierra el cuestionario a los estudiantes de esa escuela.

![Seguimiento de derivaciones por la DBU](../../figuras/man-17.png){w=4.4}

1. **Totales** de derivaciones, casos abiertos y vencidos (más de 48 h sin avanzar).
2. **Por servicio y estado**, y debajo el detalle de casos.

![Bitácora de auditoría](../../figuras/man-18.png)

1. **Desde y Hasta**, 2. **entidad y acción**, y el buscador por autor: filtran el registro.
3. **Actualizar:** recarga. La bitácora registra las operaciones críticas y los **accesos a información sensible** (quién, cuándo y desde qué IP, incluidos los intentos rechazados) con nombres claros, sin guardar el contenido consultado, y no se puede modificar.

**Otras pantallas de configuración.** *Catálogos:* facultades, escuelas, periodos, ciclos, servicios, motivos y sedes (crear, editar, desactivar; lo que está en uso solo se desactiva; solo puede haber un periodo vigente). *Parámetros:* duración de la sesión (45 min), sesiones por semestre (8), umbral de inasistencias (2), plazo de atención de derivaciones (48 h), cierre por inactividad (15 min) y bloqueo (5 intentos, 15 min). *Identidad visual:* nombre, colores y logotipo (PNG, JPEG o WEBP hasta 1 MB), con *Restablecer identidad UNTRM*. *Roles y permisos:* roles configurables con roles base protegidos y alcance por cuenta.

**Cierre de periodo.** En *Periodo académico → Cierre de periodo*: revise el resumen, pulse *Cerrar periodo* y escriba el nombre exacto como confirmación. El sistema guarda el resumen y la matrícula, y la tutoría pasa a **solo lectura** (no se registran sesiones, asistencias, entrevistas, seguimientos, derivaciones ni solicitudes; sí siguen la administración y los informes). Para el siguiente periodo, créelo en *Catálogos → Periodos* y márquelo vigente. *Reabrir periodo* lo devuelve a vigente si no hay otro vigente. Nada se borra.

**Certificados y docentes tutores (demostración).** *Docentes tutores* lista a los docentes del periodo con sus ciclos, su designación y su trámite. En *Certificados* se inicia el trámite (tres evidencias: aceptación, sesiones e informe semestral), se envía a revisión, se marca cada evidencia Conforme, Observada o Pendiente, y se aprueba, devuelve o rechaza; con la resolución de decanato registrada se genera el PDF. *Advertencia:* es solo una demostración, con marca de agua «DEMOSTRACIÓN — SIN VALOR» y numeración `DEMO-`; no se firma ni se entrega.

## D.7 Vicerrectorado y Decano

![Informe consolidado](../../figuras/man-19.png)

1. **Semestre, facultad, escuela, ciclo y tutor:** filtros del informe; para un semestre cerrado elija ese semestre.
2. **Excel y PDF:** exportan el consolidado. El Vicerrectorado es de **solo lectura** (consolidado e indicadores) y configura las **sedes** (con su ciudad y tipo) en *Configuración → Sedes*.

El **Decano** ve solo su facultad: en *Amonestaciones* elige al docente tutor, la fecha y el motivo, y adjunta el documento si lo tiene. Es un registro, no aplica sanciones; no ve estudiantes ni expedientes. La coordinación y la DBU las consultan.

## D.8 Mensajes frecuentes

[[tabla: Mensajes frecuentes y qué hacer]]

| Mensaje o situación | Qué hacer |
| --- | --- |
| No aparece una opción del menú | Depende del rol; pida a la DBU revisar el rol |
| «Ya respondiste el cuestionario de este periodo» | Se responde una sola vez por periodo |
| «La evaluación no está disponible» | La DBU aún no la habilitó para su escuela, o ya la cerró |
| No se puede registrar la asistencia | La sesión debe haber empezado y el estudiante no puede pasar de 8 en el semestre |
| No se puede marcar atendida una solicitud | Escriba antes la respuesta para el estudiante |
| No se puede cambiar un caso a un estado anterior | Los estados solo avanzan; Atendido y Cerrado exigen observaciones |
| Un estudiante no ve su menú | Su cuenta del portal debe estar vinculada a su registro (*Más → Vincular cuenta*) |
| La página pide entrar de nuevo | La sesión se cerró por inactividad, por cambio de contraseña o por desactivación |
| «Demasiados intentos» | Espere unos minutos e inténtelo de nuevo |
| «El tutor pertenece a otra escuela» | Elija un docente de la escuela del estudiante |
| Un envío de correo figura «Envío incierto» | No reenvíe a ciegas; consulte primero a quien debía recibirlo |
