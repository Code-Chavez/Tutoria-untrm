# Capítulo VI. Pruebas, seguridad y resultados

## 6.1 Estrategia de verificación

El proyecto reúne pruebas unitarias del servidor con Jest, pruebas de integración y de permisos contra una base de datos real y exclusiva (que se niega a correr sobre la de desarrollo), pruebas de componentes del cliente con Vitest y Testing Library, recorridos de extremo a extremo con Playwright en la integración continua (Microsoft, s. f.), ensayos de respaldo y restauración, recorridos de aceptación manual y el ensayo técnico de los roles. Cada nivel comprueba cosas distintas: la consulta de una API acredita reglas y respuestas, pero no demuestra por sí sola que una persona complete cómodamente un formulario ni que un impreso sea legible.

Los requisitos de calidad se ordenan con el modelo de la norma ISO/IEC 25010 (ISO e IEC, 2023) y las revisiones de seguridad con el OWASP Top 10 (OWASP Foundation, 2021); se declara el nivel de cada comprobación para no atribuirle más de lo que demuestra.

## 6.2 Resultados verificados

Las cifras provienen de la integración continua sobre el commit `21b04d3` de `main` (etiqueta `v1.0.0-beta.4`, 19/11/2026), cuya ejecución terminó satisfactoriamente.

[[tabla: Resultados de la verificación automática (commit 21b04d3, v1.0.0-beta.4)]]

| Verificación | Resultado | Fuente y fecha |
| --- | --- | --- |
| Pruebas del servidor | 1 709 pruebas en 183 conjuntos, todas aprobadas; cobertura de sentencias 90,96 % | Integración continua, 19/11/2026 |
| Pruebas del cliente | 775 pruebas en 102 archivos, todas aprobadas; cobertura de sentencias 78,99 % | Integración continua, 19/11/2026 |
| Recorridos de extremo a extremo en Chrome | 141 pruebas aprobadas, 1 omitida | Integración continua, 19/11/2026 |
| Calidad estática y compilación | Estilo, tipos estrictos y compilación del servidor y del cliente sin errores | Integración continua, 19/11/2026 |
| Auditoría de dependencias | Sin vulnerabilidades en producción en el cliente; una advertencia moderada ignorada y documentada en el servidor | Integración continua y revisiones de seguridad |
| Ensayo de restauración de respaldos | Aprobado (respaldo con adjuntos, fallo controlado, retención y restauración idéntica byte a byte) | Integración continua, 19/11/2026 |
| Construcción de imágenes y migraciones | Aprobadas (el trabajo corre en los empujes a `develop` y `main`) | Integración continua, 19/11/2026 |

[[fuente: Ejecución de integración continua del repositorio sobre el commit 21b04d3 (Anexo F).]]

Las cifras corresponden al commit indicado y no deben reutilizarse para otra versión. A modo de comparación, en la versión v1.0.0-beta.3 (commit 11486c3, 16/11/2026) eran 1 704 pruebas del servidor y 766 del cliente, y en el corte de la versión anterior del informe (commit 3860bd2, 11/10/2026) eran 689 y 299. Las coberturas superan el 70 % que fija la Definition of Done en conjunto; el criterio se refiere a la lógica de negocio del módulo y no se midió por separado. Las ejecuciones de Firefox y WebKit se hacen en cada solicitud de integración que toca código, para una selección de suites, y de forma programada; Edge comparte el motor de Chrome y se prueba a mano antes de cada lanzamiento.

## 6.3 Revisiones de seguridad

Se realizaron tres revisiones con las categorías del OWASP Top 10 (OWASP Foundation, 2021), que combinaron el análisis del código y el sondeo de la API en ejecución con una cuenta de cada rol.

[[tabla: Revisiones de seguridad del proyecto]]

| Fecha | Alcance | Resultado |
| --- | --- | --- |
| 11/10/2026 | Informe inicial sobre el sistema de esa fecha | Ningún hallazgo alto; un hallazgo medio y cinco bajos, corregidos (validación del contenido de los archivos, tiempo de respuesta del inicio de sesión, estado de una cuenta desactivada, JSON mal formado, tope de intentos por IP, dependencia de desarrollo con aviso), y una advertencia moderada de dependencias documentada |
| 12/11/2026 | Lo agregado después: certificación, pedidos por facultad, estudiantes por periodo, roles configurables y catálogos | Un hallazgo bajo, corregido: el listado de roles respondía a cualquier cuenta autenticada, incluido un estudiante, y ahora exige el permiso de lectura de usuarios; una prueba recorre todas las rutas y exige sesión |
| 19/11/2026 | Lo cambiado hasta v1.0.0-beta.4 | Ninguna ruta nueva; un hallazgo bajo (campos internos en los pedidos de facultad que ve la coordinación), cuya corrección estaba en revisión al cierre de este corte; misma advertencia moderada de dependencias |

[[fuente: Informes de seguridad del proyecto (Anexo I).]]

Ninguna revisión incluyó un escáner dinámico externo ni la infraestructura de producción, que dependen de un entorno desplegado; ambos quedan como actividades pendientes. La revisión del 19/11 tampoco repitió el sondeo de la API en ejecución, porque no hay un entorno con el código de v1.0.0-beta.4.

