# Anexo E. Manual del sistema e instalación

Versión compacta del manual técnico: conserva los procedimientos, los parámetros y las reglas necesarias para instalar, operar y mantener el sistema. La descripción detallada de cada endpoint, de los estados de los avisos y del historial de cortes de la certificación está en `docs/MANUAL_TECNICO.md`. La arquitectura y los diagramas están en el Capítulo V y el Anexo B; la seguridad, en la sección 5.4 y el Anexo I. **Los procedimientos de producción describen lo preparado en el repositorio: el entorno institucional no está entregado y el procedimiento no se ha ensayado en el servidor real.** Corte del 19/11/2026, `v1.0.0-beta.4`.

## E.1 Componentes y requisitos

[[tabla: Componentes del sistema]]

| Parte | Tecnología | Carpeta |
| --- | --- | --- |
| Cliente web | React 19, Vite, TypeScript, TanStack Query, CSS Modules | `client/` |
| API | Node.js 20, Express, TypeScript estricto, Zod | `server/` |
| Base de datos | PostgreSQL 16, Prisma ORM (58 migraciones) | `server/prisma/` |
| Contenedores | Docker Compose (desarrollo y producción), Caddy (HTTPS y proxy en producción), servicio de respaldos (`backup/`), Mailpit (correo de desarrollo) | raíz, `deploy/`, `backup/` |
| Pruebas | Jest, Vitest, Playwright | `server/`, `client/`, `e2e/` |

**Requisitos.** Desarrollo: Docker Desktop con Compose y Git (8 GB de RAM recomendados); sin Docker, Node.js 20+, pnpm 9 y PostgreSQL 16. Producción: servidor Linux con Docker y Compose, dominio público con DNS al servidor (puertos 80 y 443), servidor SMTP y un destino de respaldos fuera del servidor.

La arquitectura del servidor es hexagonal (dominio, aplicación, infraestructura, interfaces); una petición típica recorre ruta, autenticación, autorización por permiso, controlador con validación Zod, caso de uso con control de alcance, repositorio y respuesta, y los cambios relevantes quedan en la bitácora de auditoría.

## E.2 Instalación para desarrollo

```bash
git clone <url-del-repositorio>
cd Tutoria-untrm
docker compose up -d --build
docker compose exec server pnpm run seed      # solo en un entorno nuevo (base vacía)
```

El servidor aplica las migraciones en cada arranque y **no siembra**: reiniciarlo no cambia datos. El `seed` solo crea lo que falta y no sobrescribe datos existentes. La primera vez el servidor tarda unos minutos en responder.

[[tabla: Servicios del entorno de desarrollo]]

| Servicio | Dirección |
| --- | --- |
| Aplicación | `http://localhost:5173` |
| API y estado de salud | `http://localhost:3000/api/health` |
| Correo de desarrollo (Mailpit) | `http://localhost:8025` |
| PostgreSQL | `localhost:5432` (base `sit_db`) |

Las cuentas de demostración existen solo en desarrollo. Para reiniciar con datos limpios: `docker compose down -v && docker compose up -d --build && docker compose exec server pnpm run seed`. Sin Docker: `cd server && cp .env.example .env && pnpm install && pnpm prisma migrate deploy && pnpm run seed && pnpm dev`, y `cd client && pnpm install && pnpm dev` en otra terminal. Use pnpm 9 y no ejecute `prisma format`.

## E.3 Instalación en producción

Resumen; el procedimiento vigente está en `deploy/README.md`.

1. Copie `.env.production.example` a `.env.production` y complete **todos** los valores: dominio, contraseña de PostgreSQL, `JWT_SECRET` (`openssl rand -hex 48`), `ADMIN_EMAIL` y `ADMIN_PASSWORD` del primer administrador, datos SMTP y destino de respaldos.
2. Levante el sistema: `docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build`.
3. Al arrancar, el servidor valida la configuración, aplica las migraciones, asegura permisos, roles y parámetros y, **solo si no existe ningún Administrador DBU**, crea el primero. No crea cuentas ni datos de demostración.
4. Entre con ese administrador, cambie la contraseña en *Mi perfil* y quite `ADMIN_PASSWORD` del archivo de entorno.
5. Registre facultades, escuelas y periodo (*Catálogos*), usuarios (*Usuarios y roles*) y estudiantes (*Carga masiva*).

