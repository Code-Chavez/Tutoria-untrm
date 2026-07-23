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
- [Node.js 22+](https://nodejs.org/) (para desarrollo local sin Docker)
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

### Flujo de trabajo

```bash
# 1. Crear rama desde develop
git checkout -b feature/HU-01-login develop

# 2. Desarrollar con Conventional Commits
git commit -m "feat: add login endpoint with JWT"

# 3. Push y crear Pull Request → develop
git push -u origin feature/HU-01-login

# 4. CI verde + review → merge a develop
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

El pipeline se ejecuta en cada push y PR a `develop` y `main`:

1. **Backend**: Lint → Build → Test (con PostgreSQL de servicio)
2. **Frontend**: Type check → Build
3. **Docker**: Build de imágenes (solo en push a develop/main)

Los criterios de la DoD C-07 se verifican automáticamente:
- TypeScript estricto sin errores
- Tests pasan
- Auditoría de dependencias
- Build exitoso

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
