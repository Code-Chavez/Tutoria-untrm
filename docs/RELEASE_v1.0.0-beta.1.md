# SIT UNTRM — v1.0.0-beta.1 (candidata)

Beta de pruebas controladas en el servidor de la UNTRM, con participantes autorizados y **datos ficticios**. No es la versión estable `v1.0.0`, no cierra el Sprint 6 ni el piloto formal del 13/11 y no autoriza usar datos sensibles reales. Contexto y criterios de salida: `AUDITORIA_PRE_RELEASE_2026-10-12.md` y `PLAN_BETA_UNTRM_2026-10-15.md`.

## Qué incluye respecto a v0.4.4

| Tema | Cambio |
|---|---|
| Cuentas (A01) | Clave temporal aleatoria por cuenta nueva, mostrada una sola vez a la DBU; la cuenta solo puede abrir su perfil hasta cambiarla (lo hace cumplir el servidor). Ya no existe una clave común. |
| Correos (A02, A04) | Un solo formato (sin espacios, en minúsculas) en alta, edición, ingreso y recuperación; la búsqueda no distingue mayúsculas; editar a un correo ocupado responde 400 con el motivo. |
| Importación y formularios (A03, A07) | El Excel y el formulario validan igual correo, teléfono y nombres; teléfonos, fechas de la entrevista, edad y límites de texto coherentes; el cliente muestra el motivo por campo. |
| Alcance (A05) | El coordinador ve resultados, estadísticas y sugerencias de evaluación solo de sus escuelas (aplicado en el servidor). |
| Seguridad de acceso (A08) | Inactividad, intentos fallidos y duración del bloqueo son parámetros editables por la DBU y se aplican en cliente y servidor. |
| Bitácora (A09) | Se registra quién consulta o descarga expedientes, entrevistas, seguimientos, red de apoyo, derivaciones y documentos, incluidos los intentos rechazados, sin guardar el contenido. |
| Correo saliente (A10) | Los avisos por correo se encolan y se reintentan (1, 5, 15, 60 min); STARTTLS obligatorio configurable; el arranque en producción valida la configuración del correo. |
| Lenguaje (A11) | Roles visibles como Estudiante / Docente / Administrador (y la especialidad del profesional); frases de ayuda al redactar una solicitud. |
| Rendimiento | Menos consultas por petición y menos CPU (token, roles y permisos en caché de 30 s, nombres del expediente en una consulta). Mejora medida, **no cumple todavía ≤ 3 s** en todas las consultas. |
| Pruebas | 40 recorridos E2E; suite del servidor con pruebas contra base de datos real; evidencia en `EVIDENCIA_E2E_*.md`. |

## Requisitos de despliegue (léalos antes de instalar)

1. **Migraciones** (se aplican solas al arrancar el contenedor de producción): `user_must_change_password`, `security_parameters_match_behavior` (datos) y `email_outbox`. Respaldar la base antes.
2. **Variables nuevas u obligatorias en `.env.production`:** `SMTP_REQUIRE_TLS` (`true` = STARTTLS obligatorio; `false` solo en un relay interno aprobado) o `SMTP_SECURE=true` con el puerto 465. **Sin esa decisión el servidor no arranca en producción.** El resto ya era obligatorio: `JWT_SECRET` (≥ 32 caracteres, aleatorio), `DATABASE_URL` propia, `CORS_ORIGIN` y `PUBLIC_APP_URL` en `https://`, `SMTP_HOST`, `MAIL_FROM`.
3. **Cuentas:** no hay clave común. La DBU crea cada cuenta y entrega su clave temporal en persona o por un canal privado. Las cuentas creadas antes de esta versión no cambian: si alguna conserva `Tutor2026!`, hay que cambiarla.
4. **Probar el correo antes de abrir la beta:** `deploy/probar-smtp.js` (ver `GUIA_SMTP.md`) y comprobar que un aviso real llega; vigilar la cola con el SQL de la §5b de esa guía.
5. Acceso limitado a los participantes autorizados y, si se usa un capturador SMTP de ensayo, declararlo: no equivale a entrega institucional.

## Limitaciones conocidas (por hallazgo, con su decisión pendiente)

| Pendiente | Estado / quién decide |
|---|---|
| A06 anonimato de la evaluación | La respuesta se guarda ligada al estudiante; los reportes no muestran identidad. **No debe describirse como anónima** hasta decidir con la DBU. |
| Formatos de los anexos 3, 5, 6, 7, 8 y 9 | Brechas con los formatos oficiales (firmas, filiación, campos); validación de la DBU. |
| RF-39 | Hoy solo la DBU abre/cierra la evaluación y sin fechas programadas. |
| RF-01 | No se exige el dominio `@untrm.edu.pe`; falta definir excepciones. |
| Rendimiento | Expediente ~4 s con 100 peticiones simultáneas en el entorno de desarrollo; falta medir en el servidor y completar paginación, importación por lotes e índices (RNF-PERF-01/02). |
| Disponibilidad y respaldos | Respaldo externo, restauración probada, monitoreo y alertas: a configurar con TI. |
| Navegadores | Probado solo en Chrome; faltan Firefox, Edge, Safari y móvil. |
| Menú «Tutorados» y manuales | Se mantiene el término oficial; las 35 capturas del manual muestran nombres de rol anteriores. |
| Alertas | No hay aviso al administrador ante correos fallidos persistentes ni retención de la cola/bitácora. |

## Verificación del candidato

Ver `EVIDENCIA_E2E_*.md` (corrida E2E completa sobre el commit candidato) y el resultado del CI del PR de release. Las pruebas unitarias y de integración del servidor y del cliente corren en el CI.
