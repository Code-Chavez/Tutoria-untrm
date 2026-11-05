# Correcciones previas a la beta: ciclos y acceso inicial (TT-103)

Trazabilidad: TT-103 (correcciones y regresión), HU-03 (cuentas), HU-06 (contraseña), HU-12 (asignación).

## API

- Escuelas y catálogos de escuelas exponen `cycleCount`. El administrador puede editarlo entre 1 y 14, sin reducirlo por debajo de los ciclos ocupados por estudiantes o asignaciones.
- Los pedidos y las asignaciones rechazan ciclos fuera de la configuración de la escuela.
- `POST /api/tutor-acceptance/:token` sigue consumiendo el enlace de aceptación. Al aceptar, devuelve `{ accepted: true }` para una cuenta ya activada. Para una cuenta activa pendiente de crear contraseña, agrega `activationLink`, generado por el mecanismo de invitación existente, y envía el mismo enlace por correo. La respuesta usa `Cache-Control: no-store`.
- Si falla la preparación de la invitación después de aceptar, devuelve `activationUnavailable: true`; la aceptación permanece registrada. La administración debe reemitir la invitación.
- No se envían claves temporales. El enlace de activación permite crear la contraseña, vence y sirve una sola vez. No se registra su valor en la bitácora. Al rechazar no se genera activación.

## Instalación

Aplicar `20261020020000_school_cycle_count` y regenerar Prisma. No hay dependencias ni variables nuevas. Consultar `CONFIGURACION_CICLOS_ESCUELA.md` para configurar cada escuela.

## Límites

La condición de primer acceso es `mustChangePassword`, no el número de ciclos dictados. No se declara aceptación institucional del piloto, producción ni aprobación del Product Owner. El cliente correspondiente se entrega en un PR separado.
