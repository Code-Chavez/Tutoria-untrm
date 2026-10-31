# Implementación de roles, permisos y alcances

Fecha de inicio: 31/10/2026. Rama: `codex/roles-permissions-foundation`.

El responsable del proyecto pidió comenzar la implementación de los requisitos pendientes. Esta instrucción autoriza el desarrollo técnico; no sustituye decisiones institucionales sobre cargos, certificación ni firma.

## Primera entrega: catálogo y acceso vigente (N-1)

Requisitos: LEV-R10 y LEV-R19, especificados en [11](11_ESPECIFICACION_ROLES_PERMISOS_ALCANCE.md). Estado: primera base técnica implementada y verificada localmente; no equivale a roles configurables completos ni al cierre del DoD.

- Catálogo único en `server/src/domain/permissionCatalog.ts`: conserva los 36 códigos y descripciones existentes.
- La inicialización de la base consume ese catálogo. No cambia concesiones, no retira permisos ni modifica registros existentes.
- Consulta autenticada y restringida a `admin:system`: `GET /api/roles/permissions`.
- Prueba automática que contrasta las declaraciones `authorize(...)` de las rutas con el catálogo. Rechaza códigos desconocidos y declaraciones dinámicas sin revisar.
- Caracterización del alcance existente: administrador, coordinaciones, docentes, estudiantes, servicios, vicerrectorado, decano, cuentas inactivas, rol desconocido y rol nuevo sin alcance.

### Verificación local

- TypeScript estricto y lint de los archivos modificados: sin errores.
- Seis suites seleccionadas: 76/76 pruebas, ninguna omitida. Incluyen cinco casos HTTP del catálogo con cuentas y roles propios, autorización, alcance sobre estudiantes y atomicidad de creación y bitácora.
- Instalación sobre una base nueva (`bootstrap`): 3/3 pruebas aprobadas en una corrida anterior de esta entrega.
- La primera corrida de integración también tuvo ocho fallos porque `sit_db_test` no estaba preparada (faltaban tablas). La preparación posterior detectó las tablas de control de pruebas, por lo que se creó y preparó una base diferente, `sit_roles_20261031_test`. La repetición completa de las seis suites pasó allí; no se borraron las tablas de control ni se tocó `sit_db`.
- Resultados JSON y salida completa de la repetición: archivos locales en `tmp/roles-foundation-final.*`; no se publican registros crudos con datos de pruebas.
- No se ejecutó la suite completa del servidor ni pruebas de interfaz en esta entrega. No hay interfaz nueva, migración ni cambio de las concesiones existentes. La caracterización protege el alcance actual del guardia de estudiantes; no acredita una migración de todos los módulos a autorización configurable.

## Trabajo posterior necesario

1. Persistir el alcance por asignación y probar paridad con los accesos actuales antes de cambiar su resolución.
2. Sustituir las comprobaciones de nombre por permisos y alcance, módulo por módulo; incluir privacidad de derivaciones y servicios.
3. Incorporar delegación, protección de roles base y del último administrador, concurrencia y auditoría transaccional.
4. Crear la interfaz para administrar roles, seleccionar permisos, copiar una plantilla y asignar alcance a usuarios.
5. Actualizar menús y sesión activa cuando cambien permisos; probar servidor y cliente conjuntamente.

No se anuncia ninguna de estas cinco partes como implementada por incorporar el catálogo. Los requisitos de lugar, correos y certificación mantienen su propia trazabilidad.

## Segunda entrega: persistencia y resolución del alcance (N-2, avance)

- Migración aditiva `20261031120000_user_access_policies`: política por usuario, vinculada al rol vigente; no rellena ni modifica las cuentas históricas.
- Alcances representados: ninguno, estudiantes asignados al propio usuario, varias escuelas, varias facultades, institución y servicio. Cada política usa una familia de alcance; un servicio no concede acceso a expedientes individuales mediante el guardia de estudiantes.
- `StudentAccessGuard` consulta la política persistida. Sin una política mantiene su regla histórica. Una política de otro rol, un rol sin permisos o una cuenta inactiva no concede acceso.
- Una restricción de base rechaza combinaciones incoherentes. Un disparador invalida la política cuando cambia el rol, incluso si el cambio se hace por otra ruta o después se vuelve al rol anterior.
- La migración y el cliente Prisma se prepararon en la base exclusiva de pruebas y en el entorno local de desarrollo. No se crean políticas para usuarios reales ni se activa una edición desde la interfaz en esta entrega.
- **Límite:** esta resolución se integra en el guardia de estudiantes y sus consumidores; todavía no sustituye las reglas particulares de planes, evaluación, facultades y derivaciones. No es aún el modelo completo de autorización configurable.

Verificación previa a la integración en el contenedor: TypeScript y lint sin errores; 74/74 pruebas unitarias de alcance, y una corrida de cuatro suites con 90/90 pruebas (incluye paridad de cuentas históricas, persistencia, aislamiento entre facultades, cambios de rol y rechazo de políticas inválidas). Los JSON y registros completos permanecen locales en `tmp/roles-scope-*.json` y `tmp/roles-scope-*.log`.

Después de conectar el repositorio al contenedor de dependencias: TypeScript y lint sin errores; tres suites de integración (`userAccessPolicy`, `objectAccess`, `permissionCatalogHttp`) con 30/30 pruebas. Una corrida separada de instalación nueva (`bootstrap`) pasó 3/3 con la nueva migración. Los recuentos corresponden a corridas diferentes y no se suman como casos únicos. La base de desarrollo conserva cero políticas: no se alteró el alcance de ninguna cuenta. No se ejecutó la suite completa del servidor ni se validó una interfaz de edición, que todavía no existe.
