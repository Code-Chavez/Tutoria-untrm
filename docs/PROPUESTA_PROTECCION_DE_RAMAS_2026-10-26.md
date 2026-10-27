# Propuesta: protección de ramas y seguridad del repositorio (26/10/2026)

**Estado: propuesta para decidir. No se aplicó ningún cambio en GitHub** (ni reglas, ni ajustes, ni archivos de configuración). Todo lo que aquí se afirma sobre el estado actual se obtuvo con consultas de **solo lectura** a la API de GitHub y leyendo `.github/workflows/`.

## 0. Corrección de una afirmación mía

Dije antes que ni `develop` ni `main` tenían protección de rama. **Era incorrecto:** consulté solo la API de «protección de rama» clásica (respondió 404) y no los *rulesets*. Existe un ruleset activo, **«Protección main y develop — PR y CI»** (id 23945612), que ya protege ambas ramas. La propuesta parte de él.

## 1. Estado actual (consultado el 26/10/2026)

**Ruleset activo** sobre `refs/heads/main` y `refs/heads/develop`, sin actores que puedan saltárselo (`bypass_actors` vacío; la cuenta `Code-Chavez`, administradora, **no puede** saltarlo):

| Regla | Valor |
|---|---|
| Borrar la rama | prohibido |
| Reescribir historia (`non_fast_forward`) | prohibido |
| Pull request obligatorio | sí; **0 aprobaciones** requeridas; se descartan aprobaciones al subir cambios; **conversaciones resueltas obligatorias**; métodos permitidos: merge, squash y rebase |
| Checks obligatorios | 9: `Server — Lint`, `Server — Build`, `Server — Test`, `Server — Audit`, `Client — Lint`, `Client — Type Check & Build`, `Client — Test`, `Client — Audit`, `Backup — Restore drill`; **la rama debe estar al día con el destino** (`strict`) |

**Ajustes del repositorio:** público; rama por defecto `develop`; permite merge, squash y rebase; **no borra las ramas al fusionar**; fusión automática desactivada; un solo colaborador (`Code-Chavez`, administrador).

**Seguridad (todo desactivado):** alertas de vulnerabilidades, actualizaciones de seguridad de Dependabot, escaneo de secretos, protección contra subida de secretos, escaneo de código (CodeQL). No hay `.github/dependabot.yml` ni `CODEOWNERS`. No hay ruleset de etiquetas; existen las etiquetas `v0.0.1` … `v0.4.4` y `v1.0.0-beta.1`, sin *releases* publicadas.

**Flujo real (por el historial):** todo entra por PR con *merge commit* (`Merge pull request #N …`), incluidos los PR apilados; las versiones se publican con una fusión `develop → main` hecha con merge commit.

**Workflows:** `ci.yml` (jobs con los nombres anteriores, más `Docker — Build Images` solo en *push*) y `pr-checks.yml` (`📝 Validate PR Title`, `📋 Validate PR Description`, `🔀 Validate Feature → develop` si el destino es `develop`, `🛡️ Gate — Main Branch Protection` si el destino es `main`). **Ninguno de los checks de `pr-checks.yml` es obligatorio hoy.**

## 2. Brechas y cambios propuestos (ordenados por valor)

