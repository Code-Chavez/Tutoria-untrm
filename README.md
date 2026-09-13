# SIT · UNTRM

**Sistema de Información para la Sistematización de los Procesos de Acompañamiento de Tutoría Universitaria — FISME**

Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas  
Dirección de Bienestar Universitario  
Protocolo N° 01-2024-UNTRM/DBU · R.C.U. N° 283-2024

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Server | Node.js · Express · TypeScript · Arquitectura Hexagonal |
| Client | React · Vite · TypeScript · Organización por features |
| Base de datos | PostgreSQL 16 · Prisma ORM |
| Infraestructura | Docker · Docker Compose |
| Autenticación | JWT (access + refresh) · BCrypt |
| Validación | Zod |
| Testing | Jest (server) · Vitest + Testing Library (client) |

## Requisitos previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye Docker Compose)
- [Node.js 20+](https://nodejs.org/) (para desarrollo local sin Docker)
- [pnpm](https://pnpm.io/) (`corepack enable && corepack prepare pnpm@latest --activate`)
- Git

## Arranque rápido con Docker

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd Tutoria-untrm

# 2. Levantar los servicios
docker compose up --build
```

Eso es todo: el contenedor del server aplica las migraciones y ejecuta el seed
automáticamente en cada arranque, así que el entorno queda listo incluso con una
base de datos vacía. El seed es idempotente (todo son `upsert`).

Los servicios estarán disponibles en:
- **Client**: http://localhost:5173
- **Server API**: http://localhost:3000/api/health
- **PostgreSQL**: localhost:5432

Credenciales por defecto: `admin@untrm.edu.pe` / `Admin2026!`

> Si editas `vite.config.ts`, `package.json` o un `Dockerfile`, vuelve a levantar
> con `--build`: solo `src/` y `prisma/` están montados como volumen.

## Arranque local (sin Docker)

```bash
# 1. PostgreSQL debe estar corriendo en localhost:5432

# 2. Server
cd server
cp .env.example .env    # ajustar DATABASE_URL si es necesario
pnpm install
pnpm prisma migrate deploy
pnpm run seed
pnpm dev

# 3. Client (otra terminal)
cd client
pnpm install
pnpm dev
```

## Estructura del proyecto

```
Tutoria-untrm/
├── server/
│   ├── prisma/              # Schema y migraciones
│   ├── src/
│   │   ├── domain/          # Entidades e interfaces de repositorio
│   │   │   ├── entities/
│   │   │   └── repositories/
│   │   ├── application/     # Casos de uso y DTOs
│   │   │   ├── use-cases/
│   │   │   ├── ports/
│   │   │   └── dtos/
│   │   ├── infrastructure/  # Implementaciones concretas
│   │   │   ├── config/
│   │   │   ├── database/
│   │   │   ├── middleware/
│   │   │   ├── repositories/
│   │   │   └── services/
│   │   └── interfaces/      # Controladores HTTP y rutas
│   │       └── http/
│   │           ├── controllers/
│   │           ├── routes/
│   │           └── validators/
│   └── tests/
├── client/
│   ├── public/
│   └── src/
│       ├── features/        # Módulos por funcionalidad
│       │   ├── auth/
│       │   ├── dashboard/
│       │   ├── tutorados/
│       │   ├── sesiones/
│       │   ├── derivaciones/
│       │   ├── evaluacion/
│       │   ├── reportes/
│       │   └── admin/
│       ├── shared/           # Componentes y utilidades compartidas
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── services/
│       │   ├── styles/
│       │   ├── types/
│       │   └── utils/
│       └── assets/
├── docker-compose.yml
└── README.md
```

## Git Flow

El proyecto sigue Git Flow con la siguiente estructura de ramas:

| Rama | Propósito |
|------|-----------|
| `main` | Código en producción (releases etiquetadas) |
| `develop` | Integración, siempre desplegable en staging |
| `feature/HU-XX-descripcion` | Nuevas funcionalidades |
| `feature/TT-XXX-descripcion` | Tareas técnicas |
| `bugfix/descripcion` | Correcciones no urgentes |
| `hotfix/descripcion` | Correcciones urgentes desde main |
| `release/vX.Y.Z` | Preparación de release |

### Flujo de trabajo y templates de PR

Cada escenario tiene su propio template de PR con el DoD (DoD-SIT-001) adaptado:

| Escenario | Rama origen → destino | Template | Comando |
|-----------|----------------------|----------|---------|
| **Feature/Fix** | `feature/*` → `develop` | Default (automático) | `gh pr create` |
| **Hotfix** | `hotfix/*` → `main` | `hotfix_main.md` | `gh pr create --template hotfix_main.md` |
| **Release** | `release/*` → `main` | `release_main.md` | `gh pr create --template release_main.md` |

```bash
# Feature → develop (template por defecto con DoD completo)
git checkout -b feature/HU-01-login develop
git commit -m "feat: add login endpoint with JWT"
git push -u origin feature/HU-01-login
gh pr create  # usa el template por defecto

# Hotfix → main (corrección urgente)
git checkout -b hotfix/fix-token-expiry main
git commit -m "fix: correct JWT expiry validation"
git push -u origin hotfix/fix-token-expiry
gh pr create --template hotfix_main.md

# Release → main (fin de Sprint)
git checkout -b release/v1.0.0 develop
git commit -m "chore: bump version to 1.0.0"
git push -u origin release/v1.0.0
gh pr create --template release_main.md
```

### Conventional Commits

- `feat:` — Nueva funcionalidad
- `fix:` — Corrección de bug
- `docs:` — Documentación
- `refactor:` — Refactorización
- `test:` — Pruebas
- `chore:` — Mantenimiento
- `ci:` — CI/CD

## CI/CD (GitHub Actions)

### CI Pipeline (`ci.yml`)

Se ejecuta en cada push y PR a `develop` y `main`:

| Job | Qué verifica |
|-----|-------------|
| **Server — Lint** | ESLint con typescript-eslint |
| **Server — Build** | TypeScript compila (`strict: true`) + Prisma |
| **Server — Test** | Jest con PostgreSQL de servicio + coverage |
| **Server — Audit** | Vulnerabilidades en dependencias de producción |
| **Client — Lint** | ESLint con react-hooks y react-refresh |
| **Client — Test** | Vitest + Testing Library + coverage |
| **Client — Build** | Type check (`tsc --noEmit`) + Vite build |
| **Docker — Build** | Build de imágenes (solo en push, no en PRs) |

### PR Checks (`pr-checks.yml`)

Se ejecuta en cada Pull Request:

- **Título**: debe seguir Conventional Commits (`feat:`, `fix:`, etc.)
- **Descripción**: debe tener contenido mínimo
- **Protección de main**: solo permite PRs desde `release/*`, `hotfix/*` o `develop`
- **DoD técnico**: en PRs a main exige que la sección técnica del DoD (delimitada por
  `<!-- DOD-GATE:START/END -->` en la plantilla) esté 100% marcada. El sign-off humano
  (visto bueno del asesor, Sprint Review, tablero) queda fuera del gate y lo confirma
  quien aprueba el PR — un check automático no puede verificar una reunión.

## Convenciones de código

- **TypeScript estricto**: `strict: true` en ambos tsconfig
- **Server**: Arquitectura Hexagonal — el dominio no depende de la infraestructura
- **Client**: Organizado por features; cada feature contiene sus componentes, hooks y servicios
- **Clean Code**: nombres descriptivos, responsabilidad única, sin código muerto

## Roles del sistema

| Rol | Descripción |
|-----|-------------|
| Administrador DBU | Gestión completa del sistema |
| Coordinador | Coordinador de tutoría por escuela |
| Docente Tutor | Tutor asignado a estudiantes |
| Tutorado | Estudiante tutorado |
| Profesional de Servicio | Psicología, Asistencia Social, etc. |
| Vicerrectorado | Solo lectura de reportes |

## Usuario por defecto

```
Email:    admin@untrm.edu.pe
Password: Admin2026!
```

## Respaldos automáticos (RSK-001)

El servicio `backup` (Alpine + `pg_dump` + cron) genera un volcado comprimido de
la base de datos según la expresión cron configurada y conserva los últimos N en
un volumen aislado (`backup_data`).

| Variable | Por defecto | Descripción |
|----------|-------------|-------------|
| `BACKUP_CRON` | `0 2 * * *` | Programación del volcado (diario a las 02:00) |
| `BACKUP_KEEP` | `7` | Cantidad de volcados a conservar |

Al arrancar ejecuta un volcado inicial. Comandos útiles:

```bash
# Lanzar un respaldo manual
docker exec sit-backup /usr/local/bin/backup.sh

# Listar los respaldos
docker exec sit-backup ls -lh /backups

# Restaurar un volcado
docker exec -i sit-postgres sh -c 'zcat | psql -U sit_user -d sit_db' < backup.sql.gz
```

## Licencia

Proyecto académico — UNTRM, Prácticas Pre-Profesionales.
