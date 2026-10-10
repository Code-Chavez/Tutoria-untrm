# Guion de aceptación — release v0.4.0

**Para qué sirve:** la revisión por roles del 8 de octubre de 2026 dejó como condición de salida del release estable
un recorrido completo con datos de prueba, que ninguna suite automática reemplaza. Este guion lo hace repetible y
deja evidencia. Se ejecuta en una **base desechable** con cuentas ficticias; nunca con datos reales.

> Las pruebas automáticas (servidor con base real, cliente, CI) ya cubren cada regla por separado. Aquí se comprueba
> que **el conjunto funciona de punta a punta, visto por cada rol**, y lo que solo una persona puede juzgar (textos,
> impresos, lectura de PDF/Excel, correo recibido).

## 0. Preparar la base desechable

```bash
docker compose down -v          # borra los volúmenes de DESARROLLO (datos de demostración)
docker compose up -d --build    # migra, siembra las cuentas de prueba y levanta todo
```

Bandeja de correo de desarrollo (recuperación de contraseña): http://localhost:8025 · Aplicación: http://localhost:5173

| Rol | Cuenta | Contraseña |
|---|---|---|
| Administrador DBU | `7183255722@untrm.edu.pe` | `Admin2026!` |
| Coordinador (Sistemas) | `rosa.mendoza@untrm.edu.pe` | `Demo2026!` |
| Coordinador (Mecánica Eléctrica) | `carlos.vega@untrm.edu.pe` | `Demo2026!` |
| Docente tutor (Ana y Luis) | `elena.ramirez@untrm.edu.pe` | `Demo2026!` |
| Docente tutor (María y Jhon) | `jorge.salazar@untrm.edu.pe` | `Demo2026!` |
| Profesional de Psicología | `lucia.flores@untrm.edu.pe` | `Demo2026!` |
| Profesional de Salud | `ronald.diaz@untrm.edu.pe` | `Demo2026!` |
| Vicerrectorado | `vicerrectorado.academico@untrm.edu.pe` | `Demo2026!` |
| Tutorado (Ana Torres) | `20191234@untrm.edu.pe` | `Demo2026!` |
| Tutorado (Luis Pérez) | `20195678@untrm.edu.pe` | `Demo2026!` |

Los profesionales de Psicopedagogía, Asistencia Social y Escuela **no tienen cuenta de prueba**: créelas desde
*Usuarios y roles* (rol «Profesional de Servicio» y el servicio correspondiente) para probar los cinco servicios.

**Cómo marcar:** cada paso tiene el resultado esperado entre «→». Anote `OK`, `FALLA` o `N/A` y, si falla, la captura y
la hora. Un `FALLA` bloquea el release hasta corregirlo o aceptarlo por escrito.

## 1. Estudiante y solicitud de tutoría (R01)

| # | Quién | Paso | Resultado esperado | Estado |
|---|---|---|---|---|
| 1.1 | Tutorado Ana | *Solicitar tutoría* → tipo «Académico», motivo de una línea → Registrar | → confirmación «enrutada a tu tutor»; aparece en *Mis solicitudes* como **Pendiente**  OK (API) 09/10/2026 |
| 1.2 | Tutor Elena | Campana de avisos | → aviso «Nueva solicitud de tutoría…»; al pulsarlo abre la solicitud en la bandeja  OK (API) 09/10/2026 |
| 1.3 | Coordinadora Rosa | *Solicitudes de tutoría* | → ve la solicitud de Ana (su escuela)  OK (API) 09/10/2026 |
| 1.4 | Tutor Jorge / Coordinador Carlos | *Solicitudes de tutoría* | → **no** ven la solicitud de Ana  OK (API) 09/10/2026 |
| 1.5 | Tutor Elena | Atender → «Pasar a en atención» | → estado **En atención**  OK (API) 09/10/2026 |
| 1.6 | Tutor Elena | «Marcar atendida» sin escribir respuesta | → pide la respuesta; no avanza  OK (API) 09/10/2026 |
| 1.7 | Tutor Elena | Escribir respuesta («Te espero el jueves…») y marcar atendida | → **Atendida**; no se puede volver a un estado anterior  OK (API) 09/10/2026 |
| 1.8 | Tutorado Ana | Campana y *Mis solicitudes* | → aviso de cambio; ve estado **Atendida** y la respuesta  OK (API) 09/10/2026 |
| 1.9 | Tutorado Ana | Expediente propio no existe; menú | → solo ve su inicio, *Mis sesiones*, *Solicitar* y *Evaluar*  OK (API y menú) 09/10/2026 |
| 1.10 | Tutor Elena | Expediente de Ana | → la solicitud aparece en la línea de tiempo con su estado y la respuesta  OK (API) 09/10/2026 |
| 1.11 | Prueba límite | Estudiante **sin tutor** y estudiante de escuela **sin coordinador** | → enruta al coordinador / a la DBU, nunca se pierde  OK 10/10/2026: sin tutor → coordinadora Rosa; sin tutor ni coordinador → administrador DBU |