| # | Cambio | Por qué | Costo / riesgo |
|---|---|---|---|
| **P1** | **Comprobar** si los checks «omitidos» por una edición del PR satisfacen las reglas, y según el resultado cambiar `ci.yml` | `ci.yml` también se dispara con `edited` y cada job se omite con un `if`. Observé muchas veces que, tras editar la descripción de un PR, los 9 checks aparecen como *skipping*. Según recuerdo de la documentación de GitHub (no la volví a consultar), un job omitido por una condición se informa como correcto y no impide fusionar aunque el check sea obligatorio. **Hipótesis sin verificar:** que esa ejecución omitida sustituya a un resultado rojo del mismo commit y deje fusionar. | Verificarlo cuesta un PR desechable (ver §4). Si se confirma, la corrección es no usar `edited` en `ci.yml` y recuperar el caso de PR apilado reapuntado con un workflow aparte que relance la CI |
| **P2** | Hacer **obligatorios** los checks de `pr-checks.yml`: título, descripción y `Validate Feature → develop` (en `develop`) | Hoy el DoD y el formato del título se validan pero no bloquean | Para `Gate — Main Branch Protection` ver P3. Los checks que se omiten según el destino cuentan como correctos (mismo punto que P1) |
| **P3** | **Ruleset separado para `main`** con `Gate — Main Branch Protection` obligatorio, solo método *merge*, y (si hay un segundo revisor) 1 aprobación | `main` es la rama de versiones: conviene una regla más estricta que `develop`. El Gate ya valida que el origen sea `develop` y el DoD técnico | Dos rulesets que mantener. Con un solo colaborador no se puede exigir aprobación (ver P9) |
| **P4** | Permitir solo el método **merge** en el ruleset y en los ajustes del repositorio | Es el que se usa y el que exige el flujo de versiones; evita una fusión *squash* accidental que cambie los hashes de los commits | Ninguno conocido |
| **P5** | Activar **borrar la rama al fusionar** | Evita ramas sobrantes (ya pasó con `chore/remove-generated-diagram-images`) | PR apilados: borrar la rama base de un PR abierto puede cerrarlo o reapuntarlo (comportamiento a **verificar**); el flujo actual abre los PR contra `develop`, por lo que el riesgo es bajo |
| **P6** | Activar **escaneo de secretos + protección contra subida de secretos**, **alertas y actualizaciones de seguridad de Dependabot**, y **CodeQL** (configuración por defecto) | Es gratis en repositorios públicos y hoy está todo apagado; el CI ya ejecuta `pnpm audit` | Ruido: PR automáticos de Dependabot (cada uno corre la CI); CodeQL añade minutos de CI |
| **P7** | `.github/dependabot.yml` para `server`, `client`, `e2e`, `github-actions` y las imágenes Docker, con agrupación y frecuencia semanal | Mantiene actualizadas las dependencias sin depender de recordarlo | Muchos PR si no se agrupa; conviene limitar `open-pull-requests-limit` |
| **P8** | Ruleset de **etiquetas `v*`**: prohibir borrarlas y reescribirlas | Las versiones publicadas no deben moverse | Ninguno conocido; crear una etiqueta nueva sigue permitido |
| **P9** | **Aprobaciones:** dejar en 0 mientras haya un solo colaborador; con 2 o más personas, pasar a 1 y activar «aprobación del último push» | Nadie puede aprobar su propio PR: exigir 1 aprobación hoy bloquearía todas las fusiones | Es una decisión de equipo |
| **P10** | **Salida de emergencia:** decidir entre mantener «nadie puede saltarse la regla» o añadir a `Code-Chavez` como actor de *bypass* solo en modo «pull request», y documentarlo | Con CI intermitente (vi `ECONNRESET` al descargar los motores de Prisma, que obligó a relanzar un job) y sin bypass, una caída de la CI bloquea todo | Con bypass se debilita la garantía; sin bypass, un incidente puede requerir cambiar la regla a mano |
| **P11** | `CODEOWNERS` | Solo aporta con más de una persona o con `require_code_owner_review` | No hacerlo ahora |

**Se mantiene** lo que ya funciona: PR obligatorio, 9 checks, rama al día, conversaciones resueltas, sin borrar ni reescribir. La regla «rama al día» tiene un costo conocido (cada PR apilado hay que actualizarlo y repetir la CI al fusionar el de abajo), pero es lo que garantiza probar la combinación final; se propone mantenerla.

## 3. Qué depende del plan (GitHub Pro / paquete de estudiantes)

- El repositorio es **público**: rulesets, Actions, escaneo de secretos, CodeQL y Dependabot **no dependen** de un plan de pago. Ninguna de las propuestas anteriores requiere GitHub Pro.
- El plan solo cambiaría el cuadro si el repositorio pasara a **privado**: entonces las reglas de protección, `CODEOWNERS` y los minutos de Actions dependen del plan de la cuenta (a verificar en la documentación de GitHub al decidirlo). La API no expone el plan de la cuenta `Code-Chavez` (devuelve `null`), así que **no lo comprobé**.
- Si se evaluara hacerlo privado, hay que contar que el repositorio contiene documentación institucional; es una decisión de la persona responsable, no una propuesta técnica de este documento.

## 4. Cómo se verificaría y se aplicaría (nada de esto se ejecutó)

1. **P1 primero, sin tocar ajustes:** crear un PR desechable con una prueba que falle a propósito, esperar al rojo, editar la descripción y leer `mergeStateStatus` (`BLOCKED` o `CLEAN`) con `gh pr view --json mergeStateStatus,statusCheckRollup`. No se fusiona; se cierra y se borra la rama.
2. Aplicar los cambios de **ruleset** y de ajustes uno por uno (API `rulesets` o interfaz web), anotando el valor anterior para poder revertir; empezar por `enforcement: evaluate` (modo de evaluación) cuando el plan lo permita, que informa qué se habría bloqueado sin bloquear.
3. Ejemplo de cómo se vería P4 en la API (**ilustrativo, no ejecutado**): en el ruleset 23945612, cambiar `parameters.allowed_merge_methods` de `["merge","squash","rebase"]` a `["merge"]`.
4. P6/P7/P8 se pueden aplicar sin riesgo para el flujo; P2–P3 y P10 conviene decidirlos junto con el equipo.

## 5. Qué no se hace en esta propuesta

No se cambia ninguna regla, ajuste, archivo de workflow ni configuración; no se activa ninguna función de seguridad; no se crea ningún PR desechable; no se fusiona ni se despliega nada.
