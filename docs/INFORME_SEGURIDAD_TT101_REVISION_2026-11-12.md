# Revisión de seguridad — TT-101 (repaso del 12/11/2026)

**Alcance:** lo agregado después del [informe del 11/10](INFORME_SEGURIDAD_2026-10-11.md): certificación del tutor, pedidos de listas por facultad, estudiantes por periodo, opciones de periodo, roles configurables y catálogos. **Código:** `develop` en `1398f9a`. **Entorno:** stack de desarrollo con la base sembrada. Issue: #291.

**Método:** auditoría de dependencias, revisión estática de las rutas y sondeo de la API en ejecución con una cuenta de cada rol (solo lecturas). No sustituye un escáner externo ni la revisión de infraestructura.

## Resultado

| # | Sev. | Categoría | Hallazgo | Estado |
|---|---|---|---|---|
| G1 | Baja | A01 Control de acceso | `GET /api/roles` respondía 200 a cualquier cuenta autenticada, incluido un tutorado, con todos los roles, sus permisos y cuántas cuentas tiene cada uno. | **Corregido:** exige `users:read` (administración y coordinación, que son quienes lo usan). Prueba de integración nueva en `roleAdminHttp.test.ts`. |
| G2 | Info | A06 Componentes | Producción: 1 aviso moderado en el servidor (`uuid` vía `exceljs`, GHSA-w5hq-g745-h8pq; ya era F7) y ninguno en el cliente. Los avisos altos y críticos (handlebars, js-yaml, vite…) son solo de desarrollo. | Sin acción; sigue ignorado y documentado. |

## Comprobado y correcto

- **Rutas:** `server/tests/http/routeProtection.test.ts` recorre todas las rutas registradas; las nuevas exigen sesión (401 sin token y con token falso). Las únicas rutas sin permiso explícito son `GET /periods/current` (nombre del periodo vigente), la descarga de documentos firmados (el acceso se valida por persona en el controlador) y las de branding y certificados, que usan permisos con alias.
- **Permisos por rol** (administración, coordinación, tutor, profesional de servicio, vicerrectorado, decanato, tutorado), sobre los endpoints nuevos:

| Endpoint | Administración | Coordinación | Tutor | Resto |
|---|---|---|---|---|
| `GET /students?periodId=` | 200 | 200 | 200 | 403 |
| `GET /periods/options` | 200 | 200 | 200 | 403 |
| `GET /periods/:id/closure` | 200 | 403 | 403 | 403 |
| `GET /data-requests` | 200 | 200 | 403 | 403 |
| `GET /certificates` y configuración visual | 200 | 403 | 403 | 403 |
| `GET /users`, `/institutional-pending` | 200 | 200 | 403 | 403 |
| `GET /catalogs/*` | 200 | 403 | 403 | 403 |

- **Alcance de datos:** con el mismo filtro de periodo, administración ve 246 estudiantes, coordinación 236 (su escuela) y el tutor 50 (los suyos).

## Pendiente de TT-101

Pruebas de integración entre módulos con flujos completos (solicitud → sesión → derivación → cierre de periodo) están cubiertas por las suites de integración y E2E existentes; no se agregaron casos nuevos en este repaso.
