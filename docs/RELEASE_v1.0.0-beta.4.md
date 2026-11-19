# SIT UNTRM — v1.0.0-beta.4 (candidata)

Cuarta beta de pruebas controladas en el servidor de la UNTRM, con participantes autorizados y **datos ficticios**. Reúne las correcciones y la documentación posteriores a `v1.0.0-beta.3` y la deja como versión a presentar al Product Owner si este prefiere una versión con H10 y H11 corregidos. Sigue sin ser la estable `v1.0.0` ni autoriza el uso con datos reales.

Base de comparación: `v1.0.0-beta.3` (`main`, 16/11/2026, `11486c3`). Esta candidata reúne los PR #306 a #326 de `develop` (67 archivos cambiados). **No hay migraciones nuevas ni variables de entorno nuevas.**

## Qué incluye respecto a v1.0.0-beta.3

| Tema | Cambio (PR) |
|---|---|
| Hallazgos del ensayo del piloto | H10: «Plan semestral» entra al menú de la coordinación y el formulario del plan marca el primer campo obligatorio vacío, salta a su pestaña y le da el foco, antes de pedir la confirmación de una nueva revisión (#314, issue #313). H11: la guía usa «Profesional de servicio» (#314). H12: ensayada la comparación con un semestre cerrado (#318). |
| Lista de estudiantes | Sin `students:write` ya no se pide la carga de tutores ni se espera por ella, y el selector de escuelas ofrece solo las del alcance de la cuenta (#320). Con un semestre elegido, los encabezados de escuela y tutor dicen «(actual)» y una nota aclara que solo el ciclo es el de esa matrícula (#326). |
| Pedidos de listas | Se advierte cuando se pide una facultad y una de sus escuelas (o al revés) dentro de la ventana de 10 minutos, con confirmación explícita; la coordinación ve en «Pedidos hechos» los pedidos de facultad que incluyen su escuela, sin el correo de destino, la nota ni las demás escuelas (#324). |
| Manuales e informe | Manual de usuario y manual técnico a beta.3 (#308, #310), capturas del coordinador regeneradas con la entrada «Plan semestral» (#316), informe de prácticas V03 (#312). |
| Estado del piloto | Línea base única: versión de referencia, pruebas, manuales, informe y aceptación en una sola tabla (#322). |

## Requisitos de despliegue

Los mismos que en `v1.0.0-beta.3` (`docs/RELEASE_v1.0.0-beta.3.md`): no hay migraciones ni variables nuevas, pero **conviene respaldar la base antes de actualizar**, como siempre. Si se parte de beta.2, aplican además los requisitos de beta.3 (7 migraciones, `CERTIFICATE_DEMO_MODE`, permiso `users:read` para listar roles).

## Verificación realizada

- Cada PR de esta candidata pasó el CI completo antes de fusionarse en `develop` (lint, compilación, pruebas, auditoría, E2E en Chrome y respaldo/restauración).
- Ensayo en `sit-ensayo` (17/11): cierre de 2026-II, apertura de 2027-I y comparación de semestres por el Vicerrectorado, sin defectos (`docs/PILOTO_ESTADO_PREPARACION_2026-11-13.md`).
- El resultado del CI de este PR de release es la verificación de lint, compilación, pruebas y auditoría; consultarlo en el PR.
- No se repitieron en esta candidata las pruebas en Firefox y WebKit ni el ensayo del piloto con todos los roles sobre el código final.

## Limitaciones conocidas

- H9 sigue abierto como decisión de producto: un docente tutor atiende un solo ciclo y los demás requieren una excepción.
- El historial por semestre muestra la escuela y el tutor **actuales**; guardarlos por periodo (migración y revisión de autorización) queda para después del piloto.
- Siguen pendientes con la DBU y TI: entorno institucional (HTTPS, SMTP, respaldo externo, monitoreo), participantes y fechas del piloto, ciudad de Utcubamba, logos originales del certificado, anonimato de la evaluación (A06) y los formatos de los anexos.
- Los certificados son solo de demostración hasta que la DBU entregue la plantilla oficial.
- Solo Chrome verificado en el ensayo con participantes; Edge, Safari y móvil sin verificar.
- El informe de prácticas V03 falta que lo revise el asesor y se ajuste al formato de la escuela.
- Aprobación del Product Owner pendiente.
