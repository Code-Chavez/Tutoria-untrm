# Investigación de los fallos intermitentes del cliente (experimentos controlados)

Continúa [cliente-fallos-intermitentes.md](cliente-fallos-intermitentes.md). **No se cambió ningún tiempo de espera, ninguna aserción ni ninguna prueba; no se reintentó hasta obtener verde.** Datos crudos y script de análisis: [cliente-fallos-intermitentes-datos/](cliente-fallos-intermitentes-datos/) (`runs*.csv`, `analyze.py`, perfiles de arranque en frío).

## Resumen

Los fallos **no tienen una sola causa**. Lo medido separa dos mecanismos, más un tercer grupo sin determinar:

| Grupo | Mecanismo respaldado por mediciones | Estado |
|---|---|---|
| 1. Esperas de 5 s agotadas | Pruebas con secuencias largas de `user-event` que **solas ya duran 3,5–5,2 s**; cualquier lentitud adicional las pasa del límite | Respaldado (causa de fondo) · el amplificador no está aislado |
| 2. Fallos bajo 5 s (`findBy…` de 1 s) | Costo de **arranque en frío por archivo** (primer `getComputedStyle` de jsdom ≈ 0,5–0,8 s + primer render) frente al límite de 1 s de `findBy` en la **primera prueba** del archivo | Respaldado como mecanismo · el factor que lo empuja sobre 1 s no está aislado |
| 3. Corrida con 4 fallos en 3 archivos (nombres no conservados) | — | **Indeterminado** (no hay registro; las corridas nuevas muestran más variedad de nombres) |

## Método y entorno

- Una sola máquina de desarrollo Windows 11, Node + Vitest 4.1.10 + jsdom 29.1.1 + Testing Library; carga ambiental de procesos ajenos a las pruebas ≈ 30–50 % de CPU y 2–3 GB de RAM libre (muestreada cada 3 s). **No** es una máquina aislada.
- Cada corrida se guardó con `--reporter=json`; los fallos se cuentan **desde el JSON**. Limitación: en `runs-css.csv` el código de salida es inválido (se capturó `$?` después de sustituciones de comandos); por eso allí solo se usa el JSON.
- Los perfiles de arranque en frío usan copias instrumentadas (no versionadas) con `performance.now()`; el envoltorio de medición puede sumar costo propio.
- N pequeño (4–5 repeticiones por configuración): sirve para ver qué hipótesis **no quedan respaldadas** y para ordenar efectos, **no** para estimar frecuencias ni para descartar causas de forma definitiva.

## Resultados medidos

### Frecuencia por configuración

| Configuración | Corridas | Corridas con fallos | Fallos |
|---|---|---|---|
| Cada archivo sospechoso **aislado** (6 archivos × 5) | 30 | 2 | 2 |
| Subconjunto de 6 archivos, defecto | 5 | 4 | — |
| Suite completa, defecto | 3 | 3 | 5, 5 y 12 |
| Suite completa, `--maxWorkers=2` | 2 | 0 | 0 |
| Suite completa, sin paralelismo de archivos | 1 | 0 | 0 |
| Subconjunto, `--maxWorkers=1` | 4 | 2 | 3 |
| Subconjunto, `--maxWorkers=2` | 4 | 0 | 0 |
| Subconjunto, `--maxWorkers=3` | 4 | 2 | 5 |
| Subconjunto, `--maxWorkers=6` | 4 | 3 | 4 |
| Subconjunto, `css: true` (valor del repo) | 5 | 3 | — |
| Subconjunto, `css: false` | 5 | 5 | — |

Lectura honesta:

- **Fallan también aisladas** (2/30): «pasa sola ⇒ no es intermitente» no se sostiene (hay fallos también aisladas).
- **El paralelismo no parece ser condición necesaria**: con `--maxWorkers=1` el subconjunto falló 2 de 4 veces (`CycleTutorsPage` 5 063 ms y 1 669 ms; `UserManagementPage` 1 509 ms). La relación "más trabajadores ⇒ más fallos" **no resultó monótona** en el subconjunto (1: 2/4, 2: 0/4, 3: 2/4, 6: 3/4). Lo que sí se observa: en la suite completa, 3/3 corridas con fallos con el valor por defecto frente a 0/3 con ≤ 2 trabajadores o secuencial. El paralelismo parece **aumentar** la probabilidad, sin ser su causa única; con tan pocas repeticiones no se descarta ni se confirma como causa.
- **`css: false` no mejora** (5/5 con fallos frente a 3/5): estos experimentos **no respaldan** que el procesamiento de CSS sea la causa. Con 5 corridas por configuración no se descarta que influya.
- **CI**: en 100 ejecuciones del 23 al 28 de octubre, «Client — Test» tuvo 77 éxitos, 5 canceladas, 14 omitidas y **0 fallidas** (mediana 108 s). La CI no reproduce el problema; eso no prueba que no exista, solo que su ejecutor es más rápido/menos cargado.

### Grupo 1 — pruebas de 5 s

Duraciones (ms, mediana) de las pruebas sospechosas por configuración:

