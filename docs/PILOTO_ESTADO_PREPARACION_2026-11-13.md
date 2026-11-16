# Estado de preparación del piloto — TT-102 (13/11/2026)

Complementa la [Guía del piloto](GUIA_PILOTO.md) (sección 2, lista de preparación). Issue: #293. Lo que dice «verificado» se comprobó en el repositorio o en el stack local ese día; lo demás lo deben confirmar las personas indicadas. Las fechas y los tamaños de grupo siguen siendo propuestas.

## Versión a probar

| Dato | Estado |
|---|---|
| Última etiqueta | `v1.0.0-beta.2` (05/11/2026) |
| Estado de `develop` | 102 commits posteriores (certificación del tutor, pedidos de listas por facultad, estudiantes por periodo, reorganización del menú, endurecimiento de `GET /roles`). CI en verde. |
| **Decisión pendiente (DBU/asesor)** | Probar `v1.0.0-beta.2` tal cual o crear una etiqueta nueva sobre `develop`. La guía solo pide anotar etiqueta y commit en la hoja de sesión. |

## Lista de preparación (guía, sección 2)

| Punto | Estado | Responsable |
|---|---|---|
| Entorno distinto del de desarrollo y accesible | **Sin confirmar.** Solo existe el stack local (`tutoria-untrm`). Depende de la solicitud a TI del 17/10 (servidor, dominio, HTTPS). | TI / DBU |
| Correo real (SMTP) | **Sin confirmar.** Local usa Mailpit; `SMTP_HOST` está vacío en `server/.env.example`. Probar con `deploy/probar-smtp.js`. | TI |
| Copia de respaldo fuera del servidor | **No configurada.** El respaldo local avisa «no hay copia fuera de este equipo» (`BACKUP_OFFSITE_DIR` / `BACKUP_UPLOAD_CMD`). | TI |
| Respaldo antes y después de cargar datos | Procedimiento listo (`backup.sh`, `restore.sh`); falta hacerlo en el entorno del piloto. | Quien instale |
| Datos base, cuentas, carga masiva, asignación, portal, evaluación, plan | Se hacen desde la aplicación una vez instalado el entorno. | DBU |
| Estudiantes ficticios | **Verificado:** `docs/piloto/estudiantes_ficticios_piloto.xlsx` (12 estudiantes). | — |
| Material: guion por rol, hoja de observación, SUS, preguntas, consentimiento, registro de hallazgos | **Verificado:** secciones 6 y anexos A–F de la guía. Falta imprimirlos. | Observador |
| Observadores y canal de contacto | Sin confirmar. | DBU |
| Participantes y fechas | Sin confirmar (la guía propone grupos por rol y 2 horas por sesión). | DBU / asesor |

## Siguiente paso

1. Confirmar con TI si el entorno, el correo y el respaldo externo están entregados. Si no, decidir si el piloto se hace en un equipo propio con datos ficticios (sin HTTPS ni correo real) o se aplaza.
2. Decidir la versión y, si se crea una etiqueta nueva, pasar por el flujo de release (merge a `main` por la persona responsable).
3. Con el entorno listo: respaldo, carga de datos ficticios, cuentas, y un ensayo del recorrido de cada rol antes de la primera sesión.
4. Tras cada sesión, registrar los hallazgos en el anexo E y abrir un issue por cada defecto (insumo de TT-103).

## Ensayo del recorrido (13/11/2026, solo lectura)

Se entró con las cuentas de demostración de **docente tutor**, **coordinación** y **estudiante** en el stack local y se abrieron las pantallas de sus tareas (guía, sección 6). No se creó ni se cambió ningún dato. No se recorrieron profesional de servicio, vicerrectorado ni decanato (el acceso por rol de la API sí se comprobó en la revisión de seguridad del mismo día).

**Resultado:** todas las pantallas abren y muestran datos de 2026-II; el inicio de cada rol ofrece sus tareas por área; el menú reorganizado se entiende. Sin errores visibles para la persona.

