# Lista de pendientes con fechas — hasta v1.0.0-beta.1 y v1.0.0

Elaborada el 13/10/2026 a partir de `AUDITORIA_PRE_RELEASE_2026-10-12.md`, `PLAN_BETA_UNTRM_2026-10-15.md` y el SPRINT BACKLOG. Los hallazgos A01, A02, A04 y A05 se comprobaron leyendo el código el 13/10; los demás se toman de la auditoría sin volver a verificarlos.

## 1. Pedidos a la DBU y a TI (lo que no depende del código)

| Pedido | A quién | Pedir | Necesario para |
|---|---|---|---|
| Servidor aislado con HTTPS, dominio, Docker y acceso SSH | TI | **Hoy 13/10** | Beta 15/10 |
| Cuenta SMTP (host, puerto, TLS, usuario, remitente autorizado) o aceptar un capturador de ensayo declarado como tal | TI | **Hoy 13/10** | Pruebas de correo en la beta |
| Destino de respaldos fuera del servidor y responsable de restaurarlos | TI | 14/10 | Beta 15/10 |
| Decisión: ¿el Coordinador ve evaluaciones de todas las escuelas o solo de las suyas? (A05) | DBU | **14/10 mañana** | Código A05 |
| Decisión: evaluación confidencial (reportes sin identidad) o anonimato real (A06) | DBU | 14/10 | Texto de manuales y matriz; diseño |
| Política de dominio de correo: ¿solo `@untrm.edu.pe` o excepciones (profesionales externos)? (RF-01, A02) | DBU | 14/10 | Validación de correos |
| Quién habilita y cierra la evaluación y con qué fechas (RF-39) | DBU | 16/10 | Alcance del Sprint 6 |
| Revisión de los anexos 3, 5, 6, 7, 8 y 9 contra el sistema | DBU | Pedir 16/10, respuesta antes del 06/11 | Piloto 13/11 |
| Lista de participantes autorizados de la beta y del piloto | DBU | 14/10 (beta), 30/10 (piloto) | Cuentas y datos ficticios |

## 2. Código antes de la beta (martes 13 y miércoles 14)

Orden propuesto por riesgo y tamaño. Lo comprobado está marcado.

| # | Hallazgo | Estado verificado | Fecha | Esfuerzo |
|---|---|---|---|---|
| 1 | A04 — editar con correo ocupado devuelve 500 (dos clases `DuplicateEmailError` distintas) | Confirmado: `UpdateUserUseCase.ts:14` define la suya y `UserController.ts:85` captura la de `CreateUserUseCase` | 13/10 | Pequeño |
| 2 | A02 — correos sin `trim` ni minúsculas al crear y editar; login sí normaliza | Confirmado: el esquema solo usa `.email()` y login usa `toLowerCase().trim()` | 13/10 | Pequeño |
| 3 | A01 — contraseña inicial fija `Tutor2026!` para todas las cuentas | Confirmado en `CreateUserUseCase.ts:35` | 14/10 | Mediano: contraseña aleatoria por persona + cambio obligatorio al primer ingreso |
| 4 | A03 — la importación no valida el formato del correo | De la auditoría | 14/10 | Pequeño |
| 5 | A05 — resultados, estadísticas y sugerencias de evaluación sin límite por escuela | Confirmado en `GetEvaluationResultsUseCase`: solo comprueba el rol | 14/10, si DBU responde | Mediano; depende de la decisión |
| 6 | A07 — nombres de solo espacios, teléfonos con letras, fecha de nacimiento futura | De la auditoría | Si queda tiempo; si no, 19/10 | Mediano |

Cada punto lleva prueba nueva y su PR con la plantilla completa. Los puntos 1 y 2 van juntos en un PR; el 3 y el 4 en PR separados.

**Importante sobre A01:** hasta corregirlo, no se deben crear cuentas con datos reales, y la contraseña `Tutor2026!` no debe darse a ningún participante de la beta. Se lo dije yo antes como contraseña por defecto; fue correcto para desarrollo, pero no sirve para el servidor.

## 3. Beta v1.0.0-beta.1 (jueves 15/10)

| Fecha | Qué |
|---|---|
| Mié 14/10 tarde | Congelar el commit candidato, correr la suite E2E completa (9 recorridos, 40 pruebas) sobre ese commit y guardar el resultado |
| Jue 15/10 | Si TI entregó el servidor: instalar, smoke, correo, permisos y reversión; abrir solo tras aprobar el checklist del plan |
| Jue 15/10 | Si TI no lo entregó: candidata lista; instalación en la fecha que fije TI |
| Después de aprobar | Tag `v1.0.0-beta.1` (lo decides tú; yo lo hago por línea de comandos cuando lo apruebes) |

## 4. Después de la beta, hacia v1.0.0 (fechas del backlog)

| Fecha | Tarea | Contenido |
|---|---|---|
| 16–19/10 | Hallazgos medios | A06 (anonimato), A07 completo, A08 (parámetros de seguridad), A09 (bitácora de lecturas sensibles, RNF-COMP-01), A10 (reintentos de correo), A11 (lenguaje de roles y ejemplos en solicitudes) |
| 20/10–06/11 | Anexos | Ajustes a PDF de entrevista, seguimiento, derivación, plan e informe según la validación de la DBU |
| Semana del 26/10 | Rendimiento y respaldo | Prueba de 100 usuarios concurrentes (RNF-PERF-01), importación de 2000 filas (RNF-PERF-02), restauración real de un respaldo, monitoreo y alerta |
| 09–10/11 | TT-100 | Corrida completa de pruebas con evidencia; Firefox, Edge, móvil |
| 11–12/11 | TT-101 | Revisión de seguridad actualizada tras A01, A05 y A09 |
| 13/11 | TT-102 | Piloto con participantes reales autorizados |
| 16–17/11 | TT-103 | Correcciones y regresión |
| 18/11 | TT-104 | Producción, visto bueno del Product Owner, smoke |
| 19–20/11 | TT-105 | Manuales finales e informe V02 → final (9 recorridos y 40 pruebas) |

## 5. Lo que no se puede cerrar con código

SMTP real y llegada a bandeja, respaldo externo, aceptación de anexos, visto bueno del Product Owner, participantes del piloto, horas y constancias del informe.

## 6. Fuera de la lista, a decidir

GitHub Releases, E2E en CI (la auditoría lo recomienda; es un trabajo de ~1 día), apagar avisos por correo por persona (sin obligación documental; mantener siempre la recuperación de contraseña), borrar parámetros de sistema no usados (la auditoría pide corregirlos o explicarlos, no borrarlos sin más: ver A08).
