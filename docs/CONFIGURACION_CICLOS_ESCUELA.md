# Ciclos por escuela profesional

La cantidad se guarda en `schools.cycle_count`. Se configura con el rol Administrador en Configuración → Catálogos → Escuelas → Editar → Cantidad de ciclos de la escuela.

- Pedir listas genera sus opciones desde la cantidad guardada para la escuela seleccionada. Al cambiar de escuela, se seleccionan todos sus ciclos; no se reutilizan selecciones de otra escuela.
- Asignación por ciclo consulta la misma cantidad. Una escuela configurada con 12 ciclos muestra y admite el ciclo 12.
- El servidor rechaza pedidos y asignaciones con ciclos superiores a los configurados.
- No se permite reducir la cantidad por debajo del mayor ciclo de sus estudiantes o asignaciones existentes.
- Se mantiene el límite técnico general de 14 ciclos que ya existe en matrícula, importación y catálogos. Ampliarlo exige actualizar esas validaciones en conjunto.

## Migración

Aplicar las migraciones y regenerar Prisma antes de iniciar la API. La migración `20261020020000_school_cycle_count` conserva el comportamiento previo de las escuelas existentes (10 ciclos) y cualquier ciclo superior que ya tenga estudiantes o asignaciones. No deduce el plan oficial de estudios: el administrador debe revisar cada escuela y guardar su cantidad real. No modifica las listas de estudiantes ni las asignaciones.

La prueba de integración `server/tests/integration/schoolCycles.test.ts` requiere `REQUIRE_DB_TESTS=1` y usa una transacción que revierte todos sus datos temporales.
`La migración admite instalación limpia: no consulta asignaciones por ciclo hasta comprobar que exista su tabla, creada por una migración posterior. En actualizaciones conserva los ciclos de las asignaciones existentes.`
