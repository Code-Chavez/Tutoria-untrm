# Designaciones de tutor por ciclo liberadas en la base de desarrollo (25/10/2026)

El 25/10/2026 se liberaron, con la API del sistema y por indicación expresa, las **10 designaciones de tutor por ciclo** que había en la base de desarrollo, porque la suite de integración `cycleTutors` no podía pasar con ellas (un docente solo atiende dos ciclos y el ciclo 10 de Sistemas estaba ocupado). Quedaron registradas en la bitácora como `CYCLE_TUTOR_REMOVED`. **No se restauraron automáticamente**: este documento dice cuáles convendría recuperar si una demostración las necesita.

## Qué había

Todas las designaciones del periodo 2026-II, con su estado antes de liberarlas. Origen de la mayoría: corridas de prueba y de uso manual del 22/10/2026 (la bitácora muestra la designación y la aceptación de los ciclos 2 y 4 de Sistemas ese día). La seed no crea designaciones por ciclo.

| # | Escuela | Ciclo | Docente | Estado | Excepción | ¿Recuperar para una demostración? |
|---|---|---|---|---|---|---|
| 1 | Ingeniería de Sistemas | 1 | Jorge Salazar (cuenta de demostración) | pendiente de respuesta | no | **Sí**, si se quiere mostrar «pendiente de aceptación» |
| 2 | Ingeniería de Sistemas | 2 | Elena Ramírez (cuenta de demostración) | aceptada | **sí** (segundo ciclo del docente) | **Sí**, si se quiere mostrar una excepción con motivo |
| 3 | Ingeniería de Sistemas | 3 | Elena Ramírez | aceptada | no | **Sí**: es el caso típico «el docente aceptó y dejó su disponibilidad» |
| 4 | Ingeniería de Sistemas | 4 | cuenta `docente2-…` creada por una prueba E2E | aceptada | no | No: cuenta de prueba |
| 5 | Ingeniería de Sistemas | 5 | cuenta `docente2-…` de prueba E2E | pendiente | no | No |
| 6 | Ingeniería de Sistemas | 6 | cuenta `docente1-…` de prueba E2E | pendiente | no | No |
| 7 | Ingeniería de Sistemas | 7 | cuenta `docente2-…` de prueba E2E | pendiente | no | No |
| 8 | Ingeniería de Sistemas | 9 | cuenta `docente2-…` de prueba E2E | pendiente | no | No |
| 9 | Administración de Empresas | 2 | Miguel Torres (cuenta de demostración) | pendiente | no | **Sí**, si la demostración incluye esa escuela |
| 10 | Administración de Empresas | 6 | Miguel Torres | pendiente | **sí** | Opcional (segundo ciclo del mismo docente) |

Las cuentas de prueba E2E (`docente1-…`, `docente2-…`) son residuos de pruebas y **no** conviene recrear sus designaciones.

## Qué no se puede recuperar tal cual

- **La disponibilidad** (día, hora y lugar) que los docentes aceptados (filas 2 y 3) dejaron al responder: se eliminó con la fila. Para tenerla otra vez, el docente debe volver a responder con el enlace del correo de aceptación.
- **El texto del motivo de las excepciones** (filas 2 y 10): la bitácora solo conserva «(excepción)», no el texto. Hay que escribir un motivo nuevo, de al menos 5 caracteres.
- Las fechas de designación y de respuesta (se generan de nuevo).
- **Los estudiantes no cambiaron**: quitar la designación no los reasigna; siguen con sus tutores.

## Cómo recuperarlas (sin restaurar automáticamente)

1. Entrar como la coordinación de la escuela (o como la DBU) → *Periodo académico → Asignación por ciclo*.
2. Elegir al docente en el ciclo. Si es su segundo ciclo, el sistema pide la excepción con su motivo.
3. El sistema envía en la misma operación el correo de aceptación (en desarrollo llega a Mailpit, `http://localhost:8025`). Para dejar la designación como **aceptada**, abrir el enlace y responder con una disponibilidad.

Ninguna prueba automática debe depender de estas designaciones: desde esta fecha las suites de integración corren en una base exclusiva y con datos propios (ver `docs/PRUEBAS_DE_INTEGRACION.md`).