## 2. Entrevista, sesiones, asistencia y seguimiento

| # | Quién | Paso | Resultado esperado | Estado |
|---|---|---|---|---|
| 2.1 | Tutor Elena | Menú *Entrevista inicial* → elegir a Ana → completar el Anexo 3 | → se abre el formulario del tutorado elegido; se guarda y aparece en el expediente  OK (API) 09/10/2026 |
| 2.2 | Tutor Elena | *Programar sesión* individual con Ana (presencial, con lugar) | → aparece en su calendario; Ana la ve en *Mis sesiones* con fecha, lugar y estado «Próxima»  OK (API) 09/10/2026 |
| 2.3 | Tutor Elena | Sesión **virtual** con enlace `https://…` | → Ana ve el enlace como vínculo; un enlace que no sea http(s) no es clicable  OK tras corrección (PR #88) 09/10/2026 |
| 2.4 | Tutor Elena | *Sesión grupal* con Ana y Luis | → ambos la ven; ninguno ve al otro como participante  OK (API) 09/10/2026 |
| 2.5 | Tutor Elena | Reprogramar y cancelar una sesión, con motivo | → queda el historial; Ana ve «Cancelada» con el motivo  OK (API) 09/10/2026 |
| 2.6 | Tutor Elena | Sesión individual ya iniciada → confirmar asistencia | → número de sesión 1 (Anexo 4)  OK (API) 09/10/2026 |
| 2.7 | Tutor Elena | En una grupal, marcar quién asistió y quién no | → la inasistencia queda registrada; no cuenta como realizada si nadie asistió  OK (API) 09/10/2026 |
| 2.8 | Tutor Elena | Ficha de seguimiento (Anexo 5) para Luis | → aparece en el expediente  OK (API) 09/10/2026 |
| 2.9 | Tutor Elena | Intentar más de 8 asistencias individuales con Ana **en el mismo semestre** | → la novena se rechaza con el mensaje del tope  OK (API) 09/10/2026 |
| 2.10 | Admin DBU | Cambiar de semestre (activar otro periodo en *Catálogos*) y volver a registrar una asistencia de Ana | → la numeración **reinicia en 1** en el semestre nuevo  OK (API) 09/10/2026 |
| 2.11 | Tutor Elena | Descargar la **hoja de asistencia (Anexo 4)** desde el expediente de Ana, imprimirla/firmarla y adjuntar el escaneo | → el PDF trae filiación, 8 filas y columna de firma; el adjunto queda con autor, fecha y huella  OK (PDF y adjunto) 09/10/2026; lectura visual pendiente |

## 3. Derivación y los cinco servicios (A02, A14)

Repetir para **cada servicio**: Escuela, Psicopedagogía, Psicología, Asistencia Social y Salud.

| # | Quién | Paso | Resultado esperado | Estado |
|---|---|---|---|---|
| 3.1 | Tutor Elena | *Derivar caso* → elegir a Ana → marcar aspectos, motivo y servicio | → derivación creada; el profesional de ese servicio recibe aviso  OK (API) 09/10/2026 |
| 3.2 | Profesional del servicio | Campana → abrir el aviso | → abre **ese** caso; ve el detalle  OK (aviso con enlace al caso) 09/10/2026; clic en pantalla pendiente |
| 3.3 | Profesional de **otro** servicio | Bandeja y abrir la URL del caso | → no lo ve; si llega por un aviso, la pantalla explica que ya no está disponible  OK (API) 09/10/2026 |
| 3.4 | Tutor Jorge (no emisor) | Bandeja | → no ve la derivación de Elena  OK (API) 09/10/2026 |
| 3.5 | Coordinador | Menú | → no tiene *Casos derivados*; la API responde con una explicación (no una lista vacía)  OK (API) 09/10/2026 |
| 3.6 | Profesional del servicio | Recibir → En atención → Atendido → Cerrado, con notas | → solo avanza; las notas internas **no** las ve el tutor emisor  OK (API) 09/10/2026 |
| 3.7 | Tutor Elena | Descargar la **constancia** (Anexo 6) | → filiación completa, datos de quien deriva, aspectos, motivo, servicio y **dos líneas de firma**  OK (PDF generado) 09/10/2026; lectura visual pendiente |
| 3.8 | Tutor / servicio / DBU | Adjuntar la constancia firmada y escaneada | → queda con autor, fecha y huella; la ven el emisor, el servicio y la DBU, nadie más  OK (API) 09/10/2026 |
| 3.9 | Admin DBU | *Seguimiento DBU* y *Bitácora* | → ve todos los casos; la bitácora registra `SIGNED_DOCUMENT_ATTACHED` y los cambios  OK (API) 09/10/2026 |

## 4. Plan semestral, evaluación y recuperación

| # | Quién | Paso | Resultado esperado | Estado |
|---|---|---|---|---|
| 4.1 | Coordinadora Rosa | *Plan semestral* de Sistemas (solo ve su escuela) → completar y guardar | → plan en estado «Borrador»  OK (API) 09/10/2026 |
| 4.2 | Coordinadora Rosa | Adjuntar la resolución PDF | → «Aprobado» (vigente)  OK (API) 09/10/2026 |
| 4.3 | Coordinadora Rosa | Editar el plan aprobado y guardar | → pide confirmación; queda **en revisión**, la versión aprobada se conserva y se puede descargar con su PDF  OK (API) 09/10/2026 |
| 4.4 | Admin DBU | *Evaluación de tutoría* → habilitar la escuela de Sistemas | → Ana puede responder; las demás escuelas no  OK (escuela de Sistemas) 09/10/2026 |
| 4.5 | Tutorado Ana | Responder el cuestionario (20 preguntas) | → se envía una sola vez; no puede repetirlo  OK (API) 09/10/2026 |
| 4.6 | Admin / Coordinadora | *Resultados de evaluación* | → solo agregados y anónimos; no se identifica a Ana  OK (API) 09/10/2026 |
| 4.7 | Cualquier usuario | «¿Olvidaste tu contraseña?» con su correo | → llega un correo a http://localhost:8025 con el enlace; el enlace sirve **una vez**; la sesión anterior se cierra  OK (API) 09/10/2026 |
| 4.8 | Cualquier usuario | Dejar abierta la sesión más de 15 minutos y seguir trabajando | → la sesión se renueva sola; no se pierde lo que se estaba escribiendo  OK (renovación por API) 09/10/2026; espera real de 15 min pendiente |

## 5. Informes y exportaciones (A07, A17)

| # | Quién | Paso | Resultado esperado | Estado |
|---|---|---|---|---|
| 5.1 | Tutor Elena | *Informe semestral* → borrador autollenado | → las sesiones cuentan solo si hubo asistencia registrada  OK (borrador autollenado) 09/10/2026; revisión de textos pendiente |
| 5.2 | Tutor / Coordinadora / DBU | *Horarios y asistencia* → exportar **PDF y Excel** | → los archivos se descargan y **se abren**; las cifras coinciden con la pantalla  OK (PDF y Excel válidos) 09/10/2026; cotejo visual con la pantalla pendiente |
| 5.3 | Vicerrectorado | *Informe consolidado* e *Indicadores* → exportar PDF y Excel | → cifras por escuela/facultad coherentes entre consolidado, indicadores y panel  OK (cifras iguales en consolidado, indicadores y panel) 09/10/2026 |
| 5.4 | Admin DBU | Cerrar el semestre (activar otro), reasignar y desactivar estudiantes, y volver a abrir el informe del semestre cerrado | → **las cifras del semestre cerrado no cambian**  OK (API) 09/10/2026 |
| 5.5 | Tutor Elena | Descargar el **PDF del expediente** de Ana | → incluye entrevistas, asistencias, seguimiento, derivación y solicitud  OK (PDF generado) 09/10/2026; lectura visual pendiente |

## 6. Separación entre escuelas, tutores y roles (A01, A03)

| # | Quién | Paso | Resultado esperado | Estado |
|---|---|---|---|---|
| 6.1 | Tutor Elena | *Tutorados* | → solo Ana y Luis  OK (API) 09/10/2026 |
| 6.2 | Tutor Elena | Abrir por URL el expediente de un tutorado de Jorge | → «no encontrado»  OK (API) 09/10/2026 |
| 6.3 | Coordinadora Rosa | *Tutorados*, *Asignación*, *Plan semestral* | → solo su escuela  OK 09/10/2026 (nota: /schools lista todas las escuelas) |
| 6.4 | Admin DBU | Desactivar una cuenta de prueba | → esa persona pierde el acceso **de inmediato**, aunque tuviera la sesión abierta  OK (API) 09/10/2026 |
| 6.5 | Cada rol | Inicio | → solo accesos y tarjetas que puede usar; sin «Sin acceso» ni bloques vacíos  OK (6 de 8 roles) 09/10/2026 |
| 6.6 | Cada rol | Menú | → exactamente **una** entrada activa por página; títulos coherentes con la página  OK (6 de 8 roles) 09/10/2026 |

## 7. Operación: respaldo, restauración y migración (A10, A11)

| # | Paso | Resultado esperado | Estado |
|---|---|---|---|
| 7.1 | `docker compose exec backup backup.sh` | termina sin error; hay `sit_backup_*.tar` y `/backups/last_status` dice `OK` | OK 09/10/2026 |
| 7.2 | Restaurar ese respaldo en **otra** base (ver `backup/README.md`) con la carpeta de adjuntos | la base y las evidencias/resoluciones se recuperan; el PDF de una resolución se abre | OK 09/10/2026 |
| 7.3 | Forzar un fallo de conexión del respaldo | termina con error y no borra respaldos válidos | OK 09/10/2026 |
| 7.4 | Configurar la copia **fuera del equipo** (`BACKUP_OFFSITE_DIR` o `BACKUP_UPLOAD_CMD`) | el respaldo verifica la copia; sin ella avisa que es solo local | OK (mecanismo) 09/10/2026 — falta el destino real |
| 7.5 | Sobre una **copia de los datos de la versión anterior (v0.3.0)**, ejecutar `prisma migrate deploy` | todas las migraciones aplican sin error y los datos previos siguen consultables | OK 09/10/2026 |
| 7.6 | Probar el arranque de **producción** (ver `deploy/README.md`) sobre una base vacía, con secretos de prueba | arranca solo con configuración segura; crea un único administrador y ninguna cuenta demo | OK 09/10/2026 |
| 7.7 | Plan de reversión | definir y ensayar: restaurar el respaldo previo a la migración y volver a la imagen anterior | OK 09/10/2026 (ensayo) |

> **Secciones 1 a 6 ejecutadas el 09/10/2026** por API y navegador con las cuentas de prueba; detalle en `docs/ACEPTACION_SECCIONES_1_6_2026-10-09.md`.

> **Sección 7 ejecutada el 09/10/2026:** el detalle y las salidas están en `docs/ACEPTACION_SECCION7_2026-10-09.md`.

## 8. Cierre

- [ ] Todos los pasos con `OK` o `N/A` justificado; los `FALLA` tienen incidencia y decisión escrita.
- [ ] CI en verde en el **commit exacto** que se va a publicar (lint, build, pruebas con base real, auditorías, ensayo de restauración).
- [ ] La DBU validó los formatos y firmas (`docs/formatos-anexos-matriz.md`).
- [ ] Decisiones de despliegue tomadas: dominio y servidor, cuenta SMTP, destino de la copia de respaldo externa.
- [ ] Versiones y notas del release actualizadas.

**Fecha de ejecución:** ____ · **Ejecutó:** ____ · **Revisó (DBU / asesor):** ____
