# SIT · UNTRM

**Sistema de Información para la Sistematización de los Procesos de Acompañamiento de Tutoría Universitaria — FISME**

Universidad Nacional Toribio Rodríguez de Mendoza de Amazonas  
Dirección de Bienestar Universitario  
Protocolo N° 01-2024-UNTRM/DBU · R.C.U. N° 283-2024

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js · Express · TypeScript · Arquitectura Hexagonal |
| Frontend | React · Vite · TypeScript · Organización por features |
| Base de datos | PostgreSQL 16 · Prisma ORM |
| Infraestructura | Docker · Docker Compose |
| Autenticación | JWT (access + refresh) · BCrypt |
| Validación | Zod |
| Testing | Jest |

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
docker-compose up --build

# 3. Ejecutar migración y seed (en otra terminal)
docker exec -it sit-backend pnpm prisma migrate dev --name init
docker exec -it sit-backend pnpm ts-node prisma/seed.ts
```

Los servicios estarán disponibles en:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api/health
- **PostgreSQL**: localhost:5432

## Arranque local (sin Docker)

```bash
# 1. PostgreSQL debe estar corriendo en localhost:5432

# 2. Backend
cd backend
cp .env.example .env    # ajustar DATABASE_URL si es necesario
pnpm install
pnpm prisma migrate dev --name init
pnpm ts-node prisma/seed.ts
pnpm dev

# 3. Frontend (otra terminal)
cd frontend
pnpm install
pnpm dev
```

## Estructura del proyecto

```
Tutoria-untrm/
├── backend/
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
├── frontend/
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
| **Backend — Lint** | ESLint con typescript-eslint |
| **Backend — Build** | TypeScript compila (`strict: true`) + Prisma |
| **Backend — Test** | Jest con PostgreSQL de servicio + coverage |
| **Backend — Audit** | Vulnerabilidades en dependencias de producción |
| **Frontend — Lint** | ESLint con react-hooks y react-refresh |
| **Frontend — Build** | Type check (`tsc --noEmit`) + Vite build |
| **Docker — Build** | Build de imágenes (solo en push, no en PRs) |

### PR Checks (`pr-checks.yml`)

Se ejecuta en cada Pull Request:

- **Título**: debe seguir Conventional Commits (`feat:`, `fix:`, etc.)
- **Descripción**: debe tener contenido mínimo
- **Protección de main**: solo permite PRs desde `release/*`, `hotfix/*` o `develop`
- **DoD checklist**: verifica que todos los items estén marcados (PRs a main)

## Convenciones de código

- **TypeScript estricto**: `strict: true` en ambos tsconfig
- **Backend**: Arquitectura Hexagonal — el dominio no depende de la infraestructura
- **Frontend**: Organizado por features; cada feature contiene sus componentes, hooks y servicios
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

## Licencia

Proyecto académico — UNTRM, Prácticas Pre-Profesionales.