| # | Hallazgo | Impacto en el piloto | Acción propuesta |
|---|---|---|---|
| H1 | **Residuos de pruebas automáticas en la base de desarrollo:** solicitudes con «E2E mvc…» en el motivo (33 por atender del tutor, historial del estudiante), docentes «Prueba E2E …», 13 revisiones del plan con `resolucion-e2e.pdf`, correo de pedido `lista-bloque-…@untrm.edu.pe` en una escuela. | **Alto** si el piloto usara esta base: confunde a quien participa y esconde las tareas reales. | El piloto debe correr en un entorno aparte con una base limpia y los datos ficticios de la guía (sección 4 y anexo F), no en la de desarrollo. |
| H2 | La consola del navegador muestra 2 a 3 respuestas 403 en pantallas de tutor, coordinación y estudiante (p. ej. la lista de tutores en Estudiantes, que exige `students:write` y se ignora a propósito). | **Bajo**: la persona no lo ve. | Pedir esas consultas solo a quien tiene el permiso (mejora menor, no bloquea). |
| H3 | El filtro de escuela en Estudiantes del tutor ofrece las tres escuelas aunque solo ve estudiantes de la suya. | **Bajo**: es el catálogo, no datos. | Evaluar tras el piloto si confunde. |
| H4 | Tras reiniciar Docker, el servidor tarda unos 7 minutos en responder y las pantallas muestran «Cargando…» al principio. | Relevante si el entorno del piloto se reinicia durante una sesión. | Arrancar el entorno antes y comprobar `/api/health` antes de recibir a los participantes. |

## Ensayo con escritura de las tareas T1 a T9 (13/11/2026)

Se ejecutaron las tareas T1 a T9 de la guía (sección 6.1, docente tutor) con Playwright y el navegador Chrome contra el entorno de ensayo (`sit-ensayo`: cliente 5174, API 3100, base `sit_ensayo`), con las cuentas de demostración y datos ficticios. T6 y T7 usan además la cuenta de la estudiante y la de la tutora. Al terminar, la base volvió a su punto de partida (24 estudiantes, sin solicitudes ni sesiones).

| Tarea | Resultado |
|---|---|
| T1 Encontrar a los tutorados y abrir un expediente | Completa |
| T2 Entrevista inicial (asistente de 5 pasos) | Completa |
| T3 Sesión presencial para la semana próxima | Completa; aparece en el calendario semanal |
| T4 Sesión virtual y sesión grupal con dos estudiantes | Virtual completa. **Grupal: no se podía** (hallazgo H5); completa tras la corrección |
| T5 Asistencia de una sesión que ya empezó | Completa (se puede programar una sesión de hoy que ya pasó) |
| T6 La estudiante pide ayuda y la tutora responde | Completa; la estudiante ve la respuesta |
| T7 Derivar un caso a Psicología | Completa (ver H6) |
| T8 Hoja de asistencia para imprimir | Completa; PDF descargado |
| T9 Informe del semestre | Completa; guardado y PDF exportado |

| # | Hallazgo | Impacto | Estado |
|---|---|---|---|
| H5 | En «Sesión grupal» no se podía marcar a los estudiantes que ya tienen tutor (aviso «Ya tiene tutor: para cambiarlo usa «Reasignar»»), es decir, a los propios tutorados de quien agenda; el filtro «Solo sin asignar» tampoco hacía nada. | **Alto** para T4: la tutora no podía formar un grupo con sus tutorados. | Corregido en #296 (issue #295). |
| H6 | En la ficha de derivación hay que marcar al menos un aspecto observado; sin eso el diálogo no se cierra. En el ensayo se detectó porque el guion no lo marcó; no se verificó dónde se muestra el aviso. | Posible confusión de quien no marca ninguno. | **Corregido en #302** (issue #301): el aviso va en el pie del diálogo, junto al botón, y se anuncia como alerta. Verificado en pantalla el 15/11. |
| H7 | En «Solicitar tutoría» de la estudiante, la lista no se actualizó sola cuando la tutora respondió: mostraba «Pendiente» hasta recargar la página. | Bajo a medio: la estudiante ve el estado desfasado si deja la pantalla abierta. | **Corregido en #302** (issue #301): la lista se revisa cada 30 s y al volver a la pestaña. Verificado en pantalla el 15/11: la respuesta apareció sin recargar a los 23 s. |
| H8 | La agenda no admite dos sesiones que se solapen y lo dice con claridad («El tutor ya tiene una sesión programada que se solapa con este horario»). | Ninguno; es un buen mensaje. | — |

Evidencia (capturas y PDF) en `C:\tmp\ensayo\evidencia` del equipo de ensayo; los guiones están en el worktree `C:\tmp\wt-ensayo\e2e\tests-ensayo`.

