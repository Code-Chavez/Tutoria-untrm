# SIT UNTRM — v1.0.0-beta.3 (candidata)

Tercera beta de pruebas controladas en el servidor de la UNTRM, con participantes autorizados y **datos ficticios**. Es la versión que se prueba en TT-104 y se somete a la aprobación del Product Owner; sigue sin ser la estable `v1.0.0` ni autoriza usar datos sensibles reales. Las limitaciones de `RELEASE_v1.0.0-beta.1.md` y `RELEASE_v1.0.0-beta.2.md` que no se mencionan abajo siguen vigentes.

Base de comparación: `v1.0.0-beta.2` (`main`, 05/11/2026). Esta candidata reúne los PR #223 a #303 de `develop` (237 archivos cambiados).

## Qué incluye respecto a v1.0.0-beta.2

| Tema | Cambio (PR) |
|---|---|
| Certificación del docente tutor | Modelo de datos, restricciones de demostración y numeración transaccional (#225); permisos de consulta y rutas con alcance (#228); flujo del trámite y máquina de estados (#235); PDF de demostración con numeración y descarga auditada (#240); pantalla del trámite con estado en la URL y borradores (#242); accesibilidad, teclado y móvil (#244); lista de docentes tutores en Periodo académico (#254). |
| Certificados configurables | Logos, marca de agua y firma visual (#263); ciudad de la sede en la fecha, configurable por sede (#268); firmante, cargo, texto, departamento y tipo de sede (#272); una escuela puede dictarse en varias sedes y el certificado imprime la elegida (#275). |
| Demostración | Datos ficticios y guion para presentaciones (#266); escuelas de Bagua y búsqueda idempotente de designaciones (#270). |
| Pedidos de listas | Pedido de las listas de toda una facultad, con correo de facultad configurable (#284). |
| Navegación y listas | Menú, accesos rápidos del inicio y selector de catálogos reorganizados (#285); lista de estudiantes filtrable por periodo (#286). |
| Sesión y acceso | Al caducar la sesión, la misma persona vuelve a la vista anterior al entrar de nuevo (#276); la ruta espera los permisos del servidor antes de negarse con la sesión guardada (#226); listar roles exige `users:read`, con la revisión de seguridad de TT-101 (#292). |
| Correcciones del ensayo del piloto | La tutora elige estudiantes que ya tienen tutor en la sesión grupal (#296); el aviso de la ficha de derivación queda en el pie y la estudiante ve la respuesta de su tutora sin recargar (sondeo cada 30 s) (#302). |
| Accesibilidad y URL | Nombres accesibles que contienen su texto visible en pestañas y asignación por ciclo (#247); `useUrlParams` conserva el cambio previo cuando un render antiguo se confirma tarde (#257); etiqueta de cierre de periodo (#264); esquema de actualización de catálogos (#280); respaldo de ids de sede (#278). |
| Pruebas y CI | Restablecer clave con tope configurable fuera de producción (#246); E2E en el CI (#227), suites E2E aisladas y al día (#249, #250, #258); ejecución manual y programada en Firefox y WebKit, fijada a `ubuntu-24.04` (#251, #299); pruebas del cliente con tiempos de espera propios (#260, #290). |
| Documentación | Diseño de certificación (#224, #252), flujo de issues con Playwright (#238), estado del piloto y ensayo con todos los roles (#294, #297, #300, #303). |

## Requisitos de despliegue (léalos antes de instalar)

1. **Migraciones (7 nuevas)**, aplicadas al arrancar el contenedor de producción. **Respaldar la base antes.** Van de `20261105120000_certification_model` a `20261111090000_faculty_data_requests`; incluyen el modelo de certificación, nota de revisión, recursos visuales y configuración del certificado, ciudad por sede, sedes por escuela y pedidos de listas por facultad.
2. **Variable nueva en `.env.production`:** `CERTIFICATE_DEMO_MODE` (por defecto `false`). Sin plantilla oficial solo existen certificados de **demostración** (marca de agua, numeración `DEMO-`, sin firma ni entrega); activarlo en producción es una decisión de la DBU. `RESET_PASSWORD_RATE_LIMIT_MAX` y `LOGIN_RATE_LIMIT_MAX` son solo para pruebas E2E y se ignoran en producción.
3. Las variables obligatorias de beta.1 y beta.2 siguen vigentes (`JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGIN`, `PUBLIC_APP_URL`, `SMTP_HOST`, `MAIL_FROM`, `SMTP_REQUIRE_TLS` o `SMTP_SECURE`).
4. **Roles:** listar roles exige el permiso `users:read`; revisar que los roles a medida que administran roles lo incluyan.
5. Acceso limitado a los participantes autorizados.

## Verificación realizada

- **CI de `develop` en `033001d`** (base de esta candidata): todo en verde, incluidos lint, compilación, pruebas unitarias y de integración, auditoría, imágenes Docker con migraciones y E2E de Chrome.
- **Ejecución manual de E2E en Firefox y WebKit** sobre `bbfc664`: aprobada.
- **Ensayo del piloto (TT-102)** con datos ficticios, en Chrome, sobre una pila aislada: recorridos escritos de la tutora, DBU, coordinación, profesional de servicio, estudiante y Vicerrectorado (22 tareas), más la verificación en pantalla de las correcciones H6 y H7. Detalle y capturas en `docs/PILOTO_ESTADO_PREPARACION_2026-11-13.md`.
- El resultado del CI de este PR de release es la verificación de lint, compilación, pruebas y auditoría; consultarlo en el PR.

## Limitaciones conocidas

- Hallazgos del ensayo sin corregir, a decidir con el PO: un docente tutor atiende un solo ciclo y los demás requieren una excepción (H9); «Plan semestral» no está en el menú y su formulario valida tarde (H10); el nombre del rol en pantalla («Profesional de servicio») debe unificarse con el de la documentación (H11); el ensayo solo cuenta con el periodo 2026-II (H12).
- Siguen pendientes con la DBU y TI: entorno de producción y SMTP, respaldo externo y monitoreo, participantes y fechas del piloto, ciudad de Utcubamba, logos originales del certificado, anonimato de la evaluación (A06) y los formatos de los anexos.
- Los certificados son solo de demostración hasta que la DBU entregue la plantilla oficial.
- Solo Chrome verificado en el ensayo con participantes; Edge, Safari y móvil sin verificar.
- Siguen pendientes los manuales con capturas actualizadas (TT-105).
