# Mejoras de rendimiento — 13/10/2026

Continuación de `VERIFICACION_RENDIMIENTO_BETA_2026-10-13.md`. Mismo guion y mismo entorno (Docker Compose de desarrollo, un solo equipo, ráfagas de 100 GET simultáneos de una cuenta); **no acredita RNF-PERF-01** por las limitaciones que ese documento ya señala. Solo mide el efecto de los cambios.

## Dónde se iba el tiempo

Con un perfil de CPU del servidor bajo carga: el proceso estaba **saturado de CPU** (el tiempo de pared de 100 peticiones era casi igual a la suma de su CPU), no esperando a la base. Contribuían:

1. **Verificación del token**: `jsonwebtoken` intenta leer una cadena como clave pública PEM y solo al fallar la usa como secreto; esa excepción ocurría en cada petición.
2. **Lecturas repetidas de roles y permisos**: cada petición autenticada hacía ~8 consultas (cuenta, otra vez la cuenta con rol y permisos —3 consultas—, cuenta y rol para el alcance, y los datos), casi todas sobre datos que casi no cambian.
3. Registro de cada consulta SQL en consola en el entorno de desarrollo (efecto medido: ninguno apreciable; se dejó opcional).

## Cambios

| Cambio | Efecto |
|---|---|
| `JwtTokenService`: clave secreta construida una vez, algoritmo HS256 fijado | Sin excepción por petición; además cierra el uso de otros algoritmos |
| `authenticate` entrega el rol vigente de la cuenta; `authorize` lo reutiliza | Una consulta menos por petición |
| Permisos de un rol: caché de 30 s (`rolePermissions.ts`) | Tres consultas menos por petición |
| `CachedRoleRepository` (30 s) para el alcance de tutorados y otros usos | Una consulta o más menos por petición |
| Consultas SQL en consola solo con `PRISMA_LOG_QUERIES=1` | Menos ruido; sin efecto medible en latencia |

Qué sigue siendo inmediato: que una cuenta se desactive o cambie de rol se lee de la base en **cada** petición. Lo que puede tardar hasta 30 s es que cambie *la lista de permisos de un rol*, algo que hoy solo ocurre al sembrar o crear un rol (crear un rol vacía la caché).

## Resultados (p95 de cada una de las tres ráfagas de 100 GET, ms)

| Consulta | Antes (informe) | Después |
|---|---|---|
| Estudiantes | 5621 / 5211 / 4651 | 3145 / 2842 / 2353 |
| Sesiones | 3628 / 3665 / 3797 | 1833 / 1775 / 1794 |
| Expediente | 7074 / 7211 / 8297 | 4345 / 4026 / 4463 |
| Secuencial p95 (estudiantes / sesiones / expediente) | 105 / 80 / 145 | 64 / 75 / 105 |

Mi propia repetición del guion antes de los cambios dio valores equivalentes a los del informe (estudiantes 6021/5491/4961). Una sola corrida por configuración; no se repitió para estimar la variación.

## Lo que sigue sin cumplir ≤ 3 s y por qué

- **Expediente** (4.0–4.5 s): hace ~14 consultas encadenadas en cuatro etapas (tutorado, escuela, seis lecturas en paralelo, un usuario por cada nombre). Falta agrupar los nombres de usuario en una consulta y repartir mejor las etapas.
- **Estudiantes**: la primera ráfaga aún pasa de 3 s. Falta paginar en el servidor y resolver el alcance del coordinador en SQL (hoy se filtra en memoria después de leer). Paginar exige cambiar la pantalla de tutorados, que filtra y pagina en el cliente.
- El entorno de desarrollo ejecuta TypeScript con `ts-node-dev` y el generador de carga comparte la CPU: en el servidor de destino (JavaScript compilado, equipo propio) los números serán otros, a medir.
- Sin tocar todavía: importación por lotes de 2000 filas (RNF-PERF-02) e índices (a partir de planes reales).