Nota: el cliente del entorno de ensayo corre ahora con la corrección de H5 (develop más #296). Si #296 no se fusiona, el ensayo de T4 sigue sin poder completarse.

## Ensayo con escritura de los demás roles (15/11/2026)

Se ejecutaron con Playwright y Chrome, contra `sit-ensayo` (código de develop `bbfc664`, que incluye #296), las tareas D1 a D6 (DBU), C1 a C5 (coordinador), S1 a S4 (profesional de servicio), E1 a E4 (estudiante) y V1 a V2 (Vicerrectorado) de la guía (sección 6), con datos ficticios. En total 22 tareas; todas se pudieron completar, algunas con las salvedades de la tabla de hallazgos.

| Rol | Tareas | Resultado |
|---|---|---|
| DBU | D1 cuenta de psicóloga con servicio; D2 habilitar la evaluación; D3 seguimiento; D4 bitácora; D5 duración de sesión a 40 min (se restituyó); D6 desactivar cuenta | Completas |
| Coordinador | C1 asignar ciclos; C2 reasignar con motivo; C3 resolución del plan; C4 nueva revisión del plan aprobado; C5 indicadores y PDF | Completas (ver H9 y H10) |
| Profesional de servicio | S1 abrir el caso desde el aviso; S2 recibir e iniciar la atención; S3 cerrar con observaciones; S4 constancia en PDF | Completas |
| Estudiante | E1 pedir apoyo; E2 ver la próxima sesión; E3 ver la respuesta; E4 evaluar a su tutora | Completas |
| Vicerrectorado | V1 consolidado y PDF; V2 comparar semestres | V1 completa; V2 solo se vio el periodo vigente (ver H12) |

| # | Hallazgo | Impacto | Estado |
|---|---|---|---|
| H9 | Un docente atiende un solo ciclo. Con dos docentes en la escuela, el tercer ciclo abre el diálogo «Registrar excepción» y pide un motivo. Es la regla del sistema, no un defecto. | **Medio** para preparar el piloto: la escuela necesita tantos docentes como ciclos con estudiantes, o la coordinación tendrá que registrar excepciones. | Informar al coordinador antes de la sesión; llevar suficientes docentes en el escenario. |
| H10 | «Plan semestral» no está en el menú lateral: se abre desde la tarjeta del panel de inicio. El formulario tiene decenas de campos obligatorios y valida al final: en el ensayo, con el plan vacío, el aviso («Indique al menos un objetivo específico») aparecía al pie, lejos de los campos vacíos. Por eso C3 cargó el plan por API y solo ensayó por pantalla la resolución. | **Medio**: C3 puede tomar mucho más tiempo del esperado o no completarse. | Sin corregir. Dar a la coordinadora el plan ya redactado o ensayar el formulario completo en una sesión aparte; evaluar mostrar el error junto al campo. |
| H11 | La guía llama «Profesional de Servicio» al rol; la pantalla dice «Profesional de servicio» (y «Estudiante» para el rol de los tutorados). | Ninguno. | Alinear la redacción de la guía. |
| H12 | El entorno de ensayo solo tiene el periodo 2026-II, así que la comparación con un semestre cerrado (V2) no se pudo ensayar. | Bajo. | Cerrar un periodo de prueba en el ensayo o ensayar V2 en el entorno de desarrollo (que tiene 2027-I cerrado). |
| H13 | Al desactivar una cuenta se pide confirmación («¿Confirmas desactivar a …?»); la cuenta queda inactiva de inmediato. | Ninguno; es un buen comportamiento. | — |

Evidencia (capturas y PDF) en `C:\tmp\ensayo\evidencia` del equipo de ensayo; los guiones están en el worktree `C:\tmp\wt-ensayo\e2e\tests-ensayo` (`piloto-r1-dbu`, `piloto-r2-coordinador`, `piloto-r3-servicio-estudiante-vice`). Al terminar, el entorno conserva las cuentas, solicitudes, casos, plan y respuesta de evaluación creados; se puede volver al punto de partida con el respaldo indicado en el README del entorno.

## Verificación de H6 y H7 (15/11/2026)

Tras fusionar #302 se reconstruyó `sit-ensayo` con develop `795a50b` y se repitieron ambos casos con Playwright y Chrome: (H6) con la ventana a 1280×720 y sin marcar ningún aspecto, el aviso queda dentro de la ventana visible, encima de «Derivar caso», y el siguiente aviso (motivo) aparece en el mismo lugar; (H7) la estudiante dejó abierta «Solicitar tutoría», la tutora respondió desde otra sesión y la respuesta apareció sola a los 23 s, sin recargar. Capturas en `C:/tmp/ensayo/evidencia` (`H6-verificado-*`, `H7-verificado-*`).
