# Propuesta: tutoría por ciclo académico — cierre, cargas, tutores por facultad y sede

Elaborada el 15/10/2026 a partir de lo conversado con el asesor, del **Protocolo N.° 01-2024-UNTRM/DBU** (leído en su texto: Títulos I a V y el flujograma del Anexo 2) y del estado actual del sistema. Es una propuesta para decidir, **no** una implementación: nada de esto está hecho todavía y no forma parte de `v1.0.0-beta.1`.

## 1. Lo que entendí

1. La tutoría se organiza **por periodo académico** (hoy 2026-II). Al terminar el periodo, la tutoría **se cierra**: se genera su reporte, los estudiantes dejan de tener acceso y todo lo registrado queda como **historia de solo lectura**. El sistema trabaja solo con el periodo abierto, para no sobrecargarse.
2. Al comenzar cada periodo se **cargan**: estudiantes, tutorados (qué estudiantes están en tutoría) y tutores, por Excel. Esos Excel los entrega la universidad: el sistema ayuda a **pedirlos por correo**, con los campos ya llenados (periodo, facultad, escuela, ciclo, columnas necesarias y el formato).
3. Los tutores se asignan **por ciclo de estudios y escuela**, no estudiante por estudiante: «el ciclo 3 de Sistemas es de Juan».
4. Un tutor pertenece a una **facultad y a una sede** (ejemplo: un docente de Bagua no puede atender a un estudiante de Chachapoyas: esa tutoría sería inválida).
5. Cargados los tutores, el sistema les **escribe para que acepten o rechacen**, y si aceptan indiquen **qué días y horas** tienen. Si rechazan, se propone otro docente; si no hay disposición, hay consecuencias (amonestación).
6. Las **credenciales iniciales son de acceso único**: quien entra con la clave inicial y sale sin cambiarla no puede volver a entrar con ella. Antes de ese primer ingreso la persona recibe la indicación de qué hacer.
7. Hay que poner **todos los roles** del flujograma del Anexo 2.

## 2. Lo que dice el protocolo (y lo que no)

| Punto de la conversación | Qué dice el protocolo | Consecuencia |
|---|---|---|
| Roles | Art. 5: Vicerrectorado Académico, Dirección de Bienestar Universitario, Dirección de Gestión Docente, **coordinador del sistema de tutoría de las facultades**, **responsable de las escuelas profesionales**, docentes tutores y tutorandos. Anexo 2: Vicerrector académico, DBU, Servicio de Psicopedagogía y Tutoría, **Decano**, Coordinador de tutoría, Docente tutor. | El rol **Decano** no existe en el sistema y el flujograma le da funciones (proponer coordinador y tutores). |
| Quién asigna tutores | Anexo 2: **el Decano propone** coordinador y tutores; el coordinador elabora la lista de tutores y el plan de trabajo. Art. 17.a: el plan lleva resolución con «asignación de docentes». | La designación nace en la facultad, no en la DBU. |
| «Tutores de cada ciclo» | Art. 22.a: «los tutores **de cada ciclo** son los encargados del seguimiento de sus estudiantes». | **Respalda** asignar el tutor por ciclo. |
| Amonestación | Art. 24: **la facultad** emite la amonestación escrita, que queda en el archivo del tutor; o **reasigna** sus responsabilidades. | La emite la facultad (decano), no la coordinadora; el sistema solo puede **registrarla y adjuntar el documento**. |
| «Dos horas a la semana» | **No aparece** en el texto que leí. Art. 15.c fija sesiones de **45 minutos**. | Hace falta saber de qué norma sale; mientras tanto sería un parámetro editable por la DBU. |
| Quién entrega las listas | **No lo dice.** Solo el Art. 19.a nombra a la **Dirección de Admisión y Registros Académicos** como fuente del reporte de estudiantes con riesgo académico. | El destinatario del pedido debe ser un dato configurable por facultad y escuela, a confirmar con la DBU. |
| Cierre de ciclo / reporte | El plan de trabajo (Anexo 8) y el **informe semestral** (Anexo 9) ya son por semestre. | El reporte de cierre se apoya en lo que el sistema ya genera. |

