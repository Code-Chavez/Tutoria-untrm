# IMP-3: investigación de la prueba intermitente de `DataRequestPage`

**Estado: abierto.** El mecanismo está **respaldado por experimentos** (la prueba falla por tiempo agotado de 5 s cuando la CPU está saturada y no falla con la máquina libre), pero la causa de la falla **original** no se puede demostrar: su salida se perdió y no se reconstruye. No se cambió ningún tiempo, aserción, prueba, número de trabajadores ni configuración. No hay corrección aplicada.

## 1. Qué se hizo

| Elemento | Valor |
|---|---|
| Rama de la investigación | `research/datarequestpage-flaky` (solo documentación y datos) |
| Código probado | (a) integración local `exp/integration-193-194-195` = `develop` `fae8c70` + #195 + #194 + #193, commit `cfe2953` (la misma combinación en que apareció la falla original); (b) `develop` real `12853b2` (con #193–#196 ya fusionados), en un `git worktree` |
| Entorno | Windows 11, 8 hilos lógicos, Node 22.19.0, Vitest 4.1.10, jsdom 29.1.1, `vitest.config.ts` sin cambios (`css: true`, trabajadores por defecto). Sin base de datos, Docker ni SMTP para estas pruebas (los contenedores de desarrollo estaban encendidos al fondo) |
| Registro | Cada corrida guarda **salida completa (`.log`) y reporte JSON**, con commit, comando y configuración en `datos/corridas-de-esta-investigacion/runs.csv`. Scripts en `datos/scripts/`; resumen reproducible con `python -I datos/scripts/resumen.py` |
| Comando base | `npx vitest run src/features/pedidos/pages/DataRequestPage.test.tsx --reporter=default --reporter=json --outputFile.json=<corrida>.json` (aislado); el grupo agrega las carpetas `src/shared/components/ui src/shared/hooks src/features/{pedidos,pendientes,admin,catalogos,identidad,periodo,planificacion} src/features/tutorados/pages` (22 archivos, 155 pruebas, como la corrida original) |
| Carga artificial | N procesos `node` en bucle (`while(Date.now()-t<…){}`) durante la corrida, para variar la contención de CPU |
| Redacción | Se sustituyó la ruta de la carpeta de resultados de la sesión (contenía el nombre de usuario del sistema) por `<carpeta-de-resultados>` en los registros; el resto es la salida tal cual |

También se conservan las **corridas previas del 28/10** de otra sesión de trabajo (`datos/corridas-previas-28-oct/`: commit `fae8c70`, comandos en su `runs.csv`, y una muestra de CPU/memoria cada ≈ 4 s en `cpu.csv`). No las ejecuté yo; se analizan con su propio commit y comando registrados.

## 2. Resultados

### 2.1 Máquina sin carga artificial

| Configuración | Corridas | Con fallo de la prueba objetivo | Notas |
|---|---|---|---|
| Archivo solo, integración `cfe2953` | 6 | **0** | prueba objetivo 1,9–2,4 s; las 28 pruebas suman 15,7–17,3 s |
| Archivo solo, `develop` `12853b2` | 3 | **0** | objetivo 2,4–3,0 s; suma 17,6–20,0 s |
| Grupo de 22 archivos, `cfe2953` | 4 | **0** | objetivo 2,8–3,2 s; falló una vez **otra** prueba (`UserManagementPage`, IMP-2, 1 602 ms, `findByRole`) |

Con la máquina libre la prueba **no se reproduce** (0 de 13). Otra revisión independiente del 29/10 (borrador sin commitear de otra herramienta, no integrado) llegó a lo mismo en sus 7 corridas completas sin carga controlada.

### 2.2 Con la CPU saturada

**Corridas previas del 28/10 (`fae8c70`, carga ambiental medida: CPU ≈ 92–100 % durante cada corrida, memoria libre mínima 1 605 MB):**

| Corrida | Resultado | Prueba objetivo |
|---|---|---|
| archivo solo ×5 | **1 de 5 falló** (iso-4: `Test timed out in 5000ms`, 5 141 ms; la corrida duró 98 s frente a 46–79 s de las otras) | pasó en 2,2–4,6 s las otras cuatro |
| grupo de 21 archivos ×3 | 2 de 3 con la prueba objetivo fallida por 5 s (5 210 y 5 056 ms); la tercera pasó en 4 775 ms y falló otra prueba (`WorkPlanPage`, 5 082 ms) | — |
| suite completa ×2 | las dos con la prueba objetivo fallida por 5 s (5 162 y 5 444 ms), con 8 y 32 pruebas fallidas en total (1 y 2 de ellas del propio archivo; casi todas `Test timed out in 5000ms`, algunas `findBy…` de 1 s) | — |

