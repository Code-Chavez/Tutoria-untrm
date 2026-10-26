# Propuesta: arranque sin seed y base de pruebas que no acepta restos (26/10/2026)

**Estado: propuesta para decidir. No se implementó nada en el código ni se cambió ningún dato.** Se revisó primero lo que ya existe y se propone lo más sencillo que resuelve cada punto. Referencias: PR #170 y #171 (fusionados), #172 (corrección documental, `docs/AUTORREVISION_AISLAMIENTO_PRUEBAS_2026-10-26.md` y `docs/PRUEBAS_DE_INTEGRACION.md` §3.5).

## Resumen

| | Problema | Propuesta (lo más sencillo) | Qué no se hace |
|---|---|---|---|
| 1 | El arranque normal del servidor de desarrollo ejecuta `prisma/seed.ts` y ese seed **reescribe** algunas configuraciones existentes | Quitar el seed del arranque; dejarlo como orden explícita para entornos nuevos; y hacer que el seed **no sobrescriba** lo que ya tiene valor | No tocar producción (ya está separada) ni restaurar valores de desarrollo |
| 2 | Una corrida posterior acepta en silencio una base de pruebas contaminada por una terminación abrupta (o por una verificación fallida) | Que el `globalSetup` **se detenga con instrucciones** si encuentra restos de una corrida anterior; la recuperación es **recrear la base exclusiva** (ya existe y es desechable) | No recrearla automáticamente ni agregar un mecanismo de recuperación |

## Punto 1 · El arranque de desarrollo y el seed

### Qué existe hoy (hechos)

- **Desarrollo** (`server/Dockerfile`, línea 23): `pnpm prisma generate && pnpm prisma migrate deploy && pnpm run seed && pnpm run dev`. El seed corre en **cada arranque** del contenedor `sit-server`. `README.md` lo presenta como una ventaja («el entorno queda listo incluso con una base de datos vacía») y afirma que «el seed es idempotente (todo son `upsert`)».
- **Producción ya está separada** (`server/Dockerfile.prod`, línea 30): `checkProductionConfig` → `prisma migrate deploy` → `bootstrap.js` → `index.js`. Nunca ejecuta `prisma/seed.ts`. El `bootstrap` crea solo los datos base (`seedBase`: permisos, roles, parámetros, todo con `update: {}`) y el primer administrador si no existe ninguno; no cambia la contraseña de uno existente. **No hay nada que cambiar en producción.**
- **La afirmación «todo son upsert» es incompleta.** Lo que `prisma/seed.ts` reescribe en cada ejecución, aunque el dato ya exista (líneas del commit `0299db1`):

| Línea | Qué reescribe | Con qué |
|---|---|---|
| 109, 115, 121 | `coordinatorId` y `campusId` de «Ingeniería de Sistemas» y «Ingeniería Mecánica Eléctrica»; `campusId` de «Administración de Empresas» | Los valores de la seed (Rosa Mendoza, Carlos Vega, Sede Central) |
| 94 | `facultyId` del decano de la seed | La facultad de la seed |
| 127 | `schoolId` de los 4 docentes tutores de la seed | La escuela de la seed |
| 209–212 | `userId` de los 2 estudiantes con cuenta de portal | La cuenta de la seed |
| 218 en adelante | **Crea** (no sobrescribe) la matrícula en el periodo 2026-II de **todos** los estudiantes activos, no solo los de la seed | — |

  Todo lo demás es «crear si no existe» (`update: {}`), incluidos los parámetros del sistema (`seedBase`), por lo que un parámetro cambiado por la DBU **no** se sobrescribe.

### Alternativas

| Opción | Cambio | A favor | En contra |
|---|---|---|---|
| **A (recomendada)** | Quitar `pnpm run seed` del arranque de desarrollo; sembrar con una orden explícita | Cumple lo pedido; igual a producción (migrar, no sembrar); sin lógica nueva | Un entorno nuevo necesita una orden más |
| B | Sembrar al arrancar solo si no hay usuarios | Entorno nuevo «listo» sin orden extra | Sigue acoplado al arranque; un entorno a medias nunca se siembra; lógica nueva |
| C | Dejar el seed en el arranque y volverlo no destructivo | Cambio mínimo de flujo | Sigue ejecutándose en cada arranque (crea matrículas a todos los activos); el acoplamiento sigue |

### Propuesta concreta (A, más una defensa en el propio seed)

