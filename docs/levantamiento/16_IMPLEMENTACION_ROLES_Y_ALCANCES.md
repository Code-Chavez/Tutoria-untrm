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

## Tercera entrega: API de roles configurables (N-3, LEV-R11 primera parte)

Rama `feat/roles-permissions-api` (sobre N-1 y N-2). **Solo servidor; no hay pantalla todavía** (el cliente solo gana tres etiquetas de bitácora).

- Migración aditiva `20261102120000_roles_base_and_active`: `roles.is_base` y `roles.is_active`; los siete roles sembrados quedan como **base**; no cambia permisos ni cuentas.
- `POST /api/roles` acepta `permissions` (códigos del catálogo) y/o `copyFromRoleId` (plantilla). `PUT /api/roles/:id` reemplaza descripción y/o permisos. `PATCH /api/roles/:id/status` `{ isActive }` activa o desactiva. Todas exigen `admin:system`. `GET /api/roles` ahora informa `isBase`, `isActive` y `userCount`.
- **Reglas:** los permisos se eligen solo del catálogo (400 si no existe); `admin:system` **no es delegable** (403; valor provisional a confirmar con la DBU/TI, LEV-R13) y nadie otorga un permiso que no tiene; los roles base no se modifican ni se desactivan (409 `ROLE_PROTECTED`; el seed reaparecería sus permisos); no se desactiva un rol con cuentas (409 `ROLE_IN_USE`); un rol desactivado no concede permisos (ni con la caché) y no se puede asignar a una cuenta (409).
- **Efecto inmediato:** al crear, editar o desactivar un rol se vacían la caché de roles y la de permisos; el cambio rige desde la siguiente petición.
- **Bitácora** en la misma transacción que el cambio: `ROLE_CREATED`, `ROLE_UPDATED` (con lo añadido y lo quitado), `ROLE_ACTIVATED`, `ROLE_DEACTIVATED`.

Verificación local: `tsc` y `npm run lint` sin errores; 1 257 pruebas unitarias y de integración seleccionadas (`tests/unit` completo, `userAccessPolicy`, `permissionCatalogHttp`) más `roleAdminHttp` (12 pruebas HTTP reales sobre `sit_db_test`: permisos, rol base, `admin:system`, efecto inmediato, desactivar/asignar, bitácora) y `roleCreationAudit`; `authorize` ahora prueba el rol desactivado. No se ejecutó la suite completa del servidor.