**Carga artificial en esta investigación (archivo solo, `cfe2953`; «suma» = suma de las duraciones de las 28 pruebas, un indicador de la contención real):**

| Etiqueta | Corridas | Con fallos | Suma por corrida | Prueba más larga | Fallas |
|---|---|---|---|---|---|
| sin carga (`iso`) | 6 | 0 | 15,7–17,3 s | 2,4 s | — |
| `stress4` | 4 | 0 | 21,1–24,2 s | **4,1 s** (la prueba objetivo, 82 % del límite) | — |
| `stress8` | 4 | 1 | 26,3–27,2 s (49,5 s la que falló) | 5,7 s | 1 prueba **distinta** de la objetivo, por 5 s |
| `stress16` | 4 | 1 con pruebas (6 de 28 fallaron, 4,4–5,8 s, incluida la objetivo, 5 352 ms) y **3 sin ninguna prueba** | 84,2 s | 5,8 s | ver abajo |
| `develop` + `stress4` | 4 | 2 con pruebas pasando (4,2 s la más larga) y **2 sin ninguna prueba** | 21,4–27,8 s | 4,2 s | — |

Las corridas «sin ninguna prueba» (`stress16-2..4`, `dev-stress4-3..4`) no ejecutaron nada: `Failed to start forks worker … Timeout waiting for worker to respond` (el arranque del trabajador de Vitest superó su plazo por falta de CPU). Es una falla de entorno, no de la prueba, y es el mismo mensaje que ya apareció en corridas completas anteriores.

**Cada prueba se hace más lenta, no solo la objetivo:** con `stress16` el cociente frente a la mediana sin carga fue de ×4,6 (mínimo ×1,4, máximo ×15,5); fallaron la objetivo (≈ 2 s sola), tres pruebas de ≈ 0,7–1,0 s, la de U13 (≈ 0,75 s) y una de ≈ 0,4 s. Con `stress8`, una prueba de ≈ 0,4 s tardó 5,7 s.

## 3. Comparación del archivo aislado con el grupo

- **Sin carga**, la prueba objetivo tarda ≈ 2,0 s aislada y ≈ 3,0 s dentro del grupo (+50 %): el grupo reparte la CPU entre varios archivos en paralelo. Sigue por debajo de los 5 s.
- **Es, con diferencia, la prueba más larga del archivo** (mediana aislada ≈ 2,0 s; las demás ≤ 1,0 s): encadena tres clics, escribe 12 caracteres con `user.type` y espera el envío. Por eso es la primera en cruzar el límite cuando la CPU se satura, pero **no es la única**: bajo carga fallaron otras pruebas del mismo archivo, y de otros archivos en las corridas previas.
- **Arranque en frío:** la primera prueba del archivo tarda ≈ 0,9 s sin carga (más que las siguientes) y llegó a 5,1 s con `stress16`. No hay deriva en el orden: la suma de las 10 primeras pruebas es ≈ 7–8 s y la de las 10 últimas ≈ 3,3–3,7 s en las seis corridas sin carga (coherente con coste de arranque, no con acumulación de estado).

## 4. Revisión de limpieza, simulaciones pendientes, temporizadores y asincronía

Se revisaron el código (solo lectura) y los datos; **no se encontró un defecto que explique la falla**:

- `src/test/setup.ts`: `cleanup()` y `localStorage.clear()` tras cada prueba. `QueryClientTestWrapper` crea un `QueryClient` nuevo por render con `retry: false` y `gcTime: 0`: no hay caché compartida entre pruebas.
- `DataRequestPage.tsx` no usa temporizadores ni `refetchInterval`; los servicios están simulados (`vi.mock`), sin red.
- La prueba objetivo espera cada paso (`findBy…`, `await user…`, `waitFor`) y no usa temporizadores falsos. Las pausas reales del archivo son dos de 50 ms, en otras pruebas.
- `vi.clearAllMocks()` en `beforeEach` limpia las llamadas pero **no** restablece las implementaciones fijadas con `mockResolvedValue`/`mockReturnValue` ni las colas `…Once` no consumidas: es un punto de atención de diseño (una prueba que abortara antes de consumir su cola podría contaminar a la siguiente). **No es causal aquí**: la prueba objetivo es la 3.ª del archivo, precedida solo por pruebas con `mockResolvedValue`, y la falla se observa también con el archivo aislado y en pruebas ajenas a ese patrón.
- Las promesas controladas de las pruebas LEV-R04 se resuelven en el camino aprobado; no se observaron operaciones asíncronas sin esperar en la ruta de la prueba objetivo.
- Aparecen avisos de React («update … not wrapped in act») en el archivo aislado; se conservan en los registros. No se demostró relación con la falla.