1. `server/Dockerfile`: `CMD ["sh", "-c", "pnpm prisma generate && pnpm prisma migrate deploy && pnpm run dev"]`. Las migraciones se siguen aplicando en cada arranque (es lo que hace producción).
2. Inicialización explícita de un entorno nuevo, separada del arranque:

```bash
docker compose up --build -d
docker compose exec server pnpm run seed     # solo la primera vez, o cuando se quiera sembrar a propósito
```

   `README.md` y `docs/MANUAL_TECNICO.md` (que ya dicen `pnpm run seed` para el arranque local sin Docker) se actualizan: el seed es una orden explícita y **ya no** corre en cada arranque. Se corrige la frase «todo son `upsert`».
3. **Defensa en el seed (opcional pero recomendada):** que una ejecución explícita sobre un entorno con datos tampoco sobrescriba: `update: {}` en las tres escuelas y las otras tres escrituras (`user.update`, `student.update`) solo cuando el campo esté vacío. En una base vacía el resultado es idéntico al actual.
4. **Prueba:** reutilizar el patrón de `bootstrap.test.ts` (base temporal propia): sembrar, cambiar a mano la coordinación y la sede de una escuela y la escuela de un docente, sembrar otra vez y comprobar que **no** cambian. Hoy esa prueba fallaría (documenta el defecto); con el cambio pasa.
5. **Aviso al arrancar sin seed (opcional):** si la base no tiene ningún usuario, el servidor escribe en el registro «sin usuarios: ejecute `pnpm run seed`», para que quien olvide el paso no se quede sin entender por qué no puede entrar.

Riesgos: quien tenía el hábito de «arrancar y ya» en un entorno nuevo tendrá la base vacía hasta ejecutar el seed (mitigado por el README y el aviso); los E2E y la CI no se afectan (la CI siembra explícitamente con su propio paso, y la base de pruebas con `test:db:prepare`).

### Incertidumbre sobre la base de desarrollo (documentada, no resuelta)

- El 26/10/2026 Docker Desktop estaba apagado y se **arrancaron** los contenedores de desarrollo con `docker start`. El arranque de `sit-server` ejecutó este seed. El registro del contenedor muestra 6 ejecuciones del seed en su historia; la de ese día fue una más.
- Hoy las tres escuelas de la seed tienen las coordinaciones y la sede de la seed. **No se compararon los valores anteriores** a ese arranque: no se sabe si alguno había sido cambiado a mano y fue reescrito. **No se debe afirmar que desarrollo quedó intacto ni se restauran valores por suposición.**
- Lo único que sí se midió: los conteos de todas las tablas de `sit_db` no cambiaron (huella `cb28d8e7…`, antes y después). Los conteos no detectan un valor cambiado.
- Posible fuente de comparación, **no abierta ni usada**: el volumen de respaldos `tutoria-untrm_backup_data` contiene respaldos diarios hasta el 23/10/2026 02:00. Está 3 días antes del arranque, así que una diferencia no probaría por sí sola que la causa fue el seed. Si se quiere resolver la duda, el camino es restaurar ese respaldo en una base **temporal** (nunca en `sit_db`) y comparar solo esos campos; la decisión de restaurar cualquier valor sería de quien administra ese entorno.

## Punto 2 · Base de pruebas contaminada por una terminación abrupta

### Qué existe hoy (hechos, de la implementación de #170/#171)

- El `globalSetup` ya confirma con `current_database()` que la base termina en `_test` **antes** de instalar nada; en cualquier otra base aborta. Todo lo que sigue solo existe en la base de pruebas.
- Mientras una corrida está en curso, `test_preexisting` contiene su foto (205 filas en la base de la verificación) y `test_row_origin` las filas que las pruebas van creando. Al terminar bien, ambas quedan vacías.
- Un `SIGKILL` deja ambas con datos y los parámetros cambiados (medido en `docs/resultados-2026-10-26/terminacion-abrupta.txt`). **Hay un segundo caso que no se había dicho:** si la verificación final **detecta** residuos o cambios, el `globalTeardown` descarta la foto antes de lanzar el error (`dropSnapshot` va antes del `throw`), de modo que la corrida siguiente también acepta ese estado en silencio.
- Las órdenes de recuperación ya existen: recrear la base de pruebas (`docker compose -f docker-compose.test-db.yml down/up` y `test:db:prepare`) o el SQL de `docs/PRUEBAS_DE_INTEGRACION.md` §3.5. `prepare-test-db.js` y `test-integration.js` ya se niegan si la base no termina en `_test`.