## 6.4 Auditoría funcional y ensayo técnico de los roles

**Auditoría del 17/11/2026.** Revisó el estado del producto y la preparación del piloto sobre el código de `develop`. Sus hallazgos se resolvieron o se mitigaron por vía de issues y solicitudes de integración: la lista de estudiantes pedía los tutores aunque la cuenta no tuviera permiso y ofrecía escuelas fuera de su alcance; los pedidos de facultad y de escuela no se advertían entre sí; el historial por semestre mezclaba el ciclo de la matrícula con la escuela y el tutor actuales; y los documentos de estado discrepaban sobre la versión de partida. Siguen abiertos «Todos los periodos» como padrón general, el comportamiento del botón Atrás en las listas filtradas y la opción de guardar escuela y tutor por periodo, que se decidió dejar para después del piloto (Anexo I).

**Ensayo técnico del piloto (13 a 17/11/2026).** Con guiones automatizados de Playwright en Chrome, sobre un entorno aislado con datos ficticios, se ensayaron las tareas de cada rol según la guía del piloto: docente tutor, coordinación, administración de la DBU, profesional de servicio, estudiante y Vicerrectorado. Se completaron las 22 tareas con escritura de los demás roles, además de las nueve de la tutora, y el 17/11 se ensayó también la comparación de un semestre cerrado con el vigente (cierre del 2026-II, apertura del 2027-I). **No fue un piloto:** lo ejecutó el propio equipo de desarrollo, sin participantes reales, sin medir tiempos ni éxito de tarea con personas, y no sustituye la prueba de usabilidad.

[[tabla: Hallazgos del ensayo técnico y su estado]]

| Hallazgo | Descripción | Estado |
| --- | --- | --- |
| H5 | La sesión grupal no permitía elegir a estudiantes que ya tienen tutor | Corregido |
| H6 | El aviso de validación de la ficha de derivación quedaba fuera de la vista | Corregido |
| H7 | La estudiante no veía la respuesta de su tutora hasta recargar | Corregido |
| H9 | Un docente atiende un solo ciclo; con pocos docentes el tercer ciclo exige una excepción | Regla del sistema; decisión de producto pendiente |
| H10 | «Plan semestral» no estaba en el menú y su formulario validaba tarde | Corregido en v1.0.0-beta.4 |
| H11 | La guía llamaba al rol de forma distinta a la pantalla | Corregido |
| H12 | No se había ensayado la consulta de un semestre cerrado | Ensayado el 17/11/2026 sin defectos |

[[fuente: Estado de preparación del piloto (Anexo H).]]

## 6.5 Relación entre objetivos y productos

[[tabla: Objetivos específicos, productos y alcance pendiente]]

| Objetivo | Producto registrado | Alcance pendiente |
| --- | --- | --- |
| 1. Requerimientos | Historias de usuario y tareas técnicas, matriz de trazabilidad, levantamiento de ampliaciones | Conformidad de la DBU y control de cambios |
| 2. Modelado | Esquema de datos (50 tablas), diagramas de casos de uso, entidad-relación, clases, actividades, secuencia, estados, componentes y despliegue | Diagramas de procesos AS-IS/TO-BE, que requieren la línea de base institucional |
| 3. Interfaz | Aplicación web revisada por rol, menú reorganizado y recorridos de extremo a extremo | Medición de usabilidad y pruebas en dispositivos móviles reales |
| 4. Implementación | Módulos, importación de Excel, autenticación, almacenamiento de evidencias, migraciones y certificación en demostración | Aceptación formal de la versión de entrega y formato oficial del certificado |
| 5. Validación | Pruebas automáticas, aceptación manual, tres revisiones de seguridad, auditoría y ensayo técnico de los roles | Rendimiento, usabilidad y piloto con usuarios reales; escáner dinámico externo |
| 6. Documentación | Manuales de usuario y del sistema, guías de despliegue, respaldo y piloto, y este informe con sus anexos | Aprobación del Product Owner y capacitación |

## 6.6 Limitaciones de los resultados

No se dispone en este corte de una medición comparativa de tiempos del proceso institucional ni de resultados de un piloto con usuarios reales. Tampoco se acredita la culminación de las prácticas, sus horas efectivas, la capacitación final, la puesta en producción institucional ni la aprobación de la versión por el Product Owner. La existencia de funciones y pruebas permite describir el avance técnico, pero no permite concluir que todos los objetivos hayan sido aceptados.

Los requisitos de rendimiento (respuesta de operaciones frecuentes en hasta tres segundos con al menos cien usuarios concurrentes e importación de dos mil registros en menos de dos minutos) y de disponibilidad (99 %) requieren datos de carga, un entorno de despliegue y seguimiento operacional que todavía no existen; las pruebas de extremo a extremo se ejecutaron en ejecutores de automatización y no sirven como medición de rendimiento. El entorno de producción de la UNTRM, el correo saliente real y la copia de respaldo fuera del servidor dependen de la Oficina de TI y no estaban confirmados al corte.
