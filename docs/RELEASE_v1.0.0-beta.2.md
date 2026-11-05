# SIT UNTRM — v1.0.0-beta.2 (candidata)

Segunda beta de pruebas controladas en el servidor de la UNTRM, con participantes autorizados y **datos ficticios**. Sigue sin ser la versión estable `v1.0.0`: no cierra el Sprint 6 ni el piloto formal y no autoriza usar datos sensibles reales. Las limitaciones de `RELEASE_v1.0.0-beta.1.md` que no se mencionan abajo siguen vigentes.

Base de comparación: `v1.0.0-beta.1` (`main`, 13/10/2026). Esta candidata reúne los PR #134 a #221 de `develop` (~130 fusiones).

## Qué incluye respecto a v1.0.0-beta.1

| Tema | Cambio (PR) |
|---|---|
| Cuentas | Enlace de invitación de un solo uso en lugar de una clave inicial (#134); alta masiva de docentes desde Excel (#139); correo institucional como regla única, sin duplicados (#153). |
| Periodo académico | Cierre explícito del periodo, modo de solo lectura y reapertura (#135); matrícula del periodo, estudiantes continuos y pedido de listas por correo (#136, #146, #147, #157); pedidos idempotentes con aviso de pedido equivalente (#188, #189). |
| Escuelas y tutores | Catálogo de sedes y escuela del tutor (#137); un tutor por ciclo de cada escuela, con excepción registrada (#138); aceptación del tutor por enlace con disponibilidad semanal (#140); asignación solo por ciclo (#145); ciclos por escuela y primer acceso de docentes (#164, #165). |
| Decano | Rol de Decano por facultad y amonestaciones registradas (#141). |
| Solicitudes y derivaciones | Atender una solicitud programando una sesión o derivando el caso (#149); solo reciben la solicitud las cuentas elegibles (#158); una cita cancelada se reemplaza por otra sesión o derivación (#160); aviso persistente y reenvío del aviso de designación declinada (#191). |
| Roles configurables | Roles y permisos a medida con roles base protegidos y `admin:system` no delegable, efecto inmediato y bitácora (#208, #210); alcance por usuario (nada, propio, escuelas, facultades, institución) que se reinicia al cambiar de rol (#209, #211); menú, pestañas, rutas y panel de inicio según permisos (#212, #213); creación de rol y último administrador activo protegidos (#182, #186). |
| Experiencia de uso | Menú corto agrupado por tarea, con secciones en pestañas (#144, #148); bandeja de pendientes (#152, #159); vocabulario en lenguaje de tarea (#157); avisos reales de sesión al estudiante (#155); borradores que no se pierden (#156). |
| Estado en la URL y borradores | Filtros, pestañas, selección y ventanas abiertas viven en la URL (se restauran al recargar o abrir el enlace en otra pestaña y responden a Atrás/Adelante); lo escrito en formularios se conserva como borrador por pestaña y por persona, sin pasar por la URL, y se limpia al guardar o descartar (#214 a #219). |
| Accesibilidad | Correcciones y vista del estudiante sobre citas canceladas (#161, #162); ConfirmDialog accesible y solo responde el diálogo superior (#193, #204, #205, #207). |
| Correo saliente | Fallos SMTP clasificados por fase observada (#195); mensaje claro cuando falla el correo de un pedido (#194). |
| Dependencias | Auditoría limpia: `follow-redirects`, zod 4, multer, nodemailer, express/body-parser, `qs` (#163, #169, #187, #200). Excepción documentada para GHSA-g3hv-75wg-m249 en el servidor (#200). |
| Pruebas | Base de datos de pruebas exclusiva, con filas propias y que se niega a arrancar sobre restos de una corrida inconclusa (#170, #171, #174); E2E de fases 3–5 (#142), de roles y alcance (E2E-21, #220) y de URL y borradores (E2E-22, #221). El seed de desarrollo ya no corre en cada arranque (#175). |

## Requisitos de despliegue (léalos antes de instalar)

1. **Migraciones (14 nuevas)**, aplicadas al arrancar el contenedor de producción. **Respaldar la base antes.** Van de `20261020020000_school_cycle_count` a `20261102120000_roles_base_and_active`; incluyen cierre de periodo, matrícula y pedidos de listas, sedes, tutor por ciclo, aceptación del tutor, amonestaciones, notificaciones de sesión, idempotencia de pedidos y `user_access_policies` (alcance por usuario).
2. **Variables nuevas en `.env.production`** (ambas con valor por defecto): `INVITATION_TTL_HOURS` (72) y `EMAIL_ALLOWED_DOMAINS` (vacío = solo `untrm.edu.pe`; un dominio mal escrito impide el arranque). Las obligatorias de beta.1 (`SMTP_REQUIRE_TLS` o `SMTP_SECURE`, `JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGIN`, `PUBLIC_APP_URL`, `SMTP_HOST`, `MAIL_FROM`) siguen vigentes.
3. **Cuentas nuevas:** se entregan por enlace de invitación de un solo uso, no por clave temporal. Revisar que el correo saliente funcione antes de abrir la beta (`deploy/probar-smtp.js`).
4. **Roles:** los roles base no se pueden editar ni desactivar; un rol a medida no puede incluir `admin:system`. Al cambiar el rol de una cuenta, su alcance vuelve a «ninguno» hasta que la administración lo defina de nuevo.
5. Acceso limitado a los participantes autorizados.

## Verificación realizada sobre `develop` (`ca3e9a4`)

- **E2E-21** (roles, permisos y alcance): 5 de 5 casos aprobados en Chrome, dos veces seguidas más una repetición sobre el commit de `develop`.
- **E2E-22** (URL y borradores): 9 de 9 casos aprobados en Chrome.
- Ambos se ejecutaron en una pila aislada (base `sit_db_test`, datos ficticios).
- El resultado del CI de este PR de release es la verificación de lint, compilación, pruebas unitarias y de integración y auditoría; consultarlo en el PR.
- **No se repitió** la corrida E2E completa de los 40 recorridos sobre este commit candidato; queda como paso previo a una beta con participantes.

## Limitaciones conocidas

- Solo Chrome verificado en las pruebas de esta entrega; Firefox, Edge, Safari y móvil sin verificar (hubo una corrida multi-navegador anterior, ver `RESULTADOS_PRUEBAS_NAVEGADORES_Y_DOCENTE_2026-10-19.md`).
- En Amonestaciones, al cancelar y reabrir la ventana sin recargar se conserva el texto pero no se muestra el aviso «Recuperamos lo que habías escrito»; aparece tras recargar.
- Siguen pendientes de decisión con la DBU: anonimato de la evaluación (A06), formatos de los anexos, RF-39 y excepciones de dominio (RF-01, ahora configurable por `EMAIL_ALLOWED_DOMAINS`).
- Siguen pendientes: rendimiento ≤ 3 s en todas las consultas, respaldo externo y monitoreo con TI, y los manuales con capturas actualizadas.
- Pendiente de IMP-3 (prueba intermitente del cliente), cerrado como riesgo de entorno aceptado (#202).