**Límites:** sin pantalla ni asignación de alcance (siguientes entregas); un rol base solo se puede copiar (si la DBU necesita ajustar un rol base se decidirá aparte); la lista de permisos no delegables es provisional; la protección del último administrador ya existe para cuentas (#186) y aquí queda garantizada porque `admin:system` solo lo tienen los roles base, que no se pueden modificar.

## Cuarta entrega: alcance por persona (N-4, LEV-R12, API)

Rama `feat/user-access-scope-api`. **Solo servidor; sin migración** (usa `user_access_policies` de N-2).

- `GET /api/users/:id/access` devuelve el rol actual, el alcance guardado (`kind`, `schoolIds`, `facultyIds`, `service`, `revision`), su origen (`STORED`, `DEFAULT` si no se configuró y rige el comportamiento del rol, `OUTDATED` defensivo) y si es configurable. `PUT /api/users/:id/access` lo define: `NONE`, `OWN` (propios), `SCHOOLS`, `FACULTIES`, `INSTITUTION` o `SERVICE`. Ambas exigen `admin:system`.
- **Reglas:** `SCHOOLS`/`FACULTIES` exigen al menos una escuela/facultad existente y `SERVICE` un servicio válido (400 `ACCESS_SCOPE_INVALID`); los datos que el tipo no usa se descartan; nadie cambia su propio alcance; el tutorado no se amplía y la administración conserva `INSTITUTION` (409 `ACCESS_SCOPE_NOT_CONFIGURABLE`). El alcance solo limita datos, no concede permisos.
- Al cambiar el rol de una cuenta, la base invalida el alcance (queda en `NONE`, revisión +1) hasta que se defina de nuevo; así un alcance no acompaña a una persona a un rol con más poder.
- **Bitácora** `USER_ACCESS_UPDATED` en la misma transacción (rol, alcance anterior → nuevo). La revisión sube en cada cambio.
- El efecto es inmediato: `StudentAccessGuard` lee la política en cada petición, sin caché.

**Límites:** sin pantalla (siguiente entrega); asignar rol y alcance sigue siendo dos llamadas (la pantalla las unirá); no se probó por HTTP que el alcance filtre listados (lo cubren las pruebas de `StudentAccessGuard` de N-2); `SERVICE` hoy no da acceso a expedientes individuales (circuito de derivaciones separado); falta confirmar con la DBU qué roles admiten qué alcance (Q02/Q04/Q06).

## Quinta entrega: pantalla «Roles y permisos» (N-5, LEV-R11, cliente)

Rama `feat/roles-permissions-screen`. Solo cliente, sin cambios de servidor. Ruta `/roles` (pestaña «Roles y permisos» en Configuración, solo `Administrador DBU`).

- Lista de roles con su condición (Base / Personalizado / Desactivado), cuentas y permisos. Al elegir uno se ven sus permisos agrupados por área, con el código de cada uno.
- **Roles base:** solo lectura (casillas bloqueadas) y el botón «Crear a partir de este rol»; el sistema restablece sus permisos, por eso no se editan.
- **Rol personalizado:** editar descripción y permisos («Guardar cambios» solo con cambios), copiar, desactivar (confirmación; bloqueado con cuentas, con el motivo a la vista) y activar.
- **Nuevo rol** (vacío o copiando otro): nombre y descripción obligatorios; `admin:system` aparece bloqueado y no se envía (no delegable). Los errores del servidor se muestran tal cual.
- Los cambios invalidan las consultas de roles y usuarios.

Verificación local: `tsc`, `eslint` y 71 pruebas de cliente (`features/admin` y `layout`, incluida la nueva `RolesPage.test.tsx` con 7). **No se revisó en navegador contra el servidor** (la pila Docker del usuario monta otra rama).

**Límites:** el formulario de usuarios aún no filtra roles desactivados (el servidor los rechaza con 409); la asignación de rol y alcance por persona llega en la entrega siguiente; el menú por permisos, después.

## Sexta entrega: rol y alcance por persona en «Usuarios y roles» (N-6, LEV-R12, cliente)

Rama `feat/user-role-scope-assignment`. Solo cliente; usa `GET/PUT /api/users/:id/access` (N-4) y los roles de N-3.

- Cada fila de «Usuarios y roles» tiene la acción **«Rol y alcance»**: una ventana que resume **qué puede hacer** la persona (permisos de su rol agrupados por área) y deja definir **hasta dónde llega** (ninguno, propios, escuelas, facultades, institución o servicio) con una frase en vivo («Con esto: …»).
- Avisa cuando rige el valor por defecto del rol y cuando el alcance quedó en «ninguno» tras cambiar de rol. No deja editar el propio alcance, el del estudiante ni el de la administración, con el motivo a la vista; los errores del servidor se muestran tal cual.
- El **rol** se sigue cambiando con «Editar usuario» (ya existía y pide servicio/escuela/facultad cuando el rol lo exige); ese formulario ya no ofrece roles desactivados (salvo el que la cuenta ya tiene).
- Se extrajo `permissionGroups.ts` (áreas y etiquetas) para compartirlo con «Roles y permisos».

Verificación local: `tsc`, `eslint` y 35 pruebas de `features/admin` (incluidas `UserAccessDialog.test.tsx`, la fila de `UserTable` y los roles desactivados de `UserFormModal`). No se revisó en navegador contra el servidor.

**Límites:** rol y alcance siguen siendo dos pasos (editar usuario y luego «Rol y alcance»); la tabla no muestra el alcance de cada fila; el menú y la sesión por permisos llegan en la entrega siguiente.