| Archivo | Aislada | Subconjunto | Suite completa (defecto) | `--maxWorkers=2` | Secuencial |
|---|---|---|---|---|---|
| InterviewFormModal | 3 490 | 4 499 | 5 087 | 2 939 | 2 469 |
| CycleTutorsPage («si el docente…») | 3 977 | 4 757 | 5 085 | 4 257 | 4 780 |

Desglose de `CycleTutorsPage` aislado: la prueba "si el docente ya tiene otro ciclo" ronda **4,2–5,2 s sola**; solo teclear 17 caracteres cuesta ≈ 1,3–1,5 s (≈ 80–90 ms por carácter) y los clics 550–750 ms cada uno. Es decir, la prueba **ya está pegada al límite de 5 s sin ninguna carga**; la carga solo decide de qué lado cae. Esto explica que falle alguna vez incluso aislada.

Hipótesis:
- **Confirmada**: estas pruebas consumen casi todo su presupuesto de 5 s en una secuencia larga de `user-event`.
- **Confirmada (parcial)**: la contención empeora el tiempo (medianas 2 469 → 5 087 ms en InterviewFormModal entre secuencial y defecto). No se aisló si el factor es CPU, memoria o planificación: la carga ambiental confunde la medición.
- **No verificada**: la memoria libre. Hubo un solo dato (EvaluationPage de 20 358 ms con la memoria libre en 865 MB), insuficiente.

### Grupo 2 — fallos por debajo de 5 s

Errores observados: `Unable to find role="option" and name "Ciclo 4"` (ReportFilters, 1,4–1,8 s), `Unable to find role="button" and name "Desactivar"` (UserManagementPage, 1,5–2,0 s; el DOM muestra el esqueleto `aria-busy`), `Unable to find a label … Motivo de la excepción` (CycleTutorsPage, 1,7–2,0 s). Todos son búsquedas asíncronas que agotan el **límite de 1 000 ms** de `findBy…`, y los tres son la primera o una de las primeras pruebas de su archivo.

Mediciones de arranque en frío (copias instrumentadas):

| Medición | Primera vez | Siguientes |
|---|---|---|
| `getComputedStyle` en jsdom recién creado | 477–827 ms | ≈ 1 ms (llamadas 3.ª en adelante) |
| ReportFilters: render + `findByRole('option')` | 1,2–1,65 s | 0,35–0,6 s |

`getByRole`/`findByRole` calculan estilos para decidir accesibilidad, de modo que la primera búsqueda por rol de cada archivo paga ese costo; cada archivo tiene un jsdom nuevo. Con la carga, ese costo único más el primer render puede superar 1 s.

Hipótesis:
- **Confirmada** (mecanismo): el costo de arranque en frío existe y es del orden del límite de `findBy` (0,5–0,8 s de 1 s disponibles).
- **No respaldada por estos experimentos**: procesamiento de CSS (`css: false` no ayuda; N pequeño, no es un descarte definitivo).
- **Indeterminada**: por qué el primer `getComputedStyle` es tan lento en jsdom 29 (no se investigó el interior de jsdom); y qué incremento exacto lleva el total sobre 1 s en cada caso concreto.

### Grupo 3

La corrida con 4 fallos en 3 archivos no conservó nombres ni registro. Las corridas nuevas de suite completa mostraron **más** pruebas fallando que las listadas originalmente (p. ej. GroupSessionFormModal, FollowUpFormModal, WorkPlanPage, DataRequestPage), lo cual es coherente con ambos mecanismos pero **no permite atribuir** esa corrida. Queda indeterminada.

## Qué NO se concluye

- No se demuestra que la causa sea «la carga»: los fallos ocurren también aislados y con un trabajador.
- No se demuestra que los fallos de otros archivos comparten el mecanismo del Grupo 1 o 2 más allá de los medidos.
- Los resultados de una máquina no se extrapolan a la CI ni a otros equipos.

## Opciones para un arreglo (NO aplicadas; cada una requeriría su propio PR y medición previa/posterior)

1. **Acortar o dividir** las pruebas de secuencias largas (Grupo 1) conservando las mismas aserciones; resuelve la causa de fondo (presupuesto casi agotado sin carga).
2. **Calentar `getComputedStyle` en un archivo de preparación** (`setupFiles`) para que el costo de arranque en frío quede fuera del cronómetro de la primera prueba (Grupo 2). No se probó; hay que medir antes de proponerlo.
3. **Limitar los trabajadores en local** (p. ej. 2) como práctica de ejecución, no como corrección del código: reduce la frecuencia (0/3 en suite completa) pero no elimina la causa y alarga la suite.

Subir tiempos de espera o relajar aserciones **sigue descartado**.

## Limpieza

Los archivos de experimento (`client/vitest.exp.config.ts`, `client/src/scratch-profile/`) no se versionaron y se eliminan; el muestreador de CPU se detuvo. No se tocó `docs/informe-practicas/`.

## Evidencia de CI de este PR (limitada a ese entorno)

La CI del último commit del PR (`3ddeeee`) terminó con «Client — Test», «Client — Lint», «Client — Type Check & Build», «Server — Lint/Test/Build/Audit», «Client — Audit», «Backup — Restore drill» y las tres validaciones del PR en `success`; «Docker — Build Images» y «Gate — Main Branch Protection» omitidas. Es un solo ejecutor de CI y es un PR de documentación: no demuestra que los fallos locales no existan.