[[tabla: Servicios de producción]]

| Servicio | Función | Expuesto |
| --- | --- | --- |
| `web` | Cliente compilado con Caddy: HTTPS automático y reenvío de `/api` | 80 y 443 |
| `server` | API compilada, sin código fuente, usuario no root | red interna |
| `postgres` | Base de datos | ningún puerto |
| `backup` | Respaldo diario de la base y de los adjuntos | red interna |

Si otro componente termina el HTTPS, use `SITE_ADDRESS=:80` y revise `TRUST_PROXY`. **Prueba de humo:** `curl https://<dominio>/api/health` debe responder `ok` con `database: connected`; `docker compose -f docker-compose.prod.yml ps` debe mostrar todo en ejecución; entre como administrador, abra *Panel de inicio*, *Catálogos* y *Bitácora*, y pruebe «¿Olvidaste tu contraseña?» con un correo real para confirmar el SMTP.

## E.4 Configuración

[[tabla: Variables principales del servidor]]

| Variable | Valor por defecto | Para qué sirve |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` activa la validación estricta de configuración |
| `DATABASE_URL`, `PORT` | local, `3000` | Conexión a PostgreSQL y puerto de la API |
| `JWT_SECRET` | de desarrollo | Firma de tokens; en producción, al menos 32 caracteres aleatorios |
| `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | `15m`, `7d` | Vigencia de los tokens de acceso y de renovación |
| `BCRYPT_ROUNDS` | `12` | Costo del hash de contraseñas (mínimo 10 en producción) |
| `CORS_ORIGIN`, `PUBLIC_APP_URL` | `http://localhost:5173` | Origen del cliente y URL de los enlaces de los correos (en producción, `https://`) |
| `TRUST_PROXY` | `0` (`1` con Caddy) | Saltos de proxy para la IP real en la bitácora y los límites |
| `EVIDENCE_STORAGE_DIR` | `storage/evidence` | Carpeta de adjuntos |
| `INVITATION_TTL_HOURS`, `PASSWORD_RESET_TTL_MINUTES` | `72`, `60` | Vigencia de las invitaciones y de la recuperación de contraseña |
| `EMAIL_ALLOWED_DOMAINS` | `untrm.edu.pe` | Dominios de correo permitidos para las cuentas de usuario |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_REQUIRE_TLS`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | vacío | Correo saliente; en producción `SMTP_HOST` es obligatorio y hay que definir `SMTP_SECURE=true` o `SMTP_REQUIRE_TLS` |
| `EMAIL_NOTIFICATIONS` | `true` | Envía cada aviso también por correo (cola con reintentos en `email_outbox`) |
| `CERTIFICATE_DEMO_MODE` | `true` fuera de producción, `false` en producción | Certificados de demostración; en producción solo se activa por decisión de la DBU |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | vacío | Solo para el primer administrador (contraseña de 12 caracteres o más) |
| `BACKUP_CRON`, `BACKUP_KEEP`, `BACKUP_OFFSITE_DIR`, `BACKUP_UPLOAD_CMD` | `0 2 * * *`, 7 o 14 | Respaldos (sección E.7) |
| `LOGIN_RATE_LIMIT_MAX`, `RESET_PASSWORD_RATE_LIMIT_MAX` | vacío | Solo para pruebas E2E; se ignoran en producción |

Del cliente (en compilación): `VITE_IDLE_TIMEOUT_MINUTES` (15) y `VITE_IDLE_WARNING_SECONDS` (60). **Parámetros editables en la aplicación** (*Parámetros*, solo DBU): duración de la sesión (45 min), sesiones por semestre (8), umbral de alerta por inasistencias (2), plazo de atención de derivaciones (48 h), horas semanales máximas de un tutor y, en seguridad, cierre por inactividad (15 min), intentos antes del bloqueo (5) y duración del bloqueo (15 min). Los avisos por correo son formales, no incluyen el texto del aviso ni datos de la persona atendida y se envían solo a cuentas activas; si el SMTP falla, el aviso interno se crea igual.

## E.5 Base de datos y reglas del servidor

El esquema está en `server/prisma/schema.prisma` (50 tablas, Anexo B) con 58 migraciones escritas a mano. Se aplican con `pnpm prisma migrate deploy` (en producción, ya incluido en el arranque); el estado, con `migrate status`. Los adjuntos no están en la base: viven en `EVIDENCE_STORAGE_DIR` y se respaldan con ella. Reglas que conviene conocer:

- **Cierre de periodo:** `POST /api/periods/:id/close` (DBU, confirmando el nombre), `/reopen` y `GET /closure`. Sin periodo vigente, los registros operativos se rechazan con `409 PERIOD_CLOSED`; las cargas y la administración no pasan por ese control.
- **Matrícula por periodo:** la carga y el alta manual matriculan en el periodo vigente (sin periodo, `409 NO_OPEN_PERIOD`); las acciones propias del estudiante exigen figurar en la matrícula (`403 NOT_ENROLLED`).
- **Tutor por ciclo:** único por periodo, escuela y ciclo; el tutor debe ser de la misma escuela (`409`); un docente con otro ciclo se rechaza con `409 TUTOR_HAS_CYCLE` salvo excepción con motivo (máximo dos ciclos). La aceptación pasa por `SIN_SOLICITAR → PENDIENTE → ACEPTADA` o `RECHAZADA`, con un enlace de un solo uso guardado como huella SHA-256. Un rechazo se registra en una sola transacción junto con su aviso a la coordinación, que se envía en segundo plano con un solo intento automático (estados `EN_COLA`, `ENVIANDO`, `ENVIADO`, `FALLIDO`, `INCIERTO`, entre otros); no hay entrega «exactamente una vez».
- **Pedidos de listas:** `POST /api/data-requests` exige `operationId` (idempotencia por persona) y devuelve `201`, `200` (repetición), `202` (incierto), `502` (no aceptado), `409` (`DUPLICATE_DATA_REQUEST` o `DATA_REQUEST_IN_FLIGHT`) o `422`. La ventana de equivalencia es de 10 minutos (valor de trabajo). El pedido por facultad usa `facultyId` y su propia clave; un pedido por escuela advierte si su facultad ya fue pedida y viceversa.
- **Certificación:** estados `INICIADO → EN_REVISION → OBSERVADO ↔ EN_REVISION`, `RECHAZADO`, `APROBADO → GENERADO_SIN_FIRMA` y `ANULADO` (Capítulo V). La base impide que un certificado de demostración llegue a firmado o entregado; el PDF lleva la marca «DEMOSTRACIÓN — SIN VALOR» y numeración `DEMO-`.
- **Roles y alcance:** `admin:system` no es delegable; el alcance de cada cuenta es ninguno, propio, escuelas, facultades, institución o servicio.
- **Datos base y de demostración:** `seedBase` crea permisos, roles y parámetros; `prisma/seed.ts` solo corre en desarrollo.

## E.6 Seguridad

Contraseñas con bcrypt; token de acceso de 15 minutos y de renovación rotativo, con detección de reutilización; bloqueo tras 5 intentos fallidos (15 min) y tope de 100 intentos por IP cada 5 minutos; recuperación por enlace de un solo uso; permisos por rol más control de alcance en el servidor; validación del contenido de los archivos; cabeceras `helmet` (CSP, HSTS) y CORS restringido; el servidor de producción se niega a arrancar con secretos de ejemplo o URLs sin HTTPS; y bitácora de auditoría de accesos sensibles. Los informes de seguridad están en el Anexo I.

## E.7 Respaldo, restauración y reversión

El servicio `backup` guarda en un único paquete verificado (`sit_backup_AAAAMMDD_HHMMSS.tar`) la base y los adjuntos con manifiesto SHA-256, según `BACKUP_CRON`, conserva los últimos `BACKUP_KEEP` y, si una etapa falla, no publica nada a medias ni borra los respaldos existentes (el contenedor pasa a *unhealthy*).

- **Copia fuera del servidor (obligatoria en producción):** `BACKUP_OFFSITE_DIR` o `BACKUP_UPLOAD_CMD`.
- **Manual:** `docker compose -f docker-compose.prod.yml exec backup backup.sh`.
- **Restaurar (destructivo):** `RESTORE_CONFIRM=yes restore.sh /backups/<paquete>.tar /data/restore` dentro del contenedor; verifica las sumas antes de tocar la base.
- **Reversión de una actualización:** respaldar antes; si falla, detener `server` y `web`, restaurar el respaldo, volver a la versión anterior (`git checkout vX.Y.Z`) y reconstruir.
- **Ensayo:** `backup/test-backup.sh` (también en CI) comprueba respaldo, fallo controlado, retención y restauración idéntica byte a byte.

## E.8 Pruebas, integración continua y versiones

[[tabla: Niveles de prueba y cómo ejecutarlos]]

| Nivel | Herramienta | Ejecución |
| --- | --- | --- |
| Servidor: unitarias | Jest | `cd server && npx jest tests/unit` |
| Servidor: integración y rutas (base real y exclusiva) | Jest | `pnpm run test:db:prepare && pnpm run test:integration`; se niega a correr si la base no termina en `_test` |
| Cliente | Vitest y Testing Library | `cd client && npx vitest run --maxWorkers=3` |
| Extremo a extremo | Playwright | `cd e2e && pnpm run test:ci` |
| Tipos, estilo y dependencias | TypeScript estricto, ESLint, `pnpm audit --prod` | en `server/` y `client/` |

**Integración continua** (`.github/workflows/`): `ci.yml` (cada push y pull request a `develop` y `main`: estilo, compilación, pruebas del servidor y del cliente, auditoría, ensayo de respaldo, E2E en Chrome y, solo en *push*, construcción de las imágenes Docker); `e2e-browsers.yml` (Firefox y WebKit en pull requests que tocan código y de forma programada); `pr-checks.yml` (título con Conventional Commits, descripción y, hacia `main`, el DoD técnico completo). Los ejecutores usan `ubuntu-24.04` fijado. `develop` y `main` exigen pull request y estar al día: si una rama queda atrás hay que actualizarla y esperar de nuevo el CI.

**Versiones (Git Flow):** `feature/*`, `fix/*` y `docs/*` se integran en `develop`; los lanzamientos salen de `release/vX.Y.Z` hacia `main`, se etiquetan y se devuelven a `develop` con commit de merge, no *squash*. Los commits siguen Conventional Commits y cada solicitud de integración reproduce la Definition of Done.

## E.9 Operación y solución de problemas

[[tabla: Problemas frecuentes]]

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| «No se pudo conectar con el servidor» | El servidor aún arranca o Docker no está activo | Esperar y revisar `docker compose ps` y `/api/health` |
| El servidor de producción no arranca | Falló la validación de configuración | `docker compose logs server`: lista cada problema |
| No llegan los correos | SMTP mal configurado | Revisar `SMTP_*` y `MAIL_FROM`; en desarrollo, Mailpit |
| Un usuario no puede entrar | Cuenta desactivada o bloqueada | La DBU la reactiva; el bloqueo expira solo |
| «Demasiados intentos» | Límite por IP | Esperar; detrás de un proxy, configurar `TRUST_PROXY` |
| El respaldo está *unhealthy* | Falló el último respaldo o la copia externa | `docker compose logs backup` y `cat /backups/last_status` |
| Tras actualizar todos deben volver a entrar | Las migraciones cierran las sesiones | Es lo esperado |
| Un adjunto no se abre | Archivo ausente en `EVIDENCE_STORAGE_DIR` | Restaurar desde el respaldo |

Mantenimiento recomendado: revisar `last_status` y probar una restauración cada trimestre, ejecutar `pnpm audit --prod`, rotar `JWT_SECRET` y las credenciales SMTP cuando cambie el personal responsable y revisar la bitácora.

## E.10 Limitaciones conocidas

- Los tokens de sesión se guardan en `localStorage` del navegador (riesgo bajo con la política de contenido actual).
- El tope de intentos por IP es un contador en memoria de una sola instancia del servidor.
- Los certificados son de demostración: sin el formato oficial no hay firma ni entrega.
- Falta un escáner dinámico (OWASP ZAP) y el ensayo completo de instalación en el servidor real con el dominio definitivo.
