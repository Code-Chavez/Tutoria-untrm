# Anexo H. Preparación del piloto y ensayo técnico

Resumen de la guía del piloto y del ensayo técnico de los recorridos de los roles (13 a 17/11/2026), con sus hallazgos y su estado. **No es un piloto con usuarios reales:** el ensayo lo ejecutó el equipo de desarrollo con guiones automatizados de Playwright en Chrome, sobre un entorno aislado y con datos ficticios (`sit-ensayo`). El documento completo es `docs/PILOTO_ESTADO_PREPARACION_2026-11-13.md`; las capturas del ensayo son las figuras anotadas del Anexo D y las del Anexo G.

## H.1 Guía del piloto

La guía (`docs/GUIA_PILOTO.md`) ordena la preparación, la ejecución y el registro del piloto con usuarios, que corresponde al objetivo específico 5 del plan. Sus tamaños de grupo, duraciones y fechas son **propuestas** por decidir con el asesor y la DBU, no resultados. Contiene: objetivo y alcance; lista de preparación (entorno, datos base, material); participantes; datos y privacidad; desarrollo de la sesión; **tareas por rol** (docente tutor T1 a T9, coordinación C1 a C5, DBU D1 a D6, profesional de servicio S1 a S4, estudiante E1 a E4 y Vicerrectorado V1 a V2); qué se registra; severidad y decisión sobre los hallazgos; y los instrumentos (hoja de observación, cuestionario de usabilidad SUS, preguntas abiertas, modelo de consentimiento, registro de hallazgos y escenario de datos ficticios).

[[tabla: Lista de preparación del piloto (13/11/2026)]]

| Punto | Estado | Responsable |
| --- | --- | --- |
| Entorno distinto del de desarrollo y accesible | Sin confirmar: solo existe el entorno local; depende de la solicitud a TI del 17/10 | TI y DBU |
| Correo real (SMTP) | Sin confirmar; el entorno local usa Mailpit | TI |
| Copia de respaldo fuera del servidor | No configurada | TI |
| Estudiantes ficticios y material (guiones, SUS, consentimiento) | Verificados en el repositorio; falta imprimir el material | Observador |
| Observadores, participantes y fechas | Sin confirmar | DBU y asesor |

## H.2 Tareas ensayadas y resultado

[[tabla: Tareas ensayadas por rol]]

| Rol | Tareas | Resultado |
| --- | --- | --- |
| Docente tutor (13/11) | T1 expediente, T2 entrevista, T3 y T4 sesiones (presencial, virtual, grupal), T5 asistencia, T6 solicitud y respuesta, T7 derivación, T8 hoja imprimible, T9 informe semestral | Completas; T4 grupal tras corregir H5 |
| DBU (15/11) | D1 cuenta de psicóloga con servicio, D2 habilitar la evaluación, D3 seguimiento, D4 bitácora, D5 duración de la sesión, D6 desactivar cuenta | Completas |
| Coordinación | C1 asignar ciclos, C2 reasignar con motivo, C3 resolución del plan, C4 nueva revisión, C5 indicadores y PDF | Completas (ver H9 y H10) |
| Profesional de servicio | S1 abrir el caso desde el aviso, S2 recibir e iniciar la atención, S3 cerrar con observaciones, S4 constancia en PDF | Completas |
| Estudiante | E1 pedir apoyo, E2 próxima sesión, E3 ver la respuesta, E4 evaluar a su tutora | Completas |
| Vicerrectorado | V1 consolidado y PDF, V2 comparar semestres | V1 completa; V2 ensayada el 17/11 con el semestre 2026-II cerrado y 2027-I vigente, sin defectos |

El 13/11 se hizo además un recorrido de solo lectura con las cuentas de docente, coordinación y estudiante: todas las pantallas abren y muestran datos de 2026-II, sin errores visibles. Al terminar el ensayo, la base volvió a su punto de partida (salvo el cierre de 2026-II del 17/11, que el entorno conserva).

## H.3 Hallazgos y estado

[[tabla: Hallazgos del ensayo técnico]]

| N.° | Hallazgo | Impacto | Estado |
| --- | --- | --- | --- |
| H1 | Residuos de pruebas automáticas en la base de desarrollo (solicitudes «E2E…», docentes y planes de prueba) | Alto si el piloto usara esa base | El piloto debe correr en un entorno aparte con base limpia |
| H2 | 2 o 3 respuestas 403 en la consola (la lista de tutores sin permiso) | Bajo | **Corregido en v1.0.0-beta.4** (#320): no se pide sin permiso |
| H3 | El filtro de escuela del tutor ofrecía las tres escuelas | Bajo | **Corregido en v1.0.0-beta.4** (#320) |
| H4 | Tras reiniciar Docker, el servidor tarda unos 7 minutos en responder | Relevante si el entorno se reinicia en una sesión | Arrancar el entorno antes y comprobar `/api/health` |
| H5 | La sesión grupal no permitía elegir a los propios tutorados | Alto para T4 | **Corregido** (#296) |
| H6 | El aviso de la ficha de derivación quedaba fuera de la vista | Medio | **Corregido** (#302) y verificado en pantalla el 15/11 |
| H7 | La estudiante no veía la respuesta hasta recargar | Bajo a medio | **Corregido** (#302): la lista se actualiza cada 30 s; verificado a los 23 s |
| H8 | La agenda rechaza sesiones solapadas con un mensaje claro | Ninguno | Buen comportamiento |
| H9 | Un docente atiende un solo ciclo; el tercer ciclo exige una excepción | Medio para preparar el piloto | Regla del sistema; **decisión de producto pendiente** del PO |
| H10 | «Plan semestral» no estaba en el menú y el formulario validaba al final | Medio | **Corregido en v1.0.0-beta.4** (#314) |
| H11 | La guía llamaba al rol de otra forma que la pantalla | Ninguno | **Corregido** (#314) |
| H12 | No se había ensayado la consulta de un semestre cerrado | Bajo | **Ensayado el 17/11** (#318) sin defectos |
| H13 | Al desactivar una cuenta se pide confirmación | Ninguno | Buen comportamiento |

[[fuente: Estado de preparación del piloto, 13 a 17/11/2026 (documento del proyecto).]]

## H.4 Lo que el ensayo no demuestra

No hubo participantes reales ni se midieron tiempos, éxito de tarea ni satisfacción; no sustituye la prueba de usabilidad. El entorno no era el institucional (sin HTTPS, correo real ni respaldo externo). Queda pendiente decidir la versión a probar, el entorno, los participantes, los observadores y las fechas (Anexo L).