## 3. Qué existe hoy en el sistema

- **Periodos académicos** (`academic_periods`): nombre, fechas y un indicador de activo. Evaluaciones, planes de trabajo, informes semestrales, asistencias y **fotos de estudiantes por periodo** (`student_period_snapshots`) ya cuelgan del periodo.
- **No hay «cerrar periodo»**: ningún flujo cierra el periodo, genera el reporte final, bloquea escrituras ni retira el acceso de los estudiantes.
- Los **estudiantes son permanentes** (una fila con ciclo y escuela) y su tutor se guarda en el propio estudiante; **no hay matrícula por periodo**.
- **Tutores**: el rol Docente Tutor no está ligado a ninguna facultad, escuela ni sede, y la asignación solo exige que sea un tutor activo (no valida que coincida con la escuela o sede del estudiante). **No existe el concepto de sede.**
- **Cargas por Excel**: hay importación de **estudiantes** (con validación de correo, teléfono y nombres) y asignación masiva de estudiantes a un tutor. **No hay** importación de tutores ni de tutorados por periodo, ni plantilla descargable, ni pedido por correo.
- **Correo**: ya hay envío con cola, reintentos y TLS configurable (A10): sirve de base para los pedidos y las invitaciones.
- **Claves iniciales**: la clave temporal obliga a cambiarla antes de usar el sistema, pero **no es de un solo uso** (se puede volver a entrar con ella mientras no se cambie) y **no hay forma de reemitirla** salvo recrear la cuenta o usar la recuperación por correo.
- **Roles**: Administrador DBU, Coordinador, Docente Tutor, Profesional de Servicio, Vicerrectorado y Tutorado (visibles como Administrador, Coordinador, Docente, Profesional de …, Vicerrectorado, Estudiante).

## 4. Propuesta por fases

| Fase | Qué incluye | Depende de |
|---|---|---|
| **0 — Credenciales de acceso único** (pequeña) | La clave temporal deja de servir tras el primer ingreso aunque no se cambie la clave; la DBU puede **reemitir** una clave temporal nueva (o enviar una **invitación por enlace** de un solo uso, que evita mandar una clave por correo); mensaje de orientación en el primer ingreso. | Decidir invitación por enlace vs. clave en el correo |
| **1 — Ciclo de vida del periodo** (hecha: ver el PR de la fase 1; el acceso de lectura de cada rol a un periodo cerrado sigue como hasta ahora) | Estados abierto/cerrado; **cerrar periodo** con su reporte (consolidado e informes semestrales) y confirmación; tras cerrar, todo el periodo pasa a **solo lectura** y los estudiantes **no acceden**; consultas por defecto limitadas al periodo abierto; consulta de periodos cerrados solo para la DBU y coordinadores. | Qué ve exactamente cada rol de un periodo cerrado |
| **2 — Cargas por periodo** | **Matrícula por periodo** (quién está en tutoría ese periodo, con su escuela y ciclo); plantillas Excel descargables (estudiantes y tutores) con sus columnas; **importación de tutores**; **pedido por correo** con los campos llenos y registro de qué se pidió y cuándo llegó; una carga nueva reactiva a los estudiantes que continúan (misma cuenta). | Quién envía las listas, con qué correo, y las columnas que se piden |
| **3 — Tutores por facultad, sede y ciclo** | Facultad y **sede** del tutor; sede de cada escuela; asignación **por escuela y ciclo** para el periodo (los estudiantes de ese grupo quedan asignados); el sistema **rechaza** asignar un tutor de otra facultad o sede. | Lista de sedes y a qué sede pertenece cada escuela |
| **4 — Aceptación del tutor** | Correo a cada tutor con enlace: **acepta o rechaza** y, si acepta, **días y horas de atención** (con el máximo semanal como parámetro); si rechaza, aviso al coordinador para reasignar; registro de la **amonestación** de la facultad (documento adjunto y fecha) sin automatizar la sanción. | Fuente de las «dos horas»; quién registra la amonestación |
| **5 — Rol Decano y flujo del Anexo 2** | Rol **Decano** (propone coordinador y tutores, recibe la lista, emite la amonestación) y revisión de los demás roles contra el flujograma. | Decisión de la DBU sobre el rol |

