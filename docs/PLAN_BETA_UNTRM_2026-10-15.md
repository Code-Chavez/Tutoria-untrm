# Beta de pruebas en servidor UNTRM

Fecha objetivo: jueves 15/10/2026 (America/Bogota). Versión propuesta: `v1.0.0-beta.1`, anterior a `v1.0.0` estable. Estado: preparación; el responsable informó que aún no tiene el servidor. No se ha realizado despliegue ni creado tag/release.

## Alcance

Beta controlada para pruebas con participantes autorizados y datos ficticios. No constituye cierre del Sprint 6, ejecución del piloto formal previsto para 13/11, conformidad institucional ni aceptación de v1.0.0. Las pruebas de octubre pueden aportar evidencia adicional, sin sustituir resultados o fechas del backlog automáticamente.

Usar entorno, base, almacenamiento y cuentas exclusivos de beta. Acceso limitado a participantes definidos. No cargar expedientes, derivaciones ni notas de salud reales antes de cerrar brechas de permisos/seguridad y acordar tratamiento institucional. La etiqueta beta no elimina controles de acceso, HTTPS, respaldos ni gestión de secretos.

## Dependencias que TI debe entregar

- Servidor/VM: sistema operativo, recursos, Docker/Compose o autorización de instalación, acceso administrativo por canal seguro y responsable técnico.
- Dominio/subdominio, DNS y HTTPS: definir si Caddy obtiene certificado o si termina TLS el proxy institucional; acceso de prueba autorizado.
- SMTP: host, puerto, cifrado, cuenta/relay autorizado, remitente y destinatarios de ensayo. Credenciales por canal seguro, fuera del repositorio.
- Destino de respaldo fuera del servidor y montaje/transporte; responsable de revisar fallos y restaurar.
- Horario de instalación y acompañamiento de TI. No enviar credenciales en documentos ni en solicitudes públicas.

Si el servidor no está disponible el jueves, entregar la candidata y ejecutar pruebas locales; registrar el despliegue institucional como pendiente. No presentar una entrega del código como instalación en UNTRM.

## Preparación del candidato

1. Revisar `docs/AUDITORIA_PRE_RELEASE_2026-10-12.md` contra el commit vigente y registrar por hallazgo: corregido, reproducido pendiente o limitación aceptada con responsable. No asumir que ya se corrigió por existir un PR.
2. Cerrar contraseña inicial común y normalización/validación de correos antes de provisionar cuentas de participantes. Verificar conflictos en edición e importación. Separar invitación de usuarios de la simple creación de estudiantes.
3. Resolver alcance de evaluación de coordinadores o excluir temporalmente ese acceso de la beta mediante control de servidor comprobado, no solo ocultando el menú. Revisar toda matriz de permisos.
4. Usar datos ficticios, comunicar limitaciones de formatos/firmas, configuración de seguridad y anonimato. No declarar estos requisitos aceptados mientras sigan pendientes.
5. Congelar commit candidato y registrar versión; ejecutar lint/build/tests/auditoría y E2E completo sobre ese commit. Conservar informe de resultados y defectos conocidos. El listado de 40 pruebas no equivale a ejecución aprobada.
6. Preparar nota de versión con alcance, usuarios previstos, limitaciones, instrucciones de acceso y canal de hallazgos. Proponer `v1.0.0-beta.1`; las siguientes correcciones podrán ser beta.2, beta.3. Reservar v1.0.0 para aceptación estable.

No se cambian versiones, ramas, tags ni se fusionan PR desde este plan. Antes de publicar se debe comprobar el flujo de ramas/gates existente y distinguir aprobación de beta de aprobación estable; no marcar criterios de DoD no satisfechos.

## Instalación y validación en el servidor

Usar `deploy/README.md`, `.env.production.example` y `docker-compose.prod.yml` con configuración propia de beta. `NODE_ENV=production` mantiene controles de despliegue seguro aunque la versión del producto sea beta. No usar el seed de demostración de desarrollo en el servidor institucional ni contraseñas/secreto JWT de ejemplo.

La configuración actual requiere dominio HTTPS y SMTP_HOST para arrancar. `EMAIL_NOTIFICATIONS=false` solo desactiva avisos y no elimina el requisito de SMTP ni la recuperación. Si SMTP real no está disponible, puede acordarse un capturador exclusivamente de ensayo, restringido y con datos ficticios; esto no acredita entrega institucional y debe quedar identificado en la beta.

Checklist de aceptación técnica de beta (marcar solo con evidencia):

- [ ] Commit, versión, entorno y fecha registrados; imágenes construidas y migraciones aplicadas sin error.
- [ ] DNS/HTTPS correcto, API/base sin puertos públicos innecesarios, secretos propios y admin inicial seguro.
- [ ] `/api/health` responde por el dominio final; ingreso/cierre de sesión y cuentas inactivas se comportan correctamente.
- [ ] Alta, edición, login y recuperación normalizan correo; dominio institucional según RF-01; Excel rechaza correo inválido por fila.
- [ ] Recuperación: enlace de un uso, caducidad, revocación y respuesta pública equivalente. No se muestran tokens en registros.
- [ ] SMTP o capturador de ensayo identificado; remitente, enlaces HTTPS, destinatarios y ausencia de contenido sensible comprobados. SMTP aceptado no equivale a llegada al buzón.
- [ ] Recorridos por rol y pruebas negativas de acceso a otra persona/escuela/servicio aprobados en beta.
- [ ] Solicitud → respuesta, sesión → asistencia, derivación → cierre y exportación funcionan; formatos incompletos están señalados.
- [ ] Respaldo de base y adjuntos, copia externa y restauración en destino de ensayo comprobados; monitorización y contacto de incidencias definidos.
- [ ] Participantes conocen que es beta, usan datos ficticios y tienen canal para reportar errores.

## Reversión

Conservar commit/imágenes y configuración del candidato, respaldo previo a cada actualización y evidencia de restauración. Ante exposición de datos, permisos indebidos, migración fallida o pérdida de registros, detener el acceso y evaluar reversión con TI. No intentar restauración destructiva sin identificar la base/volúmenes correctos. Volver solo al código puede no revertir una migración: seguir procedimiento de `deploy/README.md`, restaurar también adjuntos y advertir pérdida de cambios posteriores al respaldo. En una primera instalación fallida, mantener beta fuera de servicio hasta corregir; no eliminar volúmenes para aparentar una instalación limpia.

## Agenda propuesta

| Fecha | Entregable |
|---|---|
| Martes 13/10 | Solicitud a TI y cierre de alcance beta; priorización de hallazgos. |
| Miércoles 14/10 | Correcciones mínimas, pruebas del candidato y preparación de configuración/instrucciones. |
| Jueves 15/10 | Si TI entrega entorno: instalación, smoke, correos y permisos; habilitación controlada solo tras aprobar checklist. Si no: candidata preparada y fecha de instalación pendiente de TI. |
| Tras instalación | Registro de hallazgos y nuevas betas verificadas; conservar resultados para el informe. |
| Antes de v1.0.0 | Conformidad de anexos, piloto formal y correcciones, RNF de rendimiento/usabilidad/operación, manuales e informe final, aceptación del PO y release estable. |
