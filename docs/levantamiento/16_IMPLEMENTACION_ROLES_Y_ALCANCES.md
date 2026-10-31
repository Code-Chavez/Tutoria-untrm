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