Orden sugerido: 0 → 1 → 3 → 2 → 4 → 5. Las fases 0 y 1 son las que más reducen riesgo para el piloto del 13/11. **Todo lo anterior requiere cambios de base de datos y de permisos**, por lo que conviene hacerlo con pruebas y revisión como los hallazgos de la auditoría, no a último momento.

## 5. Decisiones que necesito

1. **Quién entrega los Excel** (estudiantes y tutores) en cada facultad: ¿Decanato, Dirección de Escuela, Admisión y Registros Académicos? ¿Qué correos?
2. **Sedes:** ¿cuáles son y cada **escuela** pertenece a una sola sede? ¿O una misma escuela existe en dos sedes?
3. **Las «dos horas a la semana»:** ¿en qué documento figuran? El protocolo que leí solo habla de sesiones de 45 minutos.
4. **Amonestación:** el protocolo la asigna a la **facultad**. ¿La registra el coordinador en nombre del decano, o se crea el rol Decano?
5. **Un tutor por ciclo y escuela:** si un ciclo tiene muchos estudiantes, ¿se admite más de un tutor por grupo (secciones)?
6. **Estudiantes al cerrar el periodo:** ¿sin ningún acceso, o solo lectura de su propio historial?
7. **Claves iniciales:** ¿invitación por **enlace** de un solo uso (recomendado: no viaja una clave por correo) o la clave temporal en el correo?
8. **Material recibido:** de la conversación llegó la imagen del **flujograma (Anexo 2)** y el protocolo; **no llegó** la captura de la lista de usuarios de la que hablas. Si es otra imagen, vuelve a enviarla.

## 6. Decisiones tomadas (15/10/2026, el responsable del proyecto)

1. **Pedido de los Excel:** el correo al que se pide es **configurable por facultad/escuela** por la persona que administra (no se fija una sola dirección ni persona). Si no hay correo configurado, el botón de pedir lleva a configurarlo. Se puede cambiar el destinatario y volver a pedir si no llegó. Pendiente fuera del sistema: coordinar con la universidad a quién y cuándo se pide.
2. **Sedes:** la universidad tiene **tres: Sede Central, Sede Bagua y Sede Utcubamba**. Deben poder **configurarse en el sistema** (catálogo de sedes, a cargo del rol Vicerrectorado) y **cada escuela pertenece a una sola sede**.
3. **Horas de tutoría:** no son «2 horas semanales»: la sesión es de **45 minutos** (hora pedagógica) y **cada docente decide cuándo, cuánto (mínimo 45 min) y dónde** atiende.
4. **Amonestación:** se crea el **rol Decano**, que es quien amonesta (el protocolo la asigna a la facultad).
5. **Un tutor por ciclo y escuela:** **no se admite más de un tutor por ciclo**, ni que un mismo tutor atienda varios ciclos, ni que atienda a una escuela distinta de la suya (un docente de Mecatrónica no tutoriza a Sistemas). Hay un problema práctico (5 docentes nombrados para 10 ciclos) que **resuelve la facultad**; el sistema debe permitir una **excepción**: un tutor con **dos ciclos**, solicitada al docente por correo («este ciclo está sin tutoría, ¿puede asumirlo?») y registrada como excepción.
6. **Al cerrar el periodo:** el estudiante queda con **solo lectura de su historial**. Al abrirse un periodo nuevo recupera el acceso **solo si vuelve a estar cargado** (en el nuevo Excel, por su código); si no está, solo lectura y **no puede solicitar nada**.
7. **Claves iniciales:** **invitación por enlace de un solo uso y con vencimiento**, lo más seguro posible: no se envía ni se muestra ninguna clave.

