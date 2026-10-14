# Evidencia de la corrida E2E completa — 13/10/2026

- **Commit probado:** `3ffe778` (rama `test/e2e-03-repeatable`, sobre `develop` en `c67d768`, que ya incluye A01–A05 y A07).
- **Entorno:** stack de desarrollo local con Docker (`docker compose`), Chrome (`E2E_CHANNEL=chrome`), un solo trabajador, una corrida continua.
- **Resultado:** **40 de 40 pruebas pasaron** (9 recorridos), 14.0 min.
- **Historial de esta fecha:** una corrida anterior sobre `c67d768` dio 39/40; falló `e2e-03` (registrar asistencia) porque no era repetible el mismo día (la agenda de la tutora no admite dos sesiones a la misma hora). Se corrigió en `3ffe778` y se repitió la suite completa.
- **Alcance:** solo Chrome; no cubre Firefox, Edge, Safari ni móvil, ni entrega SMTP real, ni carga de 100 usuarios.

| # | Recorrido | Prueba | Tiempo |
|---|---|---|---|
| 1 | e2e-01-acceso-y-menu | Administrador DBU: menú y panel de inicio | 11.4s |
| 2 | e2e-01-acceso-y-menu | Coordinador: menú y panel de inicio | 17.2s |
| 3 | e2e-01-acceso-y-menu | Docente Tutor: menú y panel de inicio | 10.4s |
| 4 | e2e-01-acceso-y-menu | Profesional de Servicio: menú y panel de inicio | 10.3s |
| 5 | e2e-01-acceso-y-menu | Vicerrectorado: menú y panel de inicio | 10.3s |
| 6 | e2e-01-acceso-y-menu | Tutorado: menú y panel de inicio | 11.0s |
| 7 | e2e-01-acceso-y-menu | credenciales inválidas muestran un error y no entran | 12.4s |
| 8 | e2e-01-acceso-y-menu | una ruta protegida sin sesión redirige al ingreso | 7.9s |
| 9 | e2e-01-acceso-y-menu | un rol no entra a una página que no es suya | 15.5s |
| 10 | e2e-02-solicitud-de-tutoria | el estudiante registra la solicitud y queda Pendiente | 18.1s |
| 11 | e2e-02-solicitud-de-tutoria | la tutora recibe el aviso y exige una respuesta antes de marcarla atendida | 23.3s |
| 12 | e2e-02-solicitud-de-tutoria | el estudiante ve el estado Atendida y la respuesta | 13.9s |
| 13 | e2e-02-solicitud-de-tutoria | la coordinadora de la escuela ve la solicitud | 14.8s |
| 14 | e2e-02-solicitud-de-tutoria | un tutor que no es el de Ana no la ve | 10.6s |
| 15 | e2e-03-sesiones-y-asistencia | la tutora programa una sesión individual presencial para Ana | 24.8s |
| 16 | e2e-03-sesiones-y-asistencia | la tutorada ve la sesión con su lugar | 13.2s |
| 17 | e2e-03-sesiones-y-asistencia | la tutora cancela la sesión con un motivo y la tutorada ve Cancelada | 37.2s |
| 18 | e2e-03-sesiones-y-asistencia | la tutora registra la asistencia de una sesión que ya empezó | 20.3s |
| 19 | e2e-04-derivacion-a-servicio | la tutora deriva el caso de Ana a Psicología | 23.2s |
| 20 | e2e-04-derivacion-a-servicio | Psicología recibe el aviso, abre el caso y lo lleva hasta cerrarlo | 20.6s |
| 21 | e2e-04-derivacion-a-servicio | otro servicio no ve el caso | 11.4s |
| 22 | e2e-04-derivacion-a-servicio | la tutora descarga la constancia y no ve las notas internas | 19.1s |
| 23 | e2e-04-derivacion-a-servicio | la DBU ve el caso en el seguimiento | 22.9s |
| 24 | e2e-05-informes-y-exportaciones | la tutora ve su consolidado de horarios y exporta PDF y Excel | 19.8s |
| 25 | e2e-05-informes-y-exportaciones | la tutora guarda su informe semestral y exporta el PDF | 19.0s |
| 26 | e2e-05-informes-y-exportaciones | Vicerrectorado ve el consolidado e indicadores y exporta | 27.1s |
| 27 | e2e-05-informes-y-exportaciones | el consolidado y los indicadores muestran las mismas cifras | 1.9s |
| 28 | e2e-06-plan-semestral | la coordinadora deja vigente el plan con la resolución | 15.8s |
| 29 | e2e-06-plan-semestral | al editar el plan aprobado se crea una revisión y se conserva la versión aprobada | 21.9s |
| 30 | e2e-07-evaluacion-de-tutoria | el tutorado responde los 20 ítems y no puede enviar antes de terminar | 27.9s |
| 31 | e2e-07-evaluacion-de-tutoria | la coordinadora ve resultados y sugerencias sin el nombre del estudiante | 25.9s |
| 32 | e2e-07-evaluacion-de-tutoria | la DBU cierra la evaluación y otro tutorado ya no puede responder | 37.1s |
| 33 | e2e-08-administracion | la DBU crea, desactiva y elimina una facultad del catálogo | 20.9s |
| 34 | e2e-08-administracion | la DBU registra un tutorado nuevo y aparece en la lista | 19.5s |
| 35 | e2e-08-administracion | un tutorado con clave temporal solo puede cambiarla y luego entra con la nueva (A01) | 46.9s |
| 36 | e2e-08-administracion | la DBU cambia el nombre corto de la identidad visual y lo restituye | 20.8s |
| 37 | e2e-09-carga-masiva-y-asignacion | la coordinadora importa el Excel: 3 estudiantes se registran y la fila con error se informa | 15.7s |
| 38 | e2e-09-carga-masiva-y-asignacion | la coordinadora asigna los 3 estudiantes nuevos a Elena en bloque | 22.8s |
| 39 | e2e-09-carga-masiva-y-asignacion | la coordinadora reasigna a uno de ellos a Jorge con un motivo | 25.1s |
| 40 | e2e-09-carga-masiva-y-asignacion | cada tutor ve solo los suyos: Elena dos, Jorge uno | 44.3s |
