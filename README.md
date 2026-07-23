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
- Git

## Arranque rápido con Docker

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd Tutoria-untrm

# 2. Levantar los servicios
docker-compose up --build

# 3. Ejecutar migración y seed (en otra terminal)
docker exec -it sit-backend npx prisma migrate dev --name init
docker exec -it sit-backend npx ts-node prisma/seed.ts
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
npm install
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts
npm run dev

# 3. Frontend (otra terminal)
cd frontend
npm install
npm run dev
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

## Convenciones

- **Git Flow**: ramas `main`, `develop`, `feature/HU-XX-descripcion`
- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- **TypeScript estricto**: `strict: true` en ambos tsconfig
- **Backend**: Arquitectura Hexagonal — el dominio no depende de la infraestructura
- **Frontend**: Organizado por features; cada feature contiene sus componentes, hooks y servicios

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
