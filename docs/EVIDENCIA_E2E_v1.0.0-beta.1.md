# Evidencia de la corrida E2E completa — candidata v1.0.0-beta.1

- **Commit probado:** `132d37f` (rama `release/v1.0.0-beta.1`, sobre `develop` en `da28412`, que incluye A01–A05 y A07–A11 y las mejoras de rendimiento).
- **Fecha y entorno:** 14/10/2026, stack de desarrollo local con Docker (`docker compose`), Chrome (`E2E_CHANNEL=chrome`), un solo trabajador, **una corrida continua** (sin repetir pruebas).
- **Resultado:** **40 de 40 pruebas pasaron** (9 recorridos), 16.2 min.
- **Alcance y límites:** solo Chrome; sin Firefox, Edge, Safari ni móvil; datos de demostración; sin entrega SMTP real (los correos van a Mailpit); sin carga de 100 usuarios ni importación de 2000 filas. No sustituye el *smoke test* en el servidor de la beta.

| # | Recorrido | Prueba | Tiempo |
|---|---|---|---|
| 1 | e2e-01-acceso-y-menu | Administrador DBU: menú y panel de inicio | 15.9s |
| 2 | e2e-01-acceso-y-menu | Coordinador: menú y panel de inicio | 13.5s |
| 3 | e2e-01-acceso-y-menu | Docente Tutor: menú y panel de inicio | 13.4s |
| 4 | e2e-01-acceso-y-menu | Profesional de Servicio: menú y panel de inicio | 12.3s |
| 5 | e2e-01-acceso-y-menu | Vicerrectorado: menú y panel de inicio | 11.1s |
| 6 | e2e-01-acceso-y-menu | Tutorado: menú y panel de inicio | 12.5s |
| 7 | e2e-01-acceso-y-menu | credenciales inválidas muestran un error y no entran | 11.2s |
| 8 | e2e-01-acceso-y-menu | una ruta protegida sin sesión redirige al ingreso | 6.2s |
| 9 | e2e-01-acceso-y-menu | un rol no entra a una página que no es suya | 16.9s |
| 10 | e2e-02-solicitud-de-tutoria | el estudiante registra la solicitud y queda Pendiente | 22.6s |
| 11 | e2e-02-solicitud-de-tutoria | la tutora recibe el aviso y exige una respuesta antes de marcarla atendida | 33.5s |
| 12 | e2e-02-solicitud-de-tutoria | el estudiante ve el estado Atendida y la respuesta | 18.2s |
| 13 | e2e-02-solicitud-de-tutoria | la coordinadora de la escuela ve la solicitud | 18.9s |
| 14 | e2e-02-solicitud-de-tutoria | un tutor que no es el de Ana no la ve | 18.4s |
| 15 | e2e-03-sesiones-y-asistencia | la tutora programa una sesión individual presencial para Ana | 29.4s |
| 16 | e2e-03-sesiones-y-asistencia | la tutorada ve la sesión con su lugar | 16.4s |
| 17 | e2e-03-sesiones-y-asistencia | la tutora cancela la sesión con un motivo y la tutorada ve Cancelada | 34.9s |
| 18 | e2e-03-sesiones-y-asistencia | la tutora registra la asistencia de una sesión que ya empezó | 27.1s |
| 19 | e2e-04-derivacion-a-servicio | la tutora deriva el caso de Ana a Psicología | 28.1s |
| 20 | e2e-04-derivacion-a-servicio | Psicología recibe el aviso, abre el caso y lo lleva hasta cerrarlo | 29.9s |
| 21 | e2e-04-derivacion-a-servicio | otro servicio no ve el caso | 13.2s |
| 22 | e2e-04-derivacion-a-servicio | la tutora descarga la constancia y no ve las notas internas | 18.5s |
| 23 | e2e-04-derivacion-a-servicio | la DBU ve el caso en el seguimiento | 17.4s |
| 24 | e2e-05-informes-y-exportaciones | la tutora ve su consolidado de horarios y exporta PDF y Excel | 22.3s |
| 25 | e2e-05-informes-y-exportaciones | la tutora guarda su informe semestral y exporta el PDF | 30.4s |
| 26 | e2e-05-informes-y-exportaciones | Vicerrectorado ve el consolidado e indicadores y exporta | 26.3s |
| 27 | e2e-05-informes-y-exportaciones | el consolidado y los indicadores muestran las mismas cifras | 1.9s |
| 28 | e2e-06-plan-semestral | la coordinadora deja vigente el plan con la resolución | 18.6s |
| 29 | e2e-06-plan-semestral | al editar el plan aprobado se crea una revisión y se conserva la versión aprobada | 24.2s |
| 30 | e2e-07-evaluacion-de-tutoria | el tutorado responde los 20 ítems y no puede enviar antes de terminar | 30.2s |
| 31 | e2e-07-evaluacion-de-tutoria | la coordinadora ve resultados y sugerencias sin el nombre del estudiante | 16.5s |
| 32 | e2e-07-evaluacion-de-tutoria | la DBU cierra la evaluación y otro tutorado ya no puede responder | 30.9s |
| 33 | e2e-08-administracion | la DBU crea, desactiva y elimina una facultad del catálogo | 27.4s |
| 34 | e2e-08-administracion | la DBU registra un tutorado nuevo y aparece en la lista | 25.9s |
| 35 | e2e-08-administracion | un tutorado con clave temporal solo puede cambiarla y luego entra con la nueva (A01) | 43.2s |
| 36 | e2e-08-administracion | la DBU cambia el nombre corto de la identidad visual y lo restituye | 19.3s |
| 37 | e2e-09-carga-masiva-y-asignacion | la coordinadora importa el Excel: 3 estudiantes se registran y la fila con error se informa | 16.8s |
| 38 | e2e-09-carga-masiva-y-asignacion | la coordinadora asigna los 3 estudiantes nuevos a Elena en bloque | 19.3s |
| 39 | e2e-09-carga-masiva-y-asignacion | la coordinadora reasigna a uno de ellos a Jorge con un motivo | 21.0s |
| 40 | e2e-09-carga-masiva-y-asignacion | cada tutor ve solo los suyos: Elena dos, Jorge uno | 58.0s |
