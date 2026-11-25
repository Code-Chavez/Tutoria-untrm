# Anexo I. Revisiones de seguridad y auditoría funcional

Resumen de los informes de seguridad del 11/10, 12/11 y 19/11/2026 y de la auditoría funcional del 17/11/2026, con el estado de cada hallazgo. Los documentos completos son `docs/INFORME_SEGURIDAD_2026-10-11.md`, `docs/INFORME_SEGURIDAD_TT101_REVISION_2026-11-12.md`, `docs/INFORME_SEGURIDAD_TT101_REVISION_2026-11-19.md` y `docs/AUDITORIA_2026-11-17.md`. Ninguna revisión incluyó un escáner dinámico externo (OWASP ZAP) ni la infraestructura de producción.

## I.1 Informe de seguridad del 11/10/2026

**Método:** revisión del código contra las categorías del OWASP Top 10 (2021) y sondeo de la API en ejecución con una cuenta de cada rol. **Resultado:** ningún hallazgo alto; no se encontró forma de leer datos de otra persona, saltarse el control de roles ni inyectar código.

[[tabla: Hallazgos del informe del 11/10/2026]]

| N.° | Severidad | Hallazgo | Estado |
| --- | --- | --- | --- |
| F1 | Media | Los archivos subidos solo se validaban por el tipo MIME que declaraba el cliente | Corregido: se comprueban los primeros bytes (PDF, PNG, JPEG, WEBP, XLSX) |
| F2 | Baja | El tiempo de respuesta del ingreso delataba qué correos existen (14 ms frente a 1,5 s) | Corregido: se compara contra un hash falso del mismo costo |
| F3 | Baja | El estado «cuenta desactivada» se revelaba solo con el correo | Corregido: solo se revela con la contraseña correcta |
| F4 | Baja | JSON mal formado respondía 500 | Corregido: 400 y 413 |
| F5 | Baja | Sin tope de intentos por IP en el ingreso | Corregido: 100 por IP cada 5 minutos (contador en memoria de una sola instancia) |
| F6 | Baja | `@playwright/test` de desarrollo con un aviso alto | Corregido: actualizado; auditoría limpia |
| F7 | Baja | Advertencia moderada ignorada en el servidor (`GHSA-w5hq-g745-h8pq`) | Documentado; sigue vigente |
| I1 a I3 | Informativos | Secreto JWT por defecto solo en desarrollo; el tutorado no abre su expediente (por diseño); HSTS depende del dominio | Sin acción |

**Comprobado y correcto:** acceso a expedientes y documentos de otras personas (403 o 404); tokens manipulados (401); autorización por el rol de la base de datos y no del token; sondas SQL, XSS y de rutas sin errores 5xx; cabeceras de seguridad y CORS; recuperación de contraseña con enlace de un solo uso; bitácora de accesos. **Pendiente:** escáner dinámico sobre un entorno desplegado con HTTPS, almacén compartido para el tope de intentos si hay varias instancias, evaluar cookies `HttpOnly` y confirmar las cabeceras del proxy de producción.

## I.2 Repaso del 12/11/2026

Alcance: lo agregado después (certificación, pedidos por facultad, estudiantes por periodo, roles configurables y catálogos), con revisión estática de las rutas y sondeo con las cuentas de cada rol. **G1 (baja):** `GET /api/roles` respondía a cualquier cuenta autenticada, incluido un estudiante; **corregido**: exige `users:read`, con prueba de integración. **G2 (informativo):** la advertencia moderada de `uuid` vía `exceljs` sigue ignorada y documentada. Las rutas nuevas exigen sesión (una prueba recorre todas las rutas registradas), y el alcance de los datos se confirmó con el mismo filtro de periodo: administración ve 246 estudiantes, coordinación 236 (su escuela) y el tutor 50 (los suyos).

## I.3 Repaso del 19/11/2026

Alcance: lo cambiado hasta `v1.0.0-beta.4`. Ninguna ruta nueva. **H1 (baja):** los pedidos de facultad que ve la coordinación estaban redactados (sin correo ni nota) pero conservaban campos internos (identificadores de otras cuentas y claves del pedido); **corrección** en revisión al cierre de este corte (PR #333), con prueba. **H2 (informativo):** misma advertencia moderada de dependencias. **Aviso nuevo del 19/11:** el servidor trae `effect@3.21.0` solo a través de Prisma (`@prisma/config`) y apareció un aviso de severidad **alta** (GHSA-7589-6fvf-x4pw, ReDoS en `Schema.TemplateLiteral`); la corrección, una regla `effect ^3.22.1` que resuelve la 3.22.5, está en revisión (PR #344). No se repitió el sondeo de la API en ejecución porque no hay un entorno con el código de v1.0.0-beta.4.

## I.4 Auditoría funcional del 17/11/2026

Revisó el producto y la preparación del piloto sobre `develop`. Los hallazgos y su seguimiento al 19/11 son:

[[tabla: Hallazgos de la auditoría y seguimiento]]

| Hallazgo | Estado | Qué se hizo o quién decide |
| --- | --- | --- |
| El historial por semestre mezcla la matrícula del semestre con la escuela y el tutor actuales | Mitigado | Los encabezados dicen «(actual)» y una nota lo aclara (#326); guardar escuela y tutor por periodo (migración y revisión de autorización) queda para después del piloto |
| Escuelas fuera del alcance del tutor en el selector | Resuelto | #320 |
| Carga de tutores sin permiso | Resuelto | #320 |
| «Todos los periodos» muestra el padrón general | Abierto | Preseleccionar el semestre activo o aclarar el texto: decide el usuario o el PO |
| Pedidos por facultad y por escuela sin aviso de solapamiento | Resuelto | Aviso confirmable dentro de la ventana de 10 minutos (#324) |
| La coordinación no ve pedidos de facultad que incluyen su escuela | Resuelto | Los ve sin correo, nota ni otras escuelas (#324) |
| Plan semestral ensayado en parte por API | Abierto | Cronometrar la creación completa desde la interfaz con una persona nueva |
| Documentos discrepan sobre la versión de partida | Resuelto | Línea base única (#322) y notas de v1.0.0-beta.4 |
| #261 y #262 abiertos aunque ya estaban en beta.3 | Resuelto | Cerrados el 19/11 tras revisar sus criterios |
| Qué restaura el botón Atrás dentro de una lista filtrada | Abierto | Decisión pendiente (#259) |

La auditoría también lista la evidencia pendiente para el piloto y la salida estable: el piloto con usuarios reales (#293), el entorno institucional (HTTPS, correo, respaldo externo), la base limpia y reproducible del piloto, los certificados oficiales (#232), el anonimato de la evaluación y el tratamiento de datos reales, la revisión de seguridad TT-101 (#291), el ensayo de accesibilidad y compatibilidad, la cobertura en CI de los flujos E2E-06 y E2E-08, y la medición de rendimiento. Todo ello figura en el Anexo L.
