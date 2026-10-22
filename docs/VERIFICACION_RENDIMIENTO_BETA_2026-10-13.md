# Verificación de rendimiento — candidata v1.0.0-beta.1

Fecha: 13/10/2026. Código local observado: `9761839`. Entorno: Docker Compose de desarrollo en el equipo local, API localhost:3000, cliente Vite localhost:5173. No se desplegó ni modificó código para esta medición.

## Método y resultados

Una sesión administrativa temporal. Diez consultas secuenciales por endpoint, seguidas de tres ráfagas de cien GET simultáneos por endpoint; 930 consultas medidas en total. Se consumió el cuerpo completo de cada respuesta y se midió tiempo de pared desde fetch. Todos los GET medidos respondieron HTTP 200. Login: 1944 ms en una muestra, sin prueba de carga de autenticación. Lista disponible: 70 estudiantes; expediente seleccionado por primera fila de esa lista, respuesta de solo 301 bytes (no representa un historial grande).

| Consulta | Secuencial, p95 | p95 de cada ráfaga de 100 solicitudes | Máximo observado bajo carga |
|---|---|---|---|
| Estudiantes | 105 ms | 5621 / 5211 / 4651 ms | 5782 ms |
| Sesiones | 80 ms | 3628 / 3665 / 3797 ms | 3900 ms |
| Expediente | 145 ms | 7074 / 7211 / 8297 ms | 8313 ms |

Solicitudes exitosas por encima de 3000 ms: estudiantes 163/300; sesiones 227/300; expediente 300/300. p95 es el valor bajo el cual queda aproximadamente el 95% de las muestras; no constituye un criterio adicional impuesto al requisito original.

En una comprobación inicial separada, health respondió en 308 ms y el HTML de Vite en 2195 ms. Estos tiempos no miden la carga visual de una página completa ni Core Web Vitals y no se comparan con producción.

## Conclusión

En este ensayo local no se sostuvo el objetivo de ≤3 segundos bajo cien solicitudes simultáneas. La navegación con peticiones individuales puede sentirse rápida, pero el comportamiento bajo carga necesita investigación y mejora. No hay errores HTTP en las muestras; sí degradación de latencia.

No equivale a cien personas concurrentes: todos los GET usaron una cuenta, ráfagas sincronizadas, base pequeña y entorno de desarrollo. El propio generador, Docker Desktop, CPU, consultas/logs y pool de conexiones pueden influir. No se midió cada componente ni se atribuye una causa definitiva. Para acreditar RNF-PERF-01 hace falta repetir con usuarios/roles representativos, mezcla de operaciones, datos realistas, carga sostenida y configuración equivalente a producción en el servidor de destino. No se realizó importación de 2000 estudiantes ni carga de escrituras; RNF-PERF-02 continúa sin acreditar en esta verificación.

## Estado de las mejoras propuestas

- Paginación: `PrismaStudentRepository.findAll` y listas de usuarios siguen devolviendo listas completas, sin límite de página.
- Alcance de estudiantes: `ListStudentsUseCase` sigue filtrando parte del alcance de coordinadores después de recuperar registros. Mover la restricción a la consulta SQL conservando defensa de acceso.
- Excel: validaciones de correo/teléfono/nombre mejoradas; `ImportStudentsUseCase` conserva búsqueda de código y alta secuenciales por fila. No se encontró importación por lotes.
- Expediente: conserva consultas separadas por cada usuario relacionado mediante Promise.all; agruparlas reduce viajes a la base, pero el expediente pequeño medido indica que no debe asumirse esa como única causa de latencia.
- Caché de consultas del cliente ya configurada (60 segundos) y gzip presente en Caddy; no son mejoras nuevas de este ensayo.

## Orden de intervención

1. Registrar por petición tiempos de middleware, consultas, espera del pool y proceso; medir CPU/memoria durante carga. No registrar datos sensibles ni tokens.
2. Paginar listas y aplicar alcance autorizado en SQL antes de paginar; pedir solo columnas necesarias y agrupar lecturas relacionadas.
3. Optimizar Excel con validación compartida, consultas de códigos por lote y escritura por lotes, preservando errores por fila/duplicados y re-pruebas.
4. Evaluar índices a partir de planes reales, tamaño de pool y capacidad de CPU/conexiones. No ampliar pool ni bajar costo de contraseña a ciegas para aparentar velocidad.
5. Repetir el mismo ensayo y registrar antes/después; luego prueba sostenida de cien usuarios, datos de volumen objetivo e importación de 2000 filas en base de ensayo aislada.

Resultados sin datos personales ni credenciales: `tmp/performance-results-2026-10-13.json`. Guion empleado: `tmp/performance-check.cjs`; obtiene la cuenta del archivo de soporte E2E, conserva el token solo en memoria y cierra la sesión creada. No genera estudiantes ni cambia sus datos. El inicio/cierre de sesión puede generar la auditoría habitual de autenticación.