### Alternativas

| Opción | Cómo | A favor | En contra |
|---|---|---|---|
| Estado actual | Documentar la recuperación | Nada que mantener | La base contaminada se acepta en silencio |
| **Detectar y detenerse (recomendada)** | Al empezar, si hay una foto sin cerrar o filas en el registro, abortar con instrucciones | ~15 líneas sobre tablas que ya existen; nunca destruye nada; deja la evidencia de la corrida interrumpida; la recuperación es una orden ya existente | Un paso manual tras una interrupción |
| Recrear automáticamente al empezar | El `globalSetup` borra y vuelve a crear la base | Sin paso manual | Un proceso de jest **no puede recrear un contenedor**: tendría que vaciar el esquema, aplicar migraciones y sembrar desde dentro de la corrida (más tiempo y más código); destruiría la evidencia de la interrupción y datos que alguien preparó a propósito (p. ej. asignaciones preexistentes para una demostración); en la CI es innecesario (base nueva en cada ejecución) |

**Por qué no recrear sola:** recrear la base exclusiva ya resuelve el problema cuando alguien lo decide, con tres órdenes existentes. Automatizarlo agrega un mecanismo (y un modo de borrar datos) para ahorrar un paso que solo hace falta tras una interrupción.

### Propuesta concreta

1. En `globalSetup`, **justo después** de confirmar que la base es de pruebas y **antes** de instalar el registro y tomar la foto:
   - si `test_preexisting` tiene filas de alguna corrida, o `test_row_origin` tiene filas, lanzar un error con el texto: «La base de pruebas tiene restos de una corrida interrumpida o con residuos (corrida `<id>`). No se ejecutó ninguna prueba. Recréela (recomendado): `docker compose -f docker-compose.test-db.yml down && docker compose -f docker-compose.test-db.yml up -d --wait` y `pnpm run test:db:prepare`; o recupere esa corrida: `docs/PRUEBAS_DE_INTEGRACION.md` §3.5.»
   - si las tablas no existen aún (base nueva), no hay nada que comprobar.
2. En `globalTeardown`, **descartar la foto solo si la verificación salió limpia.** Si encontró residuos o cambios, la foto se conserva: la corrida siguiente se negará a empezar hasta que se recupere la base (cierra el segundo caso).
3. **Protección contra desarrollo (por construcción, no por una comprobación aparte):** la detección corre solo tras la comprobación `current_database()`; contra `sit_db` el `globalSetup` ya aborta antes y no consulta esas tablas (hay una prueba unitaria que lo comprueba con un doble); las órdenes que sugiere el mensaje mencionan únicamente `docker-compose.test-db.yml`, `sit-postgres-test` y `test:db:prepare`, y nada que apunte a `sit_db`. La detección no borra ni modifica nada: solo lee y se detiene.
4. **Pruebas:** (a) unitaria: con la base real simulada como `sit_db`, no se consultan las tablas de restos y se aborta por la regla existente; (b) de integración, sobre la base de pruebas: una foto ficticia de otra corrida hace que la función de comprobación lance el error con el identificador y las instrucciones, y una foto propia no; (c) la comprobación manual que ya se hizo: tras un `SIGKILL`, la corrida siguiente se detiene; tras recrear la base, pasa.
5. **Documentación:** `docs/PRUEBAS_DE_INTEGRACION.md` §3.5 pasa de «una corrida posterior no lo detecta» a «una corrida posterior se detiene y dice cómo recuperar».

Límites que se mantienen: dos corridas simultáneas contra la misma base de pruebas no están soportadas (la segunda se detendría, que es lo correcto); lo que alguien cambie a mano en la base de pruebas sin una corrida en curso no se detecta (la base es exclusiva); si se mata el proceso **antes** de que el `globalSetup` tome la foto no queda nada que detectar, y tampoco hay nada que restaurar.

## Orden sugerido

1. PR A (punto 1): `Dockerfile`, `README.md`, `docs/MANUAL_TECNICO.md`, seed no destructivo y su prueba. Aparte, decidir si se compara el respaldo del 23/10 en una base temporal.
2. PR B (punto 2): `globalSetup`/`globalTeardown`, sus pruebas y el cambio de §3.5. No depende del PR A.

Ninguno cambia producción, el esquema ni las dependencias. No se fusiona ni se despliega nada sin decisión.