## 5. Conclusiones y lo que NO se concluye

- **Respaldado:** la prueba (y cualquiera del archivo) falla por *tiempo agotado de 5 s* cuando la CPU de la máquina está saturada; con la máquina libre no falló en 13 corridas; al subir la contención aumenta la duración de todas las pruebas (×1,7 a ×5) y aparecen fallas, y a contención extrema ni siquiera arranca el trabajador. En las corridas previas la falla de la prueba objetivo apareció **con el archivo solo** cuando la CPU ambiental estaba al 100 %.
- **No demostrado:** que la falla *original* (salida perdida) haya sido un tiempo agotado de 5 s por esta causa. Es la explicación coherente con las corridas previas y con la investigación de #192 (pruebas largas cerca del límite + contención), pero el mensaje original no existe. Tampoco se descartó otra causa funcional intermitente, aunque no apareció ninguna con la máquina libre.
- **No se declara resuelto:** que varias corridas pasen sin carga no lo resuelve; que pase al repetirla sola tampoco.

## 6. Limitaciones de los experimentos

1. **La carga artificial no está calibrada.** Los procesos de carga se lanzaron desde un script con `&` y se «mataron» con `kill` sobre el PID de MSYS, que no termina los procesos nativos de `node`; quedaron vivos entre corridas consecutivas (hasta su fin a los 15 min o hasta que los maté a mano), así que la carga **se acumuló** a lo largo de cada tanda. `stress4/8/16` son etiquetas, no cargas reales; el indicador utilizable es la **suma de duraciones** medida en cada corrida. En la tanda sobre `develop` el comando de limpieza falló por un error de comillas en el script y ocurrió lo mismo. Por eso el aumento de fallas con la «carga» es consistente pero no es una curva dosis-respuesta limpia.
2. La falla de `stress16-1` se registró sin su fila en `runs.csv` (la tanda se interrumpió antes); se añadió a mano indicando esa causa. Su JSON y su registro están completos.
3. N pequeño (3–6 por configuración) y una sola máquina con carga ambiental no controlada (contenedores de desarrollo y otras sesiones). No se extrapola a la CI ni a otros equipos.
4. Las corridas previas del 28/10 son de otra sesión, sobre `fae8c70` (antes de que #193–#195 añadieran pruebas al archivo: 25 pruebas en vez de 28); se usan solo con su commit y comando registrados.
5. La causa de las fallas de otros archivos (`WorkPlanPage`, `CycleTutorsPage`, `UserManagementPage`, …) no se estudió aquí; se ve el mismo patrón de tiempo agotado y de `findBy…` de 1 s, sin asumir una causa única (véase IMP-2 y `cliente-fallos-intermitentes-investigacion.md`).

## 7. Opciones (NO aplicadas; cada una requeriría su propio PR con medición antes y después)

1. **Acortar o dividir la prueba objetivo** (≈ 2 s sola, la más larga del archivo) conservando todas las aserciones: reduce el margen perdido bajo contención, pero no corrige la contención.
2. **Práctica de ejecución local** (no es una corrección del código): ejecutar la suite completa con menos trabajadores o con la máquina libre; en #192 la suite completa no falló en 3 corridas con ≤ 2 trabajadores (2 con 2 trabajadores y 1 secuencial; N muy pequeño). No se cambia la configuración del proyecto.
3. **Calentamiento de jsdom** (`getComputedStyle`) para el arranque en frío de la primera prueba: no probado.

Subir tiempos o relajar aserciones sigue descartado.

## 8. Pendientes reales

- **IMP-3 sigue abierto** como pendiente técnico: «mecanismo respaldado (contención de CPU / margen de 5 s), causa de la falla original no demostrable». Cerrarlo, o dejarlo así hasta decidir entre las opciones de la sección 7, es una decisión pendiente.
- Si vuelve a ocurrir, capturar de inmediato el mensaje, la traza y el volcado del DOM (el registro completo ya se guarda desde ahora).
- Limpieza ya hecha: se detuvieron todos los procesos de carga; los `git worktree` temporales se retiran al terminar.
