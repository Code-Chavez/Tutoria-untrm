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
