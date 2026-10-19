# Manual de usuario — SIT · UNTRM

**Sistema de Información para la Sistematización de los Procesos de Acompañamiento de Tutoría Universitaria**
Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas · Dirección de Bienestar Universitario (DBU)
Versión del documento: 1.0 (octubre de 2026) · Software: 0.4.1

Este manual explica, para cada tipo de persona que usa el sistema, **qué puede hacer y cómo hacerlo**. Las imágenes son del sistema con datos de demostración (personas y casos ficticios). Los nombres entre comillas o en *cursiva*
son los que aparecen en pantalla. Si necesita instalar o mantener el sistema, vea `docs/MANUAL_TECNICO.md`.

## Contenido

1. [Antes de empezar](#1-antes-de-empezar)
2. [Tutorado (estudiante)](#2-tutorado-estudiante)
3. [Docente tutor](#3-docente-tutor)
4. [Coordinador de escuela](#4-coordinador-de-escuela)
5. [Profesional de servicio](#5-profesional-de-servicio)
6. [Vicerrectorado](#6-vicerrectorado)
7. [Administrador DBU](#7-administrador-dbu)
8. [Preguntas frecuentes](#8-preguntas-frecuentes)
9. [Glosario](#9-glosario)

## 1. Antes de empezar

### 1.1 Qué ve cada persona

Cada persona entra con su cuenta institucional y ve **solo** el menú y la información que le corresponde. No es un error que a usted no le aparezca una opción
que otro compañero sí tiene: depende de su rol.

El menú es **corto a propósito** y está agrupado por tareas. Cada grupo se despliega y se pliega con un clic en su título (el sistema recuerda lo que usted dejó abierto; el grupo de la pantalla en que está siempre se ve abierto). Tres entradas son **una sola pantalla con pestañas**: *Periodo académico*, *Informes* y *Configuración*; al entrar, las pestañas aparecen arriba de la pantalla, en el orden en que se usan. Una persona solo ve lo que le sirve:

| Entrada del menú | Qué hay | Quién la ve |
|---|---|---|
| **Inicio** → Panel de inicio | Resumen y accesos directos | Todos |
| **Mi tutoría** | Solicitar tutoría · Mis sesiones · Evaluar tutoría | Estudiante |
| **Atención a estudiantes** | Estudiantes · Entrevista inicial · Sesiones · Seguimiento · Derivar caso · Solicitudes de tutoría · Casos derivados · Seguimiento DBU | Docente tutor (todo menos Seguimiento DBU), coordinación (Tutorados, Solicitudes), profesional de servicio (Casos derivados), DBU |
| **Gestión** → Periodo académico | *Pestañas:* 1 Pedir listas → 2 Carga de estudiantes → 3 Carga de docentes (solo DBU) → 4 Asignación por ciclo → 5 Cierre de periodo (solo DBU) · y, aparte de ese orden, **Pendientes** | Coordinación (pestañas 1, 2 y 4) y DBU (todas) |
| **Gestión** → Plan semestral | Plan de trabajo de la escuela | Coordinación y DBU |
| **Gestión** → Informes | *Pestañas:* Horarios y asistencia · Informe semestral · Informe consolidado · Indicadores · Resultados de evaluación · Sugerencias de estudiantes | Cada rol ve las que le corresponden: el docente (Horarios, Semestral), la coordinación (Horarios, Indicadores, Resultados, Sugerencias), Vicerrectorado (Consolidado, Indicadores) y la DBU (todas menos la del docente) |
| **Gestión** → Amonestaciones | Registro y consulta de amonestaciones a docentes | Decano (las registra), coordinación y DBU (consulta) |
| **Configuración** | *Pestañas:* Correos de las escuelas · Sedes · Evaluación de tutoría · Catálogos · Usuarios y roles · Parámetros · Identidad visual · Bitácora de auditoría | Coordinación (solo Correos de las escuelas), Vicerrectorado (solo Sedes) y DBU (todas) |

**El expediente de un estudiante** no es una entrada del menú: se abre desde **Estudiantes**, con el botón *Ver expediente* de cada fila (y de ahí se vuelve a Estudiantes).

### Quién hace qué, y dónde

| Tarea | Quién la hace | Dónde |
|---|---|---|
| Crear cuentas y asignar roles (docentes, coordinadores, Decano…) | DBU | Configuración → Usuarios y roles (también *Importar docentes* desde Excel) |
| Registrar facultades, escuelas y periodos | DBU | Configuración → Catálogos |
| Fijar la sede de cada escuela | Vicerrectorado o DBU | Facultad y sedes → Sedes |
| Pedir a cada escuela la lista de estudiantes | Coordinación o DBU | Periodo académico → Pedir listas |
| Configurar a qué correo se pide la lista de cada escuela (y corregirlo) | Coordinación (sus escuelas) o DBU | Configuración → Correos de las escuelas |
| Cargar a los estudiantes del periodo | Coordinación o DBU | Periodo académico → Carga de estudiantes |
| Crear las cuentas de los docentes tutores (varios a la vez, desde Excel) | DBU | Periodo académico → Carga de docentes (también «Importar docentes» en Usuarios y roles) |
| Asignar el tutor de cada ciclo (y ver si aceptó). **Se asigna por ciclo, no estudiante por estudiante** | Coordinación o DBU | Periodo académico → Asignación por ciclo |
| Aceptar o rechazar ser tutor de un ciclo | El docente, desde el enlace de su correo | Correo → página de aceptación (sin iniciar sesión) |
| Reasignar a un estudiante en un caso puntual (con motivo) | Coordinación o DBU | Atención a estudiantes → Estudiantes → Más → Reasignar tutor |
| Entrevista, sesiones, asistencia, seguimiento | Docente tutor | Atención a tutorados |
| Derivar un caso a un servicio | Docente tutor | Atención a tutorados → Derivar caso |
| Atender un caso derivado | Profesional de servicio | Atención a tutorados → Casos derivados |
| Pedir tutoría y evaluar a su tutor | Estudiante | Mi tutoría |
| Plan de trabajo de la escuela | Coordinación | Planificación y evaluación → Plan semestral |
| Informe semestral del docente | Docente tutor | Gestión → Informes → pestaña Informe semestral |
| Amonestar a un docente | Decano (o DBU) | Facultad y sedes → Amonestaciones |
| Cerrar el periodo | DBU | Periodo académico → Cierre de periodo |

**Pedir las listas desde la pantalla de carga.** Arriba de *Carga de estudiantes* y de *Carga de docentes* hay un bloque «¿Aún no tienes la lista? Pídela primero» con el botón **Ir a «Pedir listas»**, que lleva a esa pantalla con la lista ya elegida (estudiantes o docentes). Allí se elige la escuela y se pide; la lista de docentes tutores la pide solo la DBU. **El correo al que se pide no se escribe ahí:** se configura una vez en **Configuración → Correos de las escuelas** (la coordinación, sus escuelas; la DBU, todas), con un botón **Editar** para corregirlo si hubo un error y **Quitar** para borrarlo. En *Pedir listas* solo se ve a qué correo saldrá el pedido, con el enlace **Editar correo**; si la escuela no tiene correo, aparece el botón **Configurar correo** que lleva al apartado de configuración.

**En un celular o una ventana estrecha** las bandejas (solicitudes y casos derivados) muestran cada caso como una **tarjeta** con su estado y su botón de acción siempre a la vista, sin desplazarse a los lados.
En las pantallas con pestañas, la pestaña en la que está se lleva a la vista y, si hay más pestañas fuera de la pantalla, aparece una **flecha** para verlas.

**Lo que escribe no se pierde.** En la solicitud de tutoría, en la respuesta del docente a una solicitud y en la evaluación, lo que usted está escribiendo se guarda como **borrador**: si cambia de pantalla, recarga la página o lo interrumpen, al volver lo recupera y la pantalla se lo avisa («Recuperamos lo que habías escrito»), con el botón **Descartar borrador**. Por privacidad: el borrador queda **solo en la pestaña de su navegador** (no se envía al servidor y se pierde al cerrar la pestaña), es **de su cuenta** (otra persona no lo ve), **se borra cuando usted pulsa «Cerrar sesión»** y se descarta al entrar otra cuenta. Si el sistema cierra su sesión por inactividad, se conserva para cuando vuelva a entrar. Al enviar, el borrador desaparece.

**Pendientes (coordinación y DBU).** En *Periodo académico → Pendientes* se junta lo que nadie vería solo, ordenado por lo que lleva más tiempo esperando: un docente que **rechazó** la tutoría de un ciclo (con su motivo), **no respondió** (el enlace venció), o a quien **no le llegó el correo** de aceptación; una cuenta de docente **desactivada** que sigue como tutor; un **ciclo con estudiantes sin tutor**; y la **cita cancelada** de una solicitud que sigue sin atenderse (con el motivo de la cancelación). La coordinación ve solo sus escuelas; la DBU, todas. Cada fila lleva a donde se resuelve («Asignación por ciclo» o la solicitud) y se puede filtrar por tipo. **La pantalla solo informa:** no reasigna ni sanciona a nadie; qué hacer en cada caso lo decide la coordinación o la DBU. Si la cita de una solicitud se cancela, la solicitud **vuelve a ofrecer «Programar sesión» y «Derivar a un servicio»** (la tabla la marca como «Cita cancelada»): la nueva atención reemplaza a la cancelada, que queda en la bitácora, y el pendiente desaparece; también desaparece si la solicitud se marca atendida.

**Palabras de todos los días.** La pantalla habla de *estudiantes* (no «tutorados»), de la persona *responsable* de una solicitud (no «enrutada») y de lo que usted hace («Recibir caso», «Pedir listas»). Los artículos del Protocolo ya no aparecen en los títulos; los **formatos oficiales** (Anexos, PDF y Excel descargables) conservan su denominación original.

**Una pantalla lleva a la siguiente.** Cuando a una pantalla le falta algo (por ejemplo, no hay estudiantes o una escuela no tiene docentes) o cuando termina una tarea, muestra un bloque **«Qué sigue»** con enlaces a donde se carga lo que falta o a la tarea siguiente: después de *Pedir listas* sigue *Carga de estudiantes*; después de cargar, *Asignación por ciclo*. El **Panel de inicio** de la coordinación y la DBU muestra el periodo académico como pasos numerados.

*Nombres en pantalla:* el sistema muestra **Estudiante** (rol Tutorado), **Docente** (Docente tutor), **Administrador** (Administrador DBU) y, para el Profesional de servicio, su especialidad (p. ej. «Profesional de Psicología»). Son los mismos roles de la tabla; solo cambia cómo se escriben junto a su nombre, en el perfil y en la lista de usuarios.

### 1.2 Entrar al sistema

![Pantalla de ingreso](manual/img/01-ingreso.jpg)
*Figura: Pantalla de ingreso.*

1. Abra la dirección del sistema que le indicó la DBU.
2. Escriba su **correo institucional** y su **contraseña**, y pulse *Ingresar*. Da igual si escribe el correo con mayúsculas o con un espacio de más.
3. Llegará a su *Panel de inicio*, con un resumen de su trabajo y accesos rápidos a las tareas más frecuentes.

Tras **5 intentos fallidos** la cuenta se bloquea 15 minutos. Si la cuenta fue desactivada, pida a la DBU que la reactive.

### 1.3 Olvidé mi contraseña

![Pantalla para recuperar la contraseña](manual/img/02-recuperar-contrasena.jpg)
*Figura: Pantalla para recuperar la contraseña.*

1. En la pantalla de ingreso pulse *¿Olvidaste tu contraseña?* y escriba su correo.
2. Recibirá un mensaje con un enlace. **El enlace sirve una sola vez** y vence en 60 minutos.
3. Abra el enlace, escriba la nueva contraseña (mínimo 8 caracteres) y confirme.

Por seguridad, el sistema responde lo mismo exista o no el correo: si no llega el mensaje, revise la carpeta de correo no deseado o pida ayuda a la DBU.

### 1.4 Mi perfil y cambio de contraseña

Pulse su nombre en la esquina superior derecha. Allí puede actualizar su teléfono y foto, y en *Contraseña actual / Nueva contraseña / Confirmar nueva contraseña*
cambiar su clave con *Actualizar contraseña*. Al cambiarla se cierran sus otras sesiones abiertas.

### Accesibilidad y teclado

El sistema se puede usar solo con el teclado y con lector de pantalla: **Tab** recorre los campos y botones en orden; al abrir una ventana (por ejemplo *Atender solicitud*) el foco entra en ella, **Esc** la cierra y el foco vuelve al botón que la abrió. Al comenzar cada pantalla, la primera pulsación de **Tab** muestra el enlace **«Saltar al contenido»**. Las cargas se anuncian («Cargando tus sesiones…») y los errores aparecen como avisos con un botón **Reintentar**. En el celular las pantallas se adaptan sin desplazarse hacia los lados. Los colores de los estados (pendiente, atendida…) llevan además su texto, y los enlaces dentro de un párrafo van subrayados.

### 1.5 Avisos (campana)

La campana de la parte superior muestra sus avisos (nueva solicitud, cambio de estado de un caso, nueva derivación…). Pulsar un aviso **abre directamente**
el caso o la solicitud correspondiente. *Marcar todas como leídas* limpia la lista.

**También le llegan por correo.** Cada aviso nuevo se envía además a su **correo institucional**, para que no tenga que estar dentro del sistema para enterarse. Al registrar una solicitud de tutoría, **quien la pide recibe además una constancia** (en la campana y por correo) de que quedó registrada, aunque la haya registrado su tutor a su nombre. El correo es solo un aviso: **no trae datos del caso ni de la persona atendida** (por confidencialidad); trae un enlace que abre el sistema, donde debe iniciar sesión para ver el detalle. Si no esperaba el mensaje, puede ignorarlo; no responda al correo (es automático). Si no le llegan, revise la carpeta de correo no deseado y avise a la DBU.

### 1.6 Cierre de sesión por inactividad

Si pasan **15 minutos sin actividad**, aparece un aviso con una cuenta regresiva de 60 segundos. Pulse el botón para seguir conectado; si no, la sesión se
cierra sola. Mientras trabaja, la sesión se renueva sin que usted haga nada. Use siempre *Salir* al terminar, sobre todo en equipos compartidos.

### 1.7 Confidencialidad

Los datos de los tutorados son **confidenciales** (Ley N.° 29733). No comparta capturas, impresiones o archivos descargados fuera de las personas
involucradas en el proceso.

## 2. Tutorado (estudiante)

![Panel de inicio del tutorado](manual/img/03-inicio-tutorado.jpg)
*Figura: Panel de inicio del tutorado.*

### 2.1 Ver mis sesiones

![«Mis sesiones»: fecha, modalidad y lugar o enlace](manual/img/04-mis-sesiones.jpg)
*Figura: «Mis sesiones»: fecha, modalidad y lugar o enlace.*

*Mis sesiones* lista las sesiones de tutoría programadas por su tutor, con **fecha, modalidad y lugar o enlace**. Cada una muestra su estado:
*Próxima*, *Cancelada* (con el motivo) o realizada. Si la sesión es virtual, el enlace aparece como vínculo solo cuando empieza con `https://` o `http://`.

En una sesión grupal usted ve únicamente su propia participación, no la de sus compañeros.

**Si una cita se cancela.** En *Mis sesiones* la cita cancelada aparece con su motivo y con el siguiente paso: si todavía no hay otra, un enlace a *Solicitar tutoría*; si su tutor ya programó una nueva, la cancelada se marca **«Reemplazada»** (con la fecha de la nueva) y la nueva dice **«Esta cita reemplaza a una que se canceló»**. En *Solicitar tutoría → Mis solicitudes*, la solicitud muestra su cita: **Cita programada**, **Nueva cita** o **Cita cancelada** (la solicitud sigue abierta; no hace falta pedirla de nuevo ni se promete una fecha). Solo se muestran la fecha, la modalidad y el lugar o enlace: nunca las notas del tutor ni nada reservado.

**Usted se entera sin entrar a buscar.** Cuando su tutor programa una sesión, la cambia de horario o la cancela, le llega un **aviso en la campana** con la fecha, el lugar (o la indicación de que el enlace está en *Mis sesiones*) y, si hubo cambio o cancelación, **el motivo**; al pulsarlo se abre *Mis sesiones*. También le llega por correo institucional **si el servicio de correo está activo**: ese correo solo avisa que hay una novedad y no trae la fecha ni el motivo (por confidencialidad). Si usted no tiene cuenta del portal, el sistema no puede avisarle y su tutor debe comunicárselo por otro medio.

Mientras la pantalla carga, aparece **«Cargando tus sesiones…»**. Si tarda más de lo normal, lo dice y ofrece **Reintentar**; si falla, lo dice y permite reintentar; y si no hay sesiones, lo dice con claridad (no se confunde con que aún esté cargando).

### 2.2 Solicitar tutoría

![«Solicitar tutoría» y el historial «Mis solicitudes»](manual/img/05-solicitar-tutoria.jpg)
*Figura: «Solicitar tutoría» y el historial «Mis solicitudes».*

1. Entre a *Solicitar tutoría*.
2. En *Motivo* elija el tipo: **Académico, Psicológico, Social o Salud**.
3. En *Descripción del motivo* explique brevemente su situación.
4. Pulse *Registrar solicitud*. Verá «Solicitud registrada: la recibió tu tutor *(nombre)*. Te avisaremos en el sistema cuando responda» (o «la coordinación de tu escuela», o Bienestar Universitario, si aún no tiene tutor asignado).

**Antes de enviarla** la pantalla ya le dice quién la recibirá: «Tu solicitud la recibirá tu tutor *(nombre)*». Si aún no tiene tutor, le explica que la recibirá la coordinación de su escuela (con el nombre de quien coordina) y que le avisarán cuando responda. El sistema **no promete un plazo de respuesta**: los plazos los define la DBU. En su **Panel de inicio**, *Mi tutor* dice «Sin asignar» y quién recibe sus solicitudes mientras tanto, y *Mis solicitudes* dice cuántas esperan respuesta (o «Ninguna pendiente»).

Debajo, en *Mis solicitudes*, ve el historial con el estado de cada una: **Pendiente** → **En atención** → **Atendida**. Cuando su tutor la atiende
verá también **su respuesta** (por ejemplo, fecha y lugar de la sesión) y recibirá un aviso en la campana.

### 2.3 Evaluar a mi tutor

![Cuestionario de evaluación de la tutoría](manual/img/06-evaluar-tutoria.jpg)
*Figura: Cuestionario de evaluación de la tutoría.*

La evaluación está disponible solo cuando la DBU la habilita para su escuela.

1. Entre a *Evaluar tutoría*.
2. Antes de la primera pregunta verá **«Cómo responder»**, con el significado de cada opción: **N** Nunca · **CN** Casi nunca · **AV** A veces · **CS** Casi siempre · **S** Siempre (cada opción también lleva su nombre completo). Responda los **20 ítems**.
   El contador muestra «x de 20 respondidas», con el enlace **Ir a la primera que falta** para no recorrer todo buscando lo pendiente; el botón *Enviar evaluación* se activa cuando completa todas. **Lo respondido no se pierde** si cambia de pantalla, recarga o se interrumpe (ver «Lo que escribe no se pierde»).
3. Opcionalmente escriba *Me gustaría* y *No me gusta*.
4. Pulse *Enviar evaluación*.

Solo se puede responder **una vez por periodo**. Sus respuestas son **anónimas**: quienes ven los resultados solo ven promedios y comentarios sin su nombre.

## 3. Docente tutor

![Panel de inicio del docente tutor](manual/img/07-inicio-tutor.jpg)
*Figura: Panel de inicio del docente tutor.*

El panel muestra, además de sus tutorados y sesiones, **Solicitudes por atender** (cuántas esperan su respuesta y desde cuándo espera la más antigua); al pulsarlo abre la bandeja de solicitudes ya filtrada en *Por atender*.
La coordinación y la DBU ven el mismo contador, en primer lugar.

### 3.1 Mis tutorados

![Lista de tutorados con sus acciones](manual/img/08-tutorados.jpg)
*Figura: Lista de tutorados con sus acciones.*

*Estudiantes* muestra a los estudiantes que usted tiene asignados, con su código, escuela, ciclo y estado. Puede buscar por código, nombre o apellido y filtrar por
escuela, ciclo y estado. En cada fila:

- 📁 **Ver expediente**: línea de tiempo completa del acompañamiento.
- 📅 **Programar sesión**.
- **Más**: *Solicitar tutoría*, *Registrar entrevista inicial*, *Registrar seguimiento*, *Derivar caso* y *Marcar en riesgo*/*Quitar riesgo* (con motivo opcional).

Usted solo ve a **sus** tutorados; no puede abrir el expediente de un estudiante de otro tutor.

### 3.2 Entrevista inicial (Anexo 3)

1. Menú *Entrevista inicial* → elija al tutorado con *Registrar entrevista*.
2. Complete los datos de filiación, marque los motivos (académico, personal-emocional, vocacional), y escriba *Aspectos tratados* y *Acuerdos*.
3. Guarde. La entrevista aparece en el expediente.

### 3.3 Programar sesiones

![Formulario «Programar sesión de tutoría»](manual/img/09-programar-sesion.jpg)
*Figura: Formulario «Programar sesión de tutoría».*

![Calendario mensual de «Sesiones»](manual/img/10-calendario-sesiones.jpg)
*Figura: Calendario mensual de «Sesiones».*

![Detalle de una sesión](manual/img/11-detalle-sesion.jpg)
*Figura: Detalle de una sesión.*

1. En *Estudiantes*, pulse **Programar sesión** en la fila del estudiante (sesión individual), o *Sesión grupal* en la parte superior para varios estudiantes.
2. Indique **fecha, hora y tema**, y la modalidad:
   - **Presencial**: escriba el *Lugar*.
   - **Virtual**: pegue el *Enlace de videollamada* (debe comenzar con `https://` o `http://`).
3. Pulse *Programar sesión*. El estudiante la ve de inmediato en *Mis sesiones* y **recibe un aviso en el sistema** con la fecha y el lugar. El formulario le dice si el tutorado no tiene cuenta del portal (en ese caso el sistema no puede avisarle y usted debe comunicarle la sesión por otro medio); al guardar, la pantalla le dice a cuántos se avisó y a quién no se pudo.

La duración es de 45 minutos (la DBU puede ajustarla). *Sesiones* muestra su **calendario mensual**; pulse una sesión para ver su detalle.

**Reprogramar o cancelar:** abra la sesión desde *Sesiones* y use *Reprogramar* o *Cancelar sesión*. **El motivo es obligatorio**; queda en el historial y **cada tutorado con cuenta del portal recibe un aviso** con el nuevo horario (o la cancelación) y ese motivo. Al terminar, la pantalla confirma a cuántos se avisó y a quién no se pudo.

### 3.4 Registrar la asistencia (Anexo 4)

![Expediente del tutorado, con la hoja de asistencia (Anexo N.° 4)](manual/img/12-expediente.jpg)
*Figura: Expediente del tutorado, con la hoja de asistencia (Anexo N.° 4).*

Cuando la sesión **ya empezó**, ábrala desde *Sesiones*:

- **Individual:** pulse *Registrar asistencia* si el estudiante asistió. La sesión recibe su número (1, 2, 3…). El tope es de **8 sesiones por tutorado en cada
  semestre**: al llegar a 8 el sistema no permite una novena. Si no asistió, pulse *Marcar inasistencia*.
- **Grupal:** marque quién asistió y quién no. Si nadie asistió, la sesión queda «sin asistentes» y no cuenta como realizada.

La numeración **vuelve a empezar en 1** cada semestre.

**Hoja de asistencia imprimible:** en el *Expediente* del tutorado, la tarjeta *Hoja de asistencia (Anexo N° 4)* permite descargarla en PDF. Imprímala, haga que
el estudiante y usted la firmen, y **adjunte el escaneo** en *Hoja firmada del semestre* (queda con autor, fecha y huella de verificación).

### 3.5 Seguimiento (Anexo 5)

*Seguimiento* → elija al tutorado → escriba el *motivo*, los *acuerdos* y, si fue con un docente de asignatura, su nombre, curso y ciclo. Aparece en el expediente.

### 3.6 Derivar un caso a un servicio (Anexo 6)

![Ficha de derivación](manual/img/13-ficha-derivacion.jpg)
*Figura: Ficha de derivación.*

![«Casos derivados» del tutor](manual/img/16-casos-derivados-tutor.jpg)
*Figura: «Casos derivados» del tutor.*

1. Menú *Derivar caso* → pulse **Derivar caso: [nombre]** en el estudiante.
2. En la *Ficha de derivación* marque los **aspectos observados** (académicos, sociales, apariencia, salud mental), escriba el *motivo* y elija el
   **servicio**: Escuela Profesional, Psicopedagogía, Psicología, Asistencia Social o Salud. El sistema **sugiere un servicio** según los aspectos marcados.
   Opcionalmente indique la instancia o profesional que recibe.
3. Pulse *Derivar caso*. El profesional de ese servicio recibe un aviso.

**Seguimiento del caso:** en *Casos derivados* ve sus derivaciones con su estado (**Enviado → Recibido → En atención → Atendido → Cerrado**). Con el icono de la
lupa abre el detalle y con el otro icono descarga la **constancia** (PDF). La bandeja abre en **Pendientes** (lo enviado, recibido o en atención) y los casos atendidos o cerrados
se consultan con los botones **Atendidos**, **Cerrados**, **Abiertas** o **Todos**; cada botón muestra cuántos casos tiene y *Buscar* encuentra por estudiante, código, servicio o instancia.

**Constancia firmada:** imprima la constancia, fírmela (usted y el profesional que recibe) y adjunte el escaneo en *Constancia firmada (Anexo N° 6)* dentro del detalle.
La ven usted, el servicio de destino y la DBU, nadie más.

> Las **notas internas** que escribe el servicio al atender el caso **no se muestran** al tutor que derivó: usted ve el estado y el historial, no el contenido clínico.

### 3.7 Solicitudes de tutoría

![Bandeja de «Solicitudes de tutoría»](manual/img/14-solicitudes-bandeja.jpg)
*Figura: Bandeja de «Solicitudes de tutoría».*

![Cuadro «Atender solicitud de tutoría»](manual/img/15-atender-solicitud.jpg)
*Figura: Cuadro «Atender solicitud de tutoría».*

*Solicitudes de tutoría* lista las solicitudes de sus tutorados. **Lo que espera respuesta va primero:** la pantalla abre en **Por atender** (pendientes y en atención), con
la que más lleva esperando arriba y, en cada fila, desde cuándo espera («Espera desde hace 6 días»); las ya atendidas no la tapan. Los botones de arriba cambian de vista
(**Por atender · Pendientes · En atención · Atendidas · Todas**) y muestran cuántas hay en cada una; el cuadro *Buscar* encuentra por estudiante, código o motivo.
Los contadores del Panel de inicio abren esta pantalla ya filtrada. El sistema muestra cuánto lleva esperando algo, pero **no marca plazos vencidos**: los plazos los define la DBU.
Para atender una:

1. Pulse *Atender* en su fila. Se abre la solicitud.
2. Si la va a trabajar, pulse *Pasar a en atención*.
3. Escriba la **respuesta para el estudiante** (por ejemplo «Te espero el jueves a las 3 pm en la oficina 204») y pulse *Marcar atendida*.
   **No se puede marcar atendida sin respuesta**, y el estado nunca retrocede.

El estudiante ve la respuesta y recibe un aviso.

**Cuando la solicitud necesita una cita o una derivación, no vuelva a buscar al estudiante.** Dentro de la solicitud (solo el docente tutor) están los botones
*Programar sesión* y *Derivar a un servicio*. Ambos abren el formulario de siempre con el estudiante ya elegido y el motivo de la solicitud ya escrito
(puede corregirlo), y al guardar **la solicitud queda vinculada** a la sesión o a la derivación:

- Si programó una sesión, la solicitud pasa a *En atención* y la fila dice **Con sesión programada**. El estudiante la ve en *Mis sesiones* y recibe un aviso.
- Si derivó el caso, la fila dice **Derivada a un servicio**. El aviso al estudiante dice solo que su solicitud tiene novedades: **no revela la derivación**, que es información reservada.
- **No se duplica:** una solicitud ya vinculada no ofrece otra sesión ni otra derivación. Si necesita cambiar la cita, use *Sesiones* (reprogramar o cancelar con motivo).
- *Marcar atendida* sigue siendo un paso aparte: escriba la respuesta para el estudiante cuando termine. «Atendida» significa que usted respondió; que la tutoría se realizó
  se ve en la asistencia de la sesión.

La coordinación ve el vínculo, pero **no programa sesiones ni deriva**: eso es del docente tutor.

### 3.8 Horarios y asistencia

![Consolidado de «Horarios y asistencia»](manual/img/17-horarios-asistencia.jpg)
*Figura: Consolidado de «Horarios y asistencia».*

*Horarios y asistencia* genera su consolidado de sesiones (programadas, realizadas, canceladas, asistencias confirmadas y pendientes). Puede acotar por fechas
con *Generar consolidado* y exportarlo con los botones **PDF** o **Excel**.

### 3.9 Informe semestral (Anexo 9)

![Informe semestral autollenado](manual/img/18-informe-semestral.jpg)
*Figura: Informe semestral autollenado.*

*Informe semestral* trae un **borrador autollenado** con sus sesiones y seguimientos del periodo. Revíselo, complete logros, dificultades y sugerencias, y pulse
*Guardar informe*; después *Exportar PDF*. Con *Volver a autollenar* recupera el borrador del sistema.

## 4. Coordinador de escuela

![Panel de inicio del coordinador](manual/img/19-inicio-coordinador.jpg)
*Figura: Panel de inicio del coordinador.*

Además de ver los tutorados **de su escuela** (nunca de otras), el coordinador:

### 4.1 Asignar tutores

La asignación es **por ciclo**: se elige un docente tutor para cada ciclo de la escuela y todos los estudiantes matriculados de ese ciclo pasan a él (ver 7.9). No se asignan estudiantes uno por uno.

- *Asignación por ciclo* (menú Gestión → Periodo académico): la lista muestra **primero lo que necesita acción** (ciclos con estudiantes y sin tutor, luego los que el docente rechazó, luego los que tienen estudiantes sin tutor) y al final los ya resueltos.
- **Reasignación individual** (caso puntual): en *Estudiantes*, menú *Más* → *Reasignar tutor*; indique el motivo. Queda en el historial de asignaciones.

### 4.2 Registrar y cargar tutorados

- *Estudiantes* → *Nuevo estudiante*: código universitario, ciclo, nombres, apellidos, escuela y, opcionalmente, correo y teléfono. **El correo del estudiante es un dato de contacto:** puede ser personal (no se le exige el dominio institucional), se guarda sin espacios y en minúsculas, y **dos estudiantes no pueden tener el mismo correo** (en el alta, en la edición ni en la carga masiva, donde la fila repetida se informa con su motivo).
- *Carga masiva*: descargue la plantilla Excel con *Descargar plantilla*, complétela y súbala; el sistema muestra un **reporte del resultado** (estudiantes nuevos, estudiantes que **continúan** y filas con error). La carga es **del periodo vigente**: cada estudiante cargado queda matriculado en él (un estudiante que ya existía de un periodo anterior no da error: se actualiza su ciclo y se matricula de nuevo). **Quien no figura en la carga del periodo vigente solo puede consultar su historial: no puede solicitar tutoría ni evaluar.** Sin un periodo vigente no se puede cargar.
- *Pedir listas*: al iniciar el periodo, pida a la escuela la lista de estudiantes (la DBU también puede pedir la de **docentes tutores**; al cambiar el tipo cambian el título, las columnas de la plantilla, el enlace de carga y los pasos que siguen; el historial indica de qué lista es cada pedido). Elija la escuela y, si no hay un correo configurado, escríbalo ahí mismo (se puede cambiar cuando quien lo recibía deje de responder); marque los ciclos (o ninguno para todos), agregue observaciones y pulse *Enviar pedido*. Sale un correo formal a nombre suyo, con copia a su correo y la **plantilla Excel adjunta**; las respuestas le llegan a usted. Queda un historial con lo pedido y a quién, para marcarlo como recibido cuando llegue el archivo, que se carga en *Carga masiva*.
- Para que un estudiante pueda entrar al sistema hay que **vincular su cuenta** de portal (*Más* → *Vincular cuenta*).

### 4.3 Solicitudes de tutoría

*Solicitudes de tutoría* muestra las solicitudes de los estudiantes de su escuela (incluidas las que llegan al coordinador porque el estudiante no tiene tutor).
Se atienden igual que el tutor (sección 3.7). Si la escuela no tuviera coordinador, la solicitud llega a la DBU: nunca se pierde.

### 4.4 Plan de trabajo semestral (Anexo 8)

![Plan semestral y resolución de aprobación](manual/img/21-plan-semestral.jpg)
*Figura: Plan semestral y resolución de aprobación.*

1. *Plan semestral* muestra el plan de **su escuela** (si tuviera varias, elija en el selector).
2. Complete las secciones (datos generales, objetivos, metodología, programación, recursos, presupuesto, actividades operativas) y pulse *Guardar plan*. Queda como **Borrador**.
3. En *Resolución de aprobación* pulse *Adjuntar resolución* y suba el **PDF de la resolución**. El plan pasa a **Plan vigente**.
4. Si necesita cambiar un plan aprobado, edítelo y pulse *Guardar como nueva revisión*. El sistema pide confirmación: **la versión aprobada se conserva**
   (en *Versiones aprobadas anteriores* puede descargar su resolución y su PDF) y la nueva revisión queda **pendiente de resolución** hasta que adjunte la que la apruebe.

### 4.5 Indicadores, resultados y exportaciones

![Tablero de indicadores](manual/img/22-indicadores.jpg)
*Figura: Tablero de indicadores.*

- *Indicadores*: tablero de cobertura, riesgo, sesiones por mes y derivaciones por servicio de su escuela, con botones **PDF** y **Excel**.
- *Resultados de evaluación* y *Sugerencias de estudiantes*: promedios por tutor e ítem y comentarios abiertos, **siempre agregados y anónimos**.
- *Horarios y asistencia*: consolidado de un tutor de su escuela (elija el tutor); exportable en PDF y Excel.

## 5. Profesional de servicio

![Panel de inicio del profesional de servicio](manual/img/23-inicio-servicio.jpg)
*Figura: Panel de inicio del profesional de servicio.*

Aplica a Psicología, Psicopedagogía, Asistencia Social, Salud y Escuela Profesional. Usted ve **solo los casos derivados a su servicio**.

### 5.1 Recibir y abrir un caso

![Bandeja de «Casos derivados» del servicio](manual/img/24-bandeja-servicio.jpg)
*Figura: Bandeja de «Casos derivados» del servicio.*

Cuando un tutor deriva un caso a su servicio, aparece un aviso en la campana: *Nueva derivación recibida*. Al pulsarlo se abre **ese caso**. También puede entrar por
*Casos derivados*, donde ve la bandeja con fecha, estado, servicio e instancia receptora.

**Los contadores del Panel de inicio abren la bandeja ya filtrada:** *Por recibir* muestra solo los casos enviados a su servicio, *En atención* los recibidos y en atención, *Atendidas* y *Cerradas* sus casos
respectivos. La bandeja abre en **Pendientes** (enviados, recibidos y en atención, con los enviados primero y la fecha desde la que esperan), de modo que un caso por recibir no se pierde entre casos ya cerrados.
Los demás casos se ven con los botones **Atendidos**, **Cerrados**, **Abiertas** o **Todos**, y *Buscar* encuentra por estudiante, código, servicio o instancia.

### 5.2 Atender el caso

![Detalle de la derivación y registro de atención](manual/img/25-detalle-derivacion.jpg)
*Figura: Detalle de la derivación y registro de atención.*

En el detalle del caso, la sección *Registrar la atención y cambiar el estado* permite avanzar el caso. Los **aspectos observados** aparecen con su nombre oficial del Anexo N.° 6 (por ejemplo «Está en riesgo de repetir algún curso»), no con códigos. Cada paso se llama por lo que se hace:

| Paso | Cómo | Qué exige |
|---|---|---|
| Recibido | Pulse **Recibir caso** (el *Nuevo estado* ya viene elegido) | — |
| En atención | Pulse **Iniciar atención** | — |
| Atendido | Pulse **Registrar atención** | **Observaciones obligatorias** |
| Cerrado | Pulse **Cerrar caso** | **Observaciones obligatorias** |

El estado **solo avanza**: no se puede volver a uno anterior ni repetirlo. Las *Observaciones / Detalles de Atención* son **internas**: las ven su servicio y la DBU, no el tutor
que derivó (él ve el estado y las fechas). Un caso **Cerrado** ya no se modifica.

### 5.3 Constancia y documento firmado

Desde el detalle puede descargar la constancia (Anexo N.° 6) y **adjuntar el escaneo firmado** en *Constancia firmada*. Queda con autor, fecha y huella.

## 6. Vicerrectorado

![Informe consolidado por escuela y facultad](manual/img/26-informe-consolidado.jpg)
*Figura: Informe consolidado por escuela y facultad.*

Perfil de **solo lectura**.

- *Informe consolidado*: cifras por escuela y facultad (tutorados, con tutor, cobertura, tutores, sesiones individuales y grupales, participantes, informes). Filtros por *Semestre,
  Facultad, Escuela profesional, Ciclo y Tutor*. Botones **Excel** y **PDF**.
- *Indicadores*: tablero con tutorados activos, cobertura de sesiones, tutorados en riesgo, derivaciones del periodo y evaluación de tutores, más gráficos por mes, servicio y escuela.
  También exportable.
- Para consultar un semestre ya cerrado, elija el semestre en el filtro: **las cifras de un semestre cerrado no cambian** aunque después se reasignen o desactiven estudiantes.

Las cifras del consolidado, del tablero y del panel de inicio coinciden entre sí.

### 6.0 Decano
El **Decano** pertenece a una facultad (la DBU la indica al crear su cuenta en *Usuarios y roles*). En **Amonestaciones** ve las de su facultad y registra una nueva: elige al docente tutor (solo aparecen los de su facultad), la fecha, el motivo y, si lo tiene, adjunta el documento (resolución o memorándum, PDF o imagen). El sistema deja constancia de quién, cuándo y la huella del archivo, pero **no aplica ninguna sanción**: la amonestación es un registro. No tiene acceso a estudiantes ni a expedientes.

La coordinación de cada escuela y la DBU consultan estas amonestaciones (la coordinación, solo las de sus escuelas) y pueden descargar el documento; los docentes tutores y los demás roles no las ven.

### 6.1 Sedes
Vicerrectorado (y la DBU) configuran en **Configuración → Sedes** las sedes de la universidad (*Sede Central, Sede Bagua, Sede Utcubamba*) y **la sede de cada escuela profesional**: una escuela pertenece a una sola sede. Se puede agregar una sede, desactivarla o activarla de nuevo; una sede inactiva no se puede asignar a una escuela. Los cambios quedan en la bitácora. Este perfil no ve datos de estudiantes.

## 7. Administrador DBU

![Panel de inicio del administrador](manual/img/27-inicio-administrador.jpg)
*Figura: Panel de inicio del administrador.*

El administrador tiene acceso a todo. Además de lo descrito para los demás roles (sección 3 a 6), administra:

### 7.1 Usuarios y roles

![Lista de usuarios](manual/img/28-usuarios.jpg)
*Figura: Lista de usuarios.*

![Alta de un Profesional de Servicio: el servicio es obligatorio](manual/img/29-usuario-nuevo-servicio.jpg)
*Figura: Alta de un Profesional de Servicio: el servicio es obligatorio.*
*Usuarios y roles*: alta de cuentas (*Nuevo Usuario*: nombre, apellido, correo, teléfono y rol), cambio de rol y **activar/desactivar** (una persona desactivada pierde el acceso de inmediato, aunque tenga la sesión abierta).

**Profesionales de servicio:** al elegir el rol *Profesional de Servicio* aparece el campo obligatorio *Servicio al que pertenece* (Escuela Profesional, Psicopedagogía, Psicología, Asistencia Social o Salud). **De ese servicio depende qué casos derivados ve y recibe**: sin él no vería ninguno, por eso el sistema no deja guardar sin elegirlo. En la tabla de usuarios aparece junto al rol (por ejemplo, «Profesional de Servicio · Psicología»).

**El correo de una cuenta debe ser institucional (@untrm.edu.pe).** El formulario lo indica debajo del campo y avisa al instante si es de otro dominio («El correo debe ser institucional…»); el sistema lo comprueba también al guardar y al cargar docentes desde Excel. Se guarda en una sola forma: da igual escribirlo con mayúsculas o con espacios al principio o al final. **No puede haber dos cuentas con el mismo correo**, aunque se escriba distinto. Una cuenta anterior a esta regla que use otro dominio sigue funcionando y se puede editar sin tocar su correo; solo se exige el dominio al crear una cuenta o al cambiar su correo. Si TI autoriza a profesionales externos, es una excepción formal de la DBU que TI agrega a la configuración del servidor (`EMAIL_ALLOWED_DOMAINS`): no se hace desde la pantalla.

Al crear la cuenta **no se genera ninguna clave**: el sistema envía al correo de la persona una **invitación con un enlace de un solo uso** (vale 72 horas) para que cree su propia contraseña, y muestra ese mismo enlace a quien administra por si el correo no sale. La cuenta queda como *Pendiente de activación* hasta que se use el enlace; antes no hay forma de entrar. Si el enlace se pierde, vence o ya se usó, use el botón *Emitir invitación nueva* de esa fila (el enlace anterior deja de servir). No comparta el enlace: quien lo abra primero crea la contraseña.

### 7.2 Catálogos maestros

![Catálogos maestros](manual/img/30-catalogos.jpg)
*Figura: Catálogos maestros.*
*Catálogos*: pestañas **Facultades, Escuelas, Periodos, Ciclos, Servicios y Motivos**. Use *Nueva …* → *Crear*; *Editar*; *Desactivar/Activar*; *Eliminar* (con confirmación; lo que ya está en uso solo se puede desactivar).
El **periodo académico activo** determina el semestre en curso para reportes y numeración de asistencias; al activar otro, el anterior queda **cerrado** con su corte de matrícula.

### 7.3 Parámetros del sistema

![Parámetros del sistema](manual/img/31-parametros.jpg)
*Figura: Parámetros del sistema.*
*Parámetros*: duración de la sesión (45 min), número de sesiones por semestre (8), umbral de alerta por inasistencias (2) y plazo de atención de derivaciones (48 h). En el grupo *Seguridad de acceso*: cierre de sesión por inactividad (15 min), intentos fallidos antes del bloqueo (5) y duración del bloqueo (15 min); el plazo de inactividad rige desde el siguiente inicio de sesión de cada persona y el servidor lo hace valer también al renovar la sesión. Los cambios rigen de inmediato (salvo lo indicado) y quedan en la bitácora.

### 7.4 Identidad visual

![Identidad visual](manual/img/32-identidad-visual.jpg)
*Figura: Identidad visual.*
*Identidad visual*: nombre de la institución, **nombre corto** (barra lateral y título del navegador), colores y logotipo (PNG, JPEG o WEBP de hasta 1 MB). *Guardar cambios* lo aplica a todo el sistema;
*Restablecer identidad UNTRM* vuelve a la original.

### 7.5 Evaluación de tutoría

![Habilitación de la evaluación por escuela](manual/img/33-evaluacion-habilitacion.jpg)
*Figura: Habilitación de la evaluación por escuela.*
*Evaluación de tutoría* lista las escuelas con su estado (*Habilitada* / *Cerrada*). Pulse *Habilitar* o *Cerrar* para abrir o cerrar la evaluación a los estudiantes de esa escuela.

### 7.6 Seguimiento DBU y Bitácora

![Seguimiento de derivaciones por la DBU](manual/img/34-seguimiento-dbu.jpg)
*Figura: Seguimiento de derivaciones por la DBU.*

![Bitácora de auditoría](manual/img/35-bitacora.jpg)
*Figura: Bitácora de auditoría.*
- *Seguimiento DBU*: todos los casos derivados por servicio y estado, con el plazo de atención.
- *Bitácora de auditoría* (y la actividad reciente del Panel de inicio): cada operación aparece con un nombre claro («Invitación de acceso emitida», «Periodo cerrado», «Tutor del ciclo asignado»…), no con su código interno. Registro de las operaciones críticas (inicios de sesión, cambios de usuarios y catálogos, adjuntos, cambios de estado) y de los **accesos a información sensible**: quién consultó o descargó un expediente, entrevistas, seguimientos, red de apoyo, derivaciones y documentos firmados, cuándo y desde qué IP, incluidos los intentos rechazados. La bitácora no guarda el contenido consultado. Se puede filtrar y no se puede modificar desde el sistema.

### 7.7 Cierre de periodo
Al terminar el periodo académico, vaya a **Periodo académico → Cierre de periodo**. La pantalla muestra el periodo vigente con un **resumen** de lo ocurrido: estudiantes, tutores, sesiones (individuales, grupales, canceladas, con asistencia), solicitudes, derivaciones, respuestas de evaluación e informes semestrales, y avisa qué quedará abierto (solicitudes, derivaciones y sesiones próximas).

1. Pulse **Cerrar periodo** y **escriba el nombre exacto del periodo** como confirmación.
2. El sistema guarda el resumen, congela la matrícula del periodo y lo deja **cerrado**. Nada se borra.
3. Desde ese momento la tutoría está en **solo lectura** para todas las personas: se puede consultar el historial, pero **no se registran** sesiones, asistencias, entrevistas, seguimientos, derivaciones ni solicitudes, y los estudiantes ven un aviso y no pueden solicitar tutoría. Siguen disponibles la administración (usuarios, catálogos, cargas de estudiantes y asignaciones) y los informes.
4. Para el reporte completo del periodo use **Informe consolidado**, **Indicadores** y **Resultados de evaluación**, eligiendo ese periodo.
5. Para empezar el siguiente, cree el periodo nuevo en *Catálogos → Periodos* y márquelo vigente. **Solo puede haber un periodo vigente**: el catálogo no deja abrir otro mientras el anterior no esté cerrado, ni apagar el vigente sin cerrarlo.

Si cerró por error, **Reabrir periodo** (en el mismo periodo cerrado) lo devuelve a vigente; solo es posible si no hay otro vigente. El cierre y la reapertura quedan en la bitácora. La numeración de asistencias reinicia en 1 en el periodo nuevo.

### 7.8 Docentes tutores por escuela
Al crear o editar un usuario con rol **Docente**, la DBU debe elegir su **escuela profesional**; de ella salen su facultad y su sede. Un docente tutor **solo puede tutorear estudiantes de su escuela** (un docente de Mecánica Eléctrica no puede tutorear a estudiantes de Sistemas):

- En *Asignación por ciclo* solo se ofrecen los docentes de la escuela.
- En *Reasignar* solo aparecen tutores de la escuela del tutorado.
- Si se intenta de otra forma, el sistema lo rechaza con el aviso «El tutor pertenece a otra escuela».
- Los docentes creados antes de esta regla quedan sin escuela hasta que la DBU se la indique (editando el usuario); mientras tanto no se bloquean.

### 7.8.1 Carga de docentes desde Excel
En **Carga de docentes** (*Gestión → Periodo académico*, solo DBU) se crean las cuentas de varios docentes tutores a la vez, con el mismo recorrido guiado de la carga de estudiantes: descargar la plantilla, subir el archivo y revisar el resultado. La plantilla lleva *nombres, apellidos, correo, teléfono y escuela*; el correo debe ser único y la escuela debe existir. Cada fila crea la cuenta del docente con su escuela y le envía el enlace de un solo uso para crear su contraseña (nadie recibe contraseñas). El resultado indica cuántos se crearon y, fila por fila, los que no se pudieron cargar (correo inválido o ya registrado, escuela que no existe…). Si el correo no pudo salir, la pantalla muestra el enlace de ese docente una sola vez para entregarlo por un medio privado. Volver a subir el mismo archivo no duplica cuentas. Al terminar, ofrece ir a *Asignación por ciclo*.

### 7.9 Asignación por ciclo
En **Asignación por ciclo** (*Gestión → Periodo académico*; DBU y coordinación de la escuela) se elige, para el periodo vigente, **el tutor de cada ciclo** de una escuela. Solo aparecen los docentes de esa escuela.

1. Elija la escuela y, en cada ciclo, el docente. Al elegirlo, los estudiantes **matriculados** de ese ciclo que no tenían tutor pasan a él; si cambia el tutor del ciclo, quienes seguían con el anterior se mueven (queda en el historial de asignaciones). Un tutor puesto a mano por la coordinación no se toca.
2. Los estudiantes que se **carguen después** (carga masiva o alta manual) en ese ciclo quedan con el tutor del ciclo.
3. **Un docente atiende un solo ciclo.** Si intenta ponerlo en otro, el sistema avisa y ofrece **registrar una excepción**: escriba el motivo (p. ej. «aceptó por correo asumir el ciclo 8»). Queda marcada como *Excepción* y en la bitácora. Un docente no puede atender más de dos ciclos.
4. **Quitar** deja el ciclo sin tutor; los estudiantes conservan el que ya tienen (para cambiarlo, use la reasignación).
5. **Aceptación del docente.** Al asignar un docente nuevo a un ciclo, recibe un correo con un enlace personal de un solo uso (vence en 72 horas). Allí **acepta** indicando los días, las horas y el lugar en que atenderá (cada sesión dura 45 minutos; el máximo semanal lo fija la DBU en *Parámetros*) o **rechaza** con un motivo. En la pantalla, cada ciclo muestra *Sin solicitar / Pendiente / Aceptó / Rechazó*, con su disponibilidad o el motivo. Si rechaza, la coordinación recibe un correo y asigna a otro docente. Si no llegó el correo, use **Reenviar** (genera un enlace nuevo e invalida el anterior). Si se cambia el docente del ciclo, la aceptación empieza de nuevo con el nuevo; si se vuelve a elegir al mismo, conserva su respuesta. En una excepción, el correo le pregunta al docente si puede asumir también ese ciclo.

## 8. Preguntas frecuentes

**No me aparece una opción del menú.** Depende de su rol. Si cree que le falta acceso, pida a la DBU revisar su rol.

**«Ya respondiste el cuestionario de este periodo».** La evaluación se responde una sola vez por periodo.

**«La evaluación no está disponible por ahora».** La DBU aún no la habilitó para su escuela, o ya se cerró.

**No puedo registrar la asistencia.** La sesión debe haber empezado; además, el tutorado no puede superar 8 asistencias individuales en el semestre.

**No puedo marcar atendida una solicitud.** Escriba antes la respuesta para el estudiante.

**No puedo cambiar un caso a un estado anterior.** Los estados solo avanzan; para *Atendido* y *Cerrado* hacen falta observaciones.

**Un estudiante no ve el menú de tutorado.** Su cuenta de portal debe estar vinculada a su registro de estudiante (*Más → Vincular cuenta*).

**La página me pide entrar de nuevo.** La sesión se cerró por inactividad o porque la contraseña fue cambiada o la cuenta desactivada.

**Veo «Demasiados intentos».** Espere unos minutos e inténtelo de nuevo.

## 9. Glosario

| Término | Significado |
|---|---|
| DBU | Dirección de Bienestar Universitario |
| Tutorado | Estudiante que recibe tutoría |
| Anexo 3 | Entrevista inicial tutorial |
| Anexo 4 | Hoja de asistencia a la tutoría individual (8 sesiones por semestre) |
| Anexo 5 | Ficha de seguimiento del tutor |
| Anexo 6 | Ficha y constancia de derivación a un servicio |
| Anexo 7 | Cuestionario de evaluación de la función tutorial |
| Anexo 8 | Plan de trabajo semestral |
| Anexo 9 | Informe semestral del tutor |
| Derivación | Envío de un caso a un servicio especializado (Escuela, Psicopedagogía, Psicología, Asistencia Social, Salud) |
| Solicitud de tutoría | Pedido de un estudiante o docente para recibir tutoría (Art. 19–20) |
| Periodo / semestre | Ciclo académico activo (por ejemplo, 2026-II) |
| Corte de matrícula | Foto de los tutorados activos al cerrar un semestre; hace que sus informes no cambien |
