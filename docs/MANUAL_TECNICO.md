# Manual técnico y de instalación — SIT · UNTRM

**Sistema de Información para la Sistematización de los Procesos de Acompañamiento de Tutoría Universitaria**
Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas · Dirección de Bienestar Universitario
Versión del documento: 1.0 (octubre de 2026) · Versión del software: 0.4.1 (candidata a 1.0.0)

> Este manual está dirigido a quien instala, opera y mantiene el sistema. Para el uso diario por cada rol, vea `docs/MANUAL_USUARIO.md`.
> Los detalles de despliegue, respaldo y reversión viven en `deploy/README.md` y `backup/README.md`; aquí se resumen y se enlazan.

## Contenido

1. [Visión general](#1-visión-general)
2. [Arquitectura](#2-arquitectura)
3. [Requisitos](#3-requisitos)
4. [Instalación para desarrollo](#4-instalación-para-desarrollo)
5. [Instalación en producción](#5-instalación-en-producción)
6. [Configuración](#6-configuración)
7. [Base de datos](#7-base-de-datos)
8. [Seguridad](#8-seguridad)
9. [Respaldo, restauración y reversión](#9-respaldo-restauración-y-reversión)
10. [Pruebas y calidad](#10-pruebas-y-calidad)
11. [Integración y entrega continuas](#11-integración-y-entrega-continuas)
12. [Operación diaria y solución de problemas](#12-operación-diaria-y-solución-de-problemas)
13. [Flujo de versiones](#13-flujo-de-versiones)
14. [Limitaciones conocidas](#14-limitaciones-conocidas)

## 1. Visión general

El SIT digitaliza el protocolo de tutoría universitaria (Protocolo N.° 01-2024-UNTRM/DBU): asignación de tutores, entrevista inicial (Anexo 3),
sesiones individuales y grupales con asistencia (Anexo 4), seguimiento (Anexo 5), derivación a servicios especializados (Anexo 6), evaluación de la
función tutorial (Anexo 7), plan de trabajo semestral (Anexo 8), informe semestral (Anexo 9), informes consolidados e indicadores, y la
administración institucional (catálogos, parámetros, identidad visual, bitácora de auditoría).

Es una aplicación web con tres partes:

| Parte | Tecnología | Carpeta |
|---|---|---|
| Cliente web | React 19 · Vite · TypeScript · TanStack Query · CSS Modules | `client/` |
| API | Node.js 20 · Express · TypeScript (modo estricto) · Zod | `server/` |
| Base de datos | PostgreSQL 16 · Prisma ORM | `server/prisma/` |

Además: Docker y Docker Compose (desarrollo y producción), Caddy (HTTPS y proxy en producción), un servicio de respaldos (`backup/`), Mailpit
(bandeja de correo de desarrollo) y una suite E2E con Playwright (`e2e/`).

## 2. Arquitectura

### 2.1 Servidor: arquitectura hexagonal

La dependencia siempre apunta hacia el dominio:

```
interfaces/http  →  application  →  domain
       ↘               ↓
          infrastructure (implementa los puertos del dominio y de la aplicación)
```

| Capa | Carpeta (`server/src/`) | Contenido |
|---|---|---|
| Dominio | `domain/` | Entidades y las interfaces de repositorio. Sin dependencias externas. |
| Aplicación | `application/` | Casos de uso (`use-cases/<módulo>/`), DTOs y puertos (`PasswordHasher`, `TokenService`, almacenamiento…). Las reglas de negocio viven aquí. |
| Infraestructura | `infrastructure/` | Repositorios Prisma, bcrypt, JWT, correo (nodemailer), almacenamiento de archivos, exportaciones PDF/Excel, configuración, arranque (`bootstrap`). |
| Interfaces | `interfaces/http/` | Rutas, controladores, validadores (Zod) y middleware (autenticación, autorización, límite de solicitudes, firma de archivos). |

La **raíz de composición** es `infrastructure/container.ts`: allí se construyen los repositorios, los servicios y los casos de uso, y se inyectan
en los controladores. Las rutas están en `interfaces/http/routes/` y se agrupan en `routes/index.ts`; todas cuelgan de `/api`.

Una petición típica: ruta → `authenticate` (valida el token) → `authorize([...permisos])` (consulta el rol en la base) → controlador (valida con Zod)
→ caso de uso (regla de negocio y control de alcance) → repositorio (Prisma) → respuesta. Los cambios relevantes se registran solos en la bitácora de
auditoría mediante un contexto por petición (`requestContext`).

### 2.2 Cliente: organización por funcionalidades

```
client/src/
├── features/        # un directorio por módulo: auth, dashboard, tutorados, sesiones, derivaciones, solicitudes, evaluacion,
│                    # planificacion, informes, indicadores, catalogos, parametros, identidad, auditoria, firmados, admin…
├── shared/          # componentes de interfaz, hooks, servicios (cliente HTTP, caché), tema/identidad, estilos y tokens
└── App.tsx          # rutas y protección por rol
```

- Los datos del servidor se piden con TanStack Query; la caché se vacía al iniciar y cerrar sesión (nada de una cuenta sobrevive en otra),
  conservando la identidad visual.
- El menú lateral se define en un solo lugar (`shared/components/layout/navigation.ts`) con los roles que ven cada entrada.
- Los estilos usan variables CSS (`shared/styles/variables.css`); la paleta institucional se aplica como identidad configurable.

### 2.3 Modelo de roles

| Rol | Alcance |
|---|---|
| Administrador DBU | Todo el sistema. |
| Coordinador | Su escuela: tutorados, asignación, plan semestral, solicitudes, indicadores y resultados de evaluación. |
| Docente Tutor | Sus tutorados: entrevistas, sesiones, seguimiento, derivaciones, solicitudes, informe semestral. |
| Tutorado | Sus sesiones, solicitar tutoría y evaluar a su tutor. |
| Profesional de Servicio | Los casos derivados a su servicio (Escuela, Psicopedagogía, Psicología, Asistencia Social, Salud). |
| Vicerrectorado | Solo lectura: informe consolidado e indicadores. |

Los permisos finos (`students:read`, `referrals:write`, …) se siembran en `infrastructure/bootstrap/seedBase.ts`. La autorización lee el rol **de la base
de datos**, no del contenido del token.

## 3. Requisitos

| Entorno | Requisitos |
|---|---|
| Desarrollo | Docker Desktop (con Compose) y Git. Para trabajar sin Docker: Node.js 20+, pnpm 9 y PostgreSQL 16. 8 GB de RAM recomendados. |
| Producción | Un servidor Linux con Docker y Compose; **dominio público** con DNS apuntando al servidor (puertos 80 y 443 abiertos); **servidor SMTP** para la recuperación de contraseña; un **destino fuera del servidor** para los respaldos. |

## 4. Instalación para desarrollo

```bash
git clone <url-del-repositorio>
cd Tutoria-untrm
docker compose up -d --build
docker compose exec server pnpm run seed      # SOLO en un entorno nuevo (base vacía): datos de demostración, una vez
```

El contenedor del servidor aplica las migraciones en cada arranque, como producción, y **no siembra**: reiniciar el servidor no cambia ningún dato. El
seed (`prisma/seed.ts`) es una orden explícita que **solo crea lo que falta**: no sobrescribe coordinaciones, sedes, escuelas de docentes, vínculos de
estudiantes ni matrículas existentes, ni matricula a estudiantes que no son de la seed; si falla, termina con error y muestra la causa. La primera vez,
el servidor tarda unos minutos en responder.

| Servicio | Dirección |
|---|---|
| Aplicación (cliente) | http://localhost:5173 |
| API y estado de salud | http://localhost:3000/api/health |
| Bandeja de correo de desarrollo (Mailpit) | http://localhost:8025 |
| PostgreSQL | localhost:5432 (`sit_user` / `sit_pass`, base `sit_db`) |

**Profesionales de servicio:** al crear un usuario con el rol *Profesional de Servicio* hay que indicar su servicio (Escuela, Psicopedagogía, Psicología, Asistencia Social o Salud); de él
depende qué derivaciones ve y recibe. (Esta asignación se agregó después de la versión 0.4.1; antes solo se podía sembrar por base de datos.)

**Cuentas de demostración** (solo desarrollo; la guía completa está en `docs/ACEPTACION_RELEASE_v0.4.0.md`): administrador `7183255722@untrm.edu.pe`
(`Admin2026!`); coordinadores, tutores, profesionales, Vicerrectorado y tutorados con contraseña `Demo2026!`.

Para reiniciar con datos limpios: `docker compose down -v && docker compose up -d --build && docker compose exec server pnpm run seed` (borra los volúmenes y vuelve a sembrar).

**Sin Docker** (opcional): con PostgreSQL en `localhost:5432`:

```bash
cd server && cp .env.example .env && pnpm install && pnpm prisma migrate deploy && pnpm run seed && pnpm dev
cd client && pnpm install && pnpm dev          # en otra terminal
```

Use `pnpm` 9 (`npx -y pnpm@9.15.9 …`) para no alterar los archivos de bloqueo. No ejecute `prisma format`: reescribiría el esquema.

## 5. Instalación en producción

Resumen; el procedimiento completo y vigente está en **`deploy/README.md`**.

1. Copie `.env.production.example` a `.env.production` y complete **todos** los valores: dominio, contraseña de PostgreSQL, `JWT_SECRET`
   (`openssl rand -hex 48`), `ADMIN_EMAIL` y `ADMIN_PASSWORD` del primer administrador, datos SMTP y el destino de respaldos.
2. Levante el sistema:
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
   ```
3. Al arrancar, el servidor valida la configuración, aplica las migraciones, asegura permisos, roles y parámetros, y **solo si no existe ningún
   Administrador DBU** crea el primero con `ADMIN_EMAIL`/`ADMIN_PASSWORD`. **No crea cuentas ni datos de demostración.**
4. Entre con ese administrador, cambie la contraseña desde *Mi perfil* y quite `ADMIN_PASSWORD` del archivo de entorno.
5. Registre en la aplicación las facultades, escuelas y el periodo académico (*Catálogos*), los usuarios (*Usuarios y roles*) y los tutorados (*Carga masiva*).

Servicios de producción (`docker-compose.prod.yml`):

| Servicio | Función | Expuesto |
|---|---|---|
| `web` | Cliente compilado con Caddy: HTTPS automático y reenvío de `/api` | 80 y 443 |
| `server` | API compilada, sin código fuente, usuario no root | red interna |
| `postgres` | Base de datos | ningún puerto publicado |
| `backup` | Respaldo diario de la base y de los adjuntos | red interna |

Si el HTTPS lo termina otro componente (balanceador o proxy institucional), use `SITE_ADDRESS=:80` y revise `TRUST_PROXY` según los saltos reales de proxy.

**Verificación posterior a la instalación (prueba de humo):**

```bash
curl https://<dominio>/api/health          # {"status":"ok", ... "database":"connected"}
docker compose -f docker-compose.prod.yml ps   # todos "healthy"/"running"
```

Entre como administrador, abra *Panel de inicio*, *Catálogos* y *Bitácora de auditoría*, y pruebe «¿Olvidaste tu contraseña?» con un correo real para
confirmar el SMTP.

## 6. Configuración

Variables del servidor (`server/.env.example`, `.env.production.example`; los valores por defecto están en `server/src/infrastructure/config/env.ts`):

| Variable | Por defecto | Para qué sirve |
|---|---|---|
| `NODE_ENV` | `development` | `production` activa la validación estricta de configuración. |
| `PORT` | `3000` | Puerto de la API. |
| `DATABASE_URL` | local | Cadena de conexión a PostgreSQL. |
| `JWT_SECRET` | de desarrollo | Firma de los tokens. En producción: ≥ 32 caracteres, aleatorio. |
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | `15m` / `7d` | Vigencia del token de acceso y del de renovación. |
| `BCRYPT_ROUNDS` | `12` | Costo del hash de contraseñas (mínimo 10 en producción). |
| `CORS_ORIGIN` | `http://localhost:5173` | Origen permitido del cliente (en producción, `https://`). |
| `TRUST_PROXY` | `0` (en `docker-compose.prod.yml`, `1`: el proxy Caddy) | Saltos de proxy inverso delante del servidor (para la IP real en bitácora y límites). |
| `EVIDENCE_STORAGE_DIR` | `storage/evidence` | Carpeta de adjuntos (evidencias, resoluciones, documentos firmados). |
| `PUBLIC_APP_URL` | `http://localhost:5173` | URL pública del cliente: se usa en los enlaces de los correos (en producción, `https://`). |
| `INVITATION_TTL_HOURS` | `72` | Vigencia del enlace de invitación de una cuenta nueva (un solo uso). |
| `EMAIL_ALLOWED_DOMAINS` | vacío = `untrm.edu.pe` | Dominios de correo permitidos para las **cuentas de usuario** (RF-01), separados por comas. Rige el alta y la edición de cuentas, la carga de docentes y el primer administrador (`ADMIN_EMAIL`). Una excepción (p. ej. profesionales externos) se agrega aquí por decisión formal de la DBU. Un dominio mal escrito impide el arranque (no se ignora en silencio). Las cuentas anteriores a la regla siguen funcionando; solo se exige al crear una cuenta o al cambiar su correo. No aplica al correo de contacto de los estudiantes. Los formularios consultan la política en `GET /api/users/email-policy`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_REQUIRE_TLS`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | — | Correo saliente. En producción `SMTP_HOST` es obligatorio y hay que definir `SMTP_SECURE=true` o `SMTP_REQUIRE_TLS` (true = STARTTLS obligatorio; false solo en un relay interno aprobado). Los correos de avisos se entregan con cola y reintentos (tabla `email_outbox`, ver `GUIA_SMTP.md` §5b). |
| `PASSWORD_RESET_TTL_MINUTES` | `60` | Vigencia del enlace de recuperación. |
| `EMAIL_NOTIFICATIONS` | `true` | Envía cada aviso de la aplicación (nueva solicitud, derivación, cambio de estado) al correo institucional de la persona. Necesita `SMTP_HOST`; `false` lo desactiva. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | — | Solo para crear el primer administrador (contraseña de ≥ 12 caracteres, no de ejemplo). |
| `BACKUP_CRON`, `BACKUP_KEEP`, `BACKUP_OFFSITE_DIR`, `BACKUP_UPLOAD_CMD` | `0 2 * * *`; conserva 7 (desarrollo) o 14 (producción) | Respaldos (ver sección 9). |

Variables del cliente (en tiempo de compilación): `VITE_IDLE_TIMEOUT_MINUTES` (por defecto 15) y `VITE_IDLE_WARNING_SECONDS` (60) controlan el cierre
de sesión por inactividad.

**Parámetros del sistema** (se editan en la aplicación, *Parámetros*, por la DBU): duración de la sesión (45 min), sesiones por semestre (8), umbral de
alerta por inasistencias (2) y plazo de atención de derivaciones (48 h).

**Identidad visual** (*Identidad visual*): nombre de la institución, nombre corto (barra lateral y título del navegador), colores y logotipo.

### 6.1 Avisos por correo

Cada aviso nuevo de la campana se envía también por correo al correo institucional de la persona (la dirección de su cuenta). Es un complemento de mejor esfuerzo: si el SMTP falla, el aviso interno se crea igual, la operación no se retrasa ni falla y el error queda en el registro del servidor. El mensaje es **formal** (saludo, firma de la Dirección de Bienestar Universitario y de la universidad, aviso de mensaje automático; versión de texto y de HTML) y **no incluye el texto del aviso ni datos de la persona atendida**: solo informa que hay algo nuevo y trae el enlace directo al caso o a la solicitud, donde hay que iniciar sesión (confidencialidad, Ley N.° 29733). Se envía únicamente a cuentas activas. Además del aviso al responsable, **el tutorado recibe una constancia** de que su solicitud quedó registrada (tipo `TUTORING_REQUEST_RECEIVED`), la haya registrado él o su tutor a su nombre. No hay resúmenes ni preferencias por persona: un correo por aviso. En desarrollo, los correos se ven en Mailpit (puerto 8025).

Para configurar y probar el SMTP paso a paso, ver `docs/GUIA_SMTP.md`.

Implementación: `server/src/infrastructure/repositories/EmailNotificationRepository.ts` envuelve al repositorio de avisos (los casos de uso no cambian) y `server/src/application/services/notificationEmail.ts` arma el mensaje.

## 7. Base de datos

- **Esquema:** `server/prisma/schema.prisma`; 35 migraciones escritas a mano en `server/prisma/migrations/<fecha>_<nombre>/migration.sql`.
- **Aplicar migraciones:** `pnpm prisma migrate deploy` (desarrollo) o, en la imagen de producción, `node node_modules/prisma/build/index.js migrate deploy` (ya
  incluido en el arranque). Estado: `… migrate status`.
- **Modelos principales:**

| Grupo | Modelos |
|---|---|
| Acceso | `User`, `Role`, `Permission`, `RolePermission`, `RefreshToken` (con hash), `PasswordResetToken` (con hash, un solo uso), `AuditLog` |
| Estructura académica | `Faculty`, `School`, `AcademicPeriod` (con `closedAt`, `closedById` y `closureSummary` al cerrarse), `CatalogItem`, `StudentPeriodSnapshot` (corte de matrícula por semestre) |
| Tutoría | `Student`, `PeriodEnrollment` (matrícula por periodo), `DataRequest` (pedidos de listas por correo), `TutorAssignmentHistory`, `TutorInterview`, `TutorFollowUp`, `SupportContact`, `TutoringRequest` |
| Sesiones | `Session`, `SessionParticipant`, `SessionAttendance` (numeración por semestre), `SessionChangeHistory`, `SessionEvidence` |
| Derivaciones | `StudentReferral`, `ReferralStatusHistory`, `Notification`, `SignedDocument` |
| Evaluación e informes | `TutorEvaluation`, `EvaluationWindow`, `WorkPlan`, `WorkPlanVersion`, `TutorSemesterReport` |
| Configuración | `SystemParameter`, `BrandingSetting` |

- **Cierre de periodo:** `POST /api/periods/:id/close` (DBU, confirmando el nombre), `POST /api/periods/:id/reopen`, `GET /api/periods/:id/closure` (resumen) y `GET /api/periods/current` (cualquier sesión). Sin periodo vigente, el middleware `requireOpenPeriod` rechaza con `409 PERIOD_CLOSED` los registros operativos (sesiones, asistencias, entrevistas, seguimientos, red de apoyo, derivaciones, solicitudes y adjuntos firmados); las cargas y la administración no pasan por él. Se consulta la base en cada escritura para que el cierre rija al instante.
- **Matrícula por periodo:** `POST /api/students/import` y el alta manual matriculan al estudiante en el periodo vigente (los que ya existían continúan: se actualiza su ciclo y se reactivan; sin periodo vigente la carga responde `409 NO_OPEN_PERIOD`). El middleware `requireEnrollment` rechaza con `403 NOT_ENROLLED` las acciones propias del estudiante (`POST /tutoring-requests/me`, `POST /evaluations`) si no figura en la matrícula del periodo vigente; `GET /api/periods/current` devuelve `enrolled` para estudiantes. La migración matricula a los estudiantes activos en el periodo vigente al actualizar. El corte de matrícula y el resumen del cierre usan la matrícula cuando el periodo la tiene.
- **Sedes y escuela del tutor:** modelo `Campus` (sedes; la migración crea Central, Bagua y Utcubamba y deja todas las escuelas en la central), `School.campusId` (una sede por escuela) y `User.schoolId` (escuela del Docente Tutor; la migración la rellena si todos sus tutorados son de una escuela). Endpoints con permiso `campuses:manage` (Vicerrectorado y DBU): `GET /api/campuses` (sedes + escuelas con su sede), `POST /api/campuses`, `PATCH /api/campuses/:id` (nombre / activa), `PUT /api/schools/:id/campus`. `POST/PATCH /api/users` y la asignación de rol exigen `schoolId` para el Docente Tutor (`400`) y lo descartan en los demás roles. `assertTutorServesSchools` rechaza con `409` la asignación masiva y la reasignación de un estudiante a un tutor de otra escuela (un tutor sin escuela, anterior a la regla, no se bloquea); `GET /api/tutors/workload` incluye `schoolId`.
- **Alta masiva de docentes:** `GET /api/tutors/import/template` y `POST /api/tutors/import` (multipart `.xlsx`, máx. 5 MB, firma verificada; permiso `users:write`, solo DBU). `ImportTutorsUseCase` valida cada fila (nombre, apellido, correo único, escuela por nombre sin acentos), crea la cuenta con `CreateUserUseCase` y emite la invitación; una fila con error no detiene las demás. El informe incluye el enlace solo de quienes no recibieron el correo. En la aplicación: página guiada `/carga-docentes` (menú Periodo académico, solo DBU); el botón «Importar docentes» de Usuarios y roles lleva a ella.
- **Tutor por ciclo:** modelo `CycleTutorAssignment` (único por periodo + escuela + ciclo; `isException` + `note`). `GET/PUT/DELETE /api/schools/:schoolId/cycle-tutors[/:cycle]` (permiso `students:write` y alcance por escuela con `StudentAccessGuard`; requiere periodo vigente). El tutor debe ser del mismo `schoolId` (`409`); un tutor con otro ciclo en el periodo se rechaza con `409 TUTOR_HAS_CYCLE` salvo `isException: true` con motivo (máximo dos ciclos). `CycleTutorApplier` asigna a los matriculados sin tutor y mueve, con `TutorAssignmentHistory`, a quienes seguían con el tutor de otro ciclo; la carga masiva y el alta manual lo aplican a cada estudiante. Ciclos 1–10.
- **Aceptación del tutor:** `CycleTutorAssignment` guarda `acceptanceStatus` (`SIN_SOLICITAR` → `PENDIENTE` → `ACEPTADA`/`RECHAZADA`), la huella SHA-256 del enlace (`acceptanceTokenHash`, único, vence con `INVITATION_TTL_HOURS`), `availability` (JSON de tramos `{day 1-6, start, end, place?}`) y `declineReason`. `PUT .../cycle-tutors/:cycle` pide la aceptación cuando entra un docente nuevo; `POST .../cycle-tutors/:cycle/acceptance-request` la reenvía (invalida el enlace anterior). Rutas públicas con límite por IP: `GET/POST /api/tutor-acceptance/:token` (enlace inválido, usado o vencido → `404` genérico). Validación: tramos de ≥ 45 min, sin cruces, total ≤ parámetro `tutor_max_weekly_hours` (predeterminado 10). Bitácora: `CYCLE_TUTOR_ACCEPTANCE_REQUESTED/ACCEPTED/DECLINED` (sin el enlace).
- **Aviso del rechazo a la coordinación (LEV-R05):** al rechazar, `DeclineNoticeRepository.recordDecline` guarda **en una sola transacción** el rechazo (estado, motivo, fecha) y un intento `ORIGINAL` en `decline_notice_attempts` con estado `EN_COLA`, y deja el resumen en `cycle_tutor_assignments.decline_notice_status / decline_notice_attempt_id`. La respuesta al docente **no espera SMTP**. El envío lo hace `DeclineNoticeProcessor`, por dos vías que comparten la misma reserva atómica (`claim`: `UPDATE … WHERE status = 'EN_COLA'`; solo una gana): el **intento inmediato** tras confirmar el rechazo (solo una optimización) y el **proceso de fondo** (`EmailOutboxWorker` reutilizado con la etiqueta «avisos de rechazo»), que cada 30 s —**intervalo de revisión, no una latencia garantizada**— barre los intentos `ENVIANDO` sin resultado y toma lo `EN_COLA`. Solo existe cuando hay `SMTP_HOST`; sin él los avisos se conservan `EN_COLA` y Pendientes explica la causa. Estados del intento: `EN_COLA` (nunca se intentó), `ENVIANDO`, `ENVIADO` (aceptado por el servidor de correo), `FALLIDO` (demostrado que no fue aceptado), `INCIERTO` (usa `mailOutcomeOf`: ante la duda es incierto), `SIN_DESTINATARIO` (sin coordinación con cuenta activa y correo), `DATOS_INCOMPLETOS`, `OBSOLETO`. **Un solo intento automático**: un `ENVIANDO` sin resultado pasa a `INCIERTO` tras 5 min y **nunca se repite solo**; un `FALLIDO` tampoco (no hay reintentos automáticos); lo `EN_COLA` que nunca se intentó sí se recupera tras un reinicio. Antes de enviar se vuelve a comprobar que la designación siga rechazada por ese mismo rechazo (`tutor_id` + `declined_at`) y se resuelve el destinatario habilitado **actual**, que se anota en el intento (`recipient_user_id`, `recipient_email`) antes del envío. Ninguna transacción permanece abierta durante el envío; el resultado se registra con una actualización condicional (mismo intento, `ENVIANDO`, dentro del margen), así que un resultado tardío no pisa un `INCIERTO`. El plazo de espera (60 s) no cancela el transporte. No hay entrega «exactamente una vez».
- **Clasificación del fallo SMTP (pedidos de listas y aviso del rechazo):** `SmtpMailer` observa la fase de cada envío (un transporte por envío con `transactionLog` y un `logger` propio que solo anota, sin guardar ni imprimir nada, si salió la orden `DATA`); es no aceptado (`FALLIDO`) solo con una respuesta de rechazo 4xx/5xx del servidor o un fallo anterior a `DATA` (conexión, saludo, STARTTLS, autenticación, remitente, destinatario), y es incierto (`INCIERTO`) un corte o un tiempo agotado desde que se envió `DATA`. No se deduce de `error.command`: nodemailer informa `CONN` en cortes y tiempos agotados aunque el cuerpo ya se haya enviado. Lo usan por igual los pedidos de listas (C-4) y el aviso del rechazo de un docente (C-5).
- **Reenvío:** `POST /api/schools/:schoolId/cycle-tutors/:cycle/decline-notice/resend` (permiso `students:write` y alcance por escuela, como reenviar la aceptación). Cuerpo: `operationId` (UUID, **obligatorio**: sin él `400`) y, si el último intento es `INCIERTO` o no hay registro (rechazos anteriores a esta función), `confirmPrevious: { attemptId }` con el id de ese intento (`null` = sin registro). Reenvía **solo el correo**; no modifica el rechazo. Respuestas: `201` aceptado; `200` repetición de una operación ya guardada (`replayed: true`) o sin envío; `202` resultado incierto o envío en curso; `502` no aceptado; `409` con `code` `CONFIRMATION_REQUIRED` (trae `previous: { attemptId, status, at }`; una confirmación de otro intento vuelve a pedir la del actual), `DECLINE_NOTICE_IN_FLIGHT` (no admite confirmación), `DECLINE_NOTICE_ALREADY_SENT`, `DECLINE_NOT_REJECTED` (reenvío obsoleto), `NO_ENABLED_RECIPIENT`, `DELIVERY_DISABLED`; `422` `OPERATION_ID_CONFLICT`. El identificador es por persona (`UNIQUE (requested_by_id, operation_id)`) y la sección crítica de una designación toma un candado de transacción corto (`pg_advisory_xact_lock`), nunca durante el envío. Bitácora sin tokens ni errores técnicos: una entrada `CYCLE_TUTOR_DECLINE_NOTICE_RESEND` (actor y motivo del reenvío, vinculada al intento) y una `CYCLE_TUTOR_DECLINE_NOTICE_RESULT` por intento (resultado y destinatario).
- `GET /api/institutional-pending`: el ítem `DESIGNATION_REJECTED` lleva `notice` (`status`, `attemptId`, `kind`, `at`, `recipientName`, `deliveryEnabled`, `canResend`, `needsConfirmation`); sin códigos de error ni correos. Un `ENVIANDO` vencido se muestra `INCIERTO`. La respuesta pública al docente (`POST /api/tutor-acceptance/:token`) no incluye nada del aviso.
- **Rol Decano y amonestaciones:** rol `Decano` con `User.facultyId` (obligatoria para ese rol en el alta/edición/cambio de rol; se descarta en los demás) y permisos `admonitions:read` / `admonitions:write` (la DBU los tiene todos; la coordinación, solo `admonitions:read`). Modelo `Admonition` (docente, emisor, escuela y facultad del docente al momento de emitir, fecha, motivo y documento opcional con huella SHA-256; el archivo se guarda con `EvidenceStorage`). Endpoints: `GET /api/admonitions` (alcance: Decano → su facultad, coordinación → sus escuelas, DBU → todo), `GET /api/admonitions/tutors` (docentes amonestables), `POST /api/admonitions` (multipart; motivo 10–1000 caracteres, fecha no futura, archivo PDF/PNG/JPEG ≤ 10 MB con firma verificada), `GET /api/admonitions/:id/file` (bitácora de descarga; fuera de alcance → `404`). Solo Decano o DBU emiten; el Decano solo a docentes de su facultad (`400` si no).
- **Pedido de listas:** `PUT /api/schools/:id/request-email` (DBU o coordinación de esa escuela), `POST /api/data-requests` (correo formal con la plantilla Excel adjunta, copia y Reply-To a quien pide; queda con un estado de envío: `PENDIENTE`, `ENVIADO`, `FALLIDO` o `INCIERTO`), `GET /api/data-requests` y `POST /api/data-requests/:id/received`. Permiso `students:import`, con el alcance por escuela de siempre. `POST /api/data-requests` acepta `kind: 'ESTUDIANTES' | 'DOCENTES'` (por omisión estudiantes); la lista de docentes usa la plantilla de docentes y su propio texto, y la pide solo la DBU (`403` para la coordinación). El cliente la ofrece con un clic en las pantallas de carga (`RequestListBanner`). **Idempotencia y equivalencia (LEV-R04):** el cuerpo lleva `operationId` (UUID, **obligatorio**: sin él `400`) y, al reenviar un pedido equivalente, `confirmDuplicateOf` (id del pedido anterior que se mostró). Respuestas: `201` creado y enviado; `200` repetición de una operación ya guardada (`replayed: true`, no se envía otro correo); `202` registrado con resultado incierto (`INCIERTO`); `502` registrado pero el correo no fue aceptado (`FALLIDO`); `409` con `code` `DUPLICATE_DATA_REQUEST` (equivalente en la ventana provisional de 10 min; trae `previous` = `{ id, createdAt, status }`) o `DATA_REQUEST_IN_FLIGHT` (hay un envío equivalente en curso: no admite confirmación); `422` `OPERATION_ID_CONFLICT` (mismo `operationId` con otro contenido). El `operationId` es por persona. El envío se espera como máximo 60 s; vencer ese plazo no cancela el transporte SMTP ni prueba que el correo no salió (queda `INCIERTO`). No hay entrega «exactamente una vez». Detalle en `docs/levantamiento/05` (LEV-R04).
- **Datos base** (`seedBase`): permisos, roles, parámetros. **Datos de demostración** (`prisma/seed.ts`): solo desarrollo.
- Los archivos adjuntos **no** están en la base: viven en `EVIDENCE_STORAGE_DIR` y se respaldan junto con ella.

## 8. Seguridad

Revisión completa en `docs/INFORME_SEGURIDAD_2026-10-11.md`. Resumen de lo implementado:

- **Autenticación:** contraseñas con bcrypt; token de acceso corto (15 min) y token de renovación con **rotación**, guardado con hash y con detección de
  reutilización; bloqueo de la cuenta tras 5 intentos fallidos (15 min); tope de 100 intentos por IP cada 5 min; tiempos de respuesta equivalentes para
  cuentas existentes e inexistentes.
- **Recuperación de contraseña:** enlace por correo de un solo uso, con hash y vigencia; la respuesta no revela si el correo existe; límite por IP.
- **Autorización:** permisos por rol más **control de alcance** (un tutor solo ve a sus tutorados, un coordinador solo su escuela, un servicio solo sus casos).
  Notas internas de las derivaciones ocultas al tutor emisor.
- **Archivos:** tipo y **contenido** validados (PDF, PNG, JPEG, WEBP, XLSX), tamaño máximo, nombres generados por el servidor, descarga como adjunto.
- **Cabeceras y red:** `helmet` (CSP, `nosniff`, `X-Frame-Options`, HSTS), CORS restringido al origen configurado.
- **Configuración de producción:** el servidor se niega a arrancar con secretos de ejemplo, contraseñas de desarrollo o URLs sin HTTPS.
- **Auditoría:** `AuditLog` registra inicios de sesión, cambios de estado, adjuntos y cambios de configuración; se consulta en *Bitácora de auditoría*.
- **Protección de datos:** los datos del tutorado son sensibles (Ley N.° 29733); el acceso está limitado por rol y alcance.

## 9. Respaldo, restauración y reversión

El servicio `backup` guarda, en **un único paquete verificado** (`sit_backup_AAAAMMDD_HHMMSS.tar`), la base de datos y los archivos adjuntos, con
manifiesto de sumas SHA-256. Se ejecuta según `BACKUP_CRON` (diario, 02:00), conserva los últimos `BACKUP_KEEP` y, si falla alguna etapa, **no publica
nada a medias**, no borra los respaldos existentes y marca `FAIL` (el contenedor pasa a *unhealthy*).

- **Copia fuera del servidor (obligatoria en producción):** `BACKUP_OFFSITE_DIR` (carpeta montada) o `BACKUP_UPLOAD_CMD` (p. ej. `rclone copy "$BACKUP_FILE" remoto:sit`).
- **Respaldo manual:** `docker compose -f docker-compose.prod.yml exec backup backup.sh`
- **Restaurar** (destructivo): `RESTORE_CONFIRM=yes restore.sh /backups/<paquete>.tar /data/restore` dentro del contenedor `backup`. Verifica las sumas antes de tocar la base.
- **Reversión de una actualización:** respaldar antes de actualizar; si falla, detener `server` y `web`, restaurar el respaldo previo, volver a la versión anterior
  (`git checkout vX.Y.Z`) y reconstruir. Pasos exactos en `deploy/README.md`.
- **Ensayo:** `backup/test-backup.sh` (también corre en CI) comprueba respaldo, falla controlada, retención y restauración con adjuntos idénticos byte a byte.
  El ensayo local de migración y reversión está documentado en `docs/ACEPTACION_SECCION7_2026-10-09.md`.

## 10. Pruebas y calidad

| Nivel | Herramienta | Cómo ejecutarlo |
|---|---|---|
| Servidor: unitarias | Jest | `cd server && npx jest tests/unit` |
| Servidor: integración y rutas (**base real**) | Jest | `cd server && REQUIRE_DB_TESTS=1 npx jest --runInBand` (necesita la base de desarrollo sembrada) |
| Cliente | Vitest + Testing Library | `cd client && npx vitest run --no-file-parallelism` |
| Extremo a extremo | Playwright | `cd e2e && npx playwright test` (ver `e2e/README.md`; necesita `docker compose up -d`) |
| Tipos y estilo | TypeScript estricto, ESLint | `npx tsc --noEmit` y `pnpm lint` en `server/` y `client/` |
| Dependencias | `pnpm audit --prod` | en `server/` y `client/` |

Las **capturas del manual de usuario** (`docs/manual/img/`) se regeneran con `cd e2e && npx playwright test -c playwright.manual.config.ts`, sobre un entorno recién sembrado (`docker compose down -v && docker compose up -d --build`) y con datos de demostración realistas; no forman parte de la suite de pruebas.

La trazabilidad entre historias de usuario y pruebas está en `docs/MATRIZ_TRAZABILIDAD_PRUEBAS.md`. La aceptación manual con evidencia está en
`docs/ACEPTACION_*.md`.

## 11. Integración y entrega continuas

GitHub Actions (`.github/workflows/`):

- **`ci.yml`** (en cada push y pull request a `develop` y `main`): lint, compilación y pruebas del servidor (con PostgreSQL de servicio) y del cliente,
  auditoría de dependencias, ensayo de restauración de respaldos y, solo en *push*, construcción de las imágenes Docker.
- **`pr-checks.yml`** (en cada pull request): título con *Conventional Commits*, descripción con contenido, rama de origen permitida para `main` y, hacia `main`,
  el **DoD técnico** completo.
- La suite E2E (`e2e/`) **no** se ejecuta en CI todavía: requiere levantar el stack completo.

## 12. Operación diaria y solución de problemas

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| «No se pudo conectar con el servidor» al entrar | El servidor aún arranca, o Docker no está en ejecución | Esperar y revisar `docker compose ps` y `curl localhost:3000/api/health`. En desarrollo el arranque puede tardar varios minutos. |
| El servidor de producción **no arranca** | La validación de configuración falló | Leer el registro (`docker compose logs server`): lista cada problema (secreto, URL sin HTTPS, SMTP ausente…). |
| No llegan los correos de recuperación | SMTP mal configurado | Revisar `SMTP_*` y `MAIL_FROM`; en desarrollo ver Mailpit en el puerto 8025. |
| Un usuario no puede entrar | Cuenta desactivada o bloqueada (5 intentos fallidos, 15 min) | La DBU la reactiva en *Usuarios y roles*; el bloqueo expira solo. |
| «Demasiados intentos…» | Límite por IP (inicio de sesión o recuperación) | Esperar unos minutos. Detrás de un proxy, configurar `TRUST_PROXY`. |
| El respaldo aparece *unhealthy* | Falló el último respaldo o la copia externa | `docker compose logs backup` y `cat /backups/last_status`; revisar el destino externo. |
| Tras actualizar, todos deben volver a entrar | Las migraciones cierran las sesiones abiertas | Es lo esperado. |
| Un adjunto no se abre | Archivo ausente en `EVIDENCE_STORAGE_DIR` | Restaurar desde el respaldo (incluye adjuntos). |

**Comandos útiles**

```bash
docker compose -f docker-compose.prod.yml logs -f server        # registro del servidor
docker compose -f docker-compose.prod.yml exec backup ls -lh /backups
docker compose -f docker-compose.prod.yml exec backup cat /backups/last_status
```

**Mantenimiento periódico recomendado:** revisar `last_status` del respaldo y probar una restauración cada trimestre; ejecutar `pnpm audit --prod`; rotar
`JWT_SECRET` y las credenciales SMTP cuando cambie el personal responsable (invalida las sesiones abiertas); revisar la bitácora de auditoría.

## 13. Flujo de versiones

Git Flow: `feature/*`, `fix/*` y `docs/*` se integran en `develop` por *pull request*; los *releases* salen de `release/vX.Y.Z` hacia `main`, se etiquetan
(`vX.Y.Z`) y se devuelven a `develop` (merge de `main` a `develop` con **commit de merge**, no *squash*). Los commits siguen *Conventional Commits*. Cada PR
incluye el DoD (DoD-SIT-001). Detalle en `README.md`.

## 14. Limitaciones conocidas

- Los tokens de sesión se guardan en `localStorage` del navegador (riesgo bajo con la política de contenido actual; ver informe de seguridad).
- El tope de intentos por IP es un contador **en memoria** de una sola instancia del servidor.
- Los parámetros `inactivity_timeout_minutes`, `login_max_attempts` y `login_lockout_minutes` existen en la base pero **no se usan**: la inactividad
  (15 min) se fija en el cliente y el bloqueo (5 intentos, 15 min) en el servidor.
- Falta ejecutar un escáner dinámico (OWASP ZAP) y el ensayo completo de instalación en el servidor real con el dominio definitivo.
